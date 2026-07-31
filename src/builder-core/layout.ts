/**
 * The LAYOUT SYSTEM — how a page is composed, as distinct from what it contains
 * or what colour it is.
 *
 * The engine could already choose bands from content and dress them from a
 * register, and it still produced pages that looked like each other, because
 * both of those decisions happen INSIDE a fixed skeleton: every band a
 * full-width horizontal strip, every strip a centred column, every column an
 * eyebrow over a heading over a grid. Changing the card border does not change
 * that. A design that reads as different is different in its geometry.
 *
 * So this is chosen once per page, before anything else, and every band asks it
 * where to put things:
 *
 *   STACKED    full-width bands, centred measure. The conventional web page, and
 *              the right answer for a shop where scanning matters more than voice.
 *   RAILED     a sticky column that stays while the page moves past it — the
 *              brand, the section index, the contact. Content runs in the
 *              remaining two-thirds. Reads as a studio site.
 *   EDITORIAL  a twelve-column grid where bands take asymmetric spans and
 *              alternate their offset, so the eye moves diagonally down the page
 *              instead of straight down the middle.
 *   BLEED      inset measure for reading, full-bleed for everything visual, with
 *              media breaking past the container edge. Reads as a magazine.
 *
 * None of these is a skin. Each puts the same content in a materially different
 * place, which is the only thing that makes two pages stop looking alike.
 */

export const LAYOUTS = ["stacked", "railed", "editorial", "bleed"] as const
export type Layout = (typeof LAYOUTS)[number]

export interface LayoutSpec {
  /** Does the page carry a sticky column beside the content? */
  rail: boolean
  /** Wrapper for the scrolling content column. */
  shell: string
  /** How a normal band's inner container is laid out. */
  bandInner: string
  /** Extra classes for the Nth band — where asymmetry lives. */
  bandOffset: (i: number) => string
  /** A band whose content is prose rather than a grid. */
  measure: string
  /** May media escape the content column? */
  bleeds: boolean
  /** Vertical rhythm multiplier applied to the mood's own step. */
  rhythm: number
  /** Where a band's heading sits by default. */
  head: "left" | "centre" | "split" | "aside"
}

export const LAYOUT_SPECS: Record<Layout, LayoutSpec> = {
  stacked: {
    rail: false,
    shell: "mx-auto w-full max-w-7xl px-6 md:px-10",
    bandInner: "flex flex-col gap-12 md:gap-16",
    bandOffset: () => "",
    measure: "max-w-3xl",
    bleeds: false,
    rhythm: 1,
    head: "left",
  },
  railed: {
    rail: true,
    // The rail takes the left third on desktop; content never spans the page.
    shell: "w-full max-w-3xl px-6 md:px-0 md:pr-10",
    bandInner: "flex flex-col gap-10 md:gap-12",
    bandOffset: () => "",
    measure: "max-w-2xl",
    bleeds: false,
    rhythm: 0.85,
    head: "left",
  },
  editorial: {
    rail: false,
    shell: "mx-auto grid w-full max-w-[92rem] grid-cols-12 gap-x-6 px-6 md:px-10",
    // Every band is a grid child; the offsets below decide its span and start.
    bandInner: "flex flex-col gap-10 md:gap-14",
    // Bands alternate between the left two-thirds, the right two-thirds and the
    // full width, so the page reads diagonally rather than as a centred stack.
    bandOffset: (i: number) =>
      [
        "col-span-12 md:col-span-8",
        "col-span-12 md:col-span-7 md:col-start-6",
        "col-span-12",
        "col-span-12 md:col-span-9 md:col-start-3",
        "col-span-12 md:col-span-6 md:col-start-7",
        "col-span-12 md:col-span-10 md:col-start-2",
      ][i % 6],
    measure: "max-w-2xl",
    bleeds: true,
    rhythm: 1.1,
    head: "aside",
  },
  bleed: {
    rail: false,
    shell: "mx-auto w-full max-w-6xl px-6",
    bandInner: "flex flex-col gap-12 md:gap-16",
    bandOffset: () => "",
    measure: "max-w-2xl",
    bleeds: true,
    rhythm: 1.15,
    head: "centre",
  },
}

/**
 * Which systems suit which mood. Not every geometry fits every voice — a
 * brutalist page on a delicate editorial grid is neither — and a shop wants the
 * scannable one more often than the expressive one.
 */
export const LAYOUTS_FOR: Record<string, Layout[]> = {
  luxe: ["editorial", "bleed", "railed"],
  technical: ["railed", "stacked", "editorial"],
  organic: ["bleed", "stacked", "editorial"],
  playful: ["stacked", "bleed", "editorial"],
  brutalist: ["stacked", "railed"],
  calm: ["editorial", "railed", "bleed", "stacked"],
}
