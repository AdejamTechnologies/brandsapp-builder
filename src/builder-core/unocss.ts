/**
 * Render-time atomic CSS. Authors put Tailwind-style utility classes on nodes
 * (`node.classes`); the renderer collects the tokens actually used, and this
 * generates exactly the CSS for them — no build step, no JIT source scan. Runs in
 * the tenant Worker (SSR) and in the editor canvas, so both emit identical CSS. A
 * Fragment is self-contained: its buyer's renderer generates from the classes the
 * Fragment carries, so there's no shared-stylesheet assumption.
 */

import { createGenerator, type UnoGenerator } from "@unocss/core"
import presetWind3 from "@unocss/preset-wind3"

let genPromise: Promise<UnoGenerator> | null = null

function generator(): Promise<UnoGenerator> {
  // presetWind3 = Tailwind-v3-compatible utilities (flex, gap-4, rounded-xl, md:*).
  // Promise.resolve normalises createGenerator's sync-or-async return across versions.
  if (!genPromise) genPromise = Promise.resolve(createGenerator({ presets: [presetWind3()] }))
  return genPromise
}

/**
 * Generate CSS for a set of utility-class tokens (strings may hold several
 * space-separated classes). Returns "" when there are none. Preflight is off — the
 * page keeps its own base styles.
 */
export async function generateUtilityCss(tokens: Iterable<string>): Promise<string> {
  const set = new Set<string>()
  for (const t of tokens) {
    for (const c of String(t).split(/\s+/)) if (c) set.add(c)
  }
  if (set.size === 0) return ""
  const uno = await generator()
  const { css } = await uno.generate(set, { preflights: false })
  return css
}
