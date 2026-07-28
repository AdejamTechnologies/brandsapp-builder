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
 * When CURATED is empty (curation not started / not exported yet) every block
 * passes through unchanged, so the library never goes empty by accident.
 */
export function filterCurated<T extends { category: string; name: string }>(blocks: T[]): T[] {
  if (CURATED.length === 0) return blocks
  const allow = new Set(CURATED.map(refKey))
  return blocks.filter((b) => allow.has(refKey(b)))
}
