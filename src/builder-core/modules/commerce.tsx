/**
 * The two commerce controls a shop's own page cannot be built without.
 *
 * Both are here rather than composed from a button and a link because both
 * depend on something the author does not have: the heart needs THIS visitor's
 * saved list, which must never be baked into a cached page, and the WhatsApp
 * button needs the brand's own number, which must not be typed into a page
 * where it will rot the day the brand changes phones.
 *
 * Neither is a section. A "featured products" band is already expressible —
 * a `loop` over the products feed with bindings on ordinary nodes — and baking
 * a card layout into a module would mean one shop's grid for every brand.
 * These are the parts that a layout cannot supply for itself.
 */

import { createElement } from "react"

import { ADVANCED_DEFAULTS, ADVANCED_SCHEMA, rootAttrs } from "../advanced"
import { iconSvg } from "../icons"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const bool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1"

const glyph = (id: string, className: string) => {
  const svg = iconSvg(id)
  return svg
    ? createElement("span", {
        className,
        "aria-hidden": "true",
        dangerouslySetInnerHTML: { __html: svg },
      })
    : null
}

/**
 * Save this for later.
 *
 * Rendered UNFILLED on the server, always. The page is cached and shared
 * between visitors, so a heart whose state was server-rendered would show one
 * shopper another's saved list; the runtime asks "which of these are mine?"
 * once on load and fills in the answers.
 *
 * `productId` is meant to be BOUND (`item.id` inside a loop over a products
 * feed) rather than typed, which is why its default is empty and a button
 * without one renders inert instead of posting a save for the empty string.
 */
const WishlistButton: ModuleDefinition = {
  name: "wishlist-button",
  category: "commerce",
  schema: {
    productId: { type: "plain", label: "product id (bind to item.id)" },
    label: { type: "plain", label: "accessible label" },
    ...ADVANCED_SCHEMA,
  },
  defaults: {
    productId: "",
    label: "Save for later",
    ...ADVANCED_DEFAULTS,
  },
  contentModel: { children: "none" },
  defaultClasses:
    "inline-flex items-center justify-center w-9 h-9 rounded-full border border-base-300 bg-base-100 text-base-content/60 transition-colors hover:text-base-content",
  // The filled state, for the utility generator: the runtime adds this class and
  // the page has to already carry a rule for it.
  staticClasses: "text-primary",
  needsRuntime: true,
  Component: (p: ModuleRenderProps) => {
    const productId = str(p.props.productId)
    return createElement(
      "button",
      {
        className: p.className,
        type: "button",
        "data-bapp-wishlist": "",
        ...(productId ? { "data-product-id": productId } : {}),
        "aria-pressed": "false",
        "aria-label": str(p.props.label, "Save for later"),
        title: str(p.props.label, "Save for later"),
        ...rootAttrs(p),
      },
      glyph("heart", "inline-block w-4 h-4")
    )
  },
}

/**
 * Message the brand on WhatsApp.
 *
 * The number comes from the brand's own settings through the `site` frame, so
 * one template works for every tenant and a brand that changes its number does
 * not have to find every page it was typed into. An author may override it per
 * node — a second line for sales, say — and that override wins.
 *
 * With no number anywhere, this renders NOTHING. A floating green button that
 * opens an empty chat is worse than no button: it is a dead end at the exact
 * moment somebody wanted to buy.
 *
 * `float` is the fixed bottom-right bubble every shop in this market has. It
 * sits above the page but below a modal, and it carries the safe-area inset so
 * it clears the home indicator on a phone.
 */
const WhatsappButton: ModuleDefinition = {
  name: "whatsapp-button",
  category: "commerce",
  schema: {
    number: { type: "plain", label: "number (blank = the brand's own)" },
    message: { type: "plain", label: "message to prefill" },
    label: { type: "plain", label: "label (blank = icon only)" },
    float: { type: "boolean", label: "float at the bottom-right" },
    ...ADVANCED_SCHEMA,
  },
  defaults: {
    number: "",
    message: "",
    label: "",
    float: true,
    ...ADVANCED_DEFAULTS,
  },
  contentModel: { children: "none" },
  defaultClasses:
    "inline-flex items-center justify-center gap-2 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg no-underline transition-transform hover:scale-105",
  staticClasses: "fixed bottom-5 right-5 z-40",
  Component: (p: ModuleRenderProps) => {
    const site = p.site as { whatsapp?: unknown } | undefined
    const raw = str(p.props.number) || str(site?.whatsapp)
    // Only the digits survive. A number written "+234 801 234 5678" is how a
    // brand types it and not how wa.me accepts it.
    const digits = raw.replace(/[^0-9]/g, "")
    if (digits.length < 8) {
      // In the editor the author still needs to see and select it; on a
      // published page it is simply not there.
      return p.isEditor
        ? createElement(
            "span",
            {
              className: p.className,
              "data-bapp-whatsapp-empty": "",
              title: "No WhatsApp number in your settings yet",
              ...rootAttrs(p),
            },
            glyph("whatsapp", "inline-block w-6 h-6")
          )
        : null
    }

    const message = str(p.props.message)
    const href = `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`
    const label = str(p.props.label)
    const floating = bool(p.props.float)

    return createElement(
      "a",
      {
        className: [p.className, floating ? "fixed bottom-5 right-5 z-40" : ""]
          .filter(Boolean)
          .join(" "),
        href,
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": label || "Message us on WhatsApp",
        // Clears the home indicator on a phone, where a fixed bubble otherwise
        // sits under the system bar.
        ...(floating
          ? { style: { bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" } }
          : {}),
        ...rootAttrs(p),
      },
      glyph("whatsapp", "inline-block w-6 h-6"),
      label ? createElement("span", null, label) : null
    )
  },
}

/**
 * A wall of the shop's own stock, in one element.
 *
 * WHICH products appear is not set here and deliberately cannot be: it is
 * decided in the Products admin, by ticking Featured — or by the shop's own
 * sales, for the best-selling and trending feeds. An author choosing products
 * inside a page would mean a homepage that goes stale the week something sells
 * out, maintained in a place nobody thinks to look.
 *
 * What this element owns is the SHAPE: how many, how wide, and that each card
 * carries a picture, a name, a price and a heart. It arrives as ordinary nodes
 * (see `defaultChildren`) rather than a fixed component, so an author can
 * restyle the card, drop the price, or add a badge — a band you cannot take
 * apart is a band every shop has to live with exactly as we drew it.
 *
 * `requireFeed` is on the wrapper: a shop with nothing featured gets no band
 * at all rather than a heading over an empty grid.
 */
const CARD = "relative flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-3"

const FeaturedProducts: ModuleDefinition = {
  name: "featured-products",
  category: "commerce",
  schema: {
    requireFeed: {
      type: "select",
      label: "show",
      options: [
        { label: "Featured products (ticked in Products)", value: "products.featured" },
        { label: "Newest products", value: "products.newest" },
        { label: "Best-selling", value: "products.bestselling" },
        { label: "Trending (last 30 days)", value: "products.trending" },
      ],
    },
    ...ADVANCED_SCHEMA,
  },
  defaults: {
    // Read by the renderer on ANY node: when this feed has no rows the whole
    // section is dropped, heading included.
    requireFeed: "products.featured",
    ...ADVANCED_DEFAULTS,
  },
  contentModel: { children: "any" },
  defaultClasses: "w-full px-4 py-10 md:px-6 md:py-14",
  defaultChildren: [
    {
      module: "container",
      classes: "mx-auto flex w-full max-w-7xl flex-col gap-5",
      children: [
        {
          module: "heading",
          props: { text: "Featured", level: "2" },
          classes:
            "font-display text-xl font-bold tracking-tight text-base-content md:text-2xl",
        },
        {
          module: "loop",
          props: { source: "products.featured", limit: 8, tag: "div" },
          classes: "grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5",
          children: [
            {
              module: "box",
              classes: CARD,
              children: [
                {
                  module: "link",
                  classes: "flex flex-col gap-3 no-underline",
                  props: { text: "", href: "/shop" },
                  bindings: { href: { source: "item", field: "url" } },
                  children: [
                    {
                      module: "image",
                      classes: "aspect-square w-full rounded-xl object-contain",
                      props: {
                        altMode: "custom",
                        alt: "",
                        src: "https://placehold.co/600x600/f1f5f9/94a3b8?text=%20",
                      },
                      bindings: { src: { source: "item", field: "image" } },
                    },
                    {
                      module: "text",
                      classes:
                        "line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-base-content",
                      props: { text: "Product name" },
                      bindings: { text: { source: "item", field: "title" } },
                    },
                    {
                      module: "text",
                      classes: "text-sm font-semibold text-base-content",
                      props: { text: "" },
                      bindings: { text: { source: "item", field: "price" } },
                    },
                  ],
                },
                {
                  module: "wishlist-button",
                  classes:
                    "absolute right-4 top-4 inline-flex items-center justify-center w-8 h-8 rounded-full border border-base-300 bg-base-100 text-base-content/50 transition-colors hover:text-base-content",
                  props: { label: "Save for later" },
                  bindings: { productId: { source: "item", field: "id" } },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  Component: (p: ModuleRenderProps) =>
    createElement(
      "section",
      { className: p.className, ...rootAttrs(p) },
      p.children
    ),
}

export const COMMERCE_MODULES: ModuleDefinition[] = [
  WishlistButton,
  WhatsappButton,
  FeaturedProducts,
]
export { CARD as PRODUCT_CARD_CLASSES }
