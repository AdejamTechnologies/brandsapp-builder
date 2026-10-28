import type { Doc } from "@brandsapp/builder-core"

import { ADEJAM_DOC } from "./adejam-sample"
import { BLANK_DOC } from "./blank"
import { BOLT_WORLD_DOC } from "./bolt-world"
import { SAMPLE_DOC } from "./sample"
import { STOREFRONT_DOC } from "./storefront"

/**
 * The local demo pages, keyed by the id in `/edit/<id>` and `/preview/<id>`.
 *
 * One map rather than a chain of ternaries in each route, so the editor and the
 * read-only preview can never disagree about what `/edit/bolt` means — and so
 * adding a page to try the builder against is one line here.
 *
 * `blank` is deliberately NOT in this map: it is the scratch canvas (it opens on
 * the storefront, see docFor below) and it is also a plausible id for a real
 * tenant page, which must still be fetched from the tenant rather than shadowed
 * by a local demo.
 */
export const DEMO_DOCS: Record<string, Doc> = {
  sample: SAMPLE_DOC,
  adejam: ADEJAM_DOC,
  // A trial page built for a real prospect — a one-person repair and
  // construction business in Bonny that sells services and materials side by
  // side. It exercises tabs, a lightbox gallery, a map, a real form and a long
  // catalogue grid, which is most of what a tenant page actually needs.
  bolt: BOLT_WORLD_DOC,
}

/** True when this id is a purely local demo, so nothing should be fetched for it. */
export const isDemoPage = (pageId: string): boolean => pageId in DEMO_DOCS

/**
 * The doc a page id starts on. A demo id gets its demo; `blank` gets the
 * storefront as a substrate to build against; everything else starts EMPTY, so
 * a real tenant page never flashes someone else's markup while its own
 * definition is still being fetched.
 */
export const docFor = (pageId: string): Doc =>
  DEMO_DOCS[pageId] ?? (pageId === "blank" ? STOREFRONT_DOC : BLANK_DOC)
