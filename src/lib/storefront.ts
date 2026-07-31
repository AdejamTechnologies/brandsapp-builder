import { buildDoc, el, iconSvg, type NodeSpec } from "@brandsapp/builder-core"

/**
 * The canvas's starting page: a full department-store storefront.
 *
 * The GENRE is deliberate. A shop like this is dense and utilitarian, not
 * editorial: a utility strip above the header, search as a first-class control
 * rather than a link, a full-bleed tinted hero carrying product art, one
 * saturated brand colour, and a grid that shows price, discount and rating on
 * every card. An airy boutique layout is a different product and reads as one.
 *
 * Original content throughout — copy, imagery, palette and measurements are ours.
 * Assembled ENTIRELY from registered modules and theme tokens, so changing the
 * doc theme re-skins the whole page. It is a substrate to build against.
 */

// ── helpers ──────────────────────────────────────────────────────────────────

const box = (classes: string, ...children: NodeSpec[]): NodeSpec => el("box", { classes }, ...children)
const h = (text: string, level: string, classes: string): NodeSpec => el("heading", { props: { text, level }, classes })
const p = (text: string, classes: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes })
const a = (text: string, classes: string): NodeSpec => el("link", { props: { text, href: "#" }, classes })
const btn = (label: string, classes: string): NodeSpec =>
  el("button", { props: { label, linkType: "url", href: "#" }, classes })
const img = (src: string, classes: string, alt = ""): NodeSpec => el("image", { props: { src, alt }, classes })
const ico = (id: string, classes: string): NodeSpec => el("icon", { props: { svg: iconSvg(id) ?? "" }, classes })

const shot = (id: string, w = 800, hh = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${hh}&fit=crop&q=80&auto=format`
const wide = (id: string) => `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`

const HERO = wide("1483985988355-763728e1935b")
const BAGS = shot("1441984904996-e0b6ba687e04")
const SHOES = shot("1445205170230-053b83016050")
const RACK = shot("1472851294608-062f824d29cc")
const SHOP = shot("1441986300917-64674bd600d8")

const SHELL = "mx-auto w-full max-w-7xl px-6"
const H2 = "font-display text-2xl md:text-3xl font-bold tracking-tight text-base-content"
const PILL = "inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-content no-underline hover:opacity-90"
const UTIL_LINK = "text-xs text-primary-content/80 hover:text-primary-content no-underline"
const NAV_LINK = "text-sm font-semibold text-base-content hover:text-primary no-underline"

/** Section head with a "see all" pushed right — the shop's repeating unit. */
const head = (titleText: string, linkText = "See all"): NodeSpec =>
  box(
    "flex items-end justify-between gap-4",
    h(titleText, "2", H2),
    a(linkText, "text-sm font-semibold text-primary no-underline hover:underline")
  )

const stars = (n: string): NodeSpec =>
  box(
    "flex items-center gap-1",
    ico("star", "inline-block w-3.5 h-3.5 text-warning"),
    p(n, "text-xs text-base-content/50", "span")
  )

/** Product card: image, discount flag, name, price with the old one struck. */
const product = (src: string, name: string, price: string, was: string, rating: string, flag?: string): NodeSpec =>
  box(
    "flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-3",
    box(
      "relative overflow-hidden rounded-xl bg-base-200",
      img(src, "aspect-square w-full object-cover"),
      ...(flag
        ? [p(flag, "absolute left-2 top-2 rounded-full bg-error px-2 py-0.5 text-[11px] font-bold text-error-content", "span")]
        : []),
      box(
        "absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-base-100 shadow-sm",
        ico("heart", "inline-block w-4 h-4 text-base-content/60")
      )
    ),
    box(
      "flex flex-col gap-1.5 px-1 pb-1",
      p(name, "text-sm font-medium leading-snug text-base-content", "span"),
      stars(rating),
      box(
        "flex items-baseline gap-2",
        p(price, "text-base font-bold text-base-content", "span"),
        p(was, "text-xs text-base-content/40 line-through", "span")
      )
    )
  )

const category = (src: string, label: string, count: string): NodeSpec =>
  box(
    "flex flex-col items-center gap-2.5 rounded-2xl border border-base-300 bg-base-100 p-4",
    box("overflow-hidden rounded-full bg-base-200", img(src, "size-16 object-cover")),
    p(label, "text-sm font-semibold text-base-content", "span"),
    p(count, "text-xs text-base-content/50", "span")
  )

const promoCard = (src: string, kicker: string, titleText: string, cta: string, tone: string): NodeSpec =>
  box(
    `relative overflow-hidden rounded-3xl ${tone} p-8`,
    box(
      "relative z-10 flex max-w-[60%] flex-col items-start gap-3",
      p(kicker, "text-xs font-bold uppercase tracking-widest text-base-content/50", "span"),
      h(titleText, "3", "font-display text-xl font-bold leading-tight text-base-content md:text-2xl"),
      a(cta, "text-sm font-semibold text-primary no-underline hover:underline")
    ),
    img(src, "pointer-events-none absolute -right-6 bottom-0 h-40 w-40 rounded-2xl object-cover md:h-48 md:w-48")
  )

const trust = (id: string, titleText: string, sub: string): NodeSpec =>
  box(
    "flex items-center gap-3",
    box("flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10", ico(id, "inline-block w-5 h-5 text-primary")),
    box(
      "flex flex-col",
      p(titleText, "text-sm font-semibold text-base-content", "span"),
      p(sub, "text-xs text-base-content/55", "span")
    )
  )

const footCol = (titleText: string, links: string[]): NodeSpec =>
  box(
    "flex flex-col items-start gap-2.5",
    p(titleText, "text-sm font-bold text-base-content", "span"),
    ...links.map((l) => a(l, "text-sm text-base-content/60 hover:text-base-content no-underline"))
  )

const payPill = (label: string): NodeSpec =>
  box(
    "inline-flex items-center rounded-md border border-base-300 bg-base-100 px-2.5 py-1.5",
    p(label, "text-[11px] font-bold text-base-content/70", "span")
  )

// ── the page ─────────────────────────────────────────────────────────────────

export const STOREFRONT_DOC = buildDoc(
  box(
    "font-body text-base-content bg-base-100 antialiased min-h-screen",

    // 1 ── utility strip: the thing that says "shop", not "portfolio"
    box(
      "w-full bg-primary px-6 py-2",
      box(
        `${SHELL} flex flex-wrap items-center justify-between gap-3 px-0`,
        box(
          "flex items-center gap-2",
          ico("phone", "inline-block w-3.5 h-3.5 text-primary-content/70"),
          p("+234 800 000 0000", "text-xs text-primary-content/80", "span")
        ),
        box(
          "flex items-center gap-3",
          p("Free delivery on orders over ₦50,000", "text-xs font-medium text-primary-content", "span"),
          p("|", "text-xs text-primary-content/30", "span"),
          a("Shop now", "text-xs font-semibold text-primary-content no-underline underline-offset-2 hover:underline")
        ),
        box("flex items-center gap-5", a("English", UTIL_LINK), a("Lagos, NG", UTIL_LINK))
      )
    ),

    // 2 ── header: search is a control, not a link
    el(
      "navbar",
      { classes: "relative w-full border-b border-base-300 bg-base-100 px-6 py-4" },
      box(
        `${SHELL} flex items-center justify-between gap-6 px-0`,
        box(
          "flex items-center gap-2",
          box("flex size-9 items-center justify-center rounded-xl bg-primary", ico("shopping-bag3", "inline-block w-5 h-5 text-primary-content")),
          h("Kandi", "3", "font-display text-2xl font-extrabold tracking-tight text-base-content")
        ),
        el(
          "nav-menu",
          {
            classes:
              "hidden absolute left-0 right-0 top-full z-40 flex-col items-stretch gap-1 border-t border-base-300 bg-base-100 p-4 shadow-lg " +
              "lg:static lg:z-auto lg:flex lg:flex-row lg:items-center lg:gap-7 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none",
          },
          a("Categories", NAV_LINK),
          a("Deals", NAV_LINK),
          a("What's new", NAV_LINK),
          a("Delivery", NAV_LINK)
        ),
        box(
          "hidden flex-1 max-w-md md:block",
          box(
            "relative",
            el("input", {
              props: { type: "search", name: "q", label: "", placeholder: "Search for a product" },
              classes:
                "h-11 w-full rounded-full border border-base-300 bg-base-200 pl-5 pr-12 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/25",
            }),
            box(
              "absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-primary",
              ico("search", "inline-block w-4 h-4 text-primary-content")
            )
          )
        ),
        box(
          "flex items-center gap-5",
          box("hidden items-center gap-2 sm:flex", ico("user3", "inline-block w-5 h-5 text-base-content/70"), a("Account", "text-sm font-medium text-base-content no-underline")),
          box(
            "relative flex items-center gap-2",
            ico("shopping-cart2", "inline-block w-5 h-5 text-base-content/70"),
            a("Cart", "text-sm font-medium text-base-content no-underline"),
            p("2", "absolute -left-2 -top-2 flex size-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-error-content", "span")
          )
        ),
        el("nav-toggle", {
          classes: "lg:hidden inline-flex flex-col justify-center gap-[5px] w-10 h-10 px-[9px] cursor-pointer text-base-content",
        })
      )
    ),

    // 3 ── hero: full-bleed tinted band, art to the edge
    el(
      "section",
      { classes: "w-full bg-base-200" },
      box(
        "mx-auto grid w-full max-w-7xl items-center gap-8 px-6 py-14 md:grid-cols-2 md:gap-6 md:py-0",
        box(
          "flex flex-col items-start gap-6 md:py-20",
          box(
            "inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5",
            p("Season sale", "text-xs font-bold uppercase tracking-widest text-primary", "span"),
            p("up to 50% off", "text-xs font-semibold text-primary/70", "span")
          ),
          h(
            "Everything for the home, in one shop",
            "1",
            "font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-base-content md:text-6xl"
          ),
          p(
            "Groceries, electronics, fashion and homeware — delivered across Nigeria in two to four days.",
            "max-w-md text-base leading-relaxed text-base-content/60"
          ),
          box("flex flex-wrap items-center gap-4", btn("Start shopping", PILL), a("Track an order", "text-sm font-semibold text-base-content no-underline underline underline-offset-4")),
          box(
            "mt-2 flex flex-wrap items-center gap-6",
            trust("truck", "Free delivery", "Over ₦50,000"),
            trust("refund2", "14-day returns", "No questions"),
            trust("secure-payment", "Secure payment", "Card or transfer")
          )
        ),
        box("relative h-64 w-full overflow-hidden md:h-[30rem]", img(HERO, "h-full w-full object-cover md:rounded-bl-[3rem]"))
      )
    ),

    // 4 ── categories
    el(
      "section",
      { classes: "w-full px-6 py-12" },
      box(
        `${SHELL} flex flex-col gap-6 px-0`,
        head("Shop by category", "All categories"),
        box(
          "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6",
          category(BAGS, "Bags", "128 items"),
          category(SHOES, "Footwear", "96 items"),
          category(RACK, "Fashion", "240 items"),
          category(SHOP, "Grocery", "310 items"),
          category(BAGS, "Home", "88 items"),
          category(SHOES, "Beauty", "54 items")
        )
      )
    ),

    // 5 ── deals grid
    el(
      "section",
      { classes: "w-full px-6 py-12" },
      box(
        `${SHELL} flex flex-col gap-6 px-0`,
        head("Deals of the week"),
        box(
          "grid grid-cols-2 gap-4 md:grid-cols-4",
          product(BAGS, "Woven market tote", "₦18,900", "₦26,000", "4.8", "-27%"),
          product(SHOES, "Everyday leather sandal", "₦24,500", "₦32,000", "4.6", "-23%"),
          product(RACK, "Cotton overshirt", "₦15,200", "₦19,000", "4.4", "-20%"),
          product(SHOP, "Ceramic serving bowl", "₦9,800", "₦13,500", "4.9", "-27%")
        )
      )
    ),

    // 6 ── two promo banners
    el(
      "section",
      { classes: "w-full px-6 py-4" },
      box(
        `${SHELL} grid gap-5 md:grid-cols-2 px-0`,
        promoCard(SHOES, "Weekend only", "Second pair half price", "Shop footwear", "bg-primary/10"),
        promoCard(BAGS, "New arrivals", "Fresh bags, restocked weekly", "Shop bags", "bg-warning/15")
      )
    ),

    // 7 ── best sellers
    el(
      "section",
      { classes: "w-full px-6 py-12" },
      box(
        `${SHELL} flex flex-col gap-6 px-0`,
        head("Best sellers"),
        box(
          "grid grid-cols-2 gap-4 md:grid-cols-4",
          product(SHOP, "Stovetop coffee pot", "₦21,000", "₦25,000", "4.7"),
          product(RACK, "Linen day dress", "₦34,000", "₦41,000", "4.5", "Low stock"),
          product(BAGS, "Leather card holder", "₦11,400", "₦14,000", "4.8"),
          product(SHOES, "Canvas trainer", "₦28,600", "₦35,000", "4.3", "-18%")
        )
      )
    ),

    // 8 ── the one saturated band
    el(
      "section",
      { classes: "w-full px-6 py-12" },
      box(
        `${SHELL} flex flex-col items-start gap-6 rounded-3xl bg-primary p-10 md:flex-row md:items-center md:justify-between md:p-14 px-0`,
        box(
          "flex flex-col gap-3 px-10 md:px-0",
          h("Get ₦2,000 off your first order", "2", "font-display text-2xl font-extrabold tracking-tight text-primary-content md:text-3xl"),
          p("Join the list for early access to sales and new stock.", "max-w-md text-sm leading-relaxed text-primary-content/75")
        ),
        el(
          "form",
          { classes: "flex w-full max-w-md gap-2 px-10 md:px-0" },
          el("input", {
            props: { type: "email", name: "email", label: "", placeholder: "Enter your email", required: true },
            classes: "h-12 flex-1 rounded-full border-0 bg-base-100 px-5 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none",
          }),
          el("submit", {
            props: { label: "Join" },
            classes: "inline-flex h-12 shrink-0 cursor-pointer items-center rounded-full bg-base-content px-7 text-sm font-semibold text-base-100 hover:opacity-90",
          })
        )
      )
    ),

    // 9 ── footer
    el(
      "footer",
      { classes: "w-full border-t border-base-300 bg-base-100 px-6 py-14" },
      box(
        `${SHELL} flex flex-col gap-10 px-0`,
        box(
          "grid grid-cols-2 gap-8 md:grid-cols-5",
          box(
            "col-span-2 flex flex-col gap-3",
            box(
              "flex items-center gap-2",
              box("flex size-8 items-center justify-center rounded-lg bg-primary", ico("shopping-bag3", "inline-block w-4 h-4 text-primary-content")),
              h("Kandi", "3", "font-display text-xl font-extrabold tracking-tight text-base-content")
            ),
            p("A department store for everyday things, delivered across Nigeria.", "max-w-xs text-sm leading-relaxed text-base-content/60"),
            box(
              "flex items-center gap-4",
              ico("facebook-circle", "inline-block w-5 h-5 text-base-content/45 hover:text-base-content"),
              ico("instagram", "inline-block w-5 h-5 text-base-content/45 hover:text-base-content"),
              ico("twitter-x", "inline-block w-5 h-5 text-base-content/45 hover:text-base-content")
            )
          ),
          footCol("Shop", ["Categories", "Deals", "New arrivals", "Gift cards"]),
          footCol("Help", ["Delivery", "Returns", "Track order", "Contact us"]),
          footCol("Company", ["About", "Careers", "Stockists", "Press"])
        ),
        box(
          "flex flex-col gap-4 border-t border-base-300 pt-6 sm:flex-row sm:items-center sm:justify-between",
          p("© 2026 Kandi Stores. All rights reserved.", "text-sm text-base-content/50", "span"),
          box("flex flex-wrap items-center gap-2", payPill("Visa"), payPill("Mastercard"), payPill("Verve"), payPill("Transfer"))
        )
      )
    )
  ),
  {
    theme: {
      colors: {
        primary: "#15452c",
        secondary: "#f4a72c",
        neutral: "#14211a",
        "base-100": "#ffffff",
        "base-200": "#eef2ee",
        "base-300": "#dfe5e0",
        "base-content": "#14211a",
      },
      fonts: { display: "Poppins", body: "Inter" },
      radius: {},
      // A shop, not a showreel: bands arrive and imagery drifts, and nothing on
      // the page had to be annotated for that to be true.
      scale: { density: 1, radius: 1, typeScale: 1, motion: 1, choreography: "subtle", smoothScroll: false },
      breakpoints: [
        { id: "tablet", label: "Tablet", maxWidth: 1023 },
        { id: "mobile", label: "Mobile", maxWidth: 767 },
      ],
    },
  }
)
