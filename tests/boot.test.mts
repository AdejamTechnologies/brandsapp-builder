/**
 * The builder loads.
 *
 * Every route in this app is imported STATICALLY by `src/router.tsx`, so a
 * single module that throws while it is evaluating takes the whole builder
 * down — not the screen that module belongs to, the whole thing. The author
 * gets a blank page and one line in a console they are not reading.
 *
 * That is not hypothetical. The Template dialog built its blank manifest with
 * `templateManifest.parse({ id: "", name: "" })` at module scope, and both of
 * those fields are `min(1)`. Every screen of the builder was gone, for a
 * constant nobody had looked at since the day it was written, and the only
 * symptom was `Uncaught ZodError` in the console.
 *
 * No error boundary can catch this: the throw happens before React renders.
 * So the check is here instead — import the router, which pulls in every route
 * and everything they import, and fail if any module body throws.
 *
 * It runs in node rather than a browser, which means it cannot catch a module
 * that throws only because `window` is missing — those are skipped by the
 * stubs below rather than reported, since the real browser has them. What it
 * catches is logic that was always wrong: a parse of an invalid literal, a
 * constant built from one that is not there yet, a cycle resolved to
 * undefined.
 *
 * Run: npx tsx tests/boot.test.mts
 */

import assert from "node:assert/strict";

// Enough of a browser that a module touching these at load does not fail for
// a reason that would never happen in the product. Anything beyond this is a
// module doing too much at import time and is worth failing on.
const g = globalThis as Record<string, unknown>;
g.window ??= globalThis;
// Stubbing `document` is what puts the router in its browser branch, and that
// branch stores itself on `self`. Both or neither.
g.self ??= globalThis;
g.document ??= {
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  documentElement: { style: {} },
  head: { appendChild() {} },
  body: { appendChild() {} },
  addEventListener() {},
  querySelector: () => null,
};
g.navigator ??= { userAgent: "node" };
g.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

await test("every route module evaluates without throwing", async () => {
  const mod = await import("../src/router.tsx");
  assert.ok(mod.router, "router.tsx evaluated but exported no router");
});

await test("a blank template manifest can be built", async () => {
  // The exact constant that was fatal, asserted directly so a failure says
  // what broke instead of pointing at the router.
  const { emptyTemplateManifest } = await import("../src/builder-core/index.ts");
  const blank = emptyTemplateManifest();
  assert.equal(blank.id, "");
  assert.equal(blank.name, "");
});

console.log(`\nboot: ${passed} passed`);
