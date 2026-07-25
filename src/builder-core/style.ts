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

/** Theme → CSS custom properties + base font, scoped to the root wrapper. */
export function themeToCss(theme: ThemeTokens, rootSelector: string): string {
  const vars: string[] = []
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
