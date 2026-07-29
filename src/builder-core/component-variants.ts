/**
 * Variant catalogs for the composed components (card, alert, badge, avatar,
 * breadcrumb, pagination), plus the registry that maps a module to its catalog so
 * the editor needs ONE picker rather than one per element.
 *
 * Same contract as the navbar and dropdown sets: a variant is a `DefaultChild`
 * subtree plus the root's classes, and applying it plants ordinary editable nodes.
 *
 * PROVENANCE. These shapes are the common ground of shadcn/ui, Preline, Meraki UI,
 * HyperUI and daisyUI — a badge is a rounded label in all five. Shapes are not
 * protectable and none of the markup is copied; Preline in particular is still not
 * ingested (its licence forbids the derivative work a refactor would produce).
 * Everything is written against daisyUI theme tokens so a tenant's palette flows
 * through.
 */

import { iconSvg } from "./icons"
import { LIST_RESET, PAGE_CURRENT, PAGE_LINK } from "./modules/components"
import type { DefaultChild } from "./registry"

export interface ElementVariant {
  id: string
  label: string
  group: string
  hint: string
  /** Replaces the element's own `defaultClasses`. */
  classes: string
  /** Merged into the node when applied. */
  props?: Record<string, unknown>
  children: DefaultChild[]
}

export interface VariantCatalog {
  /** Shown as the picker's heading. */
  title: string
  groups: string[]
  variants: ElementVariant[]
}

// ── shared pieces ────────────────────────────────────────────────────────────

const G = (id: string) => iconSvg(id) ?? ""

const icon = (id: string, classes = "inline-block w-5 h-5 shrink-0"): DefaultChild => ({
  module: "icon",
  props: { svg: G(id) },
  classes,
})

const span = (text: string, classes: string): DefaultChild => ({
  module: "text",
  props: { tag: "span", text },
  classes,
})

const para = (text: string, classes = "text-sm leading-relaxed text-base-content/70"): DefaultChild => ({
  module: "text",
  props: { tag: "p", text },
  classes,
})

const title = (text: string, classes = "font-display text-lg font-semibold text-base-content"): DefaultChild => ({
  module: "heading",
  props: { text, level: "3" },
  classes,
})

const link = (text: string, classes: string): DefaultChild => ({
  module: "link",
  props: { text, href: "#" },
  classes,
})

const cta = (label: string, variant = "default"): DefaultChild => ({
  module: "button",
  props: { label, variant, size: "sm", linkType: "url", href: "#" },
})

const img = (classes: string, src = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=70"): DefaultChild => ({
  module: "image",
  props: { src, alt: "" },
  classes,
})

const face = (classes: string, n = 12): DefaultChild => ({
  module: "image",
  props: { src: `https://i.pravatar.cc/160?img=${n}`, alt: "" },
  classes,
})

const stack = (children: DefaultChild[], classes: string): DefaultChild => ({
  module: "box",
  classes,
  children,
})

// ── card ─────────────────────────────────────────────────────────────────────

const CARD_BASE = "flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-6"

const CARD: VariantCatalog = {
  title: "Card variants",
  groups: ["Basic", "Media", "Purpose"],
  variants: [
    {
      id: "simple",
      label: "Simple",
      group: "Basic",
      hint: "Title and a line of copy.",
      classes: CARD_BASE,
      children: [title("Card title"), para("A short description of what this card is about.")],
    },
    {
      id: "action",
      label: "With action",
      group: "Basic",
      hint: "Ends in a button.",
      classes: CARD_BASE,
      children: [
        title("Card title"),
        para("A short description of what this card is about."),
        stack([cta("Learn more")], "mt-1 flex"),
      ],
    },
    {
      id: "icon",
      label: "With icon",
      group: "Basic",
      hint: "Glyph above the title — a feature card.",
      classes: CARD_BASE,
      children: [
        stack(
          [icon("flashlight", "inline-block w-5 h-5 text-primary")],
          "flex size-10 items-center justify-center rounded-xl bg-primary/10"
        ),
        title("Fast by default", "font-display text-base font-semibold text-base-content"),
        para("Everything ships pre-optimised, so pages load quickly on a phone."),
      ],
    },
    {
      id: "image-top",
      label: "Image on top",
      group: "Media",
      hint: "Full-bleed image above the copy.",
      classes: "flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100",
      children: [
        img("h-44 w-full object-cover"),
        stack(
          [title("Card title"), para("A short description of what this card is about.")],
          "flex flex-col gap-2 p-6"
        ),
      ],
    },
    {
      id: "horizontal",
      label: "Horizontal",
      group: "Media",
      hint: "Image beside the copy.",
      classes: "flex overflow-hidden rounded-2xl border border-base-300 bg-base-100",
      children: [
        img("h-auto w-40 shrink-0 object-cover"),
        stack(
          [title("Card title"), para("A short description of what this card is about.")],
          "flex flex-col gap-2 p-5"
        ),
      ],
    },
    {
      id: "profile",
      label: "Profile",
      group: "Purpose",
      hint: "Avatar, name and role.",
      classes: "flex flex-col items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-6 text-center",
      children: [
        face("size-16 rounded-full object-cover"),
        stack(
          [
            title("Ada Obi", "font-display text-base font-semibold text-base-content"),
            span("Product designer", "text-sm text-base-content/60"),
          ],
          "flex flex-col gap-0.5"
        ),
        stack([cta("View profile", "outline")], "mt-1 flex"),
      ],
    },
    {
      id: "pricing",
      label: "Pricing",
      group: "Purpose",
      hint: "Plan name, price and a call to action.",
      classes: "flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-100 p-6",
      children: [
        stack(
          [
            span("Starter", "text-sm font-medium text-base-content/60"),
            stack(
              [
                span("₦5,000", "font-display text-3xl font-bold text-base-content"),
                span("/month", "text-sm text-base-content/50"),
              ],
              "flex items-baseline gap-1"
            ),
          ],
          "flex flex-col gap-1"
        ),
        stack(
          [
            featureRow("Everything in Free"),
            featureRow("Custom domain"),
            featureRow("Priority support"),
          ],
          "flex flex-col gap-2"
        ),
        stack([cta("Choose Starter")], "mt-1 flex"),
      ],
    },
    {
      id: "stat",
      label: "Stat",
      group: "Purpose",
      hint: "One number, labelled.",
      classes: "flex flex-col gap-1 rounded-2xl border border-base-300 bg-base-100 p-6",
      children: [
        span("Revenue this month", "text-sm text-base-content/60"),
        span("₦2.4m", "font-display text-3xl font-bold text-base-content"),
        stack(
          [icon("arrow-right-up", "inline-block w-4 h-4 text-success"), span("12% vs last month", "text-xs text-success")],
          "flex items-center gap-1"
        ),
      ],
    },
  ],
}

function featureRow(text: string): DefaultChild {
  return stack(
    [icon("check", "inline-block w-4 h-4 shrink-0 text-primary"), span(text, "text-sm text-base-content/70")],
    "flex items-center gap-2"
  )
}

// ── alert ────────────────────────────────────────────────────────────────────

/** Tone is the only thing that changes across these; the shape is constant. */
function alertVariant(
  id: string,
  label: string,
  hint: string,
  tone: string,
  iconId: string,
  body: string,
  group = "Tone"
): ElementVariant {
  return {
    id,
    label,
    group,
    hint,
    classes: `flex items-start gap-3 rounded-xl border p-4 ${tone}`,
    props: { live: id === "error" ? "alert" : "status" },
    children: [icon(iconId, "inline-block w-5 h-5 shrink-0"), para(body, "text-sm leading-relaxed")],
  }
}

const ALERT: VariantCatalog = {
  title: "Alert variants",
  groups: ["Tone", "Shape"],
  variants: [
    alertVariant("info", "Info", "Neutral notice.", "border-info/30 bg-info/10 text-info", "information", "Heads up — this is something worth knowing."),
    alertVariant("success", "Success", "Something worked.", "border-success/30 bg-success/10 text-success", "checkbox-circle", "Saved. Your changes are live."),
    alertVariant("warning", "Warning", "Proceed carefully.", "border-warning/30 bg-warning/10 text-warning", "error-warning", "Your trial ends in three days."),
    alertVariant("error", "Error", "Something failed — announced assertively.", "border-error/30 bg-error/10 text-error", "close-circle", "We couldn't process that payment."),
    {
      id: "titled",
      label: "With title",
      group: "Shape",
      hint: "Heading above the explanation.",
      classes: "flex items-start gap-3 rounded-xl border border-info/30 bg-info/10 p-4",
      children: [
        icon("information", "inline-block w-5 h-5 shrink-0 text-info"),
        stack(
          [
            span("Scheduled maintenance", "text-sm font-semibold text-base-content"),
            para("The dashboard will be briefly unavailable on Sunday at 02:00.", "text-sm leading-relaxed text-base-content/70"),
          ],
          "flex flex-col gap-1"
        ),
      ],
    },
    {
      id: "action",
      label: "With action",
      group: "Shape",
      hint: "Ends in a link the reader can act on.",
      classes: "flex items-center gap-3 rounded-xl border border-base-300 bg-base-200 p-4",
      children: [
        icon("information", "inline-block w-5 h-5 shrink-0 text-base-content/60"),
        para("Your profile is missing a logo.", "flex-1 text-sm text-base-content"),
        link("Add one", "text-sm font-medium text-primary no-underline hover:underline"),
      ],
    },
    {
      id: "left-accent",
      label: "Accent bar",
      group: "Shape",
      hint: "Colour carried on the leading edge only.",
      classes: "flex items-start gap-3 rounded-r-xl border-l-4 border-primary bg-base-200 p-4",
      children: [para("A quieter treatment for a page that already has a lot of colour.", "text-sm leading-relaxed text-base-content/80")],
    },
  ],
}

// ── badge ────────────────────────────────────────────────────────────────────

const BADGE_BASE = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"

const BADGE: VariantCatalog = {
  title: "Badge variants",
  groups: ["Style", "Content"],
  variants: [
    { id: "solid", label: "Solid", group: "Style", hint: "Filled with the brand colour.", classes: `${BADGE_BASE} bg-primary text-primary-content`, children: [span("Badge", "")] },
    { id: "soft", label: "Soft", group: "Style", hint: "Tinted background, coloured text.", classes: `${BADGE_BASE} bg-primary/10 text-primary`, children: [span("Badge", "")] },
    { id: "outline", label: "Outline", group: "Style", hint: "Border only.", classes: `${BADGE_BASE} border border-base-300 text-base-content/70`, children: [span("Badge", "")] },
    { id: "square", label: "Square", group: "Style", hint: "Rounded corners rather than a pill.", classes: "inline-flex items-center gap-1.5 rounded-md bg-base-200 px-2 py-0.5 text-xs font-medium text-base-content", children: [span("Badge", "")] },
    {
      id: "dot",
      label: "With status dot",
      group: "Content",
      hint: "Small dot for a live state.",
      classes: `${BADGE_BASE} bg-success/10 text-success`,
      children: [{ module: "box", classes: "size-1.5 rounded-full bg-success" }, span("Active", "")],
    },
    {
      id: "icon",
      label: "With icon",
      group: "Content",
      hint: "Leading glyph.",
      classes: `${BADGE_BASE} bg-base-200 text-base-content`,
      children: [icon("check", "inline-block w-3 h-3 shrink-0"), span("Verified", "")],
    },
    {
      id: "count",
      label: "Count",
      group: "Content",
      hint: "A number, sized to stay circular.",
      classes: "inline-flex size-5 items-center justify-center rounded-full bg-error px-1 text-[11px] font-semibold text-error-content",
      children: [span("3", "")],
    },
  ],
}

// ── avatar ───────────────────────────────────────────────────────────────────

const AVATAR_BASE = "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-base-200"

const AVATAR: VariantCatalog = {
  title: "Avatar variants",
  groups: ["Single", "Group"],
  variants: [
    { id: "plain", label: "Plain", group: "Single", hint: "Just the photo.", classes: AVATAR_BASE, children: [face("size-full rounded-full object-cover")] },
    { id: "ring", label: "With ring", group: "Single", hint: "Outlined, to lift it off the page.", classes: `${AVATAR_BASE} ring-2 ring-base-300 ring-offset-2 ring-offset-base-100`, children: [face("size-full rounded-full object-cover")] },
    { id: "square", label: "Rounded square", group: "Single", hint: "Softened square instead of a circle.", classes: "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-200", children: [face("size-full object-cover")] },
    {
      id: "initials",
      label: "Initials",
      group: "Single",
      hint: "Fallback when there is no photo.",
      classes: `${AVATAR_BASE} bg-primary/10`,
      children: [span("AO", "text-sm font-semibold text-primary")],
    },
    {
      id: "status",
      label: "With status",
      group: "Single",
      hint: "Presence dot on the corner.",
      classes: AVATAR_BASE,
      children: [
        face("size-full rounded-full object-cover"),
        { module: "box", classes: "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-base-100 bg-success" },
      ],
    },
    {
      id: "group",
      label: "Stacked group",
      group: "Group",
      hint: "Overlapping faces, with a remainder count.",
      classes: "flex items-center",
      children: [
        face("size-9 rounded-full object-cover ring-2 ring-base-100", 12),
        face("-ml-2 size-9 rounded-full object-cover ring-2 ring-base-100", 32),
        face("-ml-2 size-9 rounded-full object-cover ring-2 ring-base-100", 45),
        stack(
          [span("+3", "text-xs font-medium text-base-content/70")],
          "-ml-2 flex size-9 items-center justify-center rounded-full bg-base-200 ring-2 ring-base-100"
        ),
      ],
    },
    {
      id: "labelled",
      label: "With name",
      group: "Group",
      hint: "Face beside a name and role.",
      classes: "flex items-center gap-3",
      children: [
        face("size-10 rounded-full object-cover"),
        stack(
          [span("Ada Obi", "text-sm font-medium text-base-content"), span("Product designer", "text-xs text-base-content/55")],
          "flex flex-col"
        ),
      ],
    },
  ],
}

// ── breadcrumb ───────────────────────────────────────────────────────────────

const CRUMB = "no-underline hover:text-base-content"
const CRUMB_BASE = "flex items-center gap-2 text-sm text-base-content/60"

function crumbs(sep: DefaultChild): DefaultChild[] {
  return [
    link("Home", CRUMB),
    sep,
    link("Products", CRUMB),
    sep,
    span("Current page", "text-base-content"),
  ]
}

const BREADCRUMB: VariantCatalog = {
  title: "Breadcrumb variants",
  groups: ["Separator", "Style"],
  variants: [
    { id: "slash", label: "Slash", group: "Separator", hint: "Plain / between steps.", classes: CRUMB_BASE, children: crumbs(span("/", "text-base-content/30")) },
    { id: "chevron", label: "Chevron", group: "Separator", hint: "Arrow between steps.", classes: CRUMB_BASE, children: crumbs(icon("arrow-right-s", "inline-block w-4 h-4 shrink-0 text-base-content/30")) },
    { id: "dot", label: "Dot", group: "Separator", hint: "A quiet middot.", classes: CRUMB_BASE, children: crumbs(span("·", "text-base-content/30")) },
    {
      id: "home-icon",
      label: "Home icon",
      group: "Style",
      hint: "First step is a glyph.",
      classes: CRUMB_BASE,
      children: [
        { module: "link", props: { text: "", href: "#" }, classes: "inline-flex items-center no-underline hover:text-base-content", children: [icon("home5", "inline-block w-4 h-4")] },
        icon("arrow-right-s", "inline-block w-4 h-4 shrink-0 text-base-content/30"),
        link("Products", CRUMB),
        icon("arrow-right-s", "inline-block w-4 h-4 shrink-0 text-base-content/30"),
        span("Current page", "text-base-content"),
      ],
    },
    {
      id: "boxed",
      label: "Boxed",
      group: "Style",
      hint: "Sits on its own tinted bar.",
      classes: "flex items-center gap-2 rounded-lg bg-base-200 px-3 py-2 text-sm text-base-content/60",
      children: crumbs(icon("arrow-right-s", "inline-block w-4 h-4 shrink-0 text-base-content/30")),
    },
  ],
}

// ── pagination ───────────────────────────────────────────────────────────────

const PAGINATION: VariantCatalog = {
  title: "Pagination variants",
  groups: ["Shape"],
  variants: [
    {
      id: "numbered",
      label: "Numbered",
      group: "Shape",
      hint: "Previous, pages, next.",
      classes: "flex items-center gap-1",
      children: [
        link("Previous", PAGE_LINK),
        link("1", PAGE_CURRENT),
        link("2", PAGE_LINK),
        link("3", PAGE_LINK),
        link("Next", PAGE_LINK),
      ],
    },
    {
      id: "arrows",
      label: "Arrows",
      group: "Shape",
      hint: "Glyphs instead of words.",
      classes: "flex items-center gap-1",
      children: [
        { module: "link", props: { text: "", href: "#" }, classes: PAGE_LINK, children: [icon("arrow-left-s", "inline-block w-4 h-4")] },
        link("1", PAGE_CURRENT),
        link("2", PAGE_LINK),
        link("3", PAGE_LINK),
        { module: "link", props: { text: "", href: "#" }, classes: PAGE_LINK, children: [icon("arrow-right-s", "inline-block w-4 h-4")] },
      ],
    },
    {
      id: "truncated",
      label: "Truncated",
      group: "Shape",
      hint: "Ellipsis for a long run of pages.",
      classes: "flex items-center gap-1",
      children: [
        link("1", PAGE_CURRENT),
        link("2", PAGE_LINK),
        span("…", "px-1 text-sm text-base-content/40"),
        link("24", PAGE_LINK),
        link("Next", PAGE_LINK),
      ],
    },
    {
      id: "simple",
      label: "Simple",
      group: "Shape",
      hint: "Just previous and next, pushed apart.",
      classes: "flex w-full items-center justify-between gap-4",
      children: [
        link("← Previous", "inline-flex h-9 items-center rounded-md border border-base-300 px-3 text-sm text-base-content no-underline hover:bg-base-200"),
        span("Page 1 of 24", "text-sm text-base-content/55"),
        link("Next →", "inline-flex h-9 items-center rounded-md border border-base-300 px-3 text-sm text-base-content no-underline hover:bg-base-200"),
      ],
    },
  ],
}

// ── accordion (FAQ) ──────────────────────────────────────────────────────────

/**
 * The questions are the same across variants on purpose — what changes is the
 * treatment, and swapping the copy too would make the picker look like it does
 * more than it does. Answers are real nodes, so an author edits them in place.
 */
const FAQ: Array<[string, string]> = [
  ["What's included?", "Everything in the plan, with no setup fee."],
  ["How does billing work?", "You're billed monthly and can change plans anytime."],
  ["Can I cancel anytime?", "Yes — cancel from your dashboard, no phone calls."],
  ["Do you offer refunds?", "Within 14 days of a charge, no questions asked."],
]

const ANSWER = "text-sm leading-relaxed text-base-content/70"

function faqItems(itemClasses: string, numbered = false): DefaultChild[] {
  return FAQ.map(([q, a], i) => ({
    module: "accordion-item",
    props: { title: numbered ? `${String(i + 1).padStart(2, "0")}. ${q}` : q },
    classes: itemClasses,
    children: [para(a, ANSWER)],
  }))
}

const ACCORDION: VariantCatalog = {
  title: "Accordion variants",
  groups: ["FAQ", "Behaviour"],
  variants: [
    {
      id: "boxed",
      label: "Boxed",
      group: "FAQ",
      hint: "Each question in its own bordered card.",
      classes: "flex flex-col gap-2",
      children: faqItems("rounded-2xl border border-base-300 bg-base-100 px-5"),
    },
    {
      id: "bordered",
      label: "Bordered list",
      group: "FAQ",
      hint: "One outline around the whole set.",
      classes: "flex flex-col divide-y divide-base-300 rounded-2xl border border-base-300 bg-base-100",
      children: faqItems("px-5"),
    },
    {
      id: "separated",
      label: "Hairlines",
      group: "FAQ",
      hint: "Rules between questions, no box.",
      classes: "flex flex-col divide-y divide-base-300",
      children: faqItems("py-1"),
    },
    {
      id: "filled",
      label: "Filled",
      group: "FAQ",
      hint: "Tinted panels, no borders.",
      classes: "flex flex-col gap-2",
      children: faqItems("rounded-xl bg-base-200 px-5"),
    },
    {
      id: "numbered",
      label: "Numbered",
      group: "FAQ",
      hint: "Questions counted 01, 02, 03.",
      classes: "flex flex-col divide-y divide-base-300",
      children: faqItems("py-1", true),
    },
    {
      id: "plain",
      label: "Plain",
      group: "FAQ",
      hint: "No chrome at all — for a page that already has plenty.",
      classes: "flex flex-col gap-4",
      children: faqItems(""),
    },
    {
      id: "multi",
      label: "Several open",
      group: "Behaviour",
      hint: "Readers can keep more than one answer open.",
      classes: "flex flex-col gap-2",
      props: { multi: true },
      children: faqItems("rounded-2xl border border-base-300 bg-base-100 px-5"),
    },
    {
      id: "one-at-a-time",
      label: "One at a time",
      group: "Behaviour",
      hint: "Opening a question closes the last — the default.",
      classes: "flex flex-col gap-2",
      props: { multi: false },
      children: faqItems("rounded-2xl border border-base-300 bg-base-100 px-5"),
    },
  ],
}

// ── registry ─────────────────────────────────────────────────────────────────

/**
 * Module → its catalog. The editor looks a selected node up here to decide
 * whether to offer a variants chip, so adding a catalog is all a new component
 * needs — there is no per-element wiring.
 */
function withListReset(catalog: VariantCatalog): VariantCatalog {
  return {
    ...catalog,
    variants: catalog.variants.map((v) => ({
      ...v,
      classes: v.classes.includes("list-none") ? v.classes : `${LIST_RESET} ${v.classes}`,
    })),
  }
}

export const COMPONENT_VARIANTS: Record<string, VariantCatalog> = {
  card: CARD,
  alert: ALERT,
  badge: BADGE,
  avatar: AVATAR,
  accordion: ACCORDION,
  // These two render real <ol>/<ul>; see LIST_RESET.
  breadcrumb: withListReset(BREADCRUMB),
  pagination: withListReset(PAGINATION),
}

export function componentVariants(module: string): VariantCatalog | undefined {
  return COMPONENT_VARIANTS[module]
}
