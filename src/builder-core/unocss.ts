/**
 * Render-time atomic CSS. Authors put Tailwind-style utility classes AND daisyUI
 * component classes (`btn`, `card`, `badge`, `alert`, `stats`, …) on nodes; the
 * renderer collects the tokens used, and this generates exactly the CSS for them —
 * no build step, no JIT source scan. Runs in the tenant Worker (SSR) and the editor
 * canvas, so both emit identical CSS. A Fragment is self-contained: its buyer's
 * renderer generates from the classes the Fragment carries.
 */

import { createGenerator, type UnoGenerator } from "@unocss/core"
import presetWind3 from "@unocss/preset-wind3"
import { presetDaisy } from "unocss-preset-daisy"

let genPromise: Promise<UnoGenerator> | null = null

function generator(): Promise<UnoGenerator> {
  // presetWind3 = Tailwind-v3-compatible utilities; presetDaisy = daisyUI component
  // classes. Promise.resolve normalises createGenerator's sync-or-async return.
  if (!genPromise) {
    genPromise = Promise.resolve(createGenerator({ presets: [presetWind3(), presetDaisy()] }))
  }
  return genPromise
}

/**
 * Generate CSS for a set of utility/component class tokens (strings may hold several
 * space-separated classes). Returns "" when there are none. Preflight is off — the
 * page keeps its own base styles. daisyUI's theme vars are emitted by the renderer
 * (scoped to `.bapp-root`, derived from the doc theme), so component rules here just
 * reference them.
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
