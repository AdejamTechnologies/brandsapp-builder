/**
 * HTML → Doc importer — the "reproduce any external design as data, no redeploy"
 * capability (spec §8). Dependency-free + Worker-safe: a small stack tokenizer
 * (no DOM/parse5) maps common tags to primitives and inline `style=""` to node
 * styles. Best-effort by design — it gives an editable starting Doc, not a
 * pixel-perfect clone.
 */

import { DEFAULT_BREAKPOINTS } from "./migrate"
import { applyStylesheetToDoc } from "./import-css"
import { CORE_DOC_VERSION, type Doc, type Node } from "./schema"

const TAG_MODULE: Record<string, string> = {
  div: "box", section: "box", main: "box", header: "box", footer: "box",
  article: "box", nav: "box", aside: "box", figure: "box", ul: "box", ol: "box", li: "box",
  p: "text", span: "text", strong: "text", em: "text", small: "text",
  label: "text", figcaption: "text", blockquote: "text",
  h1: "heading", h2: "heading", h3: "heading", h4: "heading", h5: "heading", h6: "heading",
  a: "link", button: "button", img: "image",
}
const VOID_TAGS = new Set(["img", "br", "hr", "input", "meta", "link", "source", "area"])
const SKIP_TAGS = new Set(["script", "style", "head", "svg", "noscript", "template", "iframe"])
const TEXTY = new Set(["heading", "text", "link", "button"])

interface El {
  tag: string
  attrs: Record<string, string>
  children: Array<El | string>
}

/**
 * Text arrives as raw source, so an entity would otherwise survive into a `text`
 * prop and the renderer — which escapes props, correctly — would print the entity
 * itself: real pages shipped reading "&copy; 2022". Only the handful HTML requires
 * plus numeric refs; anything else is left alone rather than guessed at.
 */
const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  middot: "·",
  bull: "•",
  laquo: "«",
  raquo: "»",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  times: "×",
  deg: "°",
  euro: "€",
  pound: "£",
  yen: "¥",
}

export function decodeEntities(s: string): string {
  if (!s.includes("&")) return s
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
    }
    return NAMED[body.toLowerCase()] ?? whole
  })
}

function parseAttrs(str: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(str))) {
    const name = m[1].toLowerCase()
    let val = m[2] ?? ""
    if (val && (val[0] === '"' || val[0] === "'")) val = val.slice(1, -1)
    out[name] = val
  }
  return out
}

function parseStyleAttr(s: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const decl of s.split(";")) {
    const i = decl.indexOf(":")
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    const val = decl.slice(i + 1).trim()
    if (prop && val) out[prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = val
  }
  return out
}

/**
 * The stylesheet the tokenizer walks past.
 *
 * `<style>` is in SKIP_TAGS because its contents are CSS, not markup — but
 * skipping the TAG should not mean throwing away the DESIGN. Every generated
 * template hangs its entire look off one of these blocks, so it is collected
 * here and resolved onto the nodes afterwards by import-css.ts.
 */
export function extractStylesheets(html: string): string {
  const out: string[] = []
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) out.push(m[1])
  return out.join("\n")
}

function tokenize(html: string): El[] {
  const root: El = { tag: "#root", attrs: {}, children: [] }
  const stack: El[] = [root]
  const skip: string[] = []
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>|([^<]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const [full, closing, rawTag, attrStr, selfClose, text] = m
    if (text != null) {
      if (skip.length) continue
      const t = text.replace(/\s+/g, " ")
      if (t.trim()) stack[stack.length - 1].children.push(t)
      continue
    }
    if (full.startsWith("<!--") || !rawTag) continue
    const tag = rawTag.toLowerCase()
    if (closing) {
      if (skip.length && skip[skip.length - 1] === tag) skip.pop()
      else if (!skip.length) {
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].tag === tag) {
            stack.length = i
            break
          }
        }
      }
      continue
    }
    if (SKIP_TAGS.has(tag)) {
      if (!selfClose && !VOID_TAGS.has(tag)) skip.push(tag)
      continue
    }
    if (skip.length) continue
    const el: El = { tag, attrs: parseAttrs(attrStr ?? ""), children: [] }
    stack[stack.length - 1].children.push(el)
    if (!VOID_TAGS.has(tag) && !selfClose) stack.push(el)
  }
  return root.children.filter((c): c is El => typeof c !== "string")
}

export function htmlToDoc(html: string): Doc {
  const nodes: Record<string, Node> = {}
  /** id → original tag, so `body`/`h2`/`li` selectors can be resolved. */
  const tags: Record<string, string> = {}
  let counter = 0
  const nextId = () => `i${(counter++).toString(36)}`

  const walk = (el: El): string => {
    const module = TAG_MODULE[el.tag] ?? "box"
    const id = nextId()
    const props: Record<string, unknown> = {}
    const children: string[] = []
    const style = el.attrs.style ? parseStyleAttr(el.attrs.style) : undefined
    // Preserve utility classes (Tailwind/Preline) — the renderer turns them into
    // CSS at render time (UnoCSS), so an imported block keeps its styling.
    let classes = el.attrs.class?.trim() || undefined

    // Keep the original tag on box elements (ul/li/section/nav/…) so structure —
    // and CSS that targets real tags (e.g. daisyUI menu/breadcrumbs) — is faithful.
    if (module === "box" && el.tag !== "div") props.tag = el.tag
    // Imported markup was authored against Tailwind's PREFLIGHT, which strips a
    // list's markers and indent. Our generator runs preflight OFF, so an imported
    // <ul> arrives with UA bullets and a 40px indent it never had at the source.
    // Only applied when the author set no list-style of their own.
    if ((el.tag === "ul" || el.tag === "ol") && !/\blist-/.test(el.attrs.class ?? "")) {
      classes = `list-none m-0 p-0 ${classes ?? ""}`.trim()
    }
    if (module === "heading") props.level = el.tag.replace("h", "")
    if (module === "image") {
      props.src = el.attrs.src ?? ""
      props.alt = el.attrs.alt ?? ""
    }
    if (module === "link" || module === "button") props.href = el.attrs.href ?? ""

    const text = decodeEntities(
      el.children
        .filter((c): c is string => typeof c === "string")
        .join(" ")
        .trim()
    )
    if (TEXTY.has(module) && text) {
      if (module === "button") props.label = text
      else props.text = text
    }
    for (const c of el.children) {
      if (typeof c !== "string") children.push(walk(c))
    }
    nodes[id] = { id, module, props, styleIds: [], children, ...(style ? { style } : {}), ...(classes ? { classes } : {}) }
    tags[id] = el.tag
    return id
  }

  const rootId = nextId()
  const rootChildren = tokenize(html).map(walk)
  nodes[rootId] = { id: rootId, module: "page-root", props: {}, styleIds: [], children: rootChildren }

  const doc: Doc = {
    version: CORE_DOC_VERSION,
    rootId,
    nodes,
    styles: {},
    theme: { colors: {}, fonts: {}, radius: {}, breakpoints: DEFAULT_BREAKPOINTS },
    meta: {},
  }

  // The design, not just the structure. Failure here must not lose the import:
  // an unstyled but correct tree is a usable starting point, a thrown parser
  // is not.
  const css = extractStylesheets(html)
  if (css.trim()) {
    try {
      const result = applyStylesheetToDoc(doc, css, tags, (px) => {
        // Widest breakpoint at or under the query, so `max-width: 880px` lands
        // on the tablet slot rather than inventing one.
        const candidates = DEFAULT_BREAKPOINTS.filter(
          (b) => typeof b.maxWidth === "number" && b.maxWidth <= px
        )
        return candidates.sort((a, b) => (b.maxWidth ?? 0) - (a.maxWidth ?? 0))[0]?.id
      })
      if (result.residual.trim()) {
        doc.meta = { ...(doc.meta ?? {}), residualCss: result.residual }
      }
    } catch {
      // keep the structural import
    }
  }

  return doc
}
