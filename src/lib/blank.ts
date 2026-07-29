import { buildDoc, el } from "@brandsapp/builder-core"

/**
 * An empty workspace — one root box and nothing else. This is the canvas for
 * trying components out one at a time (drag from Elements, inspect, delete,
 * repeat) without a demo page's markup getting in the way.
 *
 * The root carries NO padding, margin or gap, exactly like the `page-root` a real
 * page is assembled around. It is a body, not a frame: sections are full-bleed and
 * own their own rhythm, so inset here would be a lie the canvas tells about what
 * publishes — a navbar would sit 40px off every edge and stacked sections would
 * float apart. Same class list as the demo docs' roots, so all three agree.
 *
 * It still carries a real theme: the interactive primitives draw themselves from
 * the doc's daisyUI tokens (--b1/--b3/--bc/--p), so a doc with an empty theme
 * would render them on fallback colours and you'd be testing the wrong thing.
 * Neutral greys + a blue accent here, deliberately plain so components show their
 * own styling rather than a brand's.
 *
 * The demo pages are untouched: /edit/sample and /edit/adejam still load them.
 */
export const BLANK_DOC = buildDoc(
  el("box", {
    classes: "font-body text-base-content bg-base-100 antialiased min-h-screen",
  }),
  {
    theme: {
      colors: {
        primary: "#2563eb",
        secondary: "#0d9488",
        neutral: "#1e293b",
        "base-100": "#ffffff",
        "base-200": "#f6f7f9",
        "base-300": "#e3e6ea",
        "base-content": "#111827",
      },
      fonts: { display: "Inter", body: "Inter" },
      radius: {},
      breakpoints: [
        { id: "tablet", label: "Tablet", maxWidth: 1023 },
        { id: "mobile", label: "Mobile", maxWidth: 767 },
      ],
    },
  }
)
