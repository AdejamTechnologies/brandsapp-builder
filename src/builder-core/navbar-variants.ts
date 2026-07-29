/**
 * Navbar variants — the starter arrangements offered from the Navbar element's
 * preset chip.
 *
 * A variant is nothing more than a `DefaultChild` subtree plus the classes for
 * the `<nav>` itself. Applying one REPLACES the navbar's children with real,
 * fully-editable nodes; there is no variant branch anywhere in the renderer and
 * nothing for tenant SSR to learn. That is the whole point — a variant is a
 * starting point an author immediately owns, not a locked-in component.
 *
 * PROVENANCE. The catalog covers the union of three published navbar sets the
 * user pointed at, but none of the markup here is copied from any of them:
 *   • Preline — deliberately NOT ingested; its licence is dual MIT + a Fair Use
 *     non-compete, and refactoring would still leave a derivative work. Layout
 *     IDEAS aren't protectable, so the arrangements are covered and the markup
 *     is ours (see the reference note on the Preline licence).
 *   • Meraki UI — MIT, but every navbar there is driven by Alpine.js, which we
 *     do not ship. The behaviours are reimplemented on our own `data-bapp-*`
 *     runtime instead.
 *   • ShadcnSpace — 10 of its 11 navbars are paid "Pro" blocks, so only the
 *     shapes are reproduced, authored from scratch on our theme.
 *
 * Everything is styled from daisyUI theme tokens (`base-content`, `base-100`,
 * `primary`) so a tenant's palette flows through untouched.
 */

import { iconSvg } from "./icons"
import type { DefaultChild } from "./registry"

export interface NavbarVariant {
  id: string
  label: string
  /** Groups the picker; mirrors how the sources organise their own catalogs. */
  group: "Layout" | "Style" | "Features"
  /** One line describing the arrangement, shown under the preview. */
  hint: string
  /** Replaces the navbar's own `defaultClasses`. */
  classes: string
  children: DefaultChild[]
}

// ── shared pieces ────────────────────────────────────────────────────────────

const LINK = "text-sm text-base-content/70 hover:text-base-content no-underline transition-colors"
const LINK_ON_DARK = "text-sm text-neutral-content/70 hover:text-neutral-content no-underline transition-colors"

const BAR = "w-full max-w-6xl mx-auto flex items-center justify-between gap-6 px-6 py-4"

/** Desktop row / mobile sheet, matching the `nav-menu` module's own defaults. */
const MENU =
  "hidden absolute left-0 right-0 top-full z-40 flex-col items-stretch gap-1 border-t border-base-300 bg-base-100 p-4 shadow-lg " +
  "md:static md:z-auto md:flex md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none"

/** Same, for bars that paint their own dark ground. */
const MENU_DARK =
  "hidden absolute left-0 right-0 top-full z-40 flex-col items-stretch gap-1 border-t border-neutral-content/10 bg-neutral p-4 shadow-lg " +
  "md:static md:z-auto md:flex md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none"

const link = (text: string, classes = LINK): DefaultChild => ({
  module: "link",
  props: { text, href: "#" },
  classes,
})

const brand = (text = "Brand", classes = "font-display text-lg font-bold tracking-tight text-base-content"): DefaultChild => ({
  module: "heading",
  props: { text, level: "3" },
  classes,
})

const menu = (links: DefaultChild[], classes = MENU): DefaultChild => ({
  module: "nav-menu",
  classes,
  children: links,
})

/**
 * The hamburger's layout lives in classes (the canvas has no runtime to inject
 * it), so a variant that wants a different colour or position must keep the base
 * rather than replace it — hence `extra` rather than a full class override.
 */
const TOGGLE_BASE = "md:hidden inline-flex flex-col justify-center gap-[5px] w-10 h-10 px-[9px] cursor-pointer"

const toggle = (extra = "text-base-content"): DefaultChild => ({
  module: "nav-toggle",
  classes: `${TOGGLE_BASE} ${extra}`,
})

const cta = (label: string, variant = "default", classes?: string): DefaultChild => ({
  module: "button",
  props: { label, variant, size: "sm", linkType: "url", href: "#" },
  ...(classes ? { classes } : {}),
})

const row = (children: DefaultChild[], classes = "flex items-center gap-3"): DefaultChild => ({
  module: "stack",
  props: { direction: "row", align: "center" },
  classes,
  children,
})

const icon = (svg: string, classes = "inline-block w-5 h-5 text-base-content/70"): DefaultChild => ({
  module: "icon",
  props: { svg },
  classes,
})

// Glyphs come from the shipped Remix Icon set (see icons.ts) rather than being
// hand-drawn here, so a navbar matches every other icon in the product. `iconSvg`
// returns undefined for an unknown id, which would render an empty span — the
// fallback keeps a variant visible if the catalog is ever regenerated smaller.
const G = (id: string) => iconSvg(id) ?? ""

const ICON_SEARCH = G("search")
const ICON_CART = G("shopping-cart2")
const ICON_USER = G("user3")
const ICON_HEART = G("heart")
const ICON_PHONE = G("phone")
const ICON_MAIL = G("mail")
const ICON_FACEBOOK = G("facebook-circle")
const ICON_INSTAGRAM = G("instagram")
const ICON_X = G("twitter-x")

const searchField = (classes = "hidden md:block"): DefaultChild => ({
  module: "box",
  classes: `${classes} relative`,
  children: [
    icon(ICON_SEARCH, "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-block w-4 h-4 text-base-content/40"),
    {
      module: "input",
      // No `label` — the magnifier is the affordance, and the input keeps its
      // accessible name from the placeholder rather than a visible field label.
      props: { placeholder: "Search", label: "", name: "q", type: "search" },
      classes:
        "h-9 w-48 rounded-full border border-base-300 bg-base-100 pl-9 pr-3 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/30",
    },
  ],
})

const dropdownItem = (text: string): DefaultChild => ({
  module: "link",
  props: { text, href: "#" },
  classes: "block rounded-md px-3 py-2 text-sm text-base-content no-underline hover:bg-base-200",
})

/** A mega-menu column: a small caps label over a stack of links. */
const megaColumn = (title: string, items: string[]): DefaultChild => ({
  module: "stack",
  props: { direction: "column" },
  classes: "flex flex-col gap-1",
  children: [
    {
      module: "text",
      props: { tag: "div", text: title },
      classes: "px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-base-content/45",
    },
    ...items.map(dropdownItem),
  ],
})

// ── the catalog ──────────────────────────────────────────────────────────────

const CATALOG: NavbarVariant[] = [
  // ── Layout ────────────────────────────────────────────────────────────────
  {
    id: "simple",
    label: "Simple",
    group: "Layout",
    hint: "Wordmark left, links right.",
    classes: BAR,
    children: [
      brand(),
      menu([link("Home"), link("About"), link("Pricing"), link("Contact")]),
      toggle(),
    ],
  },
  {
    id: "left",
    label: "Left aligned",
    group: "Layout",
    hint: "Wordmark and links together on the left.",
    classes: "w-full max-w-6xl mx-auto flex items-center gap-8 px-6 py-4",
    children: [
      brand(),
      menu([link("Home"), link("Features"), link("Pricing"), link("Docs")]),
      toggle("ml-auto text-base-content"),
    ],
  },
  {
    id: "centered-links",
    label: "Centred links",
    group: "Layout",
    hint: "Links centred between the wordmark and a call to action.",
    classes: BAR,
    children: [
      brand(),
      menu(
        [link("Product"), link("Solutions"), link("Pricing"), link("Company")],
        `${MENU} md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2`
      ),
      row([cta("Get started")], "flex items-center gap-2"),
      toggle(),
    ],
  },
  {
    id: "brand-center",
    label: "Centred brand",
    group: "Layout",
    hint: "Wordmark in the middle, links either side.",
    classes: "w-full max-w-6xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-4",
    children: [
      menu([link("Shop"), link("Stories")], `${MENU} md:justify-self-start`),
      brand("Brand", "font-display text-lg font-bold tracking-tight text-base-content text-center"),
      row([cta("Contact", "outline")], "flex items-center justify-end gap-2"),
      toggle("absolute left-4 text-base-content"),
    ],
  },
  {
    id: "cta",
    label: "With call to action",
    group: "Layout",
    hint: "Links right, ending in a primary button.",
    classes: BAR,
    children: [
      brand(),
      menu([link("Work"), link("Services"), link("About"), link("Journal")]),
      row([cta("Start a project")], "hidden md:flex items-center gap-2"),
      toggle(),
    ],
  },
  {
    id: "scrollable",
    label: "Scrollable links",
    group: "Layout",
    hint: "Long link row that scrolls sideways instead of wrapping.",
    classes: BAR,
    children: [
      brand(),
      menu(
        [
          link("Home"),
          link("Collections"),
          link("New in"),
          link("Editorial"),
          link("Lookbook"),
          link("Stockists"),
          link("Support"),
        ],
        `${MENU} md:flex-nowrap md:overflow-x-auto md:whitespace-nowrap`
      ),
      toggle(),
    ],
  },
  {
    id: "topbar",
    label: "With top strip",
    group: "Layout",
    hint: "Contact strip above the main bar.",
    classes: "w-full flex flex-col",
    children: [
      {
        module: "box",
        classes: "w-full border-b border-base-300 bg-base-200",
        children: [
          row(
            [
              row([icon(ICON_PHONE, "inline-block w-4 h-4 text-base-content/50"), link("+234 800 000 0000", "text-xs text-base-content/70 no-underline")], "flex items-center gap-2"),
              row([icon(ICON_MAIL, "inline-block w-4 h-4 text-base-content/50"), link("hello@brand.com", "text-xs text-base-content/70 no-underline")], "flex items-center gap-2"),
            ],
            "mx-auto flex w-full max-w-6xl items-center justify-end gap-6 px-6 py-2"
          ),
        ],
      },
      {
        module: "box",
        classes: "w-full max-w-6xl mx-auto flex items-center justify-between gap-6 px-6 py-4",
        children: [
          brand(),
          menu([link("Home"), link("Services"), link("Team"), link("Contact")]),
          toggle(),
        ],
      },
    ],
  },

  // ── Style ─────────────────────────────────────────────────────────────────
  {
    id: "boxed",
    label: "Boxed",
    group: "Style",
    hint: "Floating rounded bar with a border and shadow.",
    classes:
      "w-full max-w-5xl mx-auto mt-4 flex items-center justify-between gap-6 rounded-2xl border border-base-300 bg-base-100/90 px-5 py-3 shadow-sm backdrop-blur",
    children: [
      brand(),
      menu([link("Home"), link("Features"), link("Pricing"), link("Blog")], `${MENU} md:rounded-2xl`),
      row([cta("Sign up")], "hidden md:flex items-center gap-2"),
      toggle(),
    ],
  },
  {
    id: "dark",
    label: "Inverse",
    group: "Style",
    hint: "Dark bar for a light page (or the reverse).",
    classes: "w-full bg-neutral text-neutral-content",
    children: [
      {
        module: "box",
        classes: "w-full max-w-6xl mx-auto flex items-center justify-between gap-6 px-6 py-4",
        children: [
          brand("Brand", "font-display text-lg font-bold tracking-tight text-neutral-content"),
          menu([link("Home", LINK_ON_DARK), link("Product", LINK_ON_DARK), link("Pricing", LINK_ON_DARK), link("Contact", LINK_ON_DARK)], MENU_DARK),
          row(
            [cta("Get started", "default", "inline-flex h-9 items-center rounded-md bg-base-100 px-4 text-sm font-medium text-base-content no-underline hover:opacity-90")],
            "hidden md:flex items-center gap-2"
          ),
          toggle("text-neutral-content"),
        ],
      },
    ],
  },
  {
    id: "primary",
    label: "Brand colour",
    group: "Style",
    hint: "Bar painted in the theme's primary colour.",
    classes: "w-full bg-primary text-primary-content",
    children: [
      {
        module: "box",
        classes: "w-full max-w-6xl mx-auto flex items-center justify-between gap-6 px-6 py-4",
        children: [
          brand("Brand", "font-display text-lg font-bold tracking-tight text-primary-content"),
          menu(
            [
              link("Home", "text-sm text-primary-content/80 hover:text-primary-content no-underline"),
              link("About", "text-sm text-primary-content/80 hover:text-primary-content no-underline"),
              link("Pricing", "text-sm text-primary-content/80 hover:text-primary-content no-underline"),
              link("Contact", "text-sm text-primary-content/80 hover:text-primary-content no-underline"),
            ],
            `${MENU} md:bg-transparent bg-primary border-primary-content/15`
          ),
          toggle("text-primary-content"),
        ],
      },
    ],
  },

  // ── Features ──────────────────────────────────────────────────────────────
  {
    id: "dropdown",
    label: "With dropdown",
    group: "Features",
    hint: "One link opens a small menu.",
    classes: BAR,
    children: [
      brand(),
      menu([
        link("Home"),
        {
          module: "dropdown",
          props: { label: "Products", openOnHover: true, closeDelay: 180 },
          classes: "relative inline-block",
          children: [dropdownItem("Overview"), dropdownItem("Analytics"), dropdownItem("Automation"), dropdownItem("Integrations")],
        },
        link("Pricing"),
        link("Contact"),
      ]),
      toggle(),
    ],
  },
  {
    id: "mega",
    label: "Mega menu",
    group: "Features",
    hint: "Wide multi-column panel with a highlighted card.",
    classes: BAR,
    children: [
      brand(),
      menu([
        link("Home"),
        {
          module: "dropdown",
          props: { label: "Platform", openOnHover: true, closeDelay: 200 },
          classes: "relative inline-block md:static",
          children: [
            {
              module: "box",
              classes: "grid w-full gap-6 p-2 md:w-[42rem] md:grid-cols-3",
              children: [
                megaColumn("Product", ["Overview", "Analytics", "Automation", "Reporting"]),
                megaColumn("Resources", ["Documentation", "Tutorials", "Community", "Release notes"]),
                {
                  module: "box",
                  classes: "rounded-xl border border-base-300 bg-base-200 p-4",
                  children: [
                    {
                      module: "text",
                      props: { tag: "div", text: "Getting started" },
                      classes: "text-sm font-semibold text-base-content",
                    },
                    {
                      module: "text",
                      props: { tag: "p", text: "A ten-minute tour of the essentials." },
                      classes: "mt-1 text-xs leading-relaxed text-base-content/60",
                    },
                    cta("Read the guide", "outline", "mt-3 inline-flex h-8 items-center rounded-md border border-base-300 px-3 text-xs font-medium text-base-content no-underline hover:bg-base-100"),
                  ],
                },
              ],
            },
          ],
        },
        link("Pricing"),
        link("Docs"),
      ]),
      row([cta("Get started")], "hidden md:flex items-center gap-2"),
      toggle(),
    ],
  },
  {
    id: "search",
    label: "With search",
    group: "Features",
    hint: "Search field beside the links.",
    classes: BAR,
    children: [
      brand(),
      menu([link("Home"), link("Categories"), link("Deals"), link("Support")]),
      row([searchField()], "flex items-center gap-3"),
      toggle(),
    ],
  },
  {
    id: "avatar",
    label: "With account",
    group: "Features",
    hint: "Avatar that opens an account menu.",
    classes: BAR,
    children: [
      brand(),
      menu([link("Dashboard"), link("Projects"), link("Team"), link("Reports")]),
      row(
        [
          {
            module: "image",
            props: { src: "https://i.pravatar.cc/80?img=12", alt: "Your account" },
            classes: "size-9 rounded-full object-cover ring-2 ring-base-300",
          },
          // The dropdown owns its trigger markup, so the avatar can't BE the
          // trigger — it sits beside a labelled one. An empty label would render
          // as a lone chevron in a box, which reads as a broken control.
          {
            module: "dropdown",
            props: { label: "Account", openOnHover: false, closeDelay: 120 },
            classes: "relative inline-block",
            children: [dropdownItem("Profile"), dropdownItem("Settings"), dropdownItem("Billing"), dropdownItem("Sign out")],
          },
        ],
        "flex items-center gap-2"
      ),
      toggle(),
    ],
  },
  {
    id: "ecommerce",
    label: "Commerce",
    group: "Features",
    hint: "Search, wishlist, account and cart actions.",
    classes: BAR,
    children: [
      brand(),
      menu([link("Shop"), link("New in"), link("Collections"), link("Sale")]),
      row(
        [
          searchField(),
          icon(ICON_HEART, "inline-block w-5 h-5 text-base-content/70 hover:text-base-content"),
          icon(ICON_USER, "inline-block w-5 h-5 text-base-content/70 hover:text-base-content"),
          {
            module: "box",
            classes: "relative",
            children: [
              icon(ICON_CART, "inline-block w-5 h-5 text-base-content/70 hover:text-base-content"),
              {
                module: "text",
                props: { tag: "span", text: "2" },
                classes:
                  "absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-content",
              },
            ],
          },
        ],
        "flex items-center gap-4"
      ),
      toggle(),
    ],
  },
  {
    id: "social",
    label: "With social links",
    group: "Features",
    hint: "Social icons trailing the navigation.",
    classes: BAR,
    children: [
      brand(),
      menu([link("Home"), link("Work"), link("Journal"), link("Contact")]),
      row(
        [
          icon(ICON_FACEBOOK, "inline-block w-5 h-5 text-base-content/60 hover:text-base-content"),
          icon(ICON_INSTAGRAM, "inline-block w-5 h-5 text-base-content/60 hover:text-base-content"),
          icon(ICON_X, "inline-block w-5 h-5 text-base-content/60 hover:text-base-content"),
        ],
        "hidden md:flex items-center gap-3 border-l border-base-300 pl-4"
      ),
      toggle(),
    ],
  },
]

/**
 * Applied centrally rather than repeated on every entry, and enforced by
 * tests/variant-trees.ts: the mobile panel is positioned against the `<nav>`, so
 * a variant whose root isn't `relative` opens its sheet against some outer
 * ancestor — wrong width, wrong place, and indistinguishable from a dead toggle.
 */
export const NAVBAR_VARIANTS: NavbarVariant[] = CATALOG.map((v) => ({
  ...v,
  classes: /(^|\s)relative(\s|$)/.test(v.classes) ? v.classes : `relative ${v.classes}`,
}))

export const NAVBAR_VARIANT_GROUPS = ["Layout", "Style", "Features"] as const

export function navbarVariant(id: string): NavbarVariant | undefined {
  return NAVBAR_VARIANTS.find((v) => v.id === id)
}
