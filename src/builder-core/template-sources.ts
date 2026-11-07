/**
 * The facts a template may point a slot at — named once, for both ends.
 *
 * A slot's `source` is a dotted path into the brand's own facts (`brand.name`,
 * `contact.whatsappLink`, `row.price`). Until now that vocabulary existed only
 * in two places that could not see each other: the shape in
 * `lib/templates/facts.ts`, which the filler reads, and the memory of whoever
 * was hand-writing a template file.
 *
 * That was survivable while four templates were written by one person. It is
 * not survivable now templates are authored in the builder by partners and
 * designers: a mistyped `brand.tittle` does not fail, it quietly resolves to
 * nothing and the template keeps its placeholder — so the page ships saying
 * "Your business name here" and nobody finds out until a brand does.
 *
 * So the vocabulary lives here, in the engine both ends share. The builder
 * offers it as a list to choose from; `tests/template-sources.test.ts` checks
 * every path in it actually resolves against the facts the filler builds, so
 * the list cannot drift into naming something that does not exist.
 *
 * ── Why `kinds` ───────────────────────────────────────────────────────────
 *
 * A slot of kind `href` refuses anything that is not an address, and rightly:
 * a bare phone number dropped into a link renders a button that goes nowhere.
 * So a template sources its LABEL from `contact.whatsapp` and its LINK from
 * `contact.whatsappLink`, and the authoring UI should not offer the first for
 * the second. Each entry says which kinds it can honestly fill.
 */

import type { SlotKind } from "./slots"

export interface SourceOption {
  /** The dotted path, exactly as it goes in `bappSlot.source`. */
  path: string
  /** What it is, in the words an author would use. */
  label: string
  /** The slot kinds this fact can fill. */
  kinds: SlotKind[]
  /** Anything surprising about it. */
  note?: string
}

/**
 * Facts a brand has exactly one of.
 *
 * Every one of these can be absent — a brand that has filled in nothing still
 * gets a page — so a slot pointing at one keeps the template's own words when
 * the fact is missing rather than rendering a hole.
 */
/**
 * Numbered photographs — a FAMILY, not a fixed list.
 *
 * `gallery.images.N` is special-cased by the filler and WRAPS, so a design
 * using twelve still fills from a brand that supplied two. Our own fine-dining
 * template reaches `gallery.images.11`, which is why the picker offers more
 * than a handful and `isKnownSource` accepts any index rather than a list: a
 * design with sixteen photographs is a legitimate design.
 */
const PHOTOGRAPH_COUNT = 12
const PHOTOGRAPHS: SourceOption[] = Array.from({ length: PHOTOGRAPH_COUNT }, (_, i) => ({
  path: `gallery.images.${i}`,
  label: `Photograph ${i + 1}`,
  kinds: ["image"] as SlotKind[],
  ...(i === 0
    ? { note: "Numbered photographs wrap: a design using twelve still fills from a brand with two." }
    : {}),
}))

export const BRAND_SOURCES: SourceOption[] = [
  { path: "brand.name", label: "Brand name", kinds: ["text"] },
  {
    path: "brand.trade",
    label: "What they do",
    kinds: ["text"],
    note: 'The trade label verbatim — "Adire Maker", never "creative-maker".',
  },
  { path: "brand.summary", label: "One-line summary", kinds: ["text", "richtext"] },
  { path: "brand.logo", label: "Logo", kinds: ["image"] },
  {
    path: "brand.action",
    label: "Main call to action",
    kinds: ["text"],
    note: "A button label: the one thing a first-time visitor should do.",
  },

  { path: "contact.whatsapp", label: "WhatsApp number", kinds: ["text"] },
  { path: "contact.phone", label: "Phone number", kinds: ["text"] },
  { path: "contact.email", label: "Email address", kinds: ["text"] },
  { path: "contact.address", label: "Street address", kinds: ["text", "richtext"] },
  { path: "contact.hours", label: "Opening hours", kinds: ["text", "richtext"] },
  { path: "contact.serviceAreas", label: "Areas served", kinds: ["text", "richtext"] },

  {
    path: "contact.whatsappLink",
    label: "WhatsApp link",
    kinds: ["href"],
    note: "The address, not the number. A number in an href is a dead button.",
  },
  { path: "contact.phoneLink", label: "Phone link", kinds: ["href"] },
  { path: "contact.emailLink", label: "Email link", kinds: ["href"] },
  {
    path: "contact.mapLink",
    label: "Map / directions link",
    kinds: ["href"],
    note: "Derived from the address — nobody is asked for a map URL.",
  },

  ...PHOTOGRAPHS,
]

export interface FeedOption {
  /** Goes in `bappRepeat.source`. */
  source: string
  label: string
  note?: string
  /** The `row.*` paths a slot INSIDE this repeat may name. */
  row: SourceOption[]
}

/**
 * Feeds a container can repeat over.
 *
 * The children of a repeating container are the PATTERN: the filler clones the
 * first child once per row, so slots inside it address the row rather than the
 * brand — `row.title`, not `catalogue.products.0.title`.
 */
export const FEED_SOURCES: FeedOption[] = [
  {
    source: "catalogue.products",
    label: "Products",
    note: "Needs the Commerce app. Say how many the design holds — nine cards look composed, one looks broken.",
    row: [
      { path: "row.title", label: "Product name", kinds: ["text"] },
      {
        path: "row.price",
        label: "Price",
        kinds: ["text"],
        note: "Already formatted in the brand's currency.",
      },
      { path: "row.image", label: "Product photograph", kinds: ["image"] },
      { path: "row.href", label: "Link to the product", kinds: ["href"] },
    ],
  },
  {
    source: "faq.items",
    label: "Questions and answers",
    note: "A band over this vanishes entirely when the brand has none — heading included.",
    row: [
      { path: "row.q", label: "Question", kinds: ["text"] },
      { path: "row.a", label: "Answer", kinds: ["text", "richtext"] },
    ],
  },
  {
    source: "gallery.images",
    label: "Photographs",
    row: [{ path: "row", label: "The photograph", kinds: ["image"] }],
  },
]

/**
 * What a slot on this node may be sourced from.
 *
 * Inside a repeating container only that feed's row fields make sense: a card
 * cloned per product cannot name the brand's opening hours and mean anything
 * by it. Outside one, only the brand-wide facts.
 */
export function sourcesFor(kind: SlotKind, feed?: string | null): SourceOption[] {
  const pool = feed
    ? (FEED_SOURCES.find((f) => f.source === feed)?.row ?? [])
    : BRAND_SOURCES
  return pool.filter((s) => s.kinds.includes(kind))
}

/** `gallery.images.3` — any index, because the filler wraps. */
const PHOTOGRAPH_PATH = /^gallery\.images\.\d+$/

/** Is this a path the filler will actually understand? */
export function isKnownSource(path: string): boolean {
  if (PHOTOGRAPH_PATH.test(path)) return true
  if (BRAND_SOURCES.some((s) => s.path === path)) return true
  return FEED_SOURCES.some((f) => f.row.some((r) => r.path === path))
}
