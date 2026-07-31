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

import { DISPLAY_TEXT, RADII, SPACE_STEPS } from "./style"

/**
 * The theme scale, folded into the utilities themselves.
 *
 * Every spacing step, corner and display size is emitted as a multiple of a
 * variable the document root sets (see scaleToCss). Doing it here rather than as
 * a later override is what makes `md:gap-7` scale like `gap-7` — they are the
 * same generated declaration, so there is no cascade fight to lose.
 *
 * The variables default to 1 at the point of use, so a document with no scale
 * gets exactly Tailwind's values.
 */
const spacing: Record<string, string> = {}
for (const step of SPACE_STEPS) spacing[String(step)] = `calc(${step / 4}rem * var(--bapp-density, 1))`

const borderRadius: Record<string, string> = { full: "calc(9999px * var(--bapp-radius, 1))" }
for (const [name, rem] of RADII) borderRadius[name || "DEFAULT"] = `calc(${rem}rem * var(--bapp-radius, 1))`

const fontSize: Record<string, [string, string]> = {}
for (const [name, rem, leading] of DISPLAY_TEXT) fontSize[name] = [`calc(${rem}rem * var(--bapp-type, 1))`, String(leading)]

let genPromise: Promise<UnoGenerator> | null = null

function generator(): Promise<UnoGenerator> {
  // presetWind3 = Tailwind-v3-compatible utilities; presetDaisy = daisyUI component
  // classes. Promise.resolve normalises createGenerator's sync-or-async return.
  if (!genPromise) {
    genPromise = Promise.resolve(
      createGenerator({
        presets: [presetWind3(), presetDaisy()],
        // Theme font tokens: extend the font-family theme so `font-display` /
        // `font-body` resolve to the vars themeToCss emits (sans/serif/mono kept).
        theme: {
          fontFamily: { display: "var(--font-display)", body: "var(--font-body)" },
          spacing,
          borderRadius,
          fontSize,
        },
      })
    )
  }
  return genPromise
}

/**
 * The base rules a Tailwind-shaped document assumes exist.
 *
 * UnoCSS's own preflight is off, and stays off: it is a global reset that would
 * reach past `.bapp-root` and restyle the tenant's own chrome and the editor UI.
 * But the utilities themselves were designed on top of a reset, and leaving it out
 * entirely is not neutral — without `box-sizing: border-box`, `w-full px-6` is
 * 100% PLUS twelve rem of padding, so every padded full-width band overflows its
 * parent and the whole page scrolls sideways. That is the bug this fixes.
 *
 * Every selector is wrapped in `:where()`, which zeroes its specificity, so any
 * authored utility class still wins — the same contract Tailwind's preflight has.
 * Written to work both scoped (`@scope (.bapp-root)`, the editor canvas) and flat
 * in a global stylesheet (the published tenant page).
 *
 * List markers are deliberately left alone: rich text relies on them, and imported
 * markup that needs them off carries its own reset (see import-html).
 */
export const BUILDER_RESET = [
  ":where(.bapp-root,.bapp-root *,.bapp-root *::before,.bapp-root *::after){box-sizing:border-box}",
  ":where(.bapp-root) :where(h1,h2,h3,h4,h5,h6,p,figure,blockquote,dl,dd,pre){margin:0}",
  ":where(.bapp-root) :where(img,svg,video,canvas,audio,iframe,embed,object){display:block;vertical-align:middle}",
  ":where(.bapp-root) :where(img,video){max-width:100%;height:auto}",
  ":where(.bapp-root) :where(a){color:inherit;text-decoration:inherit}",
  ":where(.bapp-root) :where(button,input,optgroup,select,textarea){font:inherit;color:inherit;margin:0}",
  ":where(.bapp-root) :where(button,[type=button],[type=submit]){background:none;border:0;cursor:pointer}",
  ":where(.bapp-root) :where(hr){height:0;color:inherit;border-top-width:1px}",
  ":where(.bapp-root) :where(table){border-collapse:collapse}",
].join("")

/**
 * Generate CSS for a set of utility/component class tokens (strings may hold several
 * space-separated classes). daisyUI's theme vars are emitted by the renderer (scoped
 * to `.bapp-root`, derived from the doc theme), so component rules here just
 * reference them. The base reset above always leads, tokens or not.
 */
export async function generateUtilityCss(tokens: Iterable<string>): Promise<string> {
  const set = new Set<string>()
  for (const t of tokens) {
    for (const c of String(t).split(/\s+/)) if (c) set.add(c)
  }
  if (set.size === 0) return BUILDER_RESET
  const uno = await generator()
  const { css } = await uno.generate(set, { preflights: false })
  return BUILDER_RESET + css
}
