/**
 * Motion as a THEME decision, applied at render time to any document.
 *
 * Writing motion into the generators was the obvious approach and it does not
 * scale: `compose` ended up with two dozen hand-placed `anim` props while
 * `generate` had four, and the several hundred imported blocks in the catalogue
 * had none at all — so whether a page moved depended on which engine happened to
 * build it. Nobody is ever going to hand-annotate an imported Preline footer.
 *
 * So the page's motion is a token, like density or radius, and this is the rule
 * set that turns that token into per-node animation while the tree is being
 * rendered. It applies to a generated page, an imported block, and a page built
 * by hand in the editor, identically.
 *
 * Two things it deliberately does NOT do:
 *
 *   It never overrides an author. A node that already carries `anim` keeps
 *   exactly what it was given — the token fills gaps, it does not impose.
 *
 *   It never runs in the editor. Entrance animations are publish-only, so the
 *   canvas stays static and editable (the same rule the hand-placed ones follow).
 */

import type { NodeAnim } from "./anim"

export const CHOREOGRAPHY = ["none", "subtle", "cinematic"] as const
export type Choreography = (typeof CHOREOGRAPHY)[number]

/** What each level is willing to spend, per effect family. */
interface Level {
  /** Band reveal duration, ms. 0 = no reveal. */
  reveal: number
  /** Peak parallax travel for media, px. */
  drift: number
  /** Delay between a grid's children, ms. */
  stagger: number
  /** Degrees of tilt on media as it passes. 0 = flat. */
  tilt: number
  /** Depth push, px on the Z axis — needs a perspective ancestor to read. */
  depth: number
  /** Split a heading into words and reveal them in sequence. */
  text: boolean
}

const LEVELS: Record<Choreography, Level> = {
  none: { reveal: 0, drift: 0, stagger: 0, tilt: 0, depth: 0, text: false },
  // Enough that the page is clearly alive, little enough that nobody notices it
  // as an effect. This is the level a storefront should ship at.
  subtle: { reveal: 650, drift: 16, stagger: 60, tilt: 0, depth: 0, text: false },
  // The brochure tier: depth, tilt and per-word headlines.
  cinematic: { reveal: 900, drift: 40, stagger: 110, tilt: 1.4, depth: 60, text: true },
}

/** Modules that read as a BAND — the unit a reveal should be attached to. */
const BANDS = new Set(["section", "footer"])
/** Modules that carry an image and are therefore worth moving against the scroll. */
const MEDIA = new Set(["image", "video", "gallery", "carousel"])
/** Headings large enough that a per-word reveal reads as intent, not as jitter. */
const DISPLAY_TEXT = /\btext-(4xl|5xl|6xl|7xl|8xl|9xl)\b/

export interface ChoreographyInput {
  level: Choreography
  module: string
  classes: string
  /** Depth from the document root. A band is shallow; a card in a grid is not. */
  depth: number
  /** Monotonic per-render counter, so alternation is deterministic. */
  seq: number
  /** Does the node already have its own animation? */
  hasAnim: boolean
  /** Is this the first band on the page (the hero)? It should not wait to be scrolled to. */
  isFirstBand: boolean
}

/**
 * The animation a node should get from the theme, or undefined for "nothing".
 *
 * Everything here is derived from facts already present in the tree — module
 * name, utility classes, depth, ordinal — rather than from anything the author
 * has to declare. That is the only way it can work on a block the engine has
 * never seen.
 */
export function choreographFor(i: ChoreographyInput): NodeAnim | undefined {
  if (i.hasAnim) return undefined
  const L = LEVELS[i.level]
  if (!L.reveal) return undefined

  // A band arrives. The first one is the hero and plays on load — waiting to be
  // scrolled into view means it animates when it is already being read.
  if (BANDS.has(i.module) && i.depth <= 2) {
    return i.isFirstBand
      ? { effect: "fade-up", trigger: "load", duration: L.reveal }
      : { effect: "fade-up", trigger: "scroll", duration: L.reveal }
  }

  // A grid hands its children a sequence rather than letting them all land at once.
  if (L.stagger && /\bgrid\b/.test(i.classes) && !/\bgrid-flow\b/.test(i.classes)) {
    return { effect: "fade-up", trigger: "scroll", duration: L.reveal, scroll: { stagger: L.stagger } }
  }

  // Media drifts against the scroll, alternating direction so a row reads as
  // depth rather than as one slab sliding past.
  if (MEDIA.has(i.module) && L.drift) {
    const sign = i.seq % 2 ? 1 : -1
    return {
      effect: "fade",
      trigger: "scroll",
      duration: L.reveal,
      scroll: {
        parallax: Math.round(sign * L.drift * (0.6 + ((i.seq * 37) % 40) / 100)),
        ...(L.tilt ? { tilt: sign * L.tilt } : {}),
        ...(L.depth ? { depth: -L.depth } : {}),
      },
    }
  }

  // A display-sized heading is set word by word. Body copy is not: reading text
  // that assembles itself is worse than reading text that is simply there.
  if (L.text && (i.module === "heading" || i.module === "text") && DISPLAY_TEXT.test(i.classes)) {
    return { effect: "fade", trigger: "scroll", duration: L.reveal, text: "words" }
  }

  return undefined
}
