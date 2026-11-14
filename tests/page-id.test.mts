/**
 * A page id goes into a url with the fleet's builder token attached.
 *
 * `${c.req.param("id")}` went in raw. A decoded `%2F` turns one path segment
 * into two and addresses a different endpoint on the tenant — this is the
 * same shape as the `?tenant=` hole that used to post BUILDER_SERVICE_TOKEN
 * to whatever host the query string named.
 *
 * Run: tsx tests/page-id.test.mts
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, "../worker/index.ts"), "utf8")

let passed = 0
function test(name: string, fn: () => void) {
  fn()
  passed++
  console.log(`  ✓ ${name}`)
}

console.log("the page id in a proxied url")

test("every proxy route validates and encodes it", () => {
  // Three routes take :id — load, save, publish.
  assert.equal((src.match(/const id = pageId\(c\)/g) ?? []).length, 3)
  assert.equal((src.match(/if \(!id\) return c\.json/g) ?? []).length, 3)
  // And none of them interpolates the raw param any more.
  assert.ok(
    !/builder\/pages\/\$\{c\.req\.param\("id"\)\}/.test(src),
    "a route still puts the raw id into the url"
  )
})

test("the shape is stated, not escaped into looking safe", () => {
  const m = /const PAGE_ID_RE = (\/.*\/)\n/.exec(src)
  assert.ok(m, "no id pattern")
  const re = new RegExp(m![1]!.slice(1, -1))
  for (const good of ["abc", "a-b_c", "0123456789abcdef"]) assert.ok(re.test(good), good)
  for (const bad of ["", "a/b", "a%2Fb", "../x", "a b", "a.b"]) assert.ok(!re.test(bad), bad)
})

console.log(`\n${passed} passed`)
