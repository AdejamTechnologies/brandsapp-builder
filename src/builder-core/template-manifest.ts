/**
 * Everything a design has to declare before it can be offered to a brand.
 *
 * A template is a document plus two things. The slots (see `slots.ts`) say
 * which parts a brand's own content fills. These say who it is FOR — and
 * without them the picker cannot decide whether to show a design to a tailor
 * or to a school, and the AI path has nothing to choose a look from.
 *
 * They used to live in `lib/templates/registry.ts`, as a hand-written entry
 * beside a hand-written document. That works while one person writes every
 * template. It does not work when a partner builds one in the builder and
 * hands over a file — so the declarations travel INSIDE the document, on
 * `meta.template`, the same reasoning that put the slots on the nodes: a
 * manifest kept alongside a document drifts the first time somebody edits one
 * without the other.
 *
 * ── The vocabularies ──────────────────────────────────────────────────────
 *
 * `ARCHETYPE_IDS` and friends are the product's own words, repeated here
 * because the builder cannot import from the tenant app. They are not allowed
 * to drift: `tests/template-manifest.test.ts` checks each list against the
 * real one, so a shape added to the product and missed here fails a test
 * rather than quietly becoming a design nobody is ever offered.
 */

import { z } from "zod"

/** The shapes of business a brand picks from at signup. */
export const ARCHETYPE_IDS = [
  "creative-maker",
  "retailer",
  "food-hospitality",
  "service-provider",
  "health-practitioner",
  "educator",
  "beauty-wellness",
  "fitness-sports",
  "real-estate-pro",
  "hospitality-lodging",
  "freelancer",
  "farmer-agri",
  "entertainer",
  "tech-digital",
  "media-content",
] as const

/**
 * Goods categories, for catalogue designs only.
 *
 * A category decides what a product CARD shows, so a design with no catalogue
 * claims none — that is a statement, not an omission.
 */
export const GOODS_CATEGORY_ID_LIST = [
  "animals-pets",
  "babies-kids",
  "beauty-personal-care",
  "business-industry",
  "commercial-equipment",
  "electronics",
  "fashion",
  "food-agriculture",
  "home-furniture",
  "jobs",
  "leisure-activities",
  "phones-tablets",
  "property",
  "repair-construction",
  "seeking-work",
  "services",
  "vehicles",
] as const

export const templatePage = z.object({
  /**
   * The address under the brand's own domain. Empty string is the homepage.
   *
   * A template may carry more than one page — a restaurant with a menu page, a
   * school with an admissions page — and applying it creates all of them.
   */
  slug: z.string().default(""),
  title: z.string().min(1),
  /** Exactly one page of a template is the one the brand lands on. */
  home: z.boolean().default(false),
})
export type TemplatePage = z.infer<typeof templatePage>

export const templatePalette = z.object({
  /** Shown in the picker beside the swatch. Never a trademark. */
  name: z.string().min(1),
  colors: z.record(z.string(), z.string()),
  fonts: z.object({ display: z.string().optional(), body: z.string().optional() }).optional(),
  /**
   * The art direction that travels with the look: how dense the bands are, how
   * round the corners, how much the page moves.
   *
   * Carried here because a look is not only its colours. Leaving it out of the
   * manifest meant a design whose palettes each set `choreography: "subtle"`
   * arrived on the shelf with every one of them stripped — the parse drops
   * what the schema does not name, so the loss is total and silent.
   *
   * Spelled out rather than imported from `schema.ts`: that file imports THIS
   * one, for `meta.template`, and the two cannot import each other. The shape
   * mirrors `themeScale` there; the renderer is what validates it properly.
   */
  scale: z
    .object({
      density: z.number().optional(),
      radius: z.number().optional(),
      typeScale: z.number().optional(),
      motion: z.number().optional(),
      choreography: z.string().optional(),
      smoothScroll: z.boolean().optional(),
    })
    .optional(),
})

export const templateManifest = z.object({
  /** Stable, lowercase, hyphenated. The same across every page of a template. */
  id: z.string().min(1),
  name: z.string().min(1),
  /** One line, in the picker. What it is FOR, not what it looks like. */
  description: z.string().default(""),
  /**
   * Bumped whenever the DESIGN changes — a new band, a reworded promise. It is
   * stamped on the page it was applied to, so a brand can be told "we have
   * improved this design" and choose to take it, rather than having a page
   * they have been editing rewritten underneath them.
   */
  revision: z.number().int().min(1).default(1),
  archetypes: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  /** App ids the page cannot work without — a product grid needs Commerce. */
  requires: z.array(z.string()).default([]),
  /**
   * The bounded set a look may be chosen from. This is the line between "pick
   * a look" and "invent a look", and it is the whole reason the AI path is
   * safe: the model selects, it never designs.
   */
  colourways: z.array(z.string()).default([]),
  /** Looks this design owns, for a design whose colour IS part of it. */
  palettes: z.record(z.string(), templatePalette).optional(),
  /** The honest floor: a design built for nine cards looks broken with one. */
  minProducts: z.number().int().min(1).optional(),
  /** This page's own place in the template. */
  page: templatePage.default({ slug: "", title: "Home", home: true }),
})
export type TemplateManifest = z.infer<typeof templateManifest>

export interface ManifestProblem {
  field: string
  message: string
}

/**
 * What is wrong with a design's declarations, said plainly enough to fix.
 *
 * Every one of these produces a template that RENDERS. None would be caught by
 * the document schema or by looking at the page — they show up later as a
 * design nobody is ever offered, or as one offered to a brand it cannot work
 * for, or as a shop modelled on a red storefront shipping in four shades of
 * blue because its colourways were picked for the sound of their names.
 */
export function problemsWithManifest(
  m: TemplateManifest,
  known: { designSystems?: readonly string[]; apps?: readonly string[] } = {}
): ManifestProblem[] {
  const out: ManifestProblem[] = []

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.id)) {
    out.push({ field: "id", message: "An id is lowercase words joined by hyphens." })
  }
  if (!m.description.trim()) {
    out.push({
      field: "description",
      message: "The picker shows this sentence. Without it the design is a bare name.",
    })
  }
  if (m.colourways.length === 0) {
    out.push({
      field: "colourways",
      // With none, the AI path has nothing to choose among and will be tempted
      // to invent — which is the one thing it must not do.
      message: "Name at least one look. A design with none lets the AI invent one.",
    })
  }
  for (const id of m.colourways) {
    const own = m.palettes?.[id]
    const shared = known.designSystems?.includes(id)
    if (!own && known.designSystems && !shared) {
      out.push({
        field: "colourways",
        // A colourway nobody can resolve falls back to the stored theme
        // silently, which is the one state no reviewer looks at because the
        // picker still shows a swatch.
        message: `"${id}" is neither one of this design's own looks nor a shared one.`,
      })
    }
  }
  for (const a of m.archetypes) {
    if (!(ARCHETYPE_IDS as readonly string[]).includes(a)) {
      out.push({ field: "archetypes", message: `"${a}" is not a kind of business we ask about.` })
    }
  }
  for (const cat of m.categories) {
    if (!(GOODS_CATEGORY_ID_LIST as readonly string[]).includes(cat)) {
      out.push({ field: "categories", message: `"${cat}" is not a goods category.` })
    }
  }
  if (known.apps) {
    for (const app of m.requires) {
      if (!known.apps.includes(app)) {
        out.push({
          field: "requires",
          message: `"${app}" is not an app a brand can install, so this design would be offered to nobody.`,
        })
      }
    }
  }
  if (!m.page.title.trim()) {
    out.push({ field: "page", message: "Every page needs a title." })
  }
  if (m.page.slug && !/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(m.page.slug)) {
    out.push({ field: "page", message: "A slug is lowercase words joined by hyphens or slashes." })
  }
  return out
}

/**
 * A whole template, as it is stored and handed over.
 *
 * One file per template, pages included — because a template with a menu page
 * and a homepage is one thing to choose, one thing to price and one thing to
 * apply, and splitting it into files that have to be kept together is how half
 * a template gets uploaded.
 */
export const templateRecord = z.object({
  manifest: templateManifest,
  pages: z
    .array(z.object({ page: templatePage, doc: z.unknown() }))
    .min(1),
})
export type TemplateRecord = z.infer<typeof templateRecord>

/** Problems with a whole record — the per-page checks the manifest cannot see. */
export function problemsWithRecord(record: TemplateRecord): ManifestProblem[] {
  const out = problemsWithManifest(record.manifest)
  const homes = record.pages.filter((p) => p.page.home)
  if (homes.length !== 1) {
    out.push({
      field: "pages",
      // Applying a template has to know where the brand lands. Two homepages
      // is a coin toss; none is a template that applies to nothing.
      message: `Exactly one page is the home page — this has ${homes.length}.`,
    })
  }
  const slugs = record.pages.map((p) => p.page.slug)
  if (new Set(slugs).size !== slugs.length) {
    out.push({ field: "pages", message: "Two pages share an address." })
  }
  return out
}
