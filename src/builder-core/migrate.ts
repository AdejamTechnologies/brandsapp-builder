/**
 * Versioned-envelope migration for stored Docs, plus a bridge that converts the
 * LEGACY page-builder format (`{ nodes: [{id,type,props}], theme:{primaryColor,
 * fontFamily,style} }`) into a Doc so existing tenant pages keep rendering
 * through the new engine. Migration chain pattern borrowed from dialyma.
 */

import { CORE_DOC_VERSION, type Doc, type ThemeTokens } from "./schema"

/**
 * The legacy page-builder had a SECTION called "text"; builder-core has a
 * PRIMITIVE called "text" whose entire job is rendering props.text. Registering
 * the section overwrote the primitive, so every paragraph the generator emitted
 * rendered as an empty <p>. Only headings and buttons survived, which is why
 * whole bands of a generated page came out blank while others looked fine.
 *
 * The section keeps its behaviour under a name that cannot collide.
 */
export const LEGACY_TEXT_SECTION = "legacy-text-section"

export const DEFAULT_BREAKPOINTS = [
  { id: "tablet", label: "Tablet", maxWidth: 991 },
  { id: "mobile", label: "Mobile", maxWidth: 767 },
  { id: "sm", label: "Small", maxWidth: 479 },
]

interface LegacyDef {
  nodes: Array<{ id: string; type: string; props?: Record<string, unknown> }>
  theme?: { primaryColor?: string; fontFamily?: string; style?: string; pack?: string }
}

function isDocShape(v: unknown): v is Doc {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as Record<string, unknown>).rootId === "string" &&
    !!(v as Record<string, unknown>).nodes &&
    !Array.isArray((v as Record<string, unknown>).nodes)
  )
}

export function isLegacyDefinition(v: unknown): v is LegacyDef {
  return !!v && typeof v === "object" && Array.isArray((v as Record<string, unknown>).nodes)
}

export function legacyThemeToTokens(theme: LegacyDef["theme"] = {}): ThemeTokens {
  return {
    colors: { accent: theme.primaryColor ?? "#111827" },
    fonts: { body: theme.fontFamily ?? "Inter", display: theme.fontFamily ?? "Inter" },
    radius: {},
    breakpoints: DEFAULT_BREAKPOINTS,
  }
}

/**
 * Convert the legacy flat section list into a Doc. Each section becomes a node
 * under a synthetic `page-root` container; the legacy theme object is copied onto
 * each section's props as `theme` (the legacy section modules read it), and also
 * lifted into ThemeTokens for the root wrapper.
 */
export function migrateLegacyDefinition(def: LegacyDef): Doc {
  const nodes: Doc["nodes"] = {}
  const rootId = "root"
  const childIds: string[] = []
  const legacyTheme = def.theme ?? {}
  for (const s of def.nodes) {
    if (!s || !s.id || !s.type) continue
    nodes[s.id] = {
      id: s.id,
      /**
       * `text` is the one legacy section name that collides with a core
       * primitive, and the collision silently blanked every paragraph on every
       * generated page: the legacy module is registered after the primitives
       * and overwrote `text`, whose whole job is rendering `props.text`. A
       * legacy section keeps its behaviour under an unambiguous name instead.
       */
      module: s.type === "text" ? LEGACY_TEXT_SECTION : s.type,
      props: { ...(s.props ?? {}), theme: legacyTheme },
      styleIds: [],
      children: [],
    }
    childIds.push(s.id)
  }
  nodes[rootId] = { id: rootId, module: "page-root", props: {}, styleIds: [], children: childIds }
  return {
    version: CORE_DOC_VERSION,
    rootId,
    nodes,
    styles: {},
    theme: legacyThemeToTokens(legacyTheme),
    meta: {},
  }
}

/** Run stored data forward to the current Doc shape. */
export function migrateDoc(input: unknown): unknown {
  if (isDocShape(input)) {
    // future: while (doc.version < CORE_DOC_VERSION) doc = migrators[doc.version](doc)
    return input
  }
  if (isLegacyDefinition(input)) return migrateLegacyDefinition(input)
  return input // let parseDoc surface a clear validation error
}

export { CORE_DOC_VERSION }
