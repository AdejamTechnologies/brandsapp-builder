/**
 * The builder AST — the design-as-data contract. A page/template is a Doc: a
 * FLAT, normalized, id-keyed node map (not a nested blob, not absolute pixels).
 * The tree is reconstructed by following `children` id arrays. See
 * docs/builder-foundation-spec.md.
 */

import { z } from "zod"

export const CORE_DOC_VERSION = 1

const id = z.string().min(1)
const cssBag = z.record(z.string(), z.string())

export const propBinding = z.object({
  source: z.enum(["item", "parentItem", "page", "site", "route"]),
  field: z.string().min(1),
  format: z.enum(["text", "html", "url", "media"]).optional(),
  fallback: z.enum(["static", "empty"]).optional(),
})
export type PropBinding = z.infer<typeof propBinding>

// A node's `children` are string ids (refs into the flat map), NOT nested nodes,
// so the schema is non-recursive and plain inference works.
export const node = z.object({
  id,
  module: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
  bindings: z.record(z.string(), propBinding).optional(),
  styleIds: z.array(id).default([]),
  style: cssBag.optional(), // per-node local base style
  classes: z.string().optional(), // utility classes (Tailwind-style, generated at render time)
  anim: z
    .object({
      effect: z.string(),
      trigger: z.enum(["load", "scroll"]).optional(),
      duration: z.number().optional(),
      delay: z.number().optional(),
    })
    .optional(), // entrance animation (see anim.ts)
  responsive: z
    .record(
      id, // breakpoint id
      z.object({
        props: z.record(z.string(), z.unknown()).optional(),
        style: cssBag.optional(),
        styleIds: z.array(id).optional(),
        classes: z.string().optional(),
      })
    )
    .optional(),
  children: z.array(id).default([]),
  label: z.string().optional(),
  hidden: z.boolean().optional(),
  locked: z.boolean().optional(),
})
export type Node = z.infer<typeof node>

export const styleRule = z.object({
  id,
  kind: z.enum(["token", "local"]).default("local"),
  name: z.string().optional(),
  base: cssBag.default({}),
  context: z.record(id, cssBag).optional(), // keyed by breakpoint id (or condition id, future)
})
export type StyleRule = z.infer<typeof styleRule>

export const breakpoint = z.object({
  id,
  label: z.string(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
})
export type Breakpoint = z.infer<typeof breakpoint>

/**
 * The knobs that make one document render as several genuinely different designs.
 *
 * Colour and type alone do not carry a look — density, corner language, type
 * contrast and motion do at least as much work. These are MULTIPLIERS over the
 * scales the utility classes already use (1 = untouched), so an existing page
 * responds to them without a single class being rewritten. That is the whole
 * point: a template becomes a function of its tokens rather than a fixed artefact.
 */
export const themeScale = z.object({
  /** Section padding and gaps. <1 tightens toward dense commerce, >1 opens out. */
  density: z.number().min(0.4).max(2).default(1),
  /** Corner language: 0 = square/brutalist, 1 = as authored, >1 = soft. */
  radius: z.number().min(0).max(3).default(1),
  /** Type contrast — scales the display end of the ramp, not body copy. */
  typeScale: z.number().min(0.6).max(2).default(1),
  /** Animation intensity. 0 disables motion entirely (and honours reduced-motion). */
  motion: z.number().min(0).max(2).default(1),
})
export type ThemeScale = z.infer<typeof themeScale>

export const themeTokens = z.object({
  colors: z.record(z.string(), z.string()).default({}),
  fonts: z.object({ display: z.string().optional(), body: z.string().optional() }).default({}),
  radius: z.record(z.string(), z.string()).default({}),
  breakpoints: z.array(breakpoint).default([]),
  // OPTIONAL, not defaulted: an absent scale means "leave the authored classes
  // exactly as they are", which is both the correct behaviour and what keeps
  // every existing theme literal in the codebase valid without edits.
  scale: themeScale.optional(),
})
export type ThemeTokens = z.infer<typeof themeTokens>

export const docMeta = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  ogImage: z.string().optional(),
  // When set, this page is a COLLECTION TEMPLATE for the given collection slug:
  // it renders once per published row at /<collection>/<rowSlug>, with the row's
  // cells exposed to bindings via the `page` data frame. See render-page.tsx.
  collection: z.string().optional(),
})

// A linked component ("symbol"): a named, reusable subtree. Its nodes live in the
// same `doc.nodes` map; `rootId` points at the master root. An `instance` node
// (module "instance", props.component = <id>) renders the master inline, so
// editing the master updates every instance. See render.tsx renderInstance.
export const componentDef = z.object({
  id,
  name: z.string(),
  rootId: id,
})
export type ComponentDef = z.infer<typeof componentDef>

// Collaboration comments: threads optionally anchored to a node. Stored in the
// Doc so they sync over the live room and persist on save; the renderer never
// emits them, so they stay out of published output. See doc-ops comment helpers.
export const commentMessage = z.object({
  id,
  author: z.string().default("You"),
  body: z.string().default(""),
  at: z.number().optional(),
})
export type CommentMessage = z.infer<typeof commentMessage>

export const comment = z.object({
  id,
  nodeId: id.optional(),
  resolved: z.boolean().optional(),
  messages: z.array(commentMessage).default([]),
})
export type Comment = z.infer<typeof comment>

export const doc = z.object({
  version: z.number().default(CORE_DOC_VERSION),
  rootId: id,
  nodes: z.record(id, node),
  styles: z.record(id, styleRule).default({}),
  theme: themeTokens.default({ colors: {}, fonts: {}, radius: {}, breakpoints: [] }),
  meta: docMeta.optional(),
  // Optional (not defaulted) so any Doc literal stays valid; every consumer
  // guards with `?? {}` / `?? []`.
  components: z.record(id, componentDef).optional(),
  comments: z.array(comment).optional(),
})
export type Doc = z.infer<typeof doc>

export const fragmentManifest = z.object({
  id,
  name: z.string(),
  category: z.enum(["section", "page", "template", "component"]),
  author: z.string().optional(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  price: z.number().optional(),
  license: z.string().optional(),
  version: z.string().default("1.0.0"),
  requires: z
    .object({
      modules: z.array(z.string()).default([]),
      minCoreVersion: z.number().default(CORE_DOC_VERSION),
    })
    .optional(),
})
export type FragmentManifest = z.infer<typeof fragmentManifest>

export const fragment = z.object({
  version: z.number().default(CORE_DOC_VERSION),
  rootId: id,
  nodes: z.record(id, node),
  styles: z.record(id, styleRule).default({}),
  manifest: fragmentManifest,
})
export type Fragment = z.infer<typeof fragment>

/** Parse + validate an unknown value as a Doc (throws on invalid). */
export function parseDoc(value: unknown): Doc {
  return doc.parse(value)
}
export function safeParseDoc(value: unknown) {
  return doc.safeParse(value)
}
