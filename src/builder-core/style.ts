/**
 * CSS generation for the builder renderer: theme tokens → CSS custom properties,
 * StyleRules + per-node style bags → scoped classes, breakpoint context →
 * @media blocks. Values are sanitized (block expression()/javascript:/selector
 * breakout) — shared by the renderer and (later) the editor.
 */

import { themeFontStacks } from "./fonts"
import type { Breakpoint, StyleRule, ThemeTokens } from "./schema"

function camelToKebab(prop: string): string {
  if (prop.startsWith("--")) return prop // CSS custom property, leave as-is
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

/** Block the handful of things that turn a CSS value into an injection vector. */
export function sanitiseCssValue(value: string): string {
  return String(value)
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/[<>]/g, "") // no tag/RAWTEXT breakout
    .replace(/[{}]/g, "") // no selector breakout
    .trim()
}

export function cssBagToString(bag: Record<string, string> | undefined): string {
  if (!bag) return ""
  return Object.entries(bag)
    .map(([prop, val]) => `${camelToKebab(prop)}:${sanitiseCssValue(val)}`)
    .join(";")
}

/** Media query for a breakpoint (max-width preferred; falls back to min-width). */
export function mediaQueryFor(bp: Breakpoint | undefined): string | null {
  if (!bp) return null
  if (bp.maxWidth != null) return `@media (max-width:${bp.maxWidth}px)`
  if (bp.minWidth != null) return `@media (min-width:${bp.minWidth}px)`
  return null
}

/** `.selector { base } @media { .selector { ctx } }` for one style source. */
export function ruleToCss(
  selector: string,
  base: Record<string, string> | undefined,
  context: Record<string, Record<string, string>> | undefined,
  breakpoints: Breakpoint[]
): string {
  let css = ""
  const baseStr = cssBagToString(base)
  if (baseStr) css += `${selector}{${baseStr}}`
  if (context) {
    const bpById = new Map(breakpoints.map((b) => [b.id, b]))
    for (const [ctxId, bag] of Object.entries(context)) {
      const decls = cssBagToString(bag)
      if (!decls) continue
      const mq = mediaQueryFor(bpById.get(ctxId))
      css += mq ? `${mq}{${selector}{${decls}}}` : `${selector}{${decls}}`
    }
  }
  return css
}

export function styleRuleToCss(rule: StyleRule, breakpoints: Breakpoint[]): string {
  return ruleToCss(`.s-${rule.id}`, rule.base, rule.context, breakpoints)
}

// daisyUI light-theme defaults (HSL triplets). Brand colors below override the
// primary/secondary/accent/neutral trio from the doc theme, so editing the theme
// recolours every daisyUI component (btn-primary, bg-primary, text-primary, …).
const DAISY_DEFAULTS: Record<string, string> = {
  "--pf": "259 94% 44%", "--sf": "314 100% 40%", "--af": "174 75% 39%", "--nf": "214 20% 14%",
  "--in": "198 93% 60%", "--su": "158 64% 52%", "--wa": "43 96% 56%", "--er": "0 91% 71%",
  "--inc": "198 100% 12%", "--suc": "158 100% 10%", "--wac": "43 100% 11%", "--erc": "0 100% 14%",
  "--rounded-box": "1rem", "--rounded-btn": "0.5rem", "--rounded-badge": "1.9rem",
  "--animation-btn": "0.25s", "--animation-input": ".2s", "--btn-text-case": "none",
  "--btn-focus-scale": "0.98", "--border-btn": "1px", "--tab-border": "1px", "--tab-radius": "0.5rem",
  "--p": "259 94% 51%", "--pc": "0 0% 100%", "--s": "314 100% 47%", "--sc": "0 0% 100%",
  "--a": "174 75% 46%", "--ac": "174 75% 11%", "--n": "214 20% 21%", "--nc": "212 19% 87%",
  "--b1": "0 0% 100%", "--b2": "0 0% 96%", "--b3": "180 2% 90%", "--bc": "215 28% 17%",
}

/** Parse a hex colour to an HSL triplet like "259 94% 51%" (daisyUI's format). */
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  let m = hex.trim().replace(/^#/, "")
  if (m.length === 3) m = m[0] + m[0] + m[1] + m[1] + m[2] + m[2]
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}
const triplet = (c: { h: number; s: number; l: number }) => `${c.h} ${c.s}% ${c.l}%`

/** WCAG relative luminance of a hex colour, 0 (black) to 1 (white). */
export function luminance(hex: string): number | null {
  let m = hex.trim().replace(/^#/, "")
  if (m.length === 3) m = m[0] + m[0] + m[1] + m[1] + m[2] + m[2]
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(m.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

/** Is this a dark ground? Surfaces have to sit ABOVE a dark page and BELOW a light one. */
export const isDarkHex = (hex: string | undefined): boolean => (hex ? (luminance(hex) ?? 1) < 0.2 : false)

/**
 * Fill --x, --xf (focus, darker), --xc (content, contrast) from a brand hex.
 *
 * The content colour used to be picked on HSL lightness alone, which reads a
 * saturated blue like #5b6cff as "light" (l = 68%) and puts near-black on it. It
 * measures as the higher contrast of the two, but only just, and it looks like a
 * mistake — a dark label on a vivid button. So: luminance, not lightness, and
 * black has to win CLEARLY before it is chosen. Anything on a genuinely light
 * surface (a yellow, a cream) still gets ink.
 */
function brand(vars: Record<string, string>, hex: string | undefined, base: string, focus: string, content: string) {
  const c = hex ? hexToHsl(hex) : null
  if (!c) return
  vars[base] = triplet(c)
  vars[focus] = triplet({ ...c, l: Math.max(0, c.l - 8) })
  const L = luminance(hex!) ?? 0
  const onWhite = 1.05 / (L + 0.05)
  const onBlack = (L + 0.05) / 0.05
  vars[content] = onBlack >= onWhite * 1.6 ? "0 0% 12%" : "0 0% 100%"
}

/** daisyUI theme vars derived from the doc theme (defaults + brand/base overrides). */
export function daisyThemeVars(theme: ThemeTokens): string[] {
  const vars: Record<string, string> = { ...DAISY_DEFAULTS }
  const c = theme.colors ?? {}
  brand(vars, c.primary, "--p", "--pf", "--pc")
  brand(vars, c.secondary, "--s", "--sf", "--sc")
  brand(vars, c.accent, "--a", "--af", "--ac")
  brand(vars, c.neutral, "--n", "--nf", "--nc")
  // Base palette (page bg / surface / border / text) — the neutral tokens content
  // references via bg-base-100/200/300, border-base-300, text-base-content.
  const setVar = (key: string, hex: string | undefined) => {
    const v = hex ? hexToHsl(hex) : null
    if (v) vars[key] = triplet(v)
  }
  setVar("--b1", c["base-100"])
  setVar("--b2", c["base-200"])
  setVar("--b3", c["base-300"])
  setVar("--bc", c["base-content"])
  return Object.entries(vars).map(([k, v]) => `${k}:${v}`)
}

/** Theme → CSS custom properties + base font + daisyUI theme, scoped to the root wrapper. */
export function themeToCss(theme: ThemeTokens, rootSelector: string): string {
  const vars: string[] = [...daisyThemeVars(theme)]
  for (const [name, val] of Object.entries(theme.colors ?? {})) {
    vars.push(`--color-${camelToKebab(name)}:${sanitiseCssValue(val)}`)
  }
  for (const [name, val] of Object.entries(theme.radius ?? {})) {
    vars.push(`--radius-${camelToKebab(name)}:${sanitiseCssValue(val)}`)
  }
  // Font tokens: resolve the display/body NAMES to full stacks, expose them as
  // vars (consumed by the font-display / font-body utilities), and default the
  // root to the body font. The host loads the webfaces (themeFontHref).
  const stacks = themeFontStacks(theme)
  vars.push(`--font-display:${sanitiseCssValue(stacks.display)}`)
  vars.push(`--font-body:${sanitiseCssValue(stacks.body)}`)
  vars.push(`font-family:${sanitiseCssValue(stacks.body)}`)
  const base = vars.length ? `${rootSelector}{${vars.join(";")}}` : ""
  return base + scaleToCss(theme, rootSelector)
}

/**
 * The COMPLETE scales, not a sample of them.
 *
 * These are the steps the utility generator is taught to express in terms of the
 * theme (see unocss.ts): every one is emitted as `calc(<step> * var(--bapp-…))`,
 * so a page re-proportions itself from the variables this file sets. Listing only
 * the steps our own templates happened to use meant a page written with any other
 * step silently ignored the theme — it still rendered, just unthemed.
 */
export const SPACE_STEPS = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48,
  52, 56, 60, 64, 72, 80, 96,
]
export const RADII: Array<[string, number]> = [
  ["sm", 0.125], ["", 0.25], ["md", 0.375], ["lg", 0.5],
  ["xl", 0.75], ["2xl", 1], ["3xl", 1.5], ["4xl", 2],
]
/**
 * Display sizes only — body steps (xs…lg) are deliberately absent, because
 * scaling body copy hurts legibility and is not a look. Leading is Tailwind's,
 * expressed as a ratio so it tracks the scaled size instead of fighting it.
 */
export const DISPLAY_TEXT: Array<[string, number, number]> = [
  ["xl", 1.25, 1.4], ["2xl", 1.5, 1.33], ["3xl", 1.875, 1.2], ["4xl", 2.25, 1.11],
  ["5xl", 3, 1], ["6xl", 3.75, 1], ["7xl", 4.5, 1], ["8xl", 6, 1], ["9xl", 8, 1],
]

/**
 * The scale, as three variables the utility generator already multiplies by.
 *
 * This used to restate every affected utility as a more specific override —
 * `.bapp-root .gap-7{…}` — which worked until a page used a responsive variant.
 * `md:gap-7` is one class, the override is two, so the override won at every
 * breakpoint and the page silently lost its responsive spacing. (That is not
 * hypothetical: it flattened the nav menu's `md:gap-7` to the mobile `gap-1`.)
 *
 * So the scale is no longer an override at all. `generateUtilityCss` emits every
 * spacing, radius and display-type utility as `calc(<step> * var(--bapp-…))`, and
 * all this has to do is set the variables — which means variants, arbitrary
 * breakpoints and anything else UnoCSS generates scale for free, and nothing is
 * fighting anything else in the cascade.
 *
 * A default theme still costs nothing: every variable defaults to 1 at the point
 * of use, so a scale of 1 emits no declaration.
 */
export function scaleToCss(theme: ThemeTokens, rootSelector: string): string {
  const s = theme.scale
  if (!s) return ""
  const out: string[] = []
  const vars: string[] = []
  const r = (n: number) => Math.round(n * 1000) / 1000

  if (s.density !== 1) vars.push(`--bapp-density:${r(s.density)}`)
  if (s.radius !== 1) vars.push(`--bapp-radius:${r(s.radius)}`)
  if (s.typeScale !== 1) vars.push(`--bapp-type:${r(s.typeScale)}`)
  if (s.motion !== 1) {
    // One variable damps every scroll-linked effect on the page at once — the
    // travel in anim.ts multiplies by it — so "calm" is a theme decision rather
    // than something an author re-tunes on each node.
    vars.push(`--bapp-motion:${r(s.motion)}`)
  }
  if (vars.length) out.push(`${rootSelector}{${vars.join(";")}}`)

  if (s.motion !== 1) {
    const d = s.motion === 0 ? "0.01ms" : `calc(var(--bapp-anim-duration, 600ms) * ${r(s.motion)})`
    out.push(`${rootSelector} [class*="n-"]{animation-duration:${d}}`)
    if (s.motion === 0) out.push(`${rootSelector} *{animation:none!important;transition:none!important}`)
  }

  return out.join("")
}

export const classForStyle = (id: string) => `s-${id}`
export const classForNode = (id: string) => `n-${id}`
