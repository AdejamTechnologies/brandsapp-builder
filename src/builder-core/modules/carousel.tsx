/**
 * A carousel that works before the JavaScript does, and after it fails.
 *
 * The usual way to build one of these is a JS-driven track with
 * `transform: translateX()`, which means a page whose script has not loaded
 * shows one slide and no way to reach the others — on a market where a lot of
 * traffic is a mid-range Android on a thin connection, that is the hero band of
 * the homepage not working.
 *
 * So the track is a native horizontal scroller with CSS scroll snapping. With
 * no JavaScript at all it is already a usable carousel: it swipes on a phone,
 * it scrolls with a trackpad, it keyboard-scrolls, and every slide is
 * reachable. The runtime only ADDS what CSS cannot do — dots, arrows, autoplay
 * and the pause control — and it reads position from `scrollLeft`, so the two
 * halves can never disagree about which slide is showing.
 *
 * Autoplay is opt-in, pauses on hover, on focus and when the tab is hidden, and
 * stops for good the moment a visitor touches the track. It is also ignored
 * outright under `prefers-reduced-motion`, where a thing that moves by itself
 * is not a decoration but a problem.
 */

import { createElement } from "react"

import { ADVANCED_DEFAULTS, ADVANCED_SCHEMA, rootAttrs } from "../advanced"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const num = (v: unknown, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}
const bool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1"

/**
 * The scroller, as utility classes rather than runtime CSS.
 *
 * `staticClasses` so the generator emits them on every page that renders a
 * carousel — including the editor canvas, which never injects the runtime. A
 * carousel whose layout lived in the runtime stylesheet would be a column of
 * stacked slides while an author was building it.
 */
const TRACK = "flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
const SLIDE = "shrink-0 w-full snap-start"

const Carousel: ModuleDefinition = {
  name: "carousel",
  category: "layout",
  schema: {
    autoplay: { type: "boolean", label: "advance by itself" },
    /** Seconds, because nobody thinks about a carousel in milliseconds. */
    interval: { type: "number", label: "seconds per slide" },
    dots: { type: "boolean", label: "show dots" },
    arrows: { type: "boolean", label: "show arrows" },
    pauseButton: { type: "boolean", label: "show pause button" },
    loop: { type: "boolean", label: "wrap around at the end" },
    ...ADVANCED_SCHEMA,
  },
  defaults: {
    autoplay: false,
    interval: 6,
    dots: true,
    arrows: false,
    pauseButton: false,
    loop: true,
    ...ADVANCED_DEFAULTS,
  },
  contentModel: { children: "any" },
  defaultClasses: "relative w-full",
  staticClasses: `${TRACK} ${SLIDE}`,
  needsRuntime: true,
  Component: (p: ModuleRenderProps) =>
    createElement(
      "div",
      {
        className: p.className,
        "data-bapp-carousel": "",
        // Attributes rather than props the runtime cannot see: the runtime is a
        // plain script with no access to the node tree.
        ...(bool(p.props.autoplay)
          ? { "data-autoplay": String(Math.max(2, num(p.props.interval, 6)) * 1000) }
          : {}),
        ...(bool(p.props.dots) ? { "data-dots": "" } : {}),
        ...(bool(p.props.arrows) ? { "data-arrows": "" } : {}),
        ...(bool(p.props.pauseButton) ? { "data-pause": "" } : {}),
        ...(bool(p.props.loop) ? { "data-loop": "" } : {}),
        ...rootAttrs(p),
      },
      createElement(
        "div",
        { className: TRACK, "data-bapp-carousel-track": "" },
        p.children
      )
    ),
}

/**
 * One slide.
 *
 * A thin wrapper on purpose: everything inside is ordinary page content, so a
 * slide can hold a headline and a button, or one full-bleed image, without the
 * carousel knowing anything about it.
 */
const Slide: ModuleDefinition = {
  name: "slide",
  category: "layout",
  schema: { tag: { type: "plain" }, ...ADVANCED_SCHEMA },
  defaults: { ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  // Only placeable in a carousel: a slide outside one is a full-width block
  // with a snap alignment nobody can see, which reads as a bug.
  allowedParents: ["carousel"],
  defaultClasses: `${SLIDE} flex flex-col items-center justify-center gap-4 px-6 py-10`,
  Component: (p: ModuleRenderProps) =>
    createElement(
      str(p.props.tag, "div"),
      {
        className: p.className,
        "data-bapp-slide": "",
        ...rootAttrs(p),
      },
      p.children
    ),
}

/**
 * A row that slides sideways, with the two arrows a shop expects.
 *
 * Not a carousel: a carousel shows ONE slide at a time and a row of category
 * doorways shows as many as fit. Built on the same native scroll-snap scroller
 * so it works with the script absent, and the arrows — which the runtime puts
 * wherever the author left `[data-bapp-scroller-prev]` / `-next`, or appends
 * itself — page it by a screenful.
 *
 * The scrollbar is hidden. A visible one under a row of icons is the single
 * detail that makes a hand-built row look unfinished next to a designed one.
 */
const Scroller: ModuleDefinition = {
  name: "scroller",
  category: "layout",
  schema: { ...ADVANCED_SCHEMA },
  defaults: { ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  defaultClasses: "flex w-full gap-8 overflow-x-auto snap-x",
  staticClasses: "flex w-full gap-8 overflow-x-auto snap-x shrink-0 snap-start",
  needsRuntime: true,
  Component: (p: ModuleRenderProps) =>
    createElement(
      "div",
      {
        className: p.className,
        "data-bapp-scroller": "",
        ...rootAttrs(p),
      },
      p.children
    ),
}

export const CAROUSEL_MODULES: ModuleDefinition[] = [Carousel, Slide, Scroller]
export { TRACK as CAROUSEL_TRACK_CLASSES, SLIDE as CAROUSEL_SLIDE_CLASSES }
