import { buildDoc, el } from "@brandsapp/builder-core"

/**
 * An empty workspace — one padded root box and nothing else. This is the canvas
 * for trying components out one at a time (drag from Elements, inspect, delete,
 * repeat) without a demo page's markup getting in the way.
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
    classes: "font-body text-base-content bg-base-100 antialiased min-h-screen p-10 flex flex-col gap-6",
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
