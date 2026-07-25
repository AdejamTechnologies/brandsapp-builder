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

// daisyUI components reference theme CSS vars. We generate with preflights OFF (so
// Tailwind's reset never touches page output), which also drops daisyUI's theme —
// so we prepend the light theme's vars ourselves, and ONLY when a daisyUI class is
// actually used (so pages that don't use daisyUI carry nothing extra). No global
// background/color rule, so it never overrides the page's own design.
const DAISY_THEME =
  ":root{--pf:259 94% 44%;--sf:314 100% 40%;--af:174 75% 39%;--nf:214 20% 14%;--in:198 93% 60%;--su:158 64% 52%;--wa:43 96% 56%;--er:0 91% 71%;--inc:198 100% 12%;--suc:158 100% 10%;--wac:43 100% 11%;--erc:0 100% 14%;--rounded-box:1rem;--rounded-btn:0.5rem;--rounded-badge:1.9rem;--animation-btn:0.25s;--animation-input:.2s;--btn-text-case:none;--btn-focus-scale:0.98;--border-btn:1px;--tab-border:1px;--tab-radius:0.5rem;--p:259 94% 51%;--pc:0 0% 100%;--s:314 100% 47%;--sc:0 0% 100%;--a:174 75% 46%;--ac:174 75% 11%;--n:214 20% 21%;--nc:212 19% 87%;--b1:0 0% 100%;--b2:0 0% 96%;--b3:180 2% 90%;--bc:215 28% 17%}"

/**
 * Generate CSS for a set of utility/component class tokens (strings may hold several
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
  return css.includes("daisy") ? DAISY_THEME + css : css
}
