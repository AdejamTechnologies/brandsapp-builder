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
  schema: {
    // A live data feed: a CMS collection, or an app feed (products/courses/blog).
    // The host registers matching loopSources; empty in the editor → sample rows.
    source: {
      type: "select",
      label: "data source",
      options: [
        { label: "CMS collection", value: "data.rows" },
        { label: "Products · Featured", value: "products.featured" },
        { label: "Products · Newest", value: "products.newest" },
        { label: "Courses · Newest", value: "courses.newest" },
        { label: "Courses · Popular", value: "courses.popular" },
        { label: "Blog · Newest", value: "blogs.newest" },
        { label: "Blog · Featured", value: "blogs.featured" },
      ],
    },
    collection: { type: "plain", label: "collection slug (CMS source only)" },
    limit: { type: "number" },
    tag: { type: "plain" },
  },
  defaults: { source: "", limit: 6, tag: "div" },
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
