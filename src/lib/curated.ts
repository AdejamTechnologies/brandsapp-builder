import curatedData from "./curated.json"

/** Identifies a library block without carrying its (large) html payload. */
export interface CuratedRef {
  category: string
  name: string
}

/**
 * The product owner's hand-picked allowlist, curated via the `/curate` screen
 * (src/routes/curate.tsx) and exported there as `curated.json`. Starts empty —
 * until the owner ships a real list, `filterCurated` below falls back to
 * returning everything so the Sections panel keeps working.
 */
export const CURATED: CuratedRef[] = curatedData as CuratedRef[]

const refKey = (b: { category: string; name: string }) => `${b.category}␟${b.name}`

/**
 * Narrow a list of `{category, name, ...}` blocks down to the curated allowlist.
 *
 * Two deliberate escape hatches, both there so a half-finished curation cannot
 * empty the library by accident:
 *
 *   AN EMPTY LIST PASSES EVERYTHING. Curation not started, or not exported
 *   yet, means "show the lot" rather than "show nothing".
 *
 *   A CATEGORY NOBODY RULED ON PASSES WHOLE. The library is now 2,516 blocks —
 *   304 bundled plus 2,212 landing bands across 21 industries — and nobody
 *   sits down and judges all of them in one afternoon. Without this, an owner
 *   who curated the bundled set and exported would have deleted every landing
 *   band in the same gesture, having never been shown one.
 *
 * The cost of the second rule is that "drop an entire category" cannot be said
 * in this format: a category with no kept block reads as a category nobody has
 * looked at. Keeping one block in it is the way to say it, and losing that is
 * worth not losing 2,212 bands to a misunderstanding.
 */
export function filterCurated<T extends { category: string; name: string }>(blocks: T[]): T[] {
  if (CURATED.length === 0) return blocks
  const allow = new Set(CURATED.map(refKey))
  const ruledOn = new Set(CURATED.map((c) => c.category))
  return blocks.filter((b) => !ruledOn.has(b.category) || allow.has(refKey(b)))
}
