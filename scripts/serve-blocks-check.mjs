/**
 * Fetch the library the way the browser will, from the built output.
 *
 * The path is the thing most likely to be wrong and least likely to be
 * noticed: a relative URL resolves against `/edit/:pageId`, the SPA fallback
 * answers the 404 with index.html, the fetch SUCCEEDS and the JSON parse is
 * what fails. So this serves `dist/client` and asks for the real URLs.
 */
import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { join, extname } from "node:path"

const root = join(import.meta.dirname, "..", "dist", "client")
const TYPES = { ".json": "application/json", ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname)
  try {
    const body = await readFile(join(root, path))
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" })
    res.end(body)
  } catch {
    // The SPA fallback, which is exactly what makes a wrong path look like it worked.
    res.writeHead(200, { "content-type": "text/html" })
    res.end(await readFile(join(root, "index.html")))
  }
})

await new Promise((r) => server.listen(0, r))
const port = server.address().port
const at = (p) => `http://127.0.0.1:${port}${p}`

let failed = 0
async function check(label, url, expect) {
  const res = await fetch(url)
  const text = await res.text()
  let ok = false
  let note = ""
  try {
    const json = JSON.parse(text)
    ok = expect(json)
    note = Array.isArray(json) ? `${json.length} rows` : "object"
  } catch {
    note = text.slice(0, 40).replace(/\n/g, " ")
  }
  if (!ok) failed++
  console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(34)} ${note}`)
}

console.log("\nserving dist/client, asking as the editor does:")
await check("/blocks/index.json", at("/blocks/index.json"), (j) => Array.isArray(j) && j.length === 21)
const index = await (await fetch(at("/blocks/index.json"))).json()
await check(`/blocks/${index[0].slug}.json`, at(`/blocks/${index[0].slug}.json`), (j) => Array.isArray(j) && j.length === index[0].count)
/**
 * And the mistake itself, expected to FAIL — so the difference is visible
 * rather than assumed. One failure here is the pass condition.
 */
await check("edit/…/blocks/index.json (relative)", at("/edit/demo/blocks/index.json"), (j) => Array.isArray(j))

server.close()
const ok = failed === 1
console.log(
  ok
    ? "\nthe absolute path works; the relative one falls through to index.html, which is why it is absolute\n"
    : `\n${failed} checks failed — expected exactly the deliberate one\n`
)
process.exit(ok ? 0 : 1)
