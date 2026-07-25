import { buildFragment, el, extractFragment, htmlToDoc, type Fragment, type NodeSpec } from "@brandsapp/builder-core"
import blocksData from "./blocks-data.json"

const rand = () => crypto.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)

export interface Template {
  name: string
  category: string
  make: () => Fragment
}

function tpl(category: string, name: string, root: NodeSpec): Template {
  return {
    category,
    name,
    make: () => buildFragment(root, { manifest: { id: rand(), name, category: "section", version: "1.0.0" } }),
  }
}

/**
 * A block authored as Tailwind HTML (Preline-style) → imported via htmlToDoc, which
 * now preserves `class` as node.classes. The first top-level element becomes the
 * section root. This is the same path the Import HTML button uses, so any external
 * Tailwind/Preline block can be added the same way.
 */
function fromHtml(category: string, name: string, html: string): Template {
  return {
    category,
    name,
    make: () => {
      const doc = htmlToDoc(html)
      const root = doc.nodes[doc.rootId]
      // single top-level element → that IS the section; multiple → keep the wrapper.
      const sectionId = root && root.children.length === 1 ? root.children[0] : doc.rootId
      return extractFragment(doc, sectionId, { id: rand(), name, category: "section", version: "1.0.0" })
    },
  }
}

// ── authoring helpers ─────────────────────────────────────────────────────────
const box = (classes: string, ...children: NodeSpec[]): NodeSpec => el("box", { classes }, ...children)
const h = (text: string, level: string, classes: string): NodeSpec => el("heading", { props: { text, level }, classes })
const p = (text: string, classes: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes })
const btn = (label: string, classes: string): NodeSpec => el("button", { props: { label, href: "#" }, classes })
const nav = (text: string): NodeSpec =>
  el("link", { props: { text, href: "#" }, classes: "text-sm text-slate-600 hover:text-slate-900 no-underline" })
const img = (w: number, ht: number, classes: string): NodeSpec =>
  el("image", { props: { src: `https://placehold.co/${w}x${ht}/e2e8f0/94a3b8?text=Image`, alt: "" }, classes })

const PRIMARY = "inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
const SECONDARY =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm font-medium hover:bg-slate-50"

const featureCard = (title: string, body: string): NodeSpec =>
  box(
    "p-6 rounded-2xl border border-slate-200 bg-white",
    box("w-10 h-10 rounded-xl bg-slate-900 mb-4"),
    h(title, "3", "text-lg font-semibold text-slate-900 mb-2"),
    p(body, "text-slate-500 text-sm leading-relaxed m-0")
  )

const stat = (n: string, label: string): NodeSpec =>
  box("", h(n, "2", "text-4xl font-extrabold text-slate-900 m-0"), p(label, "text-slate-500 text-sm mt-1 m-0"))

const priceCard = (name: string, price: string, desc: string, highlight: boolean): NodeSpec =>
  box(
    highlight
      ? "p-8 rounded-2xl border-2 border-slate-900 bg-white flex flex-col"
      : "p-8 rounded-2xl border border-slate-200 bg-white flex flex-col",
    h(name, "3", "text-lg font-semibold text-slate-900 mb-1"),
    box("flex items-end gap-1 mb-4", h(price, "2", "text-4xl font-extrabold text-slate-900 m-0"), p("/mo", "text-slate-500 mb-1 m-0")),
    p(desc, "text-slate-500 text-sm mb-6 grow", ),
    btn("Choose plan", (highlight ? PRIMARY : SECONDARY) + " w-full")
  )

const footerCol = (title: string, links: string[]): NodeSpec =>
  box(
    "flex flex-col gap-2",
    h(title, "4", "text-sm font-semibold text-slate-900 mb-1"),
    ...links.map((l) => el("link", { props: { text: l, href: "#" }, classes: "text-sm text-slate-500 hover:text-slate-900 no-underline" }))
  )

// ── the library ───────────────────────────────────────────────────────────────
export const TEMPLATES: Template[] = [
  tpl("Layout", "Container", box("max-w-5xl mx-auto px-6 py-12 min-h-24 border border-dashed border-slate-300 rounded-xl")),
  tpl(
    "Layout",
    "Card",
    box(
      "p-6 rounded-2xl border border-slate-200 bg-white shadow-sm max-w-sm",
      box("w-full h-40 rounded-xl bg-slate-100 mb-4"),
      h("Card title", "3", "text-lg font-semibold text-slate-900 mb-1"),
      p("Supporting text that describes this card in a sentence or two.", "text-slate-500 text-sm mb-4"),
      btn("Action", PRIMARY)
    )
  ),

  tpl(
    "Navigation",
    "Navbar",
    box(
      "flex items-center justify-between px-6 py-4 border-b border-slate-200",
      h("Brand", "3", "text-lg font-bold text-slate-900 m-0"),
      box("flex items-center gap-6", nav("Features"), nav("Pricing"), nav("About"), btn("Get started", PRIMARY))
    )
  ),
  tpl(
    "Navigation",
    "Footer",
    box(
      "px-6 py-14 border-t border-slate-200",
      box(
        "grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto",
        footerCol("Product", ["Features", "Pricing", "Docs"]),
        footerCol("Company", ["About", "Blog", "Careers"]),
        footerCol("Legal", ["Privacy", "Terms"]),
        box("", h("Brand", "3", "text-lg font-bold text-slate-900 mb-2"), p("© 2026 Brand Inc.", "text-slate-500 text-sm m-0"))
      )
    )
  ),

  tpl(
    "Hero",
    "Hero — centered",
    box(
      "px-6 py-24 text-center",
      p("NEW", "inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold mb-5", "span"),
      h("The fastest way to build your site", "1", "text-5xl font-extrabold tracking-tight text-slate-900 mb-5 max-w-3xl mx-auto"),
      p("A clear, benefit-driven subheadline that tells visitors exactly what you do and why it matters.", "text-lg text-slate-500 max-w-xl mx-auto mb-8"),
      box("flex items-center justify-center gap-3", btn("Get started", PRIMARY), btn("Learn more", SECONDARY))
    )
  ),
  tpl(
    "Hero",
    "Hero — split",
    box(
      "grid grid-cols-1 md:grid-cols-2 gap-10 items-center max-w-6xl mx-auto px-6 py-20",
      box(
        "",
        h("Build beautiful pages, fast", "1", "text-4xl font-extrabold tracking-tight text-slate-900 mb-4"),
        p("Compose your site from clean, responsive sections. No code, no lock-in.", "text-lg text-slate-500 mb-6"),
        box("flex gap-3", btn("Start free", PRIMARY), btn("Book a demo", SECONDARY))
      ),
      img(640, 480, "w-full rounded-2xl border border-slate-200")
    )
  ),

  tpl(
    "Content",
    "Feature grid",
    box(
      "px-6 py-20 max-w-6xl mx-auto",
      h("Everything you need to ship", "2", "text-3xl font-bold text-center text-slate-900 mb-3"),
      p("Powerful building blocks that stay out of your way.", "text-slate-500 text-center mb-12 max-w-xl mx-auto"),
      box(
        "grid grid-cols-1 md:grid-cols-3 gap-6",
        featureCard("Fast", "Ship pages in minutes, not weeks."),
        featureCard("Flexible", "Compose any layout from primitives."),
        featureCard("Yours", "Own the design end to end — no lock-in.")
      )
    )
  ),
  tpl(
    "Content",
    "Stats",
    box(
      "grid grid-cols-2 md:grid-cols-4 gap-8 px-6 py-16 max-w-5xl mx-auto text-center",
      stat("10k+", "Active users"),
      stat("99.9%", "Uptime"),
      stat("4.9/5", "Rating"),
      stat("24/7", "Support")
    )
  ),
  tpl(
    "Content",
    "Testimonial",
    box(
      "px-6 py-20 max-w-3xl mx-auto text-center",
      p("“This completely changed how we ship pages. What used to take days now takes minutes.”", "text-2xl font-medium text-slate-900 leading-relaxed mb-6"),
      box(
        "flex items-center justify-center gap-3",
        box("w-10 h-10 rounded-full bg-slate-200"),
        box("text-left", h("Jane Doe", "4", "text-sm font-semibold text-slate-900 m-0"), p("CEO, Acme", "text-slate-500 text-xs m-0"))
      )
    )
  ),

  tpl(
    "Commerce",
    "Pricing",
    box(
      "px-6 py-20 max-w-6xl mx-auto",
      h("Simple, transparent pricing", "2", "text-3xl font-bold text-center text-slate-900 mb-12"),
      box(
        "grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch",
        priceCard("Starter", "$9", "For individuals getting started.", false),
        priceCard("Pro", "$29", "For growing teams that need more.", true),
        priceCard("Scale", "$99", "For organisations at scale.", false)
      )
    )
  ),

  tpl(
    "Call to action",
    "CTA banner",
    box(
      "mx-6 my-12 px-8 py-14 rounded-3xl bg-slate-900 text-center",
      h("Ready to get started?", "2", "text-3xl font-bold text-white mb-3"),
      p("Join thousands of teams building faster.", "text-slate-300 mb-7"),
      box(
        "flex items-center justify-center gap-3",
        btn("Start free", "inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-white text-slate-900 text-sm font-medium hover:bg-slate-100"),
        btn("Contact sales", "inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-white/30 text-white text-sm font-medium hover:bg-white/10")
      )
    )
  ),

  tpl(
    "Interactive",
    "Tabs",
    box(
      "px-6 py-16 max-w-3xl mx-auto",
      el(
        "tabs",
        {},
        el("tab-panel", { props: { title: "Overview" }, classes: "pt-2" }, p("Everything at a glance — describe the first tab here.", "text-slate-600 leading-relaxed m-0")),
        el("tab-panel", { props: { title: "Features" }, classes: "pt-2" }, p("List what makes this great in the second tab.", "text-slate-600 leading-relaxed m-0")),
        el("tab-panel", { props: { title: "Pricing" }, classes: "pt-2" }, p("Plans and pricing details go in the third tab.", "text-slate-600 leading-relaxed m-0"))
      )
    )
  ),
  tpl(
    "Interactive",
    "Accordion (FAQ)",
    box(
      "px-6 py-16 max-w-3xl mx-auto",
      h("Frequently asked questions", "2", "text-3xl font-bold text-slate-900 mb-8 text-center"),
      el(
        "accordion",
        { classes: "flex flex-col gap-2" },
        el("accordion-item", { props: { title: "What is included?" }, classes: "border border-slate-200 rounded-xl px-4" }, p("Everything you need to build and publish your pages.", "text-slate-500 text-sm m-0")),
        el("accordion-item", { props: { title: "Can I cancel anytime?" }, classes: "border border-slate-200 rounded-xl px-4" }, p("Yes — manage your plan from the dashboard whenever you like.", "text-slate-500 text-sm m-0")),
        el("accordion-item", { props: { title: "Do you offer support?" }, classes: "border border-slate-200 rounded-xl px-4" }, p("Every plan includes support; higher tiers get priority.", "text-slate-500 text-sm m-0"))
      )
    )
  ),

  // ── imported Tailwind (Preline-style) blocks, via htmlToDoc ────────────────
  fromHtml(
    "Content",
    "FAQ",
    `<div class="max-w-3xl mx-auto px-6 py-20">
      <h2 class="text-3xl font-bold text-center text-slate-900 mb-10">Frequently asked questions</h2>
      <div class="flex flex-col gap-3">
        <div class="p-5 rounded-xl border border-slate-200">
          <h3 class="font-semibold text-slate-900 mb-1">What is included?</h3>
          <p class="text-slate-500 text-sm">Everything you need to build and publish your pages — no add-ons.</p>
        </div>
        <div class="p-5 rounded-xl border border-slate-200">
          <h3 class="font-semibold text-slate-900 mb-1">Can I cancel anytime?</h3>
          <p class="text-slate-500 text-sm">Yes. Upgrade, downgrade, or cancel from your dashboard whenever you like.</p>
        </div>
        <div class="p-5 rounded-xl border border-slate-200">
          <h3 class="font-semibold text-slate-900 mb-1">Do you offer support?</h3>
          <p class="text-slate-500 text-sm">Every plan includes support; higher tiers get priority response times.</p>
        </div>
      </div>
    </div>`
  ),
  fromHtml(
    "Content",
    "Team",
    `<div class="max-w-5xl mx-auto px-6 py-20">
      <h2 class="text-3xl font-bold text-center text-slate-900 mb-10">Meet the team</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div><div class="w-20 h-20 rounded-full bg-slate-200 mx-auto mb-3"></div><h3 class="font-semibold text-slate-900">Jane Doe</h3><p class="text-slate-500 text-sm">CEO</p></div>
        <div><div class="w-20 h-20 rounded-full bg-slate-200 mx-auto mb-3"></div><h3 class="font-semibold text-slate-900">John Smith</h3><p class="text-slate-500 text-sm">CTO</p></div>
        <div><div class="w-20 h-20 rounded-full bg-slate-200 mx-auto mb-3"></div><h3 class="font-semibold text-slate-900">Amara Okoye</h3><p class="text-slate-500 text-sm">Design</p></div>
        <div><div class="w-20 h-20 rounded-full bg-slate-200 mx-auto mb-3"></div><h3 class="font-semibold text-slate-900">Liu Wei</h3><p class="text-slate-500 text-sm">Engineering</p></div>
      </div>
    </div>`
  ),
  fromHtml(
    "Content",
    "Logo cloud",
    `<div class="px-6 py-16 text-center">
      <p class="text-sm text-slate-500 mb-8">Trusted by teams at</p>
      <div class="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        <div class="text-xl font-bold text-slate-400">Acme</div>
        <div class="text-xl font-bold text-slate-400">Globex</div>
        <div class="text-xl font-bold text-slate-400">Umbrella</div>
        <div class="text-xl font-bold text-slate-400">Initech</div>
        <div class="text-xl font-bold text-slate-400">Hooli</div>
      </div>
    </div>`
  ),
  fromHtml(
    "Call to action",
    "Newsletter",
    `<div class="mx-6 my-12 px-8 py-14 rounded-3xl bg-slate-50 text-center">
      <h2 class="text-2xl font-bold text-slate-900 mb-2">Stay in the loop</h2>
      <p class="text-slate-500 mb-6">Product updates and tips. No spam, unsubscribe anytime.</p>
      <div class="flex items-center justify-center gap-2 max-w-md mx-auto">
        <div class="flex-1 h-11 rounded-lg border border-slate-300 bg-white"></div>
        <a href="#" class="inline-flex items-center justify-center px-5 h-11 rounded-lg bg-slate-900 text-white text-sm font-medium">Subscribe</a>
      </div>
    </div>`
  ),

  // ── MIT-style Tailwind blocks (HyperUI / Meraki / Flowbite-core inspired) ──
  fromHtml(
    "Navigation",
    "Announcement bar",
    `<div class="bg-slate-900 text-white text-center text-sm px-6 py-3"><span>New: interactive components are here — </span><a href="#" class="underline font-medium">learn more</a></div>`
  ),
  fromHtml(
    "Layout",
    "Alert",
    `<div class="max-w-3xl mx-auto px-6 py-6">
      <div class="flex gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
        <div class="w-5 h-5 rounded-full bg-blue-500 shrink-0"></div>
        <div><h3 class="text-sm font-semibold text-blue-900 m-0">Heads up</h3><p class="text-sm text-blue-800 m-0">This is an informational alert with a short supporting message.</p></div>
      </div>
    </div>`
  ),
  fromHtml(
    "Content",
    "Feature + image",
    `<div class="grid grid-cols-1 md:grid-cols-2 gap-10 items-center max-w-6xl mx-auto px-6 py-20">
      <img src="https://placehold.co/560x420/e2e8f0/94a3b8?text=Image" alt="" class="w-full rounded-2xl border border-slate-200"/>
      <div>
        <span class="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold mb-4">WHY US</span>
        <h2 class="text-3xl font-bold text-slate-900 mb-4">Built for speed and control</h2>
        <p class="text-slate-500 mb-6">Explain the core benefit here with a sentence or two that connects to your visitor's goal.</p>
        <div class="flex flex-col gap-3">
          <div class="flex gap-3"><div class="w-6 h-6 rounded-full bg-slate-900 shrink-0"></div><p class="text-slate-700 text-sm m-0">First key benefit stated plainly.</p></div>
          <div class="flex gap-3"><div class="w-6 h-6 rounded-full bg-slate-900 shrink-0"></div><p class="text-slate-700 text-sm m-0">Second benefit that builds trust.</p></div>
        </div>
      </div>
    </div>`
  ),
  fromHtml(
    "Content",
    "Testimonial grid",
    `<div class="max-w-6xl mx-auto px-6 py-20">
      <h2 class="text-3xl font-bold text-center text-slate-900 mb-10">Loved by teams</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl border border-slate-200"><p class="text-slate-700 mb-5">"A short, punchy quote about the impact your product had."</p><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-full bg-slate-200"></div><div><div class="text-sm font-semibold text-slate-900">Ada N.</div><div class="text-xs text-slate-500">Founder, Kito</div></div></div></div>
        <div class="p-6 rounded-2xl border border-slate-200"><p class="text-slate-700 mb-5">"Setup took minutes and the results were immediate."</p><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-full bg-slate-200"></div><div><div class="text-sm font-semibold text-slate-900">Tunde B.</div><div class="text-xs text-slate-500">Ops, Zola</div></div></div></div>
        <div class="p-6 rounded-2xl border border-slate-200"><p class="text-slate-700 mb-5">"Exactly the flexibility we needed, none of the bloat."</p><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-full bg-slate-200"></div><div><div class="text-sm font-semibold text-slate-900">Mei L.</div><div class="text-xs text-slate-500">CTO, Arc</div></div></div></div>
      </div>
    </div>`
  ),
  fromHtml(
    "Content",
    "Blog cards",
    `<div class="max-w-6xl mx-auto px-6 py-20">
      <h2 class="text-3xl font-bold text-slate-900 mb-10">From the blog</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="rounded-2xl border border-slate-200 overflow-hidden"><img src="https://placehold.co/400x240/e2e8f0/94a3b8?text=Post" alt="" class="w-full"/><div class="p-5"><div class="text-xs font-semibold text-slate-500 mb-2">PRODUCT</div><h3 class="text-lg font-semibold text-slate-900 mb-2">A compelling post title goes here</h3><p class="text-slate-500 text-sm m-0">A one-line summary that makes readers want to click through.</p></div></div>
        <div class="rounded-2xl border border-slate-200 overflow-hidden"><img src="https://placehold.co/400x240/e2e8f0/94a3b8?text=Post" alt="" class="w-full"/><div class="p-5"><div class="text-xs font-semibold text-slate-500 mb-2">ENGINEERING</div><h3 class="text-lg font-semibold text-slate-900 mb-2">How we made publishing instant</h3><p class="text-slate-500 text-sm m-0">A one-line summary that makes readers want to click through.</p></div></div>
        <div class="rounded-2xl border border-slate-200 overflow-hidden"><img src="https://placehold.co/400x240/e2e8f0/94a3b8?text=Post" alt="" class="w-full"/><div class="p-5"><div class="text-xs font-semibold text-slate-500 mb-2">DESIGN</div><h3 class="text-lg font-semibold text-slate-900 mb-2">Designing for African SMEs</h3><p class="text-slate-500 text-sm m-0">A one-line summary that makes readers want to click through.</p></div></div>
      </div>
    </div>`
  ),
  fromHtml(
    "Content",
    "Gallery",
    `<div class="max-w-6xl mx-auto px-6 py-16">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <img src="https://placehold.co/300x300/e2e8f0/94a3b8?text=1" alt="" class="w-full aspect-square object-cover rounded-xl"/>
        <img src="https://placehold.co/300x300/e2e8f0/94a3b8?text=2" alt="" class="w-full aspect-square object-cover rounded-xl"/>
        <img src="https://placehold.co/300x300/e2e8f0/94a3b8?text=3" alt="" class="w-full aspect-square object-cover rounded-xl"/>
        <img src="https://placehold.co/300x300/e2e8f0/94a3b8?text=4" alt="" class="w-full aspect-square object-cover rounded-xl"/>
        <img src="https://placehold.co/300x300/e2e8f0/94a3b8?text=5" alt="" class="w-full aspect-square object-cover rounded-xl"/>
        <img src="https://placehold.co/300x300/e2e8f0/94a3b8?text=6" alt="" class="w-full aspect-square object-cover rounded-xl"/>
        <img src="https://placehold.co/300x300/e2e8f0/94a3b8?text=7" alt="" class="w-full aspect-square object-cover rounded-xl"/>
        <img src="https://placehold.co/300x300/e2e8f0/94a3b8?text=8" alt="" class="w-full aspect-square object-cover rounded-xl"/>
      </div>
    </div>`
  ),
  fromHtml(
    "Content",
    "Stats band",
    `<div class="bg-slate-900 px-6 py-16">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
        <div><div class="text-4xl font-extrabold text-white">10k+</div><div class="text-slate-400 text-sm mt-1">Active users</div></div>
        <div><div class="text-4xl font-extrabold text-white">120+</div><div class="text-slate-400 text-sm mt-1">Countries</div></div>
        <div><div class="text-4xl font-extrabold text-white">99.9%</div><div class="text-slate-400 text-sm mt-1">Uptime</div></div>
        <div><div class="text-4xl font-extrabold text-white">4.9/5</div><div class="text-slate-400 text-sm mt-1">Rating</div></div>
      </div>
    </div>`
  ),
  fromHtml(
    "Commerce",
    "Pricing — 2 tiers",
    `<div class="max-w-3xl mx-auto px-6 py-20">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="p-8 rounded-2xl border border-slate-200"><h3 class="text-lg font-semibold text-slate-900 mb-1">Monthly</h3><div class="flex items-end gap-1 mb-4"><span class="text-4xl font-extrabold text-slate-900">$12</span><span class="text-slate-500 mb-1">/mo</span></div><p class="text-slate-500 text-sm mb-6">Billed monthly. Cancel anytime.</p><a href="#" class="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm font-medium">Choose</a></div>
        <div class="p-8 rounded-2xl border-2 border-slate-900"><h3 class="text-lg font-semibold text-slate-900 mb-1">Yearly</h3><div class="flex items-end gap-1 mb-4"><span class="text-4xl font-extrabold text-slate-900">$9</span><span class="text-slate-500 mb-1">/mo</span></div><p class="text-slate-500 text-sm mb-6">Billed yearly. Save 25%.</p><a href="#" class="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium">Choose</a></div>
      </div>
    </div>`
  ),
  fromHtml(
    "Commerce",
    "Product cards",
    `<div class="max-w-6xl mx-auto px-6 py-16">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div><div class="w-full aspect-square rounded-xl bg-slate-100 mb-3"></div><h3 class="text-sm font-semibold text-slate-900 m-0">Product name</h3><div class="flex items-center justify-between mt-1"><span class="text-slate-500 text-sm">₦12,000</span><a href="#" class="text-xs font-medium text-slate-900 underline">Add</a></div></div>
        <div><div class="w-full aspect-square rounded-xl bg-slate-100 mb-3"></div><h3 class="text-sm font-semibold text-slate-900 m-0">Product name</h3><div class="flex items-center justify-between mt-1"><span class="text-slate-500 text-sm">₦8,500</span><a href="#" class="text-xs font-medium text-slate-900 underline">Add</a></div></div>
        <div><div class="w-full aspect-square rounded-xl bg-slate-100 mb-3"></div><h3 class="text-sm font-semibold text-slate-900 m-0">Product name</h3><div class="flex items-center justify-between mt-1"><span class="text-slate-500 text-sm">₦20,000</span><a href="#" class="text-xs font-medium text-slate-900 underline">Add</a></div></div>
        <div><div class="w-full aspect-square rounded-xl bg-slate-100 mb-3"></div><h3 class="text-sm font-semibold text-slate-900 m-0">Product name</h3><div class="flex items-center justify-between mt-1"><span class="text-slate-500 text-sm">₦15,000</span><a href="#" class="text-xs font-medium text-slate-900 underline">Add</a></div></div>
      </div>
    </div>`
  ),
  fromHtml(
    "Call to action",
    "Contact",
    `<div class="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto px-6 py-20">
      <div><h2 class="text-3xl font-bold text-slate-900 mb-3">Get in touch</h2><p class="text-slate-500 m-0">Tell us what you need and we'll get back within one business day.</p></div>
      <div class="flex flex-col gap-3">
        <div class="h-11 rounded-lg border border-slate-300 bg-white"></div>
        <div class="h-11 rounded-lg border border-slate-300 bg-white"></div>
        <div class="h-28 rounded-lg border border-slate-300 bg-white"></div>
        <a href="#" class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium">Send message</a>
      </div>
    </div>`
  ),

  // ── daisyUI component classes (via @unocss/preset-daisy) ───────────────────
  fromHtml(
    "daisyUI",
    "Hero",
    `<div class="hero bg-base-200 py-24"><div class="hero-content text-center"><div class="max-w-md"><h1 class="text-5xl font-bold">Hello there</h1><p class="py-6">A daisyUI hero — component classes generated at render time, fully editable.</p><a href="#" class="btn btn-primary">Get started</a></div></div></div>`
  ),
  fromHtml(
    "daisyUI",
    "Stats",
    `<div class="px-6 py-16 flex justify-center"><div class="stats shadow"><div class="stat"><div class="stat-title">Downloads</div><div class="stat-value">31K</div><div class="stat-desc">Jan 1st - Feb 1st</div></div><div class="stat"><div class="stat-title">New users</div><div class="stat-value">4,200</div><div class="stat-desc">↗ 400 (22%)</div></div><div class="stat"><div class="stat-title">New orders</div><div class="stat-value">1,200</div><div class="stat-desc">↘ 90 (14%)</div></div></div></div>`
  ),
  fromHtml(
    "daisyUI",
    "Buttons & badges",
    `<div class="px-6 py-12 flex flex-wrap gap-3 items-center justify-center"><a href="#" class="btn">Default</a><a href="#" class="btn btn-primary">Primary</a><a href="#" class="btn btn-secondary">Secondary</a><a href="#" class="btn btn-accent">Accent</a><a href="#" class="btn btn-outline">Outline</a><span class="badge">Badge</span><span class="badge badge-primary">Primary</span><span class="badge badge-outline">Outline</span></div>`
  ),
  fromHtml(
    "daisyUI",
    "Card",
    `<div class="px-6 py-16 flex justify-center"><div class="card w-96 bg-base-100 shadow-xl"><div class="card-body"><h2 class="card-title">Card title</h2><p>Supporting text for this daisyUI card component.</p><div class="card-actions justify-end"><a href="#" class="btn btn-primary">Buy now</a></div></div></div></div>`
  ),
]

/**
 * Individual UI components (daisyUI classes → themeable via the Theme dialog).
 * Rendered in the Components tab; drag onto the canvas like anything else.
 */
export const COMPONENTS: Template[] = [
  fromHtml("Buttons", "Button", `<a class="btn btn-primary">Button</a>`),
  fromHtml("Buttons", "Button outline", `<a class="btn btn-outline">Button</a>`),
  fromHtml("Buttons", "Button ghost", `<a class="btn btn-ghost">Button</a>`),
  fromHtml("Buttons", "Button secondary", `<a class="btn btn-secondary">Button</a>`),
  fromHtml("Badges", "Badge", `<span class="badge badge-primary">Badge</span>`),
  fromHtml("Badges", "Badge outline", `<span class="badge badge-outline">Badge</span>`),
  fromHtml("Alerts", "Alert", `<div class="alert"><span>A default alert message.</span></div>`),
  fromHtml("Alerts", "Alert success", `<div class="alert alert-success"><span>Saved successfully.</span></div>`),
  fromHtml("Alerts", "Alert warning", `<div class="alert alert-warning"><span>Please double-check this.</span></div>`),
  fromHtml("Alerts", "Alert error", `<div class="alert alert-error"><span>Something went wrong.</span></div>`),
  fromHtml("Cards", "Card", `<div class="card w-96 bg-base-100 shadow-xl"><div class="card-body"><h2 class="card-title">Card title</h2><p>Supporting text.</p><div class="card-actions justify-end"><a class="btn btn-primary">Action</a></div></div></div>`),
  fromHtml("Cards", "Card + image", `<div class="card w-96 bg-base-100 shadow-xl"><figure><img src="https://placehold.co/400x200/e2e8f0/94a3b8?text=Image" alt=""/></figure><div class="card-body"><h2 class="card-title">Card title</h2><p>Supporting text for this card.</p></div></div>`),
  fromHtml("Data", "Stat", `<div class="stats shadow"><div class="stat"><div class="stat-title">Total</div><div class="stat-value">89,400</div><div class="stat-desc">21% more than last month</div></div></div>`),
  fromHtml("Data", "Avatar", `<div class="avatar"><div class="w-16 rounded-full"><img src="https://placehold.co/64x64/e2e8f0/94a3b8?text=A" alt=""/></div></div>`),
  fromHtml("Feedback", "Loading", `<span class="loading loading-spinner loading-lg"></span>`),
  fromHtml("Navigation", "Breadcrumbs", `<div class="breadcrumbs text-sm"><ul><li><a>Home</a></li><li><a>Docs</a></li><li>Current</li></ul></div>`),
  fromHtml("Navigation", "Menu", `<ul class="menu bg-base-200 rounded-box w-56"><li><a>Dashboard</a></li><li><a>Settings</a></li><li><a>Billing</a></li></ul>`),
  fromHtml("Navigation", "Tabs", `<div class="tabs tabs-boxed"><a class="tab">Tab 1</a><a class="tab tab-active">Tab 2</a><a class="tab">Tab 3</a></div>`),
  fromHtml("Navigation", "Navbar", `<div class="navbar bg-base-100 rounded-box"><div class="flex-1"><a class="btn btn-ghost text-xl">Brand</a></div><div class="flex-none"><a class="btn btn-primary">Sign in</a></div></div>`),
]

/** Imported MIT blocks (HyperUI + Meraki UI), generated from their repos → htmlToDoc. */
export const EXTERNAL_BLOCKS: Template[] = (blocksData as { category: string; name: string; html: string }[]).map(
  (b) => fromHtml(b.category, b.name, b.html)
)

/** Everything shown in the Sections tab: hand-authored + imported MIT blocks. */
export const SECTIONS: Template[] = [...TEMPLATES, ...EXTERNAL_BLOCKS]
