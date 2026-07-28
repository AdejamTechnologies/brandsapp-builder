/**
 * Wires the `data-bapp-*` runtime hooks into blocks whose markup LOOKS
 * interactive (accordions/tabs/dropdowns) but is actually inert — HyperUI and
 * Meraki ship these as static screenshots-in-HTML, not working widgets. Our
 * pages are driven by a tiny dependency-free vanilla-JS runtime (Preline-style)
 * that activates elements purely from data attributes:
 *
 *   Accordion : data-bapp-accordion (root, +data-multi for multi-open)
 *               data-bapp-accordion-item / -trigger / -panel (per item)
 *   Dropdown  : data-bapp-dropdown (root) / -trigger / -menu
 *               (menu MUST be a direct child of root — runtime uses `:scope >`)
 *   Tabs      : data-bapp-tabs (root); data-bapp-tab-panel with data-title="…"
 *               per panel (runtime synthesizes the tab bar from those titles)
 *
 * This is intentionally CONSERVATIVE, not exhaustive:
 *
 *  - ~35 blocks already use native <details>/<summary> for their disclosure
 *    (HyperUI's accordions + faqs + product-collections + filters). Those
 *    already work with zero JS. We never touch <details> subtrees.
 *  - gen-blocks.mjs already excludes the categories that would carry real
 *    interactivity (HyperUI "dropdown"/"tabs"/"modals", Meraki
 *    "dropdowns"/"tabs"/"navbars"/"tooltip") and drops anything still
 *    carrying Alpine (`x-data`/`@click`/`x-show`). So by the time a block
 *    reaches this script, most of the *real* candidates are already gone —
 *    what's left over is either already-working <details>, purely decorative
 *    hover/CSS effects (group-hover image reveals, peer-checked polls), or
 *    genuinely-inert-but-INCOMPLETE mockups (e.g. several Meraki "faq"
 *    layouts render 5 question buttons but ship an answer paragraph for only
 *    the first — there's no content for the other 4 panels to reveal). We
 *    do not fabricate missing panel content to make those "work", and we
 *    require every item in a candidate accordion group to have BOTH a
 *    trigger and a panel before wiring the group at all.
 *
 * Detection is structural (a minimal, dependency-free tag-tree walk — no
 * jsdom/cheerio in package.json, and these 304 blocks are well-formed
 * HTML from real sites, so a careful tokenizer is sufficient). We only ever
 * ADD attributes/class-tokens; the `{category,name,html}` record shape and
 * every other byte of markup is left alone.
 *
 * Idempotent: each detector skips any candidate whose root/group already
 * carries its `data-bapp-*` marker, so re-running never double-injects.
 *
 * Run standalone (one-shot rewrite of the checked-in JSON, no re-clone):
 *   node scripts/wire-blocks.mjs
 * Also called inline from gen-blocks.mjs so freshly generated blocks come
 * out pre-wired too.
 */
import fs from "node:fs"
import path from "node:path"

// Elements with no closing tag — never push a nesting frame for these.
const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
])

const TAG_RE = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*?)?)(\/?)>/g

/** Tokenize `html` into a flat list of tag tokens (comments are dropped). */
function tokenize(html) {
  const tokens = []
  let m
  TAG_RE.lastIndex = 0
  while ((m = TAG_RE.exec(html))) {
    if (m[0].startsWith("<!--")) continue
    const [full, closing, tag, attrs, selfCloseSlash] = m
    const lower = tag.toLowerCase()
    tokens.push({
      full,
      tag: lower,
      closing: !!closing,
      selfClose: !!selfCloseSlash || VOID.has(lower),
      attrs: attrs || "",
      start: m.index,
      end: m.index + full.length,
    })
  }
  return tokens
}

/**
 * Build a tag tree from `html`. Each element node carries openStart/openEnd
 * (span of its opening tag, used for attribute injection) and closeStart/
 * closeEnd (span of its closing tag, if any — used for text-content checks).
 */
function buildTree(html) {
  const root = { tag: "#root", children: [], openStart: 0, openEnd: 0 }
  const stack = [root]
  for (const t of tokenize(html)) {
    if (t.closing) {
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].tag === t.tag) {
          stack[i].closeStart = t.start
          stack[i].closeEnd = t.end
          stack.length = i
          break
        }
      }
      continue
    }
    const node = {
      tag: t.tag,
      attrs: t.attrs,
      openStart: t.start,
      openEnd: t.end,
      selfClose: t.selfClose,
      children: [],
    }
    stack[stack.length - 1].children.push(node)
    if (!t.selfClose) stack.push(node)
  }
  return root
}

const attrValue = (attrs, name) => {
  const m = attrs.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"))
  return m ? m[1] : null
}
const hasClassToken = (attrs, cls) => (attrValue(attrs, "class") || "").split(/\s+/).includes(cls)
const alreadyWired = (attrs, marker) => attrs.includes(marker)

/** Stripped text content of the span between an element's open and close tags. */
function textOf(html, node) {
  if (node.closeStart == null) return ""
  return html
    .slice(node.openEnd, node.closeStart)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Queue an attribute-string insertion right before the tag's closing `>`/`/>`. */
function queueAttrInsert(edits, html, node, attrString) {
  const openText = html.slice(node.openStart, node.openEnd)
  const selfClosing = /\/>\s*$/.test(openText)
  const pos = node.openEnd - (selfClosing ? 2 : 1)
  edits.push({ pos, insert: ` ${attrString}` })
}

/** Queue adding a class token to a node's class list (creating class="" if absent). */
function queueClassAdd(edits, html, node, cls) {
  if (hasClassToken(node.attrs, cls)) return
  const openText = html.slice(node.openStart, node.openEnd)
  const cm = openText.match(/class="([^"]*)"/)
  if (cm) {
    const pos = node.openStart + cm.index + cm[0].length - 1 // before closing quote
    edits.push({ pos, insert: ` ${cls}` })
  } else {
    const pos = node.openStart + 1 + node.tag.length // right after "<tagname"
    edits.push({ pos, insert: ` class="${cls}"` })
  }
}

function walk(node, fn) {
  fn(node)
  for (const c of node.children) walk(c, fn)
}

// --- Accordion -------------------------------------------------------------
// A group qualifies only if EVERY non-separator child has both a direct
// <button> trigger and a sibling panel with real text — this is what
// correctly excludes the Meraki "faq" mockups that only ship one answer.
// The panel must come AFTER the trigger in document order: a real accordion
// reveals content below/after the clicked header. This ordering check is
// what tells an accordion item apart from an unrelated card that merely
// happens to contain both a button and a text block — e.g. a pricing-plan
// card (feature list, THEN a trailing "Choose plan" button) matches
// "button + substantial text sibling" too, but the text comes BEFORE the
// button there, so it's correctly rejected.
function detectAccordion(html, root, edits, counts) {
  walk(root, (group) => {
    if (group.tag === "#root" || group.tag === "details") return
    if (alreadyWired(group.attrs, "data-bapp-accordion")) return
    const items = group.children.filter((c) => c.tag !== "hr" && c.tag !== "br")
    if (items.length < 2) return

    const parsed = []
    for (const item of items) {
      if (item.tag === "details") return // native disclosure inside — bail on whole group
      const triggerIdx = item.children.findIndex((c) => c.tag === "button")
      if (triggerIdx === -1) return
      const trigger = item.children[triggerIdx]
      const panel = item.children
        .slice(triggerIdx + 1)
        .find((c) => ["div", "p", "section"].includes(c.tag) && textOf(html, c).length >= 15)
      if (!panel) return // incomplete item, or text precedes the button (not an accordion shape)
      parsed.push({ item, trigger, panel })
    }

    queueAttrInsert(edits, html, group, "data-bapp-accordion")
    for (const { item, trigger, panel } of parsed) {
      queueAttrInsert(edits, html, item, "data-bapp-accordion-item")
      queueAttrInsert(edits, html, trigger, "data-bapp-accordion-trigger")
      queueAttrInsert(edits, html, panel, "data-bapp-accordion-panel")
      queueClassAdd(edits, html, panel, "hidden") // establish a real closed default state
    }
    counts.accordion++
  })
}

// --- Dropdown ----------------------------------------------------------------
// Root = a wrapper directly containing one <button> trigger and one
// menu-shaped direct-child sibling (role="menu", or absolute+rounded/shadow
// with real link/button content — filters out decorative absolute divs like
// progress-bar fills or background blobs, which have no button sibling and
// no interactive content).
function isMenuShaped(html, node) {
  if (node.tag !== "div") return false
  if (attrValue(node.attrs, "role") === "menu") return true
  const cls = attrValue(node.attrs, "class") || ""
  if (!/\babsolute\b/.test(cls)) return false
  if (!/\brounded|\bshadow/.test(cls)) return false
  const inner = html.slice(node.openEnd, node.closeStart ?? node.openEnd)
  return /<a\b|<button\b/i.test(inner)
}

function detectDropdown(html, root, edits, counts) {
  walk(root, (wrapper) => {
    if (wrapper.tag === "#root") return
    if (alreadyWired(wrapper.attrs, "data-bapp-dropdown")) return
    const trigger = wrapper.children.find((c) => c.tag === "button")
    const menuCandidates = wrapper.children.filter((c) => isMenuShaped(html, c))
    if (!trigger || menuCandidates.length !== 1) return
    const menu = menuCandidates[0]
    if (menu === trigger) return

    queueAttrInsert(edits, html, wrapper, "data-bapp-dropdown")
    queueAttrInsert(edits, html, trigger, "data-bapp-dropdown-trigger")
    queueAttrInsert(edits, html, menu, "data-bapp-dropdown-menu")
    queueClassAdd(edits, html, menu, "hidden") // menu had no closed state at all — establish one
    counts.dropdown++
  })
}

// --- Tabs ----------------------------------------------------------------
// Only fires on the standard ARIA shape (role="tablist" + role="tabpanel"),
// since that's the sole non-destructive, unambiguous signal available —
// HyperUI/Meraki's actual tab-strip categories are excluded from
// blocks-data.json entirely upstream (gen-blocks.mjs EXCLUDE set), so there's
// no reliable structural signal left to safely reconstruct a tab group
// without either inventing panels or deleting a legacy tab bar (both out of
// scope: we only ever ADD attributes).
function detectTabs(html, root, edits, counts) {
  walk(root, (container) => {
    if (container.tag === "#root") return
    if (alreadyWired(container.attrs, "data-bapp-tabs")) return
    const tablist = container.children.find((c) => attrValue(c.attrs, "role") === "tablist")
    const panels = container.children.filter((c) => attrValue(c.attrs, "role") === "tabpanel")
    if (!tablist || panels.length < 2) return
    const triggers = tablist.children.filter((c) => c.tag === "button" || c.tag === "a")
    if (triggers.length !== panels.length) return

    queueAttrInsert(edits, html, container, "data-bapp-tabs")
    for (let i = 0; i < panels.length; i++) {
      const title = textOf(html, triggers[i]).replace(/"/g, "&quot;") || `Tab ${i + 1}`
      queueAttrInsert(edits, html, panels[i], `data-bapp-tab-panel data-title="${title}"`)
    }
    counts.tabs++
  })
}

/**
 * Wire one block's html. Returns { html, counts } where counts tallies how
 * many groups/roots were wired per pattern (not sub-elements).
 */
export function wireHtml(html) {
  const root = buildTree(html)
  const edits = []
  const counts = { accordion: 0, dropdown: 0, tabs: 0 }
  detectAccordion(html, root, edits, counts)
  detectDropdown(html, root, edits, counts)
  detectTabs(html, root, edits, counts)
  if (edits.length === 0) return { html, counts }
  edits.sort((a, b) => b.pos - a.pos) // apply back-to-front so earlier offsets stay valid
  let out = html
  for (const { pos, insert } of edits) out = out.slice(0, pos) + insert + out.slice(pos)
  return { html: out, counts }
}

// --- One-shot rewrite of the checked-in blocks-data.json (mirrors tokenize-blocks.mjs) ---
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
if (isMain) {
  const file = path.join(process.cwd(), "src/lib/blocks-data.json")
  const blocks = JSON.parse(fs.readFileSync(file, "utf8"))

  const totals = { accordion: 0, dropdown: 0, tabs: 0 }
  let wiredBlocks = 0
  for (const block of blocks) {
    const { html, counts } = wireHtml(block.html)
    if (html !== block.html) wiredBlocks++
    totals.accordion += counts.accordion
    totals.dropdown += counts.dropdown
    totals.tabs += counts.tabs
    block.html = html
  }

  fs.writeFileSync(file, JSON.stringify(blocks, null, 2) + "\n")
  console.log(
    `Wired ${wiredBlocks}/${blocks.length} blocks -> ${file} ` +
      `(accordion:${totals.accordion} dropdown:${totals.dropdown} tabs:${totals.tabs})`,
  )
}
