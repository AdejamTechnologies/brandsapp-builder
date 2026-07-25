/**
 * Declarative CMS→tree binding resolution. A node prop can be overlaid from the
 * data context (the loop entry stack, or the page/site/route frames) by a dotted
 * field path. No JS eval — a fixed set of sources + a path walk, so it's safe for
 * marketplace trees and trivially AI-emittable.
 */

import type { PropBinding } from "./schema"

export interface DataContext {
  /** loop stack; top = current item, below = parent items. */
  entryStack: Array<Record<string, unknown>>
  page?: Record<string, unknown>
  site?: Record<string, unknown>
  route?: Record<string, unknown>
}

export const emptyDataContext = (): DataContext => ({ entryStack: [] })

function readFrame(source: PropBinding["source"], ctx: DataContext): Record<string, unknown> | undefined {
  switch (source) {
    case "item":
      return ctx.entryStack[ctx.entryStack.length - 1]
    case "parentItem":
      return ctx.entryStack[ctx.entryStack.length - 2]
    case "page":
      return ctx.page
    case "site":
      return ctx.site
    case "route":
      return ctx.route
  }
}

function walkPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj
  for (const key of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

/**
 * Resolve a binding to a value. Returns `undefined` when the field is missing and
 * fallback is not "static" (caller then decides to keep the static prop or blank).
 */
export function resolveBinding(binding: PropBinding, ctx: DataContext): unknown {
  const frame = readFrame(binding.source, ctx)
  if (!frame) return binding.fallback === "empty" ? "" : undefined
  const value = walkPath(frame, binding.field)
  if (value == null) return binding.fallback === "empty" ? "" : undefined
  return value
}

/** Overlay all of a node's bindings onto its static props. */
export function applyBindings(
  props: Record<string, unknown>,
  bindings: Record<string, PropBinding> | undefined,
  ctx: DataContext
): Record<string, unknown> {
  if (!bindings) return props
  const out = { ...props }
  for (const [key, binding] of Object.entries(bindings)) {
    const value = resolveBinding(binding, ctx)
    if (value !== undefined) out[key] = value // undefined ⇒ keep static fallback
  }
  return out
}
