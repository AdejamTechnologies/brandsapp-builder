/**
 * The two band-scale motion devices that cannot be expressed as a property on an
 * ordinary box, because each one needs a specific two-element structure.
 *
 *   HORIZONTAL   a section that holds still while its contents travel sideways.
 *                The outer element pins; the inner track slides by exactly
 *                `100vw - 100%` of its own width, so it starts flush with the
 *                left edge and ends flush with the right, whatever it contains
 *                and without the runtime measuring anything.
 *
 *   SCRUB        a video whose playhead is the scroll position. One file instead
 *                of the several hundred stills an image sequence needs — on a
 *                metered connection that is the difference between shipping the
 *                effect and not.
 *
 * Both degrade honestly. Without JavaScript the horizontal section is an ordinary
 * overflow-scrollable row the reader can swipe, and the video is a poster frame.
 */

import { createElement, type CSSProperties } from "react"

import { ADVANCED_DEFAULTS, ADVANCED_SCHEMA, rootAttrs } from "../advanced"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d)

/**
 * A pinned horizontal run. `hold` is how many extra viewport heights of scroll
 * the section consumes; the track's own width decides how far it travels.
 */
const Horizontal: ModuleDefinition = {
  name: "horizontal",
  category: "structure",
  schema: {
    hold: { type: "number", label: "hold (viewports)" },
    gap: { type: "plain", label: "gap between items" },
    ...ADVANCED_SCHEMA,
  },
  defaults: { hold: 2, gap: "2rem", ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  needsRuntime: true,
  // Seeded at insert time in the editor; a generated document sets its own.
  defaultClasses: "relative w-full",
  Component: (p: ModuleRenderProps) => {
    const hold = Math.max(0.5, Math.min(4, num(p.props.hold, 2)))
    const outer: CSSProperties = {
      position: "relative",
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      // Declared as a container so the track can measure against THIS element
      // rather than the viewport. `100vw` includes the scrollbar, which leaves a
      // classic 15px overshoot at the end of the run — the track finishes just
      // past the right edge and the last card is clipped.
      containerType: "inline-size",
    }
    const track: CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: str(p.props.gap, "2rem"),
      width: "max-content",
      maxWidth: "none",
      paddingLeft: "6vw",
      paddingRight: "6vw",
      willChange: "transform",
      // Before the runtime pins anything this is a swipeable row, which is also
      // exactly what it stays as on a device that never runs the script.
      transform: "translate3d(calc(var(--bapp-q, 0) * (100cqw - 100%)), 0, 0)",
    }
    return createElement(
      "section",
      {
        ...rootAttrs(p),
        className: p.className,
        "data-bapp-horizontal": "",
        style: { ...outer, ["--bapp-hold" as string]: String(hold) },
      },
      createElement("div", { className: "bapp-htrack", style: track }, p.children)
    )
  },
}

/** A video scrubbed by scroll progress. */
const Scrub: ModuleDefinition = {
  name: "scrub-video",
  category: "media",
  schema: {
    src: { type: "url", label: "video URL (mp4)" },
    poster: { type: "url", label: "poster image" },
    fit: {
      type: "select",
      label: "fit",
      options: [
        { label: "Cover", value: "cover" },
        { label: "Contain", value: "contain" },
      ],
    },
    ...ADVANCED_SCHEMA,
  },
  defaults: { src: "", poster: "", fit: "cover", ...ADVANCED_DEFAULTS },
  contentModel: { children: "none" },
  needsRuntime: true,
  Component: (p: ModuleRenderProps) => {
    const src = str(p.props.src)
    const poster = str(p.props.poster)
    const style: CSSProperties = {
      width: "100%",
      height: "100%",
      objectFit: str(p.props.fit, "cover") as CSSProperties["objectFit"],
      display: "block",
    }
    return createElement("video", {
      ...rootAttrs(p),
      className: p.className,
      "data-bapp-scrub": "",
      src: src || undefined,
      poster: poster || undefined,
      muted: true,
      playsInline: true,
      preload: "auto",
      // No controls and no autoplay: the reader's scroll is the transport.
      style: { ...style },
    })
  },
}

export const CINEMA_MODULES: ModuleDefinition[] = [Horizontal, Scrub]
