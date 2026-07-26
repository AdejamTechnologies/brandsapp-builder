/**
 * CSS generation for the builder renderer: theme tokens → CSS custom properties,
 * StyleRules + per-node style bags → scoped classes, breakpoint context →
 * @media blocks. Values are sanitized (block expression()/javascript:/selector
 * breakout) — shared by the renderer and (later) the editor.
 */

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

/** Fill --x, --xf (focus, darker), --xc (content, contrast) from a brand hex. */
function brand(vars: Record<string, string>, hex: string | undefined, base: string, focus: string, content: string) {
  const c = hex ? hexToHsl(hex) : null
  if (!c) return
  vars[base] = triplet(c)
  vars[focus] = triplet({ ...c, l: Math.max(0, c.l - 8) })
  vars[content] = c.l > 60 ? "0 0% 20%" : "0 0% 100%"
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
  if (theme.fonts?.body) vars.push(`font-family:${sanitiseCssValue(theme.fonts.body)}`)
  return vars.length ? `${rootSelector}{${vars.join(";")}}` : ""
}

export const classForStyle = (id: string) => `s-${id}`
export const classForNode = (id: string) => `n-${id}`
