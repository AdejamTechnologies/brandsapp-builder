// Moved from lib/ai/vocabulary.ts (24 Nov 2026) so the partners MCP in main-repo designs by the SAME rules as the in-app AI; builder-core is what main-repo vendors.
/**
 * The element vocabulary, GENERATED from the registry rather than written out.
 *
 * The reason this is generated is the failure mode it prevents. A prompt that
 * lists the modules by hand is a second source of truth, and it goes stale the
 * moment anyone adds one: the engine grows a 3D scene module and a horizontal
 * section, the prompt never hears about them, and the model keeps authoring the
 * same four sections it was told about a year ago. Every page then looks like
 * every other page, and the cause is invisible because nothing is broken.
 *
 * So the vocabulary is derived from `createDefaultRegistry()` at call time. Add a
 * module and the model can use it on the next request, with no prompt to edit.
 */

import { createDefaultRegistry, type ModuleRegistry } from "../index"

/**
 * Modules the model should never place directly. Internal plumbing, editor-only
 * wrappers, and the third-party embeds that need an account and an asset URL the
 * model cannot know — offering those only produces pages with dead frames in them.
 */
const HIDDEN = new Set([
  "loop", "instance", "fragment", "page-root",
  "facebook", "x-twitter", "map", "youtube", "spline", "rive", "lottie",
  "breadcrumb", "pagination", "avatar", "lightbox",
])

/** Props every module inherits from the shared "advanced" capabilities. */
const ADVANCED = new Set(["elementId", "customAttributes", "excludeFromSearch", "keepInHtml", "hidden", "preload"])

/**
 * Modules worth spending prompt tokens on. The registry holds well over a
 * hundred entries once forms and components are counted, and a model given all
 * of them writes worse pages, not better ones — so this is the part of the
 * vocabulary a landing page is actually built from.
 */
const CATEGORIES = new Set(["layout", "structure", "content", "media", "interactive", "atmosphere"])

export interface VocabularyEntry {
  name: string
  category: string
  props: string[]
  children: "none" | "any" | string[]
  /**
   * Allowed values for short select props (24 Nov 2026), so `heading(level:1|2|…)`
   * says the value is "1", not "h1". A designer that guesses the format wrong
   * gets the default silently — the commonest way a page lost its h1.
   */
  options?: Record<string, string[]>
}

export function buildVocabulary(registry: ModuleRegistry = createDefaultRegistry()): VocabularyEntry[] {
  const out: VocabularyEntry[] = []
  for (const def of registry.all()) {
    if (HIDDEN.has(def.name)) continue
    if (!CATEGORIES.has(def.category)) continue
    const props = Object.keys(def.schema).filter((k) => !ADVANCED.has(k))
    const options: Record<string, string[]> = {}
    for (const k of props) {
      const opts = def.schema[k]?.options
      // Only short closed sets — a long list costs tokens and is not a guess anyone makes.
      if (opts && opts.length <= 8 && opts.every((o) => String(o.value).length <= 12)) {
        options[k] = opts.map((o) => String(o.value))
      }
    }
    out.push({
      name: def.name,
      category: def.category,
      props,
      children: def.contentModel.children,
      ...(Object.keys(options).length ? { options } : {}),
    })
  }
  return out.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
}

/** The vocabulary as compact prompt text: `name(prop, prop) [children]`. */
export function vocabularyText(entries: VocabularyEntry[] = buildVocabulary()): string {
  const byCat = new Map<string, string[]>()
  for (const e of entries) {
    const kids = e.children === "none" ? "" : e.children === "any" ? " +children" : ` +${(e.children as string[]).join("/")}`
    const props = e.props.length
      ? `(${e.props.map((p) => (e.options?.[p] ? `${p}:${e.options[p].join("|")}` : p)).join(", ")})`
      : ""
    byCat.set(e.category, [...(byCat.get(e.category) ?? []), `${e.name}${props}${kids}`])
  }
  return [...byCat.entries()].map(([cat, xs]) => `${cat}: ${xs.join(" · ")}`).join("\n")
}
