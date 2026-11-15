/**
 * Rich HTML, made safe to put in a page. The ONLY implementation.
 *
 * It lived in lib/blog, where it was written for articles that contributors —
 * strangers who applied through the public author portal — can save. Three
 * other places had their own: builder-core's `sanitizeHtml` for `richtext`
 * props, the storefront's product description helper, and a near-copy beside
 * it. All three were BLOCK-lists: a list of tags and a regex for ` on…=`.
 *
 * A block-list of this kind does not work, and these did not. Running the
 * four regexes as written:
 *
 *   <img src=x/onerror=alert(1)>              unchanged — the pattern needs
 *                                             whitespace before `on`
 *   <scr<script>ipt src=//x></scr<script>ipt> came out as a WORKING
 *                                             <script src=//x></script>
 *   href=" javascript:…"                      survived (leading space)
 *   href="&#106;avascript:…"                  survived (entity)
 *
 * And designs are authored by partners, applied by brands, and rendered on
 * pages that share an origin with the brand's own admin console.
 *
 * So there is one sanitiser, it is an ALLOW-list, and it lives in builder-core
 * because builder-core is the thing that renders authored documents and is
 * vendored into the other repos. Tags and attributes not named here are
 * dropped; script, style, iframe, svg and friends lose their contents too;
 * urls must be http, https, mailto, tel or relative, checked after decoding
 * entities and stripping the control characters a browser ignores.
 *
 * Deliberately dependency-free — it runs in a Worker and in a browser — and
 * deliberately a tokeniser rather than a DOM parse, for the same reason.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "del", "ins", "mark", "sub", "sup", "small",
  "ul", "ol", "li", "blockquote", "pre", "code", "kbd",
  "a", "img", "figure", "figcaption",
  /**
   * Semantic containers, added when this became everybody's sanitiser.
   *
   * It was written for article bodies, where a tag outside the list simply
   * lost its wrapper and kept its text — fine for a blog post. It now also
   * cleans rich text a brand typed into admin (course and job descriptions,
   * product copy) and `richtext` props inside authored designs, which do use
   * these. None of them carries a script surface; they are boxes.
   */
  "section", "article", "header", "footer", "aside", "main",
  "dl", "dt", "dd", "abbr", "cite", "q", "time",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  "div", "span", "details", "summary",
])

const VOID_TAGS = new Set(["br", "hr", "img", "col"])

/** Elements whose CONTENT is dropped with them, not just the tag. */
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template",
  "svg", "math", "form", "textarea", "select", "option", "button", "title",
  "head", "meta", "link", "base", "frame", "frameset", "applet",
])

const GLOBAL_ATTRS = new Set(["title", "lang", "dir"])
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan", "align"]),
  th: new Set(["colspan", "rowspan", "align", "scope"]),
  col: new Set(["span"]),
  ol: new Set(["start", "type"]),
  li: new Set(["value"]),
  code: new Set(["class"]),
  pre: new Set(["class"]),
}

const escapeText = (s: string) =>
  s.replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&colon;/gi, ":")
    .replace(/&newline;/gi, "\n")
    .replace(/&tab;/gi, "\t")
}

/** http(s), mailto, tel or a relative address — nothing that can run script. */
export function isSafeUrl(raw: string, { allowMailto = true } = {}): boolean {
  // Browsers strip control characters and whitespace from inside a scheme, and
  // decode entities first, so the check has to see what the browser will.
  const url = decodeEntities(raw).replace(/[\u0000- \u007f-\u009f]/g, "")
  if (url === "") return false
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)
  if (!scheme) return true // relative or protocol-relative: same-site or https
  const s = scheme[1]!.toLowerCase()
  if (s === "http" || s === "https") return true
  return allowMailto && (s === "mailto" || s === "tel")
}

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g
const ATTR_RE = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return ""
  // Comments and CDATA can smuggle markup past a tokenizer; they carry nothing
  // a reader needs.
  let html = input.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
  html = html.replace(/<![^>]*>/g, "").replace(/<\?[\s\S]*?\?>/g, "")

  let out = ""
  let last = 0
  const stack: string[] = []
  let skipUntil: string | null = null

  TAG_RE.lastIndex = 0
  for (let m = TAG_RE.exec(html); m; m = TAG_RE.exec(html)) {
    const text = html.slice(last, m.index)
    last = m.index + m[0].length
    const closing = m[1] === "/"
    const tag = m[2]!.toLowerCase()

    if (skipUntil) {
      if (closing && tag === skipUntil) skipUntil = null
      continue
    }
    if (text) out += escapeText(text)

    if (!closing && DROP_WITH_CONTENT.has(tag)) {
      if (!m[4] && !VOID_TAGS.has(tag)) skipUntil = tag
      continue
    }
    if (!ALLOWED_TAGS.has(tag)) continue // unknown tag: drop the tag, keep its text

    if (closing) {
      const at = stack.lastIndexOf(tag)
      if (at === -1) continue
      // Close anything left open inside it so nesting stays well formed.
      while (stack.length > at) out += `</${stack.pop()}>`
      continue
    }

    const allowed = TAG_ATTRS[tag]
    let attrs = ""
    let href: string | null = null
    ATTR_RE.lastIndex = 0
    for (let a = ATTR_RE.exec(m[3] ?? ""); a; a = ATTR_RE.exec(m[3] ?? "")) {
      const name = a[1]!.toLowerCase()
      if (name.startsWith("on")) continue
      if (!GLOBAL_ATTRS.has(name) && !allowed?.has(name)) continue
      const value = decodeEntities(a[2] ?? a[3] ?? a[4] ?? "")
      if (name === "href") {
        if (!isSafeUrl(value)) continue
        href = value
      }
      if (name === "src" && !isSafeUrl(value, { allowMailto: false })) continue
      if (name === "target" && value !== "_blank" && value !== "_self") continue
      /**
       * `class` is allowed on `pre` and `code` for ONE reason — the
       * `language-xyz` hint a highlighter reads — and it used to accept any
       * value at all.
       *
       * The page's own utility classes are in scope for authored content, so
       * a class list was a style injection: `class="fixed inset-0 z-50 bg-black"`
       * on a `<pre>` inside a blog comment or an imported page is a
       * full-screen overlay covering the brand's own site, with no script
       * involved and nothing for the tag allow-list to catch. It is the same
       * shape as the attribute allow-list itself — permitted by name, with the
       * value unexamined.
       *
       * One or more `language-*` / `lang-*` tokens, nothing else.
       */
      if (name === "class" && !/^(?:(?:language|lang)-[\w+#.-]+\s*)+$/i.test(value))
        continue
      attrs += ` ${name}="${escapeAttr(value)}"`
    }
    if (tag === "a" && href !== null && / target="_blank"/.test(attrs)) {
      attrs = attrs.replace(/ rel="[^"]*"/, "") + ' rel="noopener noreferrer"'
    }
    if (tag === "img" && !/ src="/.test(attrs)) continue

    if (VOID_TAGS.has(tag)) out += `<${tag}${attrs}>`
    else {
      out += `<${tag}${attrs}>`
      if (!m[4]) stack.push(tag)
      else out += `</${tag}>`
    }
  }
  if (!skipUntil) {
    const tail = html.slice(last)
    if (tail) out += escapeText(tail)
  }
  while (stack.length) out += `</${stack.pop()}>`
  return out
}
