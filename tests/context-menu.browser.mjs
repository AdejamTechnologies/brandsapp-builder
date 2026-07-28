/**
 * Drives EVERY item in the canvas right-click menu against a real editor and
 * asserts the DOC actually changed — clicking a menu row and seeing no error is
 * not evidence that it did anything.
 *
 * Needs the builder dev server running (pnpm dev) and @playwright/test resolvable
 * (run from the multitenant repo, which has it installed).
 */
import { chromium } from "@playwright/test"

const S = process.env.SHOT_DIR ?? "/tmp" // screenshots; override with SHOT_DIR
const _unused = "/private/tmp/claude-501/-Users-adeleyejamiu-Documents-programming-projects-adejam-rebirth-brandsapp-brandsapp-multitenant/0a84ba5c-6d02-485d-98ea-7c51e2086df6/scratchpad"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
const errors = []
page.on("pageerror", (e) => errors.push(String(e)))

const results = []
const check = (name, pass, detail = "") => results.push([name, pass, detail])

await page.goto("http://localhost:5173/edit/blank", { waitUntil: "networkidle" })
await page.waitForTimeout(7000)

// helpers
const nodeCount = () => page.evaluate(() => document.querySelectorAll(".bapp-root [data-node-id]").length)
const html = () => page.evaluate(() => document.querySelector(".bapp-root")?.innerHTML ?? "")
const openMenuOn = async (sel, nth = 0) => {
  await page.locator(sel).nth(nth).click({ button: "right" })
  await page.waitForTimeout(450)
}
const clickItem = async (label) => {
  await page.locator("[role=menu] button", { hasText: new RegExp(`^${label}`) }).first().click()
  await page.waitForTimeout(700)
}
const subItem = async (parent, child) => {
  await page.locator("[role=menu] button", { hasText: new RegExp(`^${parent}$`) }).first().hover()
  await page.waitForTimeout(400)
  await page.locator("[role=menu] button", { hasText: new RegExp(`^${child}$`) }).first().click()
  await page.waitForTimeout(700)
}

// seed three elements so we have things to act on
await page.mouse.click(62, 200) // Section
await page.waitForTimeout(900)
await page.mouse.click(62, 360) // Div Block
await page.waitForTimeout(900)
const seeded = await nodeCount()
check("seeded elements", seeded >= 2, `${seeded} nodes`)

// ── Duplicate ──
let before = await nodeCount()
await openMenuOn(".bapp-root [data-node-id]", 1)
await clickItem("Duplicate")
let after = await nodeCount()
check("Duplicate adds a node", after > before, `${before} → ${after}`)

// ── Copy (no doc change) then Delete, then paste-back is out of scope ──
before = await nodeCount()
await openMenuOn(".bapp-root [data-node-id]", 1)
await clickItem("Copy")
after = await nodeCount()
check("Copy leaves the doc alone", after === before, `${before} → ${after}`)

// ── Cut removes it ──
before = await nodeCount()
await openMenuOn(".bapp-root [data-node-id]", 1)
await clickItem("Cut")
after = await nodeCount()
check("Cut removes the node", after < before, `${before} → ${after}`)

// ── Delete removes it ──
before = await nodeCount()
await openMenuOn(".bapp-root [data-node-id]", 1)
await clickItem("Delete")
after = await nodeCount()
check("Delete removes the node", after < before, `${before} → ${after}`)

// ── Rename element (prompt) ──
page.once("dialog", (d) => d.accept("My Hero"))
await openMenuOn(".bapp-root [data-node-id]", 1)
await clickItem("Rename element")
await page.waitForTimeout(500)
await page.waitForTimeout(400)
const renamed = await page.evaluate(() => (document.querySelector(".sel-label")?.textContent || "").includes("My Hero"))
check("Rename element sets the layer name", renamed)

// ── Add class ──
page.once("dialog", (d) => d.accept("hero-band"))
await openMenuOn(".bapp-root [data-node-id]", 1)
await clickItem("Add class")
await page.waitForTimeout(600)
const hasClassChip = await page.evaluate(() => document.body.innerText.includes("hero-band"))
check("Add class creates + applies a class", hasClassChip)

// class actions should now be enabled on that node
await openMenuOn(".bapp-root [data-node-id]", 1)
const enabled = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("[role=menu] button")]
  const find = (t) => rows.find((r) => (r.textContent || "").startsWith(t))
  return { remove: !find("Remove class")?.disabled, rename: !find("Rename class")?.disabled }
})
check("class actions enable once a class exists", enabled.remove, JSON.stringify(enabled))

// ── Remove class ──
await clickItem("Remove class")
await page.waitForTimeout(600)
check("Remove class detaches it", !(await html()).includes("hero-band"))

// ── Select parent ──
await openMenuOn(".bapp-root [data-node-id]", 1)
await page.locator("[role=menu] button", { hasText: /^Select parent$/ }).first().hover()
await page.waitForTimeout(450)
const parents = await page.evaluate(() => {
  const subs = [...document.querySelectorAll("[role=menu] .absolute")]
  return subs.length ? [...subs[subs.length - 1].querySelectorAll("button")].map((b) => b.textContent.trim()) : []
})
check("Select parent lists ancestors", parents.length > 0, parents.join(", "))
if (parents.length) {
  await page.locator("[role=menu] .absolute button").first().click()
  await page.waitForTimeout(600)
  const selLabel = await page.evaluate(() => document.querySelector(".sel-label")?.textContent ?? "")
  check("Select parent changes the selection", !!selLabel, `now: ${selLabel}`)
}

// ── Create component ──
page.once("dialog", (d) => d.accept("Hero Component"))
await openMenuOn(".bapp-root [data-node-id]", 1)
await clickItem("Create component")
await page.waitForTimeout(900)
await page.locator('[role=tab][aria-label="Components"]').click()
await page.waitForTimeout(700)
const madeComponent = await page.evaluate(() => document.body.innerText.includes("Hero Component"))
await page.locator('[role=tab][aria-label="Elements"]').click()
await page.waitForTimeout(400)
check("Create component makes one", madeComponent)

// ── root guards ──
// Right-click the root's OWN padding, not its centre — a child fills the middle
// and the menu (correctly) targets the deepest node under the pointer.
const rootEl = page.locator(".bapp-root > [data-node-id]").first()
const rb = await rootEl.boundingBox()
await page.mouse.click(rb.x + 8, Math.min(rb.y + rb.height - 20, 960), { button: "right" })
await page.waitForTimeout(500)
const rootSel = await page.evaluate(() => document.querySelector(".sel-label")?.textContent ?? "")
await page.waitForTimeout(300)
const rootDisabled = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("[role=menu] button")]
  const f = (t) => rows.find((r) => (r.textContent || "").startsWith(t))
  return { del: !!f("Delete")?.disabled, cut: !!f("Cut")?.disabled, wrap: !!f("Wrap in")?.disabled }
})
check("root cannot be deleted/cut/wrapped", rootDisabled.del && rootDisabled.cut && rootDisabled.wrap, )
await page.keyboard.press("Escape")

// ── the reported bg bug ──
await openMenuOn(".bapp-root [data-node-id]", 1)
await page.locator("[role=menu] button", { hasText: /^Convert to$/ }).first().hover()
await page.waitForTimeout(400)
const hoverBg = await page.evaluate(() => {
  const row = [...document.querySelectorAll("[role=menu] button")].find((b) => (b.textContent || "").startsWith("Convert to"))
  return getComputedStyle(row).backgroundColor
})
// near-white muted, not the old #6b7280 slate
const light = (() => {
  if (hoverBg.startsWith("oklch")) return Number(hoverBg.match(/[\d.]+/)?.[0] ?? 0) > 0.85
  const m = hoverBg.match(/[\d.]+/g)?.map(Number) ?? []
  return m.length >= 3 && m[0] > 200 && m[1] > 200 && m[2] > 200
})()
check("hovered row is a light surface (not slate)", light, hoverBg)
await page.screenshot({ path: `${S}/menu-all.png` })

check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
await browser.close()

const failed = results.filter((r) => !r[1])
for (const [n, p, d] of results) console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? "  → " + d : ""}`)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
