/**
 * One-shot rewrite of src/lib/blocks-data.json: remaps hardcoded Tailwind
 * palette classes (gray/slate/zinc/white/black + indigo/blue/violet/purple/sky
 * accents) in every block's `html` to daisyUI semantic design tokens, using
 * the shared mapping in scripts/token-map.mjs.
 *
 * Run:  node scripts/tokenize-blocks.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { tokenizeClasses } from "./token-map.mjs"

const file = path.join(process.cwd(), "src/lib/blocks-data.json")
const blocks = JSON.parse(fs.readFileSync(file, "utf8"))

let changed = 0
for (const block of blocks) {
  const next = tokenizeClasses(block.html)
  if (next !== block.html) changed++
  block.html = next
}

fs.writeFileSync(file, JSON.stringify(blocks, null, 2) + "\n")
console.log(`Tokenized ${changed}/${blocks.length} blocks -> ${file}`)
