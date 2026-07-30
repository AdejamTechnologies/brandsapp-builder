import { buildDoc, el, type NodeSpec } from "@brandsapp/builder-core"

/**
 * The canvas's starting page: a working storefront.
 *
 * ORIGINAL WORK. Its rhythm is informed by how good commerce pages are paced —
 * a double-height hero, rails broken up by a no-image editorial band, exactly one
 * coloured surface, colour carried by photography rather than the palette — but
 * none of the markup, copy or measurements are taken from any other site. The
 * container, radii and type ramp are ours, because matching someone else's would
 * fight every component in the library.
 *
 * Built ENTIRELY from registered modules and theme tokens, so it is not a fixed
 * design: change the doc theme and the whole page re-skins. That is the point of
 * having it as the default — it is a substrate to build against, not a preset to
 * pick from.
 */

// ── helpers ──────────────────────────────────────────────────────────────────

const box = (classes: string, ...children: NodeSpec[]): NodeSpec => el("box", { classes }, ...children)
const h = (text: string, level: string, classes: string): NodeSpec => el("heading", { props: { text, level }, classes })
const p = (text: string, classes: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes })
const a = (text: string, classes: string): NodeSpec => el("link", { props: { text, href: "#" }, classes })
const btn = (label: string, classes: string): NodeSpec =>
  el("button", { props: { label, linkType: "url", href: "#" }, classes })
const img = (src: string, classes: string, alt = ""): NodeSpec => el("image", { props: { src, alt }, classes })

/** Curated Unsplash ids — the same retail set the page generator uses. */
const shot = (id: string, w = 800, hh = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${hh}&fit=crop&q=80&auto=format`
const wide = (id: string) => `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`

const STOREFRONT = wide("1441986300917-64674bd600d8")
const RACK = shot("1472851294608-062f824d29cc", 1000, 1200)
const BAGS = shot("1441984904996-e0b6ba687e04")
const BOUTIQUE = shot("1483985988355-763728e1935b")
const SHOES = shot("1445205170230-053b83016050")

const SHELL = "w-full max-w-6xl mx-auto px-6"
const EYEBROW = "text-xs font-semibold uppercase tracking-[0.14em] text-base-content/45"
const H2 = "font-display text-3xl md:text-4xl font-semibold tracking-tight text-base-content"
const LEAD = "max-w-xl text-base leading-relaxed text-base-content/60"
const PRIMARY_BTN =
  "inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-content no-underline hover:opacity-90"
const GHOST_BTN =
  "inline-flex h-11 items-center rounded-full border border-base-300 px-6 text-sm font-medium text-base-content no-underline hover:bg-base-200"

/** Section head: eyebrow, title, and an optional link pushed to the right. */
const sectionHead = (eyebrow: string, titleText: string, linkText?: string): NodeSpec =>
  box(
    "flex flex-wrap items-end justify-between gap-4",
    box("flex flex-col gap-2", p(eyebrow, EYEBROW, "span"), h(titleText, "2", H2)),
    ...(linkText ? [a(linkText, "text-sm font-medium text-base-content/70 no-underline hover:text-base-content")] : [])
  )

const productCard = (src: string, name: string, price: string, note?: string): NodeSpec =>
  box(
    "group flex flex-col gap-3",
    box(
      "relative overflow-hidden rounded-2xl bg-base-200",
      img(src, "aspect-square w-full object-cover"),
      ...(note
        ? [p(note, "absolute left-3 top-3 rounded-full bg-base-100 px-2.5 py-1 text-[11px] font-semibold text-base-content", "span")]
        : [])
    ),
    box(
      "flex items-baseline justify-between gap-3",
      p(name, "text-sm font-medium text-base-content", "span"),
      p(price, "text-sm text-base-content/60", "span")
    )
  )

const categoryTile = (src: string, label: string): NodeSpec =>
  box(
    "flex flex-col items-center gap-3",
    box("overflow-hidden rounded-full bg-base-200", img(src, "size-24 object-cover md:size-28")),
    p(label, "text-sm font-medium text-base-content", "span")
  )

const faq = (q: string, ans: string): NodeSpec =>
  el(
    "accordion-item",
    { props: { title: q }, classes: "rounded-2xl border border-base-300 bg-base-100 px-5" },
    p(ans, "text-sm leading-relaxed text-base-content/70")
  )

// ── the page ─────────────────────────────────────────────────────────────────

export const STOREFRONT_DOC = buildDoc(
  box(
    "font-body text-base-content bg-base-100 antialiased min-h-screen",

    // 1 ── header
    el(
      "navbar",
      { classes: "relative w-full border-b border-base-300 bg-base-100" },
      box(
        `${SHELL} flex items-center justify-between gap-6 py-4`,
        h("Marée", "3", "font-display text-xl font-bold tracking-tight text-base-content"),
        el(
          "nav-menu",
          {
            classes:
              "hidden absolute left-0 right-0 top-full z-40 flex-col items-stretch gap-1 border-t border-base-300 bg-base-100 p-4 shadow-lg " +
              "md:static md:z-auto md:flex md:flex-row md:items-center md:gap-8 md:border-0 md:bg-transparent md:p-0 md:shadow-none",
          },
          a("New in", "text-sm text-base-content/70 hover:text-base-content no-underline"),
          a("Women", "text-sm text-base-content/70 hover:text-base-content no-underline"),
          a("Men", "text-sm text-base-content/70 hover:text-base-content no-underline"),
          a("Objects", "text-sm text-base-content/70 hover:text-base-content no-underline")
        ),
        box(
          "flex items-center gap-4",
          a("Search", "hidden text-sm text-base-content/70 no-underline hover:text-base-content sm:block"),
          a("Account", "hidden text-sm text-base-content/70 no-underline hover:text-base-content sm:block"),
          box(
            "relative",
            a("Bag", "text-sm font-medium text-base-content no-underline"),
            p(
              "2",
              "absolute -right-3 -top-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-content",
              "span"
            )
          )
        ),
        el("nav-toggle", {
          classes: "md:hidden inline-flex flex-col justify-center gap-[5px] w-10 h-10 px-[9px] cursor-pointer text-base-content",
        })
      )
    ),

    // 2 ── hero: the one band with double padding
    el(
      "section",
      { classes: "w-full px-6 py-20 md:py-28" },
      box(
        "mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-16",
        box(
          "flex flex-col items-start gap-6",
          p("Autumn collection", EYEBROW, "span"),
          h("Pieces made to be kept", "1", "font-display text-4xl font-semibold leading-[1.05] tracking-tight text-base-content md:text-6xl"),
          p(
            "Small runs, natural fibres, and finishing done by hand in Lagos. Nothing here is designed to be replaced next season.",
            LEAD
          ),
          box("flex flex-wrap items-center gap-3", btn("Shop the collection", PRIMARY_BTN), btn("Our materials", GHOST_BTN))
        ),
        box("overflow-hidden rounded-3xl bg-base-200", img(RACK, "h-full w-full object-cover"))
      )
    ),

    // 3 ── categories
    el(
      "section",
      { classes: "w-full px-6 py-14" },
      box(
        `${SHELL} flex flex-col gap-8`,
        sectionHead("Browse", "Shop by category", "All categories"),
        box(
          "grid grid-cols-2 gap-6 sm:grid-cols-4",
          categoryTile(BAGS, "Bags"),
          categoryTile(SHOES, "Footwear"),
          categoryTile(BOUTIQUE, "Ready to wear"),
          categoryTile(STOREFRONT, "Objects")
        )
      )
    ),

    // 4 ── first product rail
    el(
      "section",
      { classes: "w-full px-6 py-14" },
      box(
        `${SHELL} flex flex-col gap-8`,
        sectionHead("Just landed", "New this week", "View all"),
        box(
          "grid grid-cols-2 gap-6 md:grid-cols-4",
          productCard(BAGS, "Woven tote", "₦48,000", "New"),
          productCard(SHOES, "Leather sandal", "₦36,500"),
          productCard(BOUTIQUE, "Linen shirt", "₦29,000"),
          productCard(RACK, "Wool overshirt", "₦72,000", "Low stock")
        )
      )
    ),

    // 5 ── editorial break: no images, so the eye rests before the grid
    el(
      "section",
      { classes: "w-full px-6 py-20" },
      box(
        "mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center",
        p("Why we make less", EYEBROW, "span"),
        h(
          "We would rather sell out than discount",
          "2",
          "font-display text-3xl font-semibold leading-tight tracking-tight text-base-content md:text-5xl"
        ),
        p(
          "Every run is costed so it works at full price. That keeps the makers paid properly and means what you buy holds its value.",
          "text-base leading-relaxed text-base-content/60"
        ),
        btn("Read our standards", GHOST_BTN)
      )
    ),

    // 6 ── the main grid
    el(
      "section",
      { classes: "w-full px-6 py-14" },
      box(
        `${SHELL} flex flex-col gap-8`,
        sectionHead("The collection", "Everything in stock"),
        box(
          "grid grid-cols-2 gap-6 md:grid-cols-4",
          productCard(BOUTIQUE, "Cotton trouser", "₦34,000"),
          productCard(BAGS, "Market bag", "₦22,500"),
          productCard(RACK, "Quilted jacket", "₦96,000", "New"),
          productCard(SHOES, "Suede loafer", "₦58,000"),
          productCard(STOREFRONT, "Ceramic vase", "₦18,000"),
          productCard(BOUTIQUE, "Silk scarf", "₦26,000"),
          productCard(SHOES, "Canvas sneaker", "₦41,000"),
          productCard(BAGS, "Card holder", "₦14,500", "Low stock")
        )
      )
    ),

    // 7 ── the page's only coloured surface
    el(
      "section",
      { classes: "w-full px-6 py-14" },
      box(
        "mx-auto flex w-full max-w-6xl flex-col items-start gap-6 rounded-3xl bg-primary/10 p-10 md:flex-row md:items-center md:justify-between md:p-14",
        box(
          "flex flex-col gap-3",
          h("Free delivery in Lagos over ₦50,000", "2", "font-display text-2xl font-semibold tracking-tight text-base-content md:text-3xl"),
          p("Nationwide in two to four working days. Returns are free for fourteen days.", "max-w-md text-sm leading-relaxed text-base-content/60")
        ),
        btn("Start shopping", PRIMARY_BTN)
      )
    ),

    // 8 ── FAQ
    el(
      "section",
      { classes: "w-full px-6 py-14" },
      box(
        "mx-auto flex w-full max-w-3xl flex-col gap-8",
        sectionHead("Help", "Before you order"),
        el(
          "accordion",
          { classes: "flex flex-col gap-2 p-2" },
          faq("How long does delivery take?", "Two to four working days nationwide, next day within Lagos on orders placed before noon."),
          faq("Can I return something?", "Yes — fourteen days, unworn, with the tags on. Returns within Lagos are collected free."),
          faq("Do you restock sold-out pieces?", "Rarely. Runs are small on purpose, so if something sells out it usually stays that way."),
          faq("How do I find my size?", "Every product page carries the garment's own measurements rather than a generic chart.")
        )
      )
    ),

    // 9 ── footer
    el(
      "footer",
      { classes: "w-full border-t border-base-300 bg-base-100 px-6 py-14" },
      box(
        "mx-auto flex w-full max-w-6xl flex-col gap-10",
        box(
          "grid grid-cols-2 gap-8 md:grid-cols-4",
          box(
            "flex flex-col gap-3",
            h("Marée", "3", "font-display text-lg font-bold tracking-tight text-base-content"),
            p("Made in small runs in Lagos, sold direct.", "max-w-xs text-sm leading-relaxed text-base-content/60")
          ),
          footerCol("Shop", ["New in", "Ready to wear", "Footwear", "Objects"]),
          footerCol("Help", ["Delivery", "Returns", "Size guide", "Contact"]),
          footerCol("Studio", ["Our standards", "Makers", "Stockists", "Journal"])
        ),
        box(
          "flex flex-col gap-4 border-t border-base-300 pt-6 sm:flex-row sm:items-center sm:justify-between",
          p("© 2026 Marée. All rights reserved.", "text-sm text-base-content/50", "span"),
          box(
            "flex items-center gap-5",
            a("Terms", "text-sm text-base-content/60 hover:text-base-content no-underline"),
            a("Privacy", "text-sm text-base-content/60 hover:text-base-content no-underline"),
            a("Instagram", "text-sm text-base-content/60 hover:text-base-content no-underline")
          )
        )
      )
    )
  ),
  {
    theme: {
      colors: {
        primary: "#8a5a3c",
        secondary: "#3f4a3c",
        neutral: "#231f1e",
        "base-100": "#ffffff",
        "base-200": "#f5f2ee",
        "base-300": "#e6e0d8",
        "base-content": "#231f1e",
      },
      fonts: { display: "Fraunces", body: "Inter" },
      radius: {},
      breakpoints: [
        { id: "tablet", label: "Tablet", maxWidth: 1023 },
        { id: "mobile", label: "Mobile", maxWidth: 767 },
      ],
    },
  }
)

function footerCol(title: string, links: string[]): NodeSpec {
  return box(
    "flex flex-col items-start gap-2.5",
    p(title, "text-sm font-semibold text-base-content", "span"),
    ...links.map((l) => a(l, "text-sm text-base-content/60 hover:text-base-content no-underline"))
  )
}
