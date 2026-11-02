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

export const COMMERCE_MODULES: ModuleDefinition[] = [
  WishlistButton,
  WhatsappButton,
]
