/**
 * Brand modules — the ones that are about the BRAND rather than the page.
 *
 * An author can already drop an image and a link into a navbar, so these exist
 * for the cases where doing that is wrong:
 *
 *   logo       reads the brand's own branding settings, so it is right on every
 *              page without being re-uploaded into each one, and it keeps
 *              following the settings when the brand changes its mark.
 *   cart-icon  counts what is in THIS visitor's cart. Nothing authored can know
 *              that, and it must not be baked into the HTML of a cached page.
 *   saved-icon the same for saved items / wishlist.
 *   account-menu  who is signed in, which is per visitor for the same reason.
 *
 * Two data paths, and the split is deliberate. The logo is SSR'd from the
 * `site` frame because it is above the fold and part of how the page looks to a
 * crawler. The other three render a known-shaped placeholder and are filled by
 * the runtime, because a per-visitor number written into shared HTML is wrong
 * the moment a second visitor reads it — and these pages ARE cached.
 *
 * Like every other module here, each applies the node's `className` to its root
 * and spreads `...rootAttrs(p)` so the canvas can select it.
 */

import { createElement } from "react"

import { ADVANCED_DEFAULTS, ADVANCED_SCHEMA, rootAttrs } from "../advanced"
import { iconSvg } from "../icons"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const bool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1"

/** A glyph from the shipped set, so these match every other icon in the product. */
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

// ── logo ─────────────────────────────────────────────────────────────────────

/**
 * The brand's mark, from branding settings.
 *
 * Falls back along a chain that always renders SOMETHING: the author's override,
 * then the brand's uploaded logo, then the brand's name as a wordmark. A navbar
 * with an invisible logo is worse than one with a wordmark, and in the editor
 * there is no `site` frame at all — so the wordmark is what an author sees while
 * building, which is honest about what a brand without a logo will get.
 */
const Logo: ModuleDefinition = {
  name: "logo",
  category: "advanced",
  schema: {
    src: {
      type: "media",
      label: "override image",
    },
    alt: { type: "plain", label: "alt text" },
    height: { type: "plain", label: "height (css)" },
    linkToHome: { type: "boolean", label: "links to home" },
    ...ADVANCED_SCHEMA,
  },
  // No `src` default: empty means "use the brand's", which is the whole point.
  defaults: {
    src: "",
    alt: "",
    height: "2rem",
    linkToHome: true,
    ...ADVANCED_DEFAULTS,
  },
  contentModel: { children: "none" },
  defaultClasses: "inline-flex items-center gap-2 no-underline text-base-content",
  Component: (p: ModuleRenderProps) => {
    const site = p.site ?? {}
    const brandName = str(site.name) || str(site.tenantName) || "Your brand"
    const src = str(p.props.src) || str(site.logo) || str(site.logoUrl)
    const height = str(p.props.height, "2rem")

    const inner = src
      ? createElement("img", {
          src,
          // The brand's name is the honest alt text for its own mark; an author
          // can still override it.
          alt: str(p.props.alt) || brandName,
          style: { height, width: "auto" },
          // The logo is the one image in a navbar that must not arrive late.
          loading: "eager",
          decoding: "sync",
        })
      : createElement(
          "span",
          { className: "font-display text-lg font-bold tracking-tight" },
          brandName
        )

    const attrs = {
      className: p.className,
      "data-bapp-logo": "",
      ...rootAttrs(p),
    }

    return bool(p.props.linkToHome)
      ? createElement("a", { ...attrs, href: "/" }, inner)
      : createElement("span", attrs, inner)
  },
}

// ── per-visitor counters ─────────────────────────────────────────────────────

/**
 * One shape for both counters.
 *
 * The badge is rendered but EMPTY and hidden, not omitted: the runtime only has
 * to fill a number and unhide it, so there is no layout shift when the count
 * arrives, and a page served from cache shows no stale number in the meantime.
 */
function counter(
  name: string,
  icon: string,
  label: string,
  hook: string
): ModuleDefinition {
  return {
    name,
    category: "advanced",
    schema: {
      href: { type: "url", label: "links to" },
      showCount: { type: "boolean", label: "show count" },
      ...ADVANCED_SCHEMA,
    },
    defaults: {
      href: name === "cart-icon" ? "/cart" : "/account/saved",
      showCount: true,
      ...ADVANCED_DEFAULTS,
    },
    contentModel: { children: "none" },
    defaultClasses:
      "relative inline-flex items-center justify-center w-10 h-10 no-underline text-base-content",
    Component: (p: ModuleRenderProps) =>
      createElement(
        "a",
        {
          className: p.className,
          href: str(p.props.href, "/"),
          [hook]: "",
          "aria-label": label,
          ...rootAttrs(p),
        },
        glyph(icon, "inline-block w-5 h-5"),
        bool(p.props.showCount)
          ? createElement("span", {
              "data-bapp-count": "",
              // Hidden until the runtime has a real number. `hidden` rather
              // than absent so filling it causes no reflow.
              hidden: true,
              className:
                "absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-content text-[10px] font-semibold leading-4 text-center",
            })
          : null
      ),
  }
}

const CartIcon = counter("cart-icon", "shopping-cart2", "Cart", "data-bapp-cart")
const SavedIcon = counter("saved-icon", "heart", "Saved items", "data-bapp-saved")

// ── account menu ─────────────────────────────────────────────────────────────

/**
 * The signed-in visitor's menu.
 *
 * Deliberately NOT a new interactive module: it emits the same
 * `data-bapp-dropdown` / `-trigger` / `-menu` hooks the dropdown module already
 * uses, so the open/close behaviour, outside-click and Escape handling are the
 * ones already shipped and tested. All this adds is who the visitor is and the
 * default destinations, which the runtime fills.
 *
 * Signed out, the runtime swaps the trigger for a sign-in link — which is why
 * both are rendered and one is hidden, rather than the server guessing from a
 * cached page which visitor is reading it.
 */
const AccountMenu: ModuleDefinition = {
  name: "account-menu",
  category: "advanced",
  schema: {
    signedOutLabel: { type: "plain", label: "signed-out label" },
    ...ADVANCED_SCHEMA,
  },
  defaults: { signedOutLabel: "Sign in", ...ADVANCED_DEFAULTS },
  contentModel: { children: "none" },
  defaultClasses: "relative inline-flex items-center",
  Component: (p: ModuleRenderProps) =>
    createElement(
      "div",
      {
        className: p.className,
        "data-bapp-dropdown": "",
        "data-bapp-account": "",
        ...rootAttrs(p),
      },
      // Signed OUT: a plain link, which is what a visitor with no session gets
      // and what a crawler should see.
      createElement(
        "a",
        {
          "data-bapp-account-signin": "",
          href: "/sign-in",
          className: "inline-flex items-center gap-1.5 text-sm no-underline text-base-content",
        },
        glyph("account-circle", "inline-block w-5 h-5"),
        str(p.props.signedOutLabel, "Sign in")
      ),
      // Signed IN: the trigger and its menu, unhidden by the runtime.
      createElement(
        "button",
        {
          type: "button",
          "data-bapp-dropdown-trigger": "",
          "data-bapp-account-trigger": "",
          hidden: true,
          "aria-label": "Account",
          className: "inline-flex items-center justify-center w-9 h-9 rounded-full bg-base-200",
        },
        glyph("account-circle", "inline-block w-5 h-5")
      ),
      createElement("div", {
        "data-bapp-dropdown-menu": "",
        "data-bapp-account-menu": "",
        hidden: true,
        className:
          "absolute right-0 top-full z-40 mt-1 min-w-44 rounded-md border border-base-300 bg-base-100 p-1 shadow-lg",
      })
    ),
}

export const BRAND_MODULES: ModuleDefinition[] = [
  Logo,
  CartIcon,
  SavedIcon,
  AccountMenu,
]
