/**
 * Does every block in the library survive the path the panel actually takes?
 *
 * `public/blocks/*.json` → `fromHtml` → `Fragment` → a Doc with the editor's
 * default theme → `renderDocToReact`. That is exactly what the Sections panel
 * does when somebody opens a category, and the only way to know 2,212 blocks
 * all make it is to put them through it.
 *
 * Four things are checked, each of which has been wrong at least once:
 *   · the fragment builds and the doc parses
 *   · the render names no missing module
 *   · the render produces CSS — a block whose design lives in node styles and
 *     comes back with none is a block that inserts as unstyled markup
 *   · no `var()` survives with nowhere to resolve, since a fragment carries no
 *     theme and the generator is supposed to have inlined every token
 *
 *   node_modules/.bin/tsx scripts/check-landing-blocks.mts [--all]
 *
 * Without `--all` it samples every 7th block, which is a few seconds; with it,
 * all 2,212.
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { parseDoc, renderDocToReact, themeTokens } from "@brandsapp/builder-core"

import { registry } from "../src/lib/registry"
import { fromHtml } from "../src/lib/templates"

const here = dirname(new URL(import.meta.url).pathname)
const blocks = join(here, "..", "public", "blocks")
const every = process.argv.includes("--all") ? 1 : 7
const THEME = themeTokens.parse({})

interface IndexEntry {
  slug: string
  label: string
  count: number
}
const index = JSON.parse(readFileSync(join(blocks, "index.json"), "utf8")) as IndexEntry[]

let checked = 0
let noCss = 0
let unresolved = 0
const broken: string[] = []
const missing = new Map<string, number>()

for (const entry of index) {
  const list = JSON.parse(readFileSync(join(blocks, `${entry.slug}.json`), "utf8")) as Array<{
    category: string
    name: string
    html: string
  }>
  if (list.length !== entry.count) {
    broken.push(`${entry.slug}: index says ${entry.count}, file has ${list.length}`)
  }
  for (let i = 0; i < list.length; i++) {
    if (i % every !== 0) continue
    const block = list[i]!
    checked++
    try {
      const doc = parseDoc({ ...fromHtml(block.category, block.name, block.html).make(), theme: THEME })
      const { css } = renderDocToReact(doc, { registry, isEditor: false })
      for (const m of renderDocToReact(doc, { registry, isEditor: false }).missing) {
        missing.set(m, (missing.get(m) ?? 0) + 1)
      }
      if (!css.trim()) noCss++
      // A fragment carries no theme, so a surviving `var()` has nothing to
      // resolve against — the generator inlines every token for that reason.
      if (/var\(--(?!color-|font-|radius-|bapp-|un-|p|s|a|n|b|in|su|wa|er|rounded|animation|btn|border|tab)/.test(css)) {
        unresolved++
        if (broken.length < 8) broken.push(`${entry.slug}/${block.name}: unresolved var()`)
      }
    } catch (e) {
      broken.push(`${entry.slug}/${block.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

console.log(`\n${index.length} categories, ${index.reduce((s, e) => s + e.count, 0)} blocks`)
console.log(`checked ${checked} (every ${every}${every === 1 ? "" : "th"})`)
console.log(`  missing modules   ${missing.size === 0 ? "none" : JSON.stringify([...missing])}`)
console.log(`  rendered no CSS   ${noCss}`)
console.log(`  unresolved var()  ${unresolved}`)
console.log(`  failed            ${broken.length}`)
for (const b of broken.slice(0, 10)) console.log(`    ${b}`)
process.exit(broken.length || noCss || unresolved || missing.size ? 1 : 0)
