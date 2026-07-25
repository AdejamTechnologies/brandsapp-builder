import { buildDoc, el, type NodeSpec } from "@brandsapp/builder-core"

// ── authoring helpers ─────────────────────────────────────────────────────────
const box = (classes: string, ...ch: NodeSpec[]): NodeSpec => el("box", { classes }, ...ch)
const rbox = (classes: string, delay: number, ...ch: NodeSpec[]): NodeSpec =>
  el("box", { classes, anim: { effect: "fade-up", trigger: "scroll", duration: 700, delay } }, ...ch)
const h = (text: string, level: string, classes: string): NodeSpec => el("heading", { props: { text, level }, classes })
const p = (text: string, classes: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes })
const btn = (label: string, classes: string): NodeSpec => el("button", { props: { label, href: "#" }, classes })
const navlink = (text: string): NodeSpec =>
  el("link", { props: { text, href: "#" }, classes: "text-sm text-stone-600 hover:text-stone-900 no-underline" })
const footlink = (text: string): NodeSpec =>
  el("link", { props: { text, href: "#" }, classes: "text-sm text-stone-400 hover:text-white no-underline" })

const PRIMARY = "inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#c2603f] text-white text-sm font-medium hover:bg-[#a94f30] no-underline"
const GHOST = "inline-flex items-center justify-center px-6 py-3 rounded-full border border-stone-300 text-stone-900 text-sm font-medium hover:bg-stone-50 no-underline"

const moduleCard = (title: string, body: string, delay: number): NodeSpec =>
  rbox(
    "p-7 rounded-2xl border border-stone-200 bg-white",
    delay,
    box(
      "flex items-center justify-between mb-6",
      box("w-11 h-11 rounded-xl bg-stone-900"),
      p("LIVE", "inline-block px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold tracking-wide", "span")
    ),
    h(title, "3", "font-serif text-xl text-stone-900 mb-2"),
    p(body, "text-stone-500 text-sm leading-relaxed m-0")
  )

const step = (n: string, title: string, body: string, delay: number): NodeSpec =>
  rbox(
    "",
    delay,
    p(n, "font-serif text-4xl text-[#c2603f] mb-3 m-0"),
    h(title, "3", "text-lg font-semibold text-stone-900 mb-2"),
    p(body, "text-stone-500 text-sm leading-relaxed m-0")
  )

const faqItem = (title: string, answer: string): NodeSpec =>
  el(
    "accordion-item",
    { props: { title }, classes: "border border-stone-200 rounded-2xl px-5" },
    p(answer, "text-stone-500 text-sm leading-relaxed pb-1 m-0")
  )

const footCol = (title: string, links: string[]): NodeSpec =>
  box("flex flex-col gap-3", p(title, "text-xs font-semibold uppercase tracking-wider text-stone-500 m-0", "span"), ...links.map(footlink))

/** An Execufy-inspired editorial landing page — capability showcase (original copy). */
export const SAMPLE_DOC = buildDoc(
  box(
    "font-sans text-stone-900 bg-[#fdfcfa] antialiased",

    // ── nav ──
    box(
      "flex items-center justify-between px-8 py-5 max-w-6xl mx-auto",
      h("Servio", "3", "font-serif text-2xl font-bold text-stone-900 m-0"),
      box(
        "flex items-center gap-8",
        navlink("Platform"),
        navlink("How it works"),
        navlink("Pricing"),
        btn("Request a demo", PRIMARY)
      )
    ),

    // ── hero ──
    box(
      "px-8 pt-20 pb-24 text-center max-w-4xl mx-auto",
      el("box", {
        classes: "inline-block px-3.5 py-1.5 rounded-full border border-stone-200 text-stone-500 text-xs font-medium mb-8",
        anim: { effect: "fade-up", trigger: "load", duration: 600 },
      }, p("Hospitality operations, unified", "m-0", "span")),
      el("heading", {
        props: { text: "One platform for every hospitality team.", level: "1" },
        classes: "font-serif text-5xl md:text-7xl font-semibold tracking-[-0.02em] text-stone-900 mb-6 leading-[1.02]",
        anim: { effect: "fade-up", trigger: "load", duration: 700, delay: 80 },
      }),
      el("text", {
        props: { text: "Staffing, vendors, events and compliance — run the whole operation from one calm, connected place." },
        classes: "text-lg text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed",
        anim: { effect: "fade-up", trigger: "load", duration: 700, delay: 160 },
      }),
      el("box", {
        classes: "flex items-center justify-center gap-3",
        anim: { effect: "fade-up", trigger: "load", duration: 700, delay: 240 },
      }, btn("Request a demo", PRIMARY), btn("See it in action", GHOST))
    ),

    // ── logos strip ──
    box(
      "px-8 pb-20 max-w-5xl mx-auto",
      p("Trusted by hospitality teams across the region", "text-center text-xs uppercase tracking-widest text-stone-400 mb-8"),
      box(
        "flex flex-wrap items-center justify-center gap-x-14 gap-y-6",
        p("Marlow", "font-serif text-xl text-stone-300", "span"),
        p("Ardenne", "font-serif text-xl text-stone-300", "span"),
        p("The Quay", "font-serif text-xl text-stone-300", "span"),
        p("Lumen", "font-serif text-xl text-stone-300", "span"),
        p("Verano", "font-serif text-xl text-stone-300", "span")
      )
    ),

    // ── problem statement ──
    box(
      "px-8 py-28 border-t border-stone-100",
      box(
        "grid grid-cols-1 md:grid-cols-2 gap-14 items-center max-w-6xl mx-auto",
        rbox(
          "",
          0,
          p("THE PROBLEM", "text-xs font-semibold uppercase tracking-widest text-[#c2603f] mb-4"),
          h("Great service runs on a dozen disconnected tools.", "2", "font-serif text-4xl text-stone-900 leading-tight mb-5"),
          p("Spreadsheets for shifts. Email for vendors. Group chats for events. The work gets done, but nothing talks to anything else — and the gaps are where things break.", "text-stone-500 leading-relaxed m-0")
        ),
        rbox(
          "grid grid-cols-2 gap-4",
          160,
          box("p-6 rounded-2xl bg-stone-50", p("38%", "font-serif text-4xl text-stone-900 m-0"), p("of shifts rescheduled by hand", "text-stone-500 text-sm mt-2 m-0")),
          box("p-6 rounded-2xl bg-stone-50", p("6 hrs", "font-serif text-4xl text-stone-900 m-0"), p("a week lost to vendor chasing", "text-stone-500 text-sm mt-2 m-0")),
          box("p-6 rounded-2xl bg-stone-50", p("1 in 4", "font-serif text-4xl text-stone-900 m-0"), p("events missing a key document", "text-stone-500 text-sm mt-2 m-0")),
          box("p-6 rounded-2xl bg-[#c2603f] text-white", p("0", "font-serif text-4xl m-0"), p("of it needs to be this way", "text-white/80 text-sm mt-2 m-0"))
        )
      )
    ),

    // ── modules ──
    box(
      "px-8 py-28 bg-stone-50",
      box(
        "max-w-6xl mx-auto",
        rbox(
          "text-center max-w-2xl mx-auto mb-14",
          0,
          p("THE PLATFORM", "text-xs font-semibold uppercase tracking-widest text-[#c2603f] mb-4"),
          h("Five modules. One source of truth.", "2", "font-serif text-4xl text-stone-900 mb-4"),
          p("Each part works on its own and gets better together — so the whole team sees the same picture.", "text-stone-500 leading-relaxed m-0")
        ),
        box(
          "grid grid-cols-1 md:grid-cols-3 gap-5",
          moduleCard("Staffing", "Build rotas, fill open shifts and track hours without the back-and-forth.", 0),
          moduleCard("Vendors", "Source, compare and book suppliers with every quote in one thread.", 120),
          moduleCard("Events", "Plan the run-of-show, assign roles and keep documents attached.", 240),
          moduleCard("Compliance", "Certifications, checklists and audits that stay current on their own.", 0),
          moduleCard("Payments", "Invoices, payouts and expenses reconciled to each job automatically.", 120),
          moduleCard("Insights", "See utilisation, spend and service quality the moment it shifts.", 240)
        )
      )
    ),

    // ── structured RFP card ──
    box(
      "px-8 py-28",
      rbox(
        "max-w-3xl mx-auto rounded-3xl border border-stone-200 overflow-hidden",
        0,
        box(
          "flex items-center justify-between px-7 py-5 bg-stone-900",
          p("New request for proposal", "text-white font-medium m-0"),
          p("OPEN", "inline-block px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-300 text-[11px] font-semibold tracking-wide", "span")
        ),
        box(
          "p-7",
          h("Rooftop launch — 220 guests", "3", "font-serif text-2xl text-stone-900 mb-6"),
          box(
            "grid grid-cols-3 gap-4",
            box("", p("Budget", "text-xs uppercase tracking-wider text-stone-400 m-0"), p("$18,000", "text-lg font-semibold text-stone-900 mt-1 m-0")),
            box("", p("Deadline", "text-xs uppercase tracking-wider text-stone-400 m-0"), p("Fri, 12 Sep", "text-lg font-semibold text-stone-900 mt-1 m-0")),
            box("", p("Location", "text-xs uppercase tracking-wider text-stone-400 m-0"), p("Lagos, VI", "text-lg font-semibold text-stone-900 mt-1 m-0"))
          )
        )
      )
    ),

    // ── how it works ──
    box(
      "px-8 py-28 bg-stone-50",
      box(
        "max-w-5xl mx-auto",
        h("How it works", "2", "font-serif text-4xl text-center text-stone-900 mb-14"),
        box(
          "grid grid-cols-1 md:grid-cols-3 gap-10",
          step("01", "Connect your team", "Invite staff, vendors and venues — everyone lands in the right place.", 0),
          step("02", "Bring the work in", "Import rotas, contracts and event plans, or start fresh in minutes.", 120),
          step("03", "Run it in one place", "Approve, assign and pay from a single feed the whole team trusts.", 240)
        )
      )
    ),

    // ── FAQ ──
    box(
      "px-8 py-28 max-w-3xl mx-auto",
      h("Questions, answered", "2", "font-serif text-4xl text-center text-stone-900 mb-10"),
      el(
        "accordion",
        { classes: "flex flex-col gap-3" },
        faqItem("Can we start with just one module?", "Yes — begin with staffing or vendors and switch the rest on when you're ready. They share the same data from day one."),
        faqItem("Does it work for multi-venue groups?", "Every venue gets its own view while owners see the whole group. Roles and permissions keep it tidy."),
        faqItem("How long does onboarding take?", "Most teams are running their first week inside the platform within a few days, migration included.")
      )
    ),

    // ── CTA (dark) ──
    box(
      "px-8 py-28",
      rbox(
        "max-w-5xl mx-auto rounded-3xl bg-stone-900 px-10 py-24 text-center",
        0,
        h("See your operation, unified.", "2", "font-serif text-5xl text-white mb-5 leading-tight"),
        p("Book a 30-minute demo and we'll map it to how your team already works.", "text-stone-300 max-w-xl mx-auto mb-9"),
        box(
          "flex items-center justify-center gap-3",
          btn("Request a demo", PRIMARY),
          btn("See it in action", "inline-flex items-center justify-center px-6 py-3 rounded-full border border-white/25 text-white text-sm font-medium hover:bg-white/10 no-underline")
        )
      )
    ),

    // ── footer ──
    box(
      "px-8 py-16 border-t border-stone-100",
      box(
        "grid grid-cols-2 md:grid-cols-5 gap-10 max-w-6xl mx-auto",
        box(
          "col-span-2 md:col-span-1",
          h("Servio", "3", "font-serif text-xl font-bold text-stone-900 mb-2"),
          p("Hospitality operations, unified.", "text-stone-400 text-sm m-0")
        ),
        footCol("Platform", ["Staffing", "Vendors", "Events", "Compliance"]),
        footCol("Company", ["About", "Careers", "Blog"]),
        footCol("Resources", ["Docs", "Guides", "Support"]),
        footCol("Legal", ["Privacy", "Terms"])
      )
    )
  ),
  {
    theme: {
      colors: { primary: "#c2603f", text: "#0f172a", muted: "#64748b" },
      fonts: { display: "'Georgia', 'Times New Roman', serif", body: "Inter, ui-sans-serif, system-ui, sans-serif" },
      radius: {},
      breakpoints: [
        { id: "tablet", label: "Tablet", maxWidth: 1023 },
        { id: "mobile", label: "Mobile", maxWidth: 767 },
      ],
    },
  }
)
