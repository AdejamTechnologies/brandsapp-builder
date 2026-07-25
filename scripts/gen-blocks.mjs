/**
 * Generates src/lib/blocks-data.json from the MIT-licensed HyperUI + Meraki UI repos.
 * Clones them into a temp cache, walks their static component HTML, extracts the
 * <body> inner (dropping the demo doc/dark wrapper), prunes categories that don't
 * survive a static import (form widgets, charts, JS-only interactive), and skips any
 * remaining Alpine (x-data) block. Output is imported into the Sections library via
 * htmlToDoc. Interactive components ship as first-class primitives instead.
 *
 * Run:  node scripts/gen-blocks.mjs      See NOTICE.md for attribution.
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const cache = path.join(os.tmpdir(), "bapp-blocks-cache")
fs.mkdirSync(cache, { recursive: true })
const clone = (url, dir) => {
  const dest = path.join(cache, dir)
  if (!fs.existsSync(dest)) execSync(`git clone --depth 1 ${url} ${dest}`, { stdio: "inherit" })
  return dest
}
const hy = clone("https://github.com/markmead/hyperui.git", "hyperui")
const mk = clone("https://github.com/merakiui/merakiui.git", "meraki")

// Categories that don't import well statically (need real inputs, canvas, or JS).
const EXCLUDE = new Set([
  // HyperUI application
  "inputs", "checkboxes", "radio-groups", "textareas", "selects", "range-inputs",
  "quantity-inputs", "file-uploaders", "toggles", "charts", "dropdown", "modals",
  "side-menu", "vertical-menu", "skip-links", "dividers",
  // Meraki
  "dropdowns", "navbars", "tabs", "tooltip", "sidebar", "forms", "sign-in-and-registration", "contact",
])

const out = []
const bodyInner = (html) => {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  return (m ? m[1] : html).trim()
}
const push = (category, sub, name, raw) => {
  if (EXCLUDE.has(sub)) return
  let html = bodyInner(raw)
  if (/x-data|@click|x-show/.test(html)) return // remaining Alpine → skip (use primitives)
  if (html.length < 40) return
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  if (text.length < 3 && !/<img/i.test(html)) return
  out.push({ category, name, html })
}

for (const group of ["marketing", "application"]) {
  const gdir = path.join(hy, "public/examples", group)
  if (!fs.existsSync(gdir)) continue
  for (const sub of fs.readdirSync(gdir)) {
    const sdir = path.join(gdir, sub)
    if (!fs.statSync(sdir).isDirectory()) continue
    for (const f of fs.readdirSync(sdir)) {
      if (!f.endsWith(".html") || f.includes("-dark")) continue
      push(`HyperUI · ${group}/${sub}`, sub, `${sub} ${f.replace(".html", "")}`, fs.readFileSync(path.join(sdir, f), "utf8"))
    }
  }
}
const mkc = path.join(mk, "components")
for (const cat of fs.readdirSync(mkc)) {
  const cdir = path.join(mkc, cat)
  if (!fs.statSync(cdir).isDirectory()) continue
  for (const f of fs.readdirSync(cdir)) {
    if (!f.endsWith(".html")) continue
    push(`Meraki · ${cat}`, cat, f.replace(".html", "").replace(/([a-z])([A-Z])/g, "$1 $2"), fs.readFileSync(path.join(cdir, f), "utf8"))
  }
}

fs.writeFileSync(path.join(process.cwd(), "src/lib/blocks-data.json"), JSON.stringify(out))
console.log(`Wrote ${out.length} blocks`)
