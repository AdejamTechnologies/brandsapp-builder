/**
 * Generates src/lib/blocks-data.json from the MIT-licensed HyperUI + Meraki UI repos.
 * Clones them into a temp cache, walks their static component HTML, and emits
 * {category, name, html} entries — imported into the Sections library via htmlToDoc.
 *
 * Run:  node scripts/gen-blocks.mjs
 * See NOTICE.md for attribution. This is a generated artifact — edit sources, not JSON.
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

const out = []
const push = (category, name, html) => {
  html = html.trim()
  if (html.length < 30) return
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  if (text.length < 3 && !/<img/i.test(html)) return
  out.push({ category, name, html })
}

// HyperUI — marketing + application, light variants only
for (const group of ["marketing", "application"]) {
  const gdir = path.join(hy, "public/examples", group)
  if (!fs.existsSync(gdir)) continue
  for (const sub of fs.readdirSync(gdir)) {
    const sdir = path.join(gdir, sub)
    if (!fs.statSync(sdir).isDirectory()) continue
    for (const f of fs.readdirSync(sdir)) {
      if (!f.endsWith(".html") || f.includes("-dark")) continue
      push(`HyperUI · ${group}/${sub}`, `${sub} ${f.replace(".html", "")}`, fs.readFileSync(path.join(sdir, f), "utf8"))
    }
  }
}
// Meraki — all component categories
const mkc = path.join(mk, "components")
for (const cat of fs.readdirSync(mkc)) {
  const cdir = path.join(mkc, cat)
  if (!fs.statSync(cdir).isDirectory()) continue
  for (const f of fs.readdirSync(cdir)) {
    if (!f.endsWith(".html")) continue
    push(`Meraki · ${cat}`, f.replace(".html", "").replace(/([a-z])([A-Z])/g, "$1 $2"), fs.readFileSync(path.join(cdir, f), "utf8"))
  }
}

fs.writeFileSync(path.join(process.cwd(), "src/lib/blocks-data.json"), JSON.stringify(out))
console.log(`Wrote ${out.length} blocks to src/lib/blocks-data.json`)
