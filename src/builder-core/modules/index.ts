import { createElement } from "react"

import { ModuleRegistry, type ModuleDefinition, type ModuleRenderProps } from "../registry"
import { FORM_MODULES } from "./forms"
import { ATMOSPHERE_MODULES } from "./atmosphere"
export { SHADER_LOADER, ATMOSPHERE_KEYFRAMES } from "./atmosphere"
import { COMPONENT_MODULES } from "./components"
import { INTERACTIVE_MODULES } from "./interactive"
import { PRIMITIVES } from "./primitives"
import { ANIMATION_MODULES } from "./animation"
import { CAPTCHA_MODULES } from "./captcha"
import { LIGHTBOX_MODULES } from "./lightbox"
import { EMBED_MODULES } from "./embeds"
import { STRUCTURE_MODULES } from "./structure"
import { CINEMA_MODULES } from "./cinema"
import { Scene } from "./scene"

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
        { label: "Products · Best-selling", value: "products.bestselling" },
        { label: "Products · Trending", value: "products.trending" },
        { label: "Courses · Newest", value: "courses.newest" },
        { label: "Courses · Popular", value: "courses.popular" },
        { label: "Courses · Featured", value: "courses.featured" },
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
    ...STRUCTURE_MODULES,
    ...EMBED_MODULES,
    ...ANIMATION_MODULES,
    ...CAPTCHA_MODULES,
    ...LIGHTBOX_MODULES,
    ...INTERACTIVE_MODULES,
    ...COMPONENT_MODULES,
    ...ATMOSPHERE_MODULES,
    ...CINEMA_MODULES,
    Scene,
    ...FORM_MODULES,
    Loop,
    Instance,
  ])
}

// Re-exported so hosts can compute a button's look from variant + size
// (the Inspector rewrites a button's classes when either changes).
// The lazy third-party player loader — hosts inject it only when a page
// actually contains a lottie/spline/rive element.
export { ANIMATION_LOADER } from "./animation"
export { RECAPTCHA_LOADER } from "./captcha"
export { LIGHTBOX_RUNTIME } from "./lightbox"
// Real 3D, gated: hosts inject it only when the page contains a scene.
export { SCENE_LOADER } from "./scene"
export { ALL_BUTTON_TOKENS, buttonClasses } from "./primitives"
export { PRIMITIVES }
