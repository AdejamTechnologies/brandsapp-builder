import { buildDoc, el, iconSvg, type NodeSpec } from "@brandsapp/builder-core"

/**
 * Bolt World — a trial tenant page, built to test the builder against a REAL
 * prospect rather than a demo that flatters it.
 *
 * The business is a one-person repair and construction outfit in Bonny, Rivers
 * State that sells both services and materials. The design language is rebuilt
 * from measured tokens off a reference construction site (square corners, a
 * light uppercase serif at 64–88px, 11px/0.1em uppercase outline buttons, warm
 * paper neutrals, a 1280px container with 20px→55px side gutters) — layout
 * patterns only: no copy, imagery or markup is taken from it.
 *
 * Honesty rules carried from the brief, and they are load-bearing:
 *   - Nothing is claimed that the business has not told us. Every unknown is a
 *     visible [CONFIRM: …] the owner must answer before this goes live.
 *   - No prices are invented. Services read "Quote after inspection", products
 *     "Call or WhatsApp for price" — which is the true state, not a placeholder
 *     dressed as one.
 *   - Every catalogue item carries a "Sample" badge: this is a suggested range,
 *     not the owner's confirmed stock.
 *   - The page takes no payment and books nothing. It hands the order to
 *     WhatsApp, which is the only thing it can honestly promise.
 */

// ── business facts (the only ones we were given) ─────────────────────────────

const PHONE = "+2348104006439"
/** The same number, spaced the way a Nigerian customer reads it. */
const PHONE_DISPLAY = "+234 810 400 6439"
const WA_BASE = "https://wa.me/2348104006439"

/** A WhatsApp deep link carrying a pre-filled, URL-encoded order message. */
const wa = (message: string): string => `${WA_BASE}?text=${encodeURIComponent(message)}`

const orderMsg = (item: string, kind: "service" | "product"): string =>
  kind === "service"
    ? `Hello Bolt World, I would like to request this service: ${item}. My name: . My location in or near Bonny: . What needs doing: .`
    : `Hello Bolt World, I would like to order: ${item}. Quantity: . My name: . Delivery or pickup: . My location in or near Bonny: .`

// ── authoring helpers ────────────────────────────────────────────────────────

const box = (classes: string, ...children: NodeSpec[]): NodeSpec => el("box", { classes }, ...children)
/**
 * A block that fades up as it arrives — the reference's only motion, and the
 * reason this page sets choreography to "none": the automatic "subtle" setting
 * also drifts media INSIDE its container, which is right for full-bleed art and
 * wrong for a thumbnail in a fixed aspect box (the drift exposes the box's own
 * background under the photo).
 */
const rbox = (classes: string, delay: number, ...children: NodeSpec[]): NodeSpec =>
  el("box", { classes, anim: { effect: "fade-up", trigger: "scroll", duration: 700, delay } }, ...children)
const h = (text: string, level: string, classes: string): NodeSpec => el("heading", { props: { text, level }, classes })
const p = (text: string, classes: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes })
const a = (text: string, href: string, classes: string): NodeSpec =>
  el("link", { props: { text, href, linkType: "url" }, classes })
const img = (src: string, alt: string, classes: string): NodeSpec => el("image", { props: { src, alt }, classes })
const ico = (id: string, classes: string): NodeSpec => el("icon", { props: { svg: iconSvg(id) ?? "" }, classes })

const shot = (id: string, w: number, ht: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${ht}&fit=crop&q=80&auto=format`

// Placeholder photography. Real photographs (Unsplash licence, no attribution
// required), standing in for Bolt World's own job photos — see the [CONFIRM]
// list in docs/bolt-world-trial-page.md.
const IMG = {
  site: shot("1541888946425-d81bb19240f5", 1600, 1000),
  plans: shot("1503387762-592deb58ef4e", 900, 1048),
  electrical: shot("1621905251189-08b45d6a269e", 900, 1048),
  strip: shot("1517581177682-a085bb7ffb15", 900, 1048),
  bathroom: shot("1564540583246-934409427776", 900, 1048),
  carpenter: shot("1589939705384-5185137a7f0f", 900, 1048),
  paint: shot("1562259949-e8e7689d7828", 900, 1048),
  rebar: shot("1504307651254-35680f356dfd", 900, 1048),
  drill: shot("1572981779307-38b8cabb2407", 900, 1048),
  house: shot("1600585154340-be6161a56a0c", 1200, 800),
  kitchen: shot("1484154218962-a197022b5858", 1200, 800),
  joinery: shot("1595428774223-ef52624120d2", 800, 1120),
  repairman: shot("1558618666-fcd25c85cd64", 800, 1120),
}

// ── the design system, as measured ───────────────────────────────────────────

/** 1280px container, 20px side gutter on phones opening to 55px (reference: var(--spacing-sides)). */
const SHELL = "mx-auto w-full max-w-[1280px] px-5 md:px-[55px]"
/** Section rhythm. The reference runs ~96px bands on desktop, ~56px on mobile. */
const BAND = "w-full py-14 md:py-24"
/** 11px uppercase, 0.1em tracking — the reference's label voice, used for eyebrows and buttons alike. */
const LABEL = "text-[11px] uppercase tracking-[0.1em] text-base-content/50"
/** Outline button: 1px border, no fill, 142px minimum, hover drops to 50% opacity. */
const BTN =
  "inline-block min-w-[142px] border border-base-content px-[18px] pt-[18px] pb-4 text-center text-[11px] uppercase tracking-[0.1em] text-base-content no-underline transition-opacity hover:opacity-50"
const BTN_LIGHT =
  "inline-block min-w-[142px] border border-base-100 px-[18px] pt-[18px] pb-4 text-center text-[11px] uppercase tracking-[0.1em] text-base-100 no-underline transition-opacity hover:opacity-50"
/** Section heading: light serif, uppercase, 40px → 64px, leading 1. */
const H2 = "font-display text-[2.5rem] md:text-[4rem] font-normal uppercase leading-none text-base-content m-0"
const H3 = "font-display text-[1.375rem] font-normal leading-tight text-base-content m-0"
const BODY = "text-base leading-[1.5] text-base-content/70"

// ── repeating units ──────────────────────────────────────────────────────────

/** The reference's section head: a small label over a serif heading. */
const sectionHead = (label: string, title: string, intro?: string): NodeSpec =>
  rbox(
    "flex flex-col gap-3 md:max-w-[46rem]",
    0,
    p(label, LABEL, "span"),
    h(title, "2", H2),
    ...(intro ? [p(intro, `${BODY} mt-2 md:text-lg`)] : [])
  )

const sampleBadge = (): NodeSpec =>
  p("Sample", "inline-block border border-base-300 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-base-content/45", "span")

/**
 * Catalogue card — the reference's service card (55/64 image, title, short text,
 * arrow link) with the enquiry arrow replaced by the two actions this business
 * actually has: send the order to WhatsApp, or call.
 */
const item = (
  src: string,
  alt: string,
  name: string,
  blurb: string,
  meta: string,
  priceLine: string,
  kind: "service" | "product"
): NodeSpec =>
  rbox(
    "group flex flex-col gap-4",
    0,
    box("overflow-hidden bg-base-200", img(src, alt, "aspect-[55/64] w-full object-cover")),
    box(
      "flex flex-col gap-2",
      box("flex items-center justify-between gap-3", p(meta, LABEL, "span"), sampleBadge()),
      h(name, "3", H3),
      p(blurb, "text-sm leading-[1.5] text-base-content/65 m-0"),
      p(priceLine, "text-sm text-base-content m-0", "span"),
      box(
        "mt-2 flex flex-wrap items-center gap-3",
        a(kind === "service" ? "Add to order" : "Order on WhatsApp", wa(orderMsg(name, kind)), BTN),
        el("link", {
          props: { text: "Call", linkType: "phone", phone: PHONE },
          classes: "text-[11px] uppercase tracking-[0.1em] text-base-content/60 underline underline-offset-4 hover:opacity-50 no-underline",
        })
      )
    )
  )

/** A filter chip row. Presentational on this page — see the report's gaps list. */
const chips = (label: string, values: string[]): NodeSpec =>
  box(
    "flex flex-wrap items-center gap-2",
    p(label, `${LABEL} mr-1`, "span"),
    ...values.map((v) =>
      p(v, "border border-base-300 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-base-content/70", "span")
    )
  )

const step = (n: string, title: string, body: string): NodeSpec =>
  rbox(
    "flex flex-col gap-3 border-t border-base-300 pt-5",
    0,
    p(n, "font-display text-[2rem] leading-none text-primary m-0", "span"),
    h(title, "3", H3),
    p(body, "text-sm leading-[1.5] text-base-content/65 m-0")
  )

const fact = (iconId: string, title: string, sub: string): NodeSpec =>
  box(
    "flex items-start gap-3",
    box("flex size-10 shrink-0 items-center justify-center border border-base-300", ico(iconId, "inline-block w-4 h-4 text-primary")),
    box(
      "flex flex-col gap-1",
      p(title, "text-sm font-medium text-base-content m-0", "span"),
      p(sub, "text-xs leading-[1.5] text-base-content/55 m-0", "span")
    )
  )

const galleryItem = (src: string, caption: string): NodeSpec =>
  el("lightbox", {
    anim: { effect: "fade-up", trigger: "scroll", duration: 700 },
    props: { thumbnailUrl: src, mediaUrl: src, mediaType: "image", caption, group: "work", alt: caption },
    // `relative` is load-bearing: the module positions its own <img> absolutely
    // inside the anchor, so dropping it lets every thumbnail escape its box.
    classes: "relative block aspect-[400/560] w-full overflow-hidden bg-base-200 cursor-zoom-in",
  })

const faq = (q: string, ans: string): NodeSpec =>
  el(
    "accordion-item",
    { props: { title: q }, classes: "border-t border-base-300 px-0 py-1" },
    p(ans, "text-sm leading-[1.6] text-base-content/70 pb-5 m-0")
  )

const footCol = (title: string, links: Array<[string, string]>): NodeSpec =>
  box(
    "flex flex-col items-start gap-3",
    p(title, LABEL, "span"),
    ...links.map(([text, href]) =>
      a(text, href, "text-sm text-base-content/65 no-underline hover:text-base-content")
    )
  )

const navLink = (text: string, href: string): NodeSpec =>
  a(text, href, "text-[11px] uppercase tracking-[0.1em] text-base-content no-underline hover:opacity-50")

// ── catalogue (SAMPLE — the owner confirms the real range) ───────────────────

const SERVICES: NodeSpec[] = [
  item(IMG.repairman, "A worker with hand tools", "Small repair visit", "One visit for the jobs that have been waiting — a leaking tap, a loose socket, a door that will not close.", "Repairs and maintenance", "Quote after inspection", "service"),
  item(IMG.electrical, "An electrician working on a wall box", "Electrical repairs", "Sockets, switches, lights and breakers checked, replaced or re-run.", "Repairs and maintenance", "Quote after inspection", "service"),
  item(IMG.bathroom, "A finished bathroom", "Plumbing repairs", "Taps, pipes, cisterns and shower fittings — traced, repaired or replaced.", "Repairs and maintenance", "Quote after inspection", "service"),
  item(IMG.strip, "A room stripped back for renovation", "Room renovation", "Strip back, patch, plaster and finish one room at a time.", "Renovation and finishing", "Quote after inspection", "service"),
  item(IMG.paint, "A roller putting paint on a wall", "Painting and finishing", "Filling, preparation and painting, inside or outside.", "Renovation and finishing", "Quote after inspection", "service"),
  item(IMG.carpenter, "A carpenter at a workbench", "Fittings and joinery", "Doors, frames, shelving and fitted units measured and hung.", "Renovation and finishing", "Quote after inspection", "service"),
  item(IMG.rebar, "A building site", "Small construction job", "Block work, boundary walls, small extensions and structures.", "Small construction jobs", "Quote after inspection", "service"),
  item(IMG.plans, "Hands marking up a drawing", "Site inspection", "I come, look at the work and write you a quote. [CONFIRM: is an inspection charged, and how much]", "Before any quote", "Quote after inspection", "service"),
]

const PRODUCTS: NodeSpec[] = [
  item(IMG.site, "A building site", "Cement", "Sold by the bag. [CONFIRM: brands stocked]", "Building materials · 50kg bag", "Call or WhatsApp for price", "product"),
  item(IMG.rebar, "Reinforcement and materials on a site", "Sand and gravel", "Sharp sand, plaster sand and gravel. [CONFIRM: measures sold — trip, tipper or bucket]", "Building materials", "Call or WhatsApp for price", "product"),
  item(IMG.house, "A finished building", "Blocks", "[CONFIRM: sizes stocked — 6 inch, 9 inch, solid or hollow]", "Building materials", "Call or WhatsApp for price", "product"),
  item(IMG.drill, "A cordless drill", "Cordless drill", "[CONFIRM: brands and battery sizes stocked]", "Tools and hardware", "Call or WhatsApp for price", "product"),
  item(IMG.carpenter, "Hand tools on a bench", "Hand tools", "Hammers, chisels, saws, spanners, tape measures.", "Tools and hardware", "Call or WhatsApp for price", "product"),
  item(IMG.joinery, "Fitted shelving", "Nails, screws and fixings", "[CONFIRM: sold by packet, by weight, or both]", "Tools and hardware", "Call or WhatsApp for price", "product"),
  item(IMG.bathroom, "Bathroom fittings", "PVC pipes and fittings", "Pipe, elbows, tees, sockets and glue. [CONFIRM: sizes stocked]", "Plumbing and electrical", "Call or WhatsApp for price", "product"),
  item(IMG.kitchen, "A fitted kitchen", "Taps and shower fittings", "Basin taps, sink taps, shower sets and hoses.", "Plumbing and electrical", "Call or WhatsApp for price", "product"),
  item(IMG.electrical, "Electrical work on a wall", "Wire and cable", "[CONFIRM: sold per roll, per metre, or both]", "Plumbing and electrical", "Call or WhatsApp for price", "product"),
  item(IMG.repairman, "A worker with hand tools", "Sockets, switches and breakers", "Surface and flush fittings, breakers and distribution boards.", "Plumbing and electrical", "Call or WhatsApp for price", "product"),
  item(IMG.paint, "Paint being rolled onto a wall", "Emulsion paint", "[CONFIRM: tin sizes and brands stocked]", "Paint and finishing", "Call or WhatsApp for price", "product"),
  item(IMG.strip, "A room being prepared", "Brushes, rollers and filler", "Everything to prepare and finish a wall properly.", "Paint and finishing", "Call or WhatsApp for price", "product"),
]

const catalogue = (heading: string, filters: NodeSpec, cards: NodeSpec[], note: string): NodeSpec =>
  box(
    "flex flex-col gap-8 pt-8",
    box(
      "flex flex-col gap-4 border-b border-base-300 pb-6",
      box(
        "flex flex-wrap items-end justify-between gap-4",
        h(heading, "3", "font-display text-[1.75rem] font-normal uppercase leading-none text-base-content m-0"),
        p(`${cards.length} items`, LABEL, "span")
      ),
      filters
    ),
    box("grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4", ...cards),
    p(note, "text-xs leading-[1.6] text-base-content/50 m-0")
  )

// ── the page ─────────────────────────────────────────────────────────────────

export const BOLT_WORLD_DOC = buildDoc(
  box(
    "font-body text-base-content bg-base-100 antialiased min-h-screen",

    // 0 ── preview notice. This page is a draft full of placeholders; saying so
    //      at the very top is the only honest way to show it to anyone.
    box(
      "w-full bg-primary px-5 py-2.5 md:px-[55px]",
      p(
        "Draft preview for Bolt World. The catalogue below is a suggested range, not confirmed stock, and every [CONFIRM] needs your answer before this goes live.",
        "mx-auto w-full max-w-[1280px] text-[11px] leading-[1.5] text-primary-content",
        "span"
      )
    ),

    // 1 ── utility strip: phone, WhatsApp and the service area, on every screen
    box(
      "w-full border-b border-base-300 bg-base-200 px-5 py-2.5 md:px-[55px]",
      box(
        "mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-3",
        box(
          "flex flex-wrap items-center gap-4",
          box(
            "flex items-center gap-2",
            ico("phone", "inline-block w-3.5 h-3.5 text-base-content/55"),
            el("link", {
              props: { text: PHONE_DISPLAY, linkType: "phone", phone: PHONE },
              classes: "text-[11px] tracking-[0.04em] text-base-content no-underline hover:opacity-50",
            })
          ),
          box(
            "flex items-center gap-2",
            ico("whatsapp", "inline-block w-3.5 h-3.5 text-primary"),
            a("WhatsApp", wa("Hello Bolt World, I have a question."), "text-[11px] tracking-[0.04em] text-base-content no-underline hover:opacity-50")
          )
        ),
        box(
          "flex items-center gap-2",
          ico("map-pin", "inline-block w-3.5 h-3.5 text-base-content/55"),
          p("Bonny, Rivers State — and nearby areas [CONFIRM: how far you travel]", "text-[11px] text-base-content/60", "span")
        )
      )
    ),

    // 2 ── header. The reference's header is static; this one sticks, because the
    //      WhatsApp order button has to stay reachable on a long shop page.
    el(
      "navbar",
      {
        classes: "relative z-40 w-full border-b border-base-300 bg-base-100 px-5 py-5 md:px-[55px]",
        style: { position: "sticky", top: "0" },
      },
      box(
        "mx-auto flex w-full max-w-[1280px] items-center justify-between gap-6",
        box(
          "flex flex-col",
          h("BOLT WORLD", "1", "font-display text-[1.5rem] font-normal uppercase tracking-[0.08em] leading-none text-base-content m-0"),
          p("[CONFIRM: logo]", "text-[9px] uppercase tracking-[0.1em] text-base-content/35 mt-1", "span")
        ),
        el(
          "nav-menu",
          {
            classes:
              "hidden absolute left-0 right-0 top-full z-40 flex-col items-stretch gap-4 border-t border-base-300 bg-base-100 p-6 " +
              "lg:static lg:z-auto lg:flex lg:flex-row lg:items-center lg:gap-7 lg:border-0 lg:bg-transparent lg:p-0",
          },
          navLink("Shop", "#shop"),
          navLink("Services", "#shop"),
          navLink("Products", "#shop"),
          navLink("Recent work", "#work"),
          navLink("About", "#about"),
          navLink("Contact", "#contact")
        ),
        box(
          "hidden flex-1 max-w-xs lg:block",
          el("input", {
            props: { type: "search", name: "q", label: "", placeholder: "Search services and products" },
            classes:
              "h-10 w-full border border-base-300 bg-base-100 px-4 text-[11px] uppercase tracking-[0.08em] text-base-content placeholder:text-base-content/35 focus:border-base-content focus:outline-none",
          })
        ),
        box(
          "flex items-center gap-3",
          a("Order on WhatsApp", wa("Hello Bolt World, I would like to place an order."), `${BTN} hidden sm:inline-block`),
          el("nav-toggle", {
            classes: "lg:hidden inline-flex flex-col justify-center gap-[5px] w-10 h-10 px-[9px] cursor-pointer text-base-content",
          })
        )
      )
    ),

    // 3 ── hero: a short serif statement, a line of place, a paragraph, two
    //      buttons, then the reference's strip of job photographs.
    el(
      "section",
      { classes: "w-full border-b border-base-300 px-5 pt-14 pb-0 md:px-[55px] md:pt-24" },
      box(
        "mx-auto flex w-full max-w-[1280px] flex-col gap-10",
        box(
          "flex flex-col gap-5 md:max-w-[52rem]",
          p("Repairs · Renovation · Building supplies", LABEL, "span"),
          h("Fixed properly, first time", "1", "font-display text-[2.5rem] md:text-[5.5rem] font-normal uppercase leading-[1.05] tracking-[-0.01em] text-base-content m-0"),
          p("Serving Bonny and nearby areas, Rivers State", "font-display text-[1.5rem] md:text-[2rem] font-normal leading-[1.25] text-base-content/70 m-0"),
          p(
            "Bolt World is a one-person repair and construction business. Book a job, or buy the materials and tools to do your own — then send the order straight to WhatsApp and get an answer from the person who will actually do the work.",
            `${BODY} md:text-lg md:max-w-[40rem]`
          ),
          box(
            "mt-2 flex flex-wrap items-center gap-4",
            a("Shop now", "#shop", BTN),
            a("Request a site inspection", "#inspection", BTN)
          )
        ),
        box(
          "grid grid-cols-2 gap-3 md:grid-cols-5",
          img(IMG.electrical, "Electrical work on a wall box", "aspect-[3/2] w-full object-cover"),
          img(IMG.strip, "A room stripped back for renovation", "aspect-[3/2] w-full object-cover"),
          img(IMG.carpenter, "A carpenter at a workbench", "aspect-[3/2] w-full object-cover"),
          img(IMG.paint, "A wall being painted", "aspect-[3/2] w-full object-cover"),
          img(IMG.site, "A building site", "aspect-[3/2] w-full object-cover hidden md:block")
        ),
        p(
          "Photographs above are placeholders. [CONFIRM: send five photos of your own finished jobs to replace them]",
          "text-[11px] text-base-content/45 pb-10 md:pb-16 m-0"
        )
      )
    ),

    // 4 ── intro + the three things we can honestly say
    el(
      "section",
      { classes: `${BAND} border-b border-base-300 px-5 md:px-[55px]` },
      box(
        "mx-auto grid w-full max-w-[1280px] gap-10 md:grid-cols-12",
        box(
          "md:col-span-7 min-w-0",
          sectionHead(
            "What this is",
            "Two catalogues, one WhatsApp order",
            "One side of the shop is work — repairs, renovation and small construction jobs, each quoted after I have seen it. The other side is the materials, tools and supplies to do a job yourself. Pick from either, send the order, and I reply."
          )
        ),
        box(
          "flex flex-col gap-6 md:col-span-5 min-w-0 md:pt-10",
          fact("user3", "One person, start to finish", "You deal with the same person from the first message to the last coat of paint."),
          fact("map-pin", "Bonny, Rivers State", "Work and deliveries in Bonny and nearby areas. [CONFIRM: how far you travel]"),
          fact("whatsapp", "WhatsApp first", "Send a photo of the problem. It is usually faster than describing it.")
        )
      )
    ),

    // 5 ── the shop. Tabs are the Services / Products switch the brief asks for;
    //      the grid, card and filter row are shared by every view.
    el(
      "section",
      { classes: `${BAND} border-b border-base-300 px-5 md:px-[55px]`, props: { elementId: "shop" } },
      box(
        "mx-auto flex w-full max-w-[1280px] flex-col gap-8",
        sectionHead("Shop", "Services and products"),
        el(
          "tabs",
          { classes: "w-full" },
          el(
            "tab-panel",
            { props: { title: "All" }, classes: "w-full" },
            catalogue(
              "A few of each",
              chips("Browse", ["Repairs and maintenance", "Renovation and finishing", "Small construction jobs", "Building materials", "Tools and hardware", "Plumbing and electrical", "Paint and finishing"]),
              [SERVICES[0], SERVICES[3], SERVICES[6], PRODUCTS[0], PRODUCTS[3], PRODUCTS[6], PRODUCTS[10], SERVICES[7]],
              "Services are quoted after I have seen the job. Product prices change with the market, so I give them on the phone or on WhatsApp rather than printing one that will be wrong next week."
            )
          ),
          el(
            "tab-panel",
            { props: { title: "Services" }, classes: "w-full" },
            catalogue(
              "Services",
              chips("Filter", ["All services", "Repairs and maintenance", "Renovation and finishing", "Small construction jobs", "Small job", "Half day", "Full job"]),
              SERVICES,
              "Every service is quoted after a site inspection — I will not give you a figure for work I have not seen. Add what you need to your order and I will arrange a time to come and look."
            )
          ),
          el(
            "tab-panel",
            { props: { title: "Products" }, classes: "w-full" },
            catalogue(
              "Products",
              chips("Filter", ["All products", "Building materials", "Tools and hardware", "Plumbing and electrical", "Paint and finishing", "In stock", "On request"]),
              PRODUCTS,
              "Everything here is sold on request: send the list and I confirm what I have, what it costs today and how soon I can get the rest. [CONFIRM: which items you always keep in stock]"
            )
          )
        )
      )
    ),

    // 6 ── how ordering works. Four steps, and none of them claims more than the
    //      page can do: nothing is paid for or booked here.
    el(
      "section",
      { classes: `${BAND} border-b border-base-300 px-5 md:px-[55px]` },
      box(
        "mx-auto flex w-full max-w-[1280px] flex-col gap-10",
        sectionHead("How it works", "Four steps, no payment on this site"),
        box(
          "grid grid-cols-1 gap-8 md:grid-cols-4",
          step("01", "Choose", "Pick the services and products you need. Add each one to your order."),
          step("02", "Send it", "The order opens in WhatsApp with your list already written out. Add photos if it helps."),
          step("03", "Get a quote", "I confirm prices and availability. Work is quoted after I have seen the job."),
          step("04", "Agree and go", "We agree a time and terms, then I deliver the materials or come and do the work. [CONFIRM: payment terms]")
        )
      )
    ),

    // 7 ── recent work. Lightbox gallery, clearly labelled as placeholders —
    //      a gallery of other people's jobs presented as ours would be a lie.
    el(
      "section",
      { classes: `${BAND} border-b border-base-300 px-5 md:px-[55px]`, props: { elementId: "work" } },
      box(
        "mx-auto flex w-full max-w-[1280px] flex-col gap-10",
        sectionHead("Recent work", "Jobs, finished", "Click any photograph to see it full size."),
        box(
          "grid grid-cols-2 gap-4 md:grid-cols-5",
          galleryItem(IMG.strip, "Placeholder — a room stripped back"),
          galleryItem(IMG.bathroom, "Placeholder — a finished bathroom"),
          galleryItem(IMG.joinery, "Placeholder — fitted shelving"),
          galleryItem(IMG.kitchen, "Placeholder — a finished kitchen"),
          galleryItem(IMG.house, "Placeholder — a completed building")
        ),
        p(
          "These are placeholder photographs, not Bolt World jobs. [CONFIRM: five to ten photos of your own completed work, with a line about each]",
          "text-[11px] text-base-content/45 m-0"
        )
      )
    ),

    // 8 ── about teaser. No years in business, no team, no certifications.
    el(
      "section",
      { classes: `${BAND} border-b border-base-300 px-5 md:px-[55px]`, props: { elementId: "about" } },
      box(
        "mx-auto grid w-full max-w-[1280px] items-center gap-10 md:grid-cols-12",
        box("md:col-span-5 min-w-0", img(IMG.repairman, "A worker with tools", "aspect-[3/2] w-full object-cover")),
        box(
          "flex flex-col gap-5 md:col-span-7 min-w-0",
          p("About", LABEL, "span"),
          h("One person, answerable for the work", "2", H2),
          p(
            "Bolt World is run by one person in Bonny, Rivers State. That means no account manager, no handover to a crew you have never met, and no argument later about who said what: the person who quotes the job is the person who does it.",
            BODY
          ),
          p(
            "The work is repairs and maintenance, renovation and finishing, and small construction jobs — for homeowners, landlords, tenants and small businesses in and around Bonny. The shop side exists for the same customers: if you would rather do the job yourself, buy the materials here instead.",
            BODY
          ),
          p(
            "[CONFIRM: anything else you want customers to know — how long you have been working, trades you trained in, the kind of job you prefer]",
            "text-sm text-base-content/45 m-0"
          ),
          box("mt-2", a("Talk to me", wa("Hello Bolt World, I would like to talk about a job."), BTN))
        )
      )
    ),

    // 9 ── where we work
    el(
      "section",
      { classes: `${BAND} border-b border-base-300 px-5 md:px-[55px]` },
      box(
        "mx-auto grid w-full max-w-[1280px] items-start gap-10 md:grid-cols-12",
        box(
          "flex flex-col gap-5 md:col-span-5 min-w-0",
          p("Where", LABEL, "span"),
          h("Bonny, and near it", "2", H2),
          p(
            "Jobs and deliveries are in Bonny, Rivers State. If you are outside it, send your location on WhatsApp before you order and I will tell you honestly whether I can get there.",
            BODY
          ),
          p("[CONFIRM: the exact area you cover, and whether there is a travel charge outside Bonny]", "text-sm text-base-content/45 m-0"),
          p("[CONFIRM: opening hours — the days and times you answer]", "text-sm text-base-content/45 m-0"),
          box("mt-2 flex flex-wrap gap-4", a("Send your location", wa("Hello Bolt World, here is my location: "), BTN))
        ),
        el("map", {
          props: { provider: "osm", query: "4.4333, 7.1667", zoom: 12, title: "Bonny, Rivers State, Nigeria", tooltip: "Bolt World works in and around Bonny" },
          classes: "w-full h-[22rem] md:col-span-7 min-w-0 border border-base-300",
        })
      )
    ),

    // 10 ── the request form. A real form post, not a decoration — but it books
    //       nothing and takes nothing, and says so.
    el(
      "section",
      { classes: `${BAND} border-b border-base-300 bg-base-200 px-5 md:px-[55px]`, props: { elementId: "inspection" } },
      box(
        "mx-auto grid w-full max-w-[1280px] gap-10 md:grid-cols-12",
        box(
          "flex flex-col gap-5 md:col-span-5 min-w-0",
          p("Site inspection", LABEL, "span"),
          h("Ask me to come and look", "2", H2),
          p(
            "For anything bigger than a single repair, a quote needs a look first. Tell me where you are and what needs doing, and I will arrange a time.",
            BODY
          ),
          p(
            "Sending this does not book a visit or agree a price. I will come back to you to confirm both.",
            "text-sm leading-[1.6] text-base-content/70 border-l-2 border-primary pl-4 m-0"
          )
        ),
        el(
          "form",
          {
            props: {
              successMessage: "Thank you — your request has been sent. I will reply on WhatsApp or call you back.",
              errorMessage: "That did not send. Please message +234 810 400 6439 on WhatsApp instead.",
            },
            classes: "flex w-full max-w-none min-w-0 flex-col gap-5 md:col-span-7",
          },
          box(
            "grid gap-5 sm:grid-cols-2",
            el("input", {
              props: { type: "text", name: "name", label: "Your name", placeholder: "Your name", required: true },
              classes: "h-12 w-full border border-base-300 bg-base-100 px-4 text-sm text-base-content focus:border-base-content focus:outline-none",
            }),
            el("input", {
              props: { type: "tel", name: "phone", label: "Phone or WhatsApp number", placeholder: "080…", required: true },
              classes: "h-12 w-full border border-base-300 bg-base-100 px-4 text-sm text-base-content focus:border-base-content focus:outline-none",
            })
          ),
          box(
            "grid gap-5 sm:grid-cols-2",
            el("input", {
              props: { type: "text", name: "location", label: "Where the work is", placeholder: "Street and area in or near Bonny", required: true },
              classes: "h-12 w-full border border-base-300 bg-base-100 px-4 text-sm text-base-content focus:border-base-content focus:outline-none",
            }),
            el("select-field", {
              props: {
                name: "jobType",
                label: "What kind of work",
                required: true,
                choices: [
                  { label: "Repairs and maintenance", value: "repairs" },
                  { label: "Renovation and finishing", value: "renovation" },
                  { label: "Small construction job", value: "construction" },
                  { label: "Materials or tools only", value: "materials" },
                  { label: "Not sure yet", value: "unsure" },
                ],
              },
              classes: "h-12 w-full border border-base-300 bg-base-100 px-4 text-sm text-base-content focus:border-base-content focus:outline-none",
            })
          ),
          el("input", {
            props: { type: "text", name: "preferredTime", label: "When suits you", placeholder: "A day and a rough time" },
            classes: "h-12 w-full border border-base-300 bg-base-100 px-4 text-sm text-base-content focus:border-base-content focus:outline-none",
          }),
          el("textarea", {
            props: { name: "message", label: "What needs doing", placeholder: "Describe the job. You can send photos on WhatsApp afterwards.", rows: 5, required: true },
            classes: "w-full border border-base-300 bg-base-100 p-4 text-sm text-base-content focus:border-base-content focus:outline-none",
          }),
          box(
            "flex flex-wrap items-center gap-4",
            el("submit", {
              props: { label: "Send request", waitingText: "Sending…" },
              classes:
                "inline-block min-w-[142px] cursor-pointer border border-base-content bg-base-content px-[18px] pt-[18px] pb-4 text-center text-[11px] uppercase tracking-[0.1em] text-base-100 transition-opacity hover:opacity-80",
            }),
            a("Or send it on WhatsApp", wa("Hello Bolt World, I would like to request a site inspection. My location: . What needs doing: ."), "text-[11px] uppercase tracking-[0.1em] text-base-content underline underline-offset-4 hover:opacity-50 no-underline")
          )
        )
      )
    ),

    // 11 ── delivery, estimates and FAQ — every answer the owner still owes
    el(
      "section",
      { classes: `${BAND} border-b border-base-300 px-5 md:px-[55px]` },
      box(
        "mx-auto grid w-full max-w-[1280px] gap-10 md:grid-cols-12",
        box("md:col-span-5 min-w-0", sectionHead("Questions", "Delivery, quotes and payment")),
        box(
          "md:col-span-7 min-w-0",
          el(
            "accordion",
            { classes: "flex w-full flex-col gap-0 p-0" },
            faq(
              "How do I get a price for a job?",
              "Send your order or fill in the inspection form. For anything beyond a single small repair I come and look at the work first, then give you a written quote. [CONFIRM: whether the inspection itself is charged, and how much]"
            ),
            faq(
              "Why are there no prices on the products?",
              "Material prices move week to week. Printing one here that is wrong by the time you read it helps nobody, so send me the list and I will tell you what it costs today."
            ),
            faq(
              "Do you deliver, or do I collect?",
              "[CONFIRM: whether you deliver, the areas you deliver to, what delivery costs, and whether customers can collect — and from where]"
            ),
            faq(
              "How do I pay?",
              "No payment is taken on this website. [CONFIRM: payment terms — deposit before work, balance on completion, bank transfer or cash] [CONFIRM: account details if you want them shown here]"
            ),
            faq(
              "Can I send photos of the problem?",
              "Yes, and please do. A photo of a leak, a crack or a fitting usually tells me more than a paragraph. Send them to +234 810 400 6439 on WhatsApp."
            ),
            faq(
              "What areas do you work in?",
              "Bonny and the areas around it in Rivers State. [CONFIRM: how far you are willing to travel, and whether distance changes the price]"
            )
          )
        )
      )
    ),

    // 12 ── closing contact band
    el(
      "section",
      { classes: "w-full bg-neutral px-5 py-16 md:px-[55px] md:py-24", props: { elementId: "contact" } },
      box(
        "mx-auto flex w-full max-w-[1280px] flex-col items-start gap-8 md:flex-row md:items-end md:justify-between",
        box(
          "flex flex-col gap-4 md:max-w-[36rem]",
          p("Contact", "text-[11px] uppercase tracking-[0.1em] text-base-100/50", "span"),
          h("Tell me what needs doing", "2", "font-display text-[2.5rem] md:text-[4rem] font-normal uppercase leading-none text-base-100 m-0"),
          p("Message on WhatsApp, or call. Bonny, Rivers State.", "text-base leading-[1.5] text-base-100/70 m-0")
        ),
        box(
          "flex flex-wrap items-center gap-4",
          a("WhatsApp +234 810 400 6439", wa("Hello Bolt World, "), BTN_LIGHT),
          el("link", {
            props: { text: "Call now", linkType: "phone", phone: PHONE },
            classes: BTN_LIGHT,
          })
        )
      )
    ),

    // 13 ── footer
    el(
      "footer",
      { classes: "w-full border-t border-base-300 bg-base-100 px-5 py-14 md:px-[55px]" },
      box(
        "mx-auto flex w-full max-w-[1280px] flex-col gap-10",
        box(
          "grid grid-cols-2 gap-10 md:grid-cols-4",
          box(
            "col-span-2 flex flex-col gap-4 md:col-span-1",
            h("BOLT WORLD", "3", "font-display text-[1.25rem] font-normal uppercase tracking-[0.08em] leading-none text-base-content m-0"),
            p("Repairs, renovation and building supplies in Bonny, Rivers State.", "text-sm leading-[1.5] text-base-content/60 max-w-[18rem] m-0"),
            box(
              "flex items-center gap-3",
              ico("whatsapp", "inline-block w-5 h-5 text-base-content/45 hover:text-base-content"),
              ico("phone", "inline-block w-5 h-5 text-base-content/45 hover:text-base-content")
            )
          ),
          footCol("Shop", [["Services", "#shop"], ["Products", "#shop"], ["Recent work", "#work"], ["Search", "#shop"]]),
          footCol("Help", [["How it works", "#shop"], ["Delivery and quotes", "#shop"], ["Request an inspection", "#inspection"], ["Contact", "#contact"]]),
          box(
            "flex flex-col items-start gap-3",
            p("Reach me", LABEL, "span"),
            el("link", { props: { text: PHONE_DISPLAY, linkType: "phone", phone: PHONE }, classes: "text-sm text-base-content no-underline hover:opacity-50" }),
            a("WhatsApp", wa("Hello Bolt World, "), "text-sm text-base-content no-underline hover:opacity-50"),
            p("Bonny, Rivers State, Nigeria", "text-sm text-base-content/60 m-0", "span"),
            p("[CONFIRM: opening hours]", "text-sm text-base-content/40 m-0", "span")
          )
        ),
        box(
          "flex flex-col gap-3 border-t border-base-300 pt-6 sm:flex-row sm:items-center sm:justify-between",
          p("© 2026 Bolt World. Bonny, Rivers State, Nigeria.", "text-[11px] text-base-content/50 m-0", "span"),
          p("No payment is taken on this site. Orders and quotes are confirmed on WhatsApp.", "text-[11px] text-base-content/50 m-0", "span")
        )
      )
    )
  ),
  {
    theme: {
      colors: {
        // A restrained burnt-clay accent — the colour of the work, used the way
        // the reference uses its own: sparingly, for tinted bands and small marks.
        primary: "#9B4A26",
        secondary: "#E2D3C0",
        neutral: "#2E2A26",
        "base-100": "#FFFFFF",
        "base-200": "#F5F1EA",
        "base-300": "#E4DCD0",
        "base-content": "#2B2724",
      },
      // Substitutions, both recorded: Portrait Text Web → Instrument Serif (a
      // light high-contrast serif that holds up uppercase at 88px), BrownLL →
      // Work Sans (the closest grotesque in the builder's font registry).
      fonts: { display: "Instrument Serif", body: "Work Sans" },
      radius: {},
      // radius 0 is the reference's corner language — it sets border-radius: 0
      // almost everywhere. Motion is the reference's own: bands fade in on scroll.
      scale: { density: 1, radius: 0, typeScale: 1, motion: 1, choreography: "none", smoothScroll: false },
      breakpoints: [
        { id: "tablet", label: "Tablet", maxWidth: 1023 },
        { id: "mobile", label: "Mobile", maxWidth: 767 },
      ],
    },
    meta: {
      title: "Bolt World — repairs, renovation and building supplies in Bonny",
      description:
        "A one-person repair and construction business in Bonny, Rivers State. Book repairs, renovation and small construction jobs, or buy materials, tools and supplies — and send the order on WhatsApp.",
    },
  }
)
