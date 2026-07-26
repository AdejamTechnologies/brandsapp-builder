import { createElement } from "react"

import { ModuleRegistry, type ModuleDefinition, type ModuleRenderProps } from "../registry"
import { FORM_MODULES } from "./forms"
import { INTERACTIVE_MODULES } from "./interactive"
import { PRIMITIVES } from "./primitives"

/**
 * `loop` is special-cased by the renderer (it iterates a source and re-renders its
 * children per item), so this Component is only a fallback / editor placeholder.
 */
const Loop: ModuleDefinition = {
  name: "loop",
  category: "data",
  schema: { source: { type: "plain" }, tag: { type: "plain" } },
  defaults: { source: "" },
  contentModel: { children: "any" },
  dynamic: true,
  Component: ({ className, children }: ModuleRenderProps) =>
    createElement("div", { className }, children),
}

/**
 * `instance` is special-cased by the renderer (it inlines a linked component's
 * master subtree), so this Component is only a fallback / editor placeholder.
 */
const Instance: ModuleDefinition = {
  name: "instance",
  category: "component",
  schema: { component: { type: "plain" } },
  defaults: { component: "" },
  contentModel: { children: "none" },
  dynamic: true,
  Component: ({ className, children }: ModuleRenderProps) =>
    createElement("div", { className }, children),
}

/** A registry with the built-in primitives + interactive modules + loop. Apps extend this. */
export function createDefaultRegistry(): ModuleRegistry {
  return new ModuleRegistry().registerAll([
    ...PRIMITIVES,
    ...INTERACTIVE_MODULES,
    ...FORM_MODULES,
    Loop,
    Instance,
  ])
}

export { PRIMITIVES }
