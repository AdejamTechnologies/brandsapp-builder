/**
 * HTML → Doc importer — the "reproduce any external design as data, no redeploy"
 * capability (spec §8). Dependency-free + Worker-safe: a small stack tokenizer
 * (no DOM/parse5) maps common tags to primitives and inline `style=""` to node
 * styles. Best-effort by design — it gives an editable starting Doc, not a
 * pixel-perfect clone.
 */

import { DEFAULT_BREAKPOINTS } from "./migrate"
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
  let counter = 0
  const nextId = () => `i${(counter++).toString(36)}`

  const walk = (el: El): string => {
    const module = TAG_MODULE[el.tag] ?? "box"
    const id = nextId()
    const props: Record<string, unknown> = {}
    const children: string[] = []
    const style = el.attrs.style ? parseStyleAttr(el.attrs.style) : undefined

    if (module === "heading") props.level = el.tag.replace("h", "")
    if (module === "image") {
      props.src = el.attrs.src ?? ""
      props.alt = el.attrs.alt ?? ""
    }
    if (module === "link" || module === "button") props.href = el.attrs.href ?? ""

    const text = el.children
      .filter((c): c is string => typeof c === "string")
      .join(" ")
      .trim()
    if (TEXTY.has(module) && text) {
      if (module === "button") props.label = text
      else props.text = text
    }
    for (const c of el.children) {
      if (typeof c !== "string") children.push(walk(c))
    }
    nodes[id] = { id, module, props, styleIds: [], children, ...(style ? { style } : {}) }
    return id
  }

  const rootId = nextId()
  const rootChildren = tokenize(html).map(walk)
  nodes[rootId] = { id: rootId, module: "page-root", props: {}, styleIds: [], children: rootChildren }

  return {
    version: CORE_DOC_VERSION,
    rootId,
    nodes,
    styles: {},
    theme: { colors: {}, fonts: {}, radius: {}, breakpoints: DEFAULT_BREAKPOINTS },
    meta: {},
  }
}
