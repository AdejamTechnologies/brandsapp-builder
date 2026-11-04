/**
 * Generate the landing-page block library from a local corpus of whole pages.
 *
 * The Sections panel already carries ~300 blocks bundled into the editor
 * (`src/lib/blocks-data.json`, see gen-blocks.mjs). This produces a much larger
 * set — roughly 2,200 bands across 21 industries — and it CANNOT be bundled:
 * the payload is tens of megabytes, so it is written as static JSON under
 * `public/blocks/` and fetched one category at a time when somebody opens that
 * category in the panel. Same `{category, name, html}` shape as the bundled
 * set, so `fromHtml` in src/lib/templates.ts consumes it unchanged.
 *
 *   node_modules/.bin/tsx scripts/gen-landing-blocks.mts <corpus-dir>
 *
 * The corpus is `<category>/<page>/sections/NN-kind.html`, each file a whole
 * standalone document with the page's entire stylesheet inlined. Three things
 * happen to each one:
 *
 *   1. THE CSS IS TRIMMED to the rules this band actually uses. Every section
 *      of a page ships the whole page's sheet, so the 2,212 files carry the
 *      same 14KB of CSS eleven times over — 34.5MB in, 14MB out, for markup
 *      that renders identically.
 *   2. PHOTOGRAPHS BECOME A PLACEHOLDER. A real photograph baked into a block
 *      would appear on every page that inserts it. Inline `data:` SVGs (the
 *      corpus draws its logos that way) are left alone — they are shapes, not
 *      somebody's picture.
 *   3. NOTHING ABOUT WHERE IT CAME FROM TRAVELS. No reference URLs, no notes,
 *      no comments: `NOTES.md` is not read and the markup's comments are
 *      stripped.
 *
 * A third-and-a-half thing: THE TOKENS ARE RESOLVED INTO LITERAL VALUES. The
 * page declares `:root{--rust:#c1512f}` and its rules say `var(--rust)`, and a
 * block has nowhere to put the declaration — `extractFragment` keeps nodes and
 * drops the theme, so the tokens would not travel and every colour would come
 * out empty in the preview and on insert. A block has to be self-contained
 * anyway: it carries the palette of the design it came from, which is the
 * reason somebody picked it, and the alternative is a block that fights the
 * host page's theme. So `var(--rust)` becomes `#c1512f` here and `:root` is
 * dropped. (The tenant repo's importer keeps the other arrangement, where a
 * whole PAGE is imported and the tokens become its theme — there the design is
 * the page and following the theme is right.)
 *
 * A fourth thing, which is not a trim but a translation. The page's own
 * `body{background:…;color:…;font-family:…}` is the ground the band was drawn
 * on, and a band lifted out of its page has no `<body>` for that rule to land
 * on — every block came out eight declarations short, the same eight every
 * time. So the markup is wrapped in one element and `html`/`body` selectors
 * are pointed at it: the band carries its own ground, which is why somebody
 * picked it. `:root` is left alone so its tokens still lift to the theme and
 * stay editable.
 *
 * The names in the copy are invented businesses, and they stay: a person
 * inserting a band wants to see a real sentence in it and will edit it. (The
 * AI catalog in the tenant repo is the opposite — its copy must read as
 * placeholder, because a model LIFTS copy. These blocks are for hands, not for
 * the model, and could not teach it anyway: their design is a per-node CSS bag
 * and the model cannot write one.)
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const corpus = process.argv[2]
if (!corpus) {
  console.error("Usage: node_modules/.bin/tsx scripts/gen-landing-blocks.mts <corpus-dir>")
  process.exit(1)
}

const outDir = join(dirname(new URL(import.meta.url).pathname), "..", "public", "blocks")

/** A neutral stand-in, from the same curated set `scrubBrands` falls back to. */
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80&auto=format&fit=crop"

interface Block {
  category: string
  name: string
  html: string
}

/** Split a stylesheet into top-level blocks, brace-matched. */
function cssBlocks(css: string): Array<{ prelude: string; body: string; whole: string }> {
  const out: Array<{ prelude: string; body: string; whole: string }> = []
  let i = 0
  while (i < css.length) {
    const brace = css.indexOf("{", i)
    if (brace < 0) break
    let depth = 0
    let end = css.length
    for (let j = brace; j < css.length; j++) {
      if (css[j] === "{") depth++
      else if (css[j] === "}") {
        depth--
        if (depth === 0) {
          end = j + 1
          break
        }
      }
    }
    out.push({
      prelude: css.slice(i, brace).trim(),
      body: css.slice(brace + 1, end - 1),
      whole: css.slice(i, end).trim(),
    })
    i = end
  }
  return out
}

/**
 * The rules this band needs, and no more.
 *
 * Kept: `:root` (the design's tokens), anything with no class in its selector
 * (tag and `*` rules, which the band inherits), and any rule naming a class the
 * markup carries. `@media` and the like are recursed into and dropped whole
 * when nothing inside them survives; `@keyframes` and `@font-face` are kept
 * when the markup mentions their name, since an animation is referenced by
 * `animation-name` rather than by a selector.
 */
/**
 * `--name: value` pairs from `:root`, resolved against each other.
 *
 * A token may be written in terms of another (`--line: var(--cream)`), so a
 * single pass would leave a `var()` behind. Bounded rather than recursive: a
 * stylesheet is data, and two tokens that reference each other would spin.
 */
function rootTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>()
  for (const block of cssBlocks(css.replace(/\/\*[\s\S]*?\*\//g, ""))) {
    if (block.prelude !== ":root") continue
    for (const decl of block.body.split(";")) {
      const i = decl.indexOf(":")
      if (i < 0) continue
      const name = decl.slice(0, i).trim()
      if (!name.startsWith("--")) continue
      tokens.set(name, decl.slice(i + 1).trim())
    }
  }
  for (let pass = 0; pass < 5; pass++) {
    let changed = false
    for (const [name, value] of tokens) {
      if (!value.includes("var(--")) continue
      const next = substitute(value, tokens)
      if (next !== value) {
        tokens.set(name, next)
        changed = true
      }
    }
    if (!changed) break
  }
  return tokens
}

/** `var(--x)` → the token's value; an unknown token keeps its fallback. */
function substitute(value: string, tokens: Map<string, string>): string {
  return value.replace(
    /var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,([^)]*))?\)/g,
    (whole, name: string, fallback?: string) =>
      tokens.get(name) ?? (fallback != null ? fallback.trim() : whole)
  )
}

function trimCss(css: string, markup: string, tokens: Map<string, string>): string {
  const used = new Set(
    [...markup.matchAll(/class="([^"]*)"/g)]
      .flatMap((m) => m[1]!.split(/\s+/))
      .filter(Boolean)
  )
  const keep: string[] = []
  for (const block of cssBlocks(css.replace(/\/\*[\s\S]*?\*\//g, ""))) {
    const sel = block.prelude
    // The tokens are inlined everywhere they are used, so the declarations
    // themselves have nothing left to say.
    if (sel === ":root") continue
    if (sel.startsWith("@")) {
      const name = /^@([a-zA-Z-]+)/.exec(sel)?.[1]?.toLowerCase() ?? ""
      if (name === "media" || name === "supports" || name === "layer") {
        const inner = trimCss(block.body, markup, tokens)
        if (inner.trim()) keep.push(`${sel}{${inner}}`)
        continue
      }
      // `@keyframes spin` is reached by name from a declaration, not by a
      // selector, so there is nothing here to match against the markup.
      keep.push(`${sel}{${substitute(block.body, tokens)}}`)
      continue
    }
    const parts = sel.split(",").map((p) => p.trim()).filter(Boolean)
    const wanted = parts
      .filter((part) => {
        if (part === ":root" || !part.includes(".")) return true
        return [...part.matchAll(/\.([a-zA-Z0-9_-]+)/g)].some((m) => used.has(m[1]!))
      })
      // `html` and `body` were the page; the band's own wrapper is now.
      .map((part) =>
        part === "html" || part === "body" ? `.${ROOT_CLASS}` : part
      )
    if (wanted.length) keep.push(`${wanted.join(",")}{${substitute(block.body, tokens)}}`)
  }
  return keep.join("")
}

/**
 * The one class this generator adds, so `html`/`body` rules have an element.
 *
 * Dropped from the node by the importer (a class the sheet defines is resolved
 * onto the node and the bare name only invites a collision), which is exactly
 * what should happen — the declarations have already landed by then.
 */
const ROOT_CLASS = "bapp-band-root"

/**
 * The same substitution inside an inline `style=""`.
 *
 * Eleven references across the corpus live there rather than in the sheet —
 * `<div class="scentmedia" style="background:var(--butter)">` — and resolving
 * only the stylesheet left those eight colours empty.
 */
function substituteInline(markup: string, tokens: Map<string, string>): string {
  return markup.replace(/style="([^"]*)"/g, (whole, value: string) =>
    value.includes("var(--") ? `style="${substitute(value, tokens)}"` : whole
  )
}

/** A photograph becomes a placeholder; a drawn `data:` shape stays. */
function placeholderImages(markup: string): { html: string; swapped: number } {
  let swapped = 0
  const html = markup.replace(/(<img\b[^>]*?\bsrc=")([^"]*)(")/gi, (whole, a: string, src: string, b: string) => {
    if (src.startsWith("data:")) return whole
    swapped++
    return `${a}${PLACEHOLDER}${b}`
  })
  return { html, swapped }
}

/** Words the title-caser would otherwise mangle into "Ai", "Hr", "Saas". */
const ACRONYMS: Record<string, string> = {
  ai: "AI",
  hr: "HR",
  saas: "SaaS",
  cta: "CTA",
  faq: "FAQ",
  seo: "SEO",
  ui: "UI",
}

const title = (s: string) =>
  s
    .replace(/[-_]+/g, " ")
    .split(" ")
    .map((w) => ACRONYMS[w.toLowerCase()] ?? w.replace(/^[a-z]/, (c) => c.toUpperCase()))
    .join(" ")

const blocks = new Map<string, Block[]>()
let files = 0
let bytesIn = 0
let bytesOut = 0
let images = 0

for (const category of readdirSync(corpus).sort()) {
  const catDir = join(corpus, category)
  if (!statSync(catDir).isDirectory()) continue
  for (const page of readdirSync(catDir).sort()) {
    let list: string[] = []
    try {
      list = readdirSync(join(catDir, page, "sections")).sort()
    } catch {
      continue
    }
    for (const file of list) {
      if (!file.endsWith(".html")) continue
      const src = readFileSync(join(catDir, page, "sections", file), "utf8")
      files++
      bytesIn += src.length

      const css = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!).join("\n")
      const body = /<body[^>]*>([\s\S]*?)(?:<\/body>|$)/i.exec(src)?.[1] ?? ""
      // `<main>` is left open by the splitter and would swallow the next band.
      const markup = body.replace(/<main[^>]*>\s*$/i, "").replace(/<!--[\s\S]*?-->/g, "").trim()
      if (!markup) continue

      const tokens = rootTokens(css)
      const { html: imaged, swapped } = placeholderImages(
        substituteInline(markup, tokens)
      )
      images += swapped
      const trimmed = trimCss(css, markup, tokens)
      const html = `<style>${trimmed}</style><div class="${ROOT_CLASS}">${imaged}</div>`
      bytesOut += html.length

      const kind = file.replace(/^\d+-/, "").replace(/\.html$/, "")
      const list2 = blocks.get(category) ?? []
      list2.push({
        // Reads the way the bundled set does ("HyperUI · marketing/footers").
        category: `Landing · ${title(category)}`,
        name: `${title(kind)} — ${title(page)}`,
        html,
      })
      blocks.set(category, list2)
    }
  }
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

interface IndexEntry {
  slug: string
  label: string
  count: number
  bytes: number
}
const index: IndexEntry[] = []
for (const [category, list] of [...blocks.entries()].sort()) {
  const json = JSON.stringify(list)
  writeFileSync(join(outDir, `${category}.json`), json, "utf8")
  index.push({
    slug: category,
    /**
     * The row as the panel shows it. "pages" and not the bare industry,
     * because two of these — Media and Portfolio — collide with a bundled
     * component category, and one row would then hide the other. It is also
     * the truer label: these are bands lifted out of whole pages, not UI
     * components.
     */
    label: `${title(category)} pages`,
    count: list.length,
    bytes: json.length,
  })
}
writeFileSync(join(outDir, "index.json"), JSON.stringify(index), "utf8")

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`
console.log(`\n${files} section files → ${index.reduce((s, e) => s + e.count, 0)} blocks in ${index.length} categories`)
console.log(`  corpus      ${mb(bytesIn)}`)
console.log(`  library     ${mb(bytesOut)}  (${Math.round((100 * bytesOut) / bytesIn)}% — the rest was the same stylesheet eleven times over)`)
console.log(`  photographs ${images} replaced with the placeholder`)
console.log(`  biggest     ${index.sort((a, b) => b.bytes - a.bytes).slice(0, 4).map((e) => `${e.slug} ${mb(e.bytes)}`).join(", ")}`)
console.log(`\nwritten to ${outDir}`)
