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

import { createElement, Fragment as RFragment } from "react"

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
 * The badge's own classes.
 *
 * Declared as `staticClasses` and not merely written in the markup below: the
 * utility generator only ever sees `node.classes`, so a class hardcoded in a
 * Component gets NO rule unless some other node on the same page happens to
 * use the same token. This badge was in that state — a count with no
 * background, no radius and no size, sitting wherever the flow put it.
 */
const BADGE =
  "absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-content text-[10px] font-semibold leading-4 text-center"

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
      // `/account/saved` is the address this used to carry and no route has
      // ever answered it: the saved list lives at `/account/wishlist`. A
      // header icon landing on the catch-all's "Page not found" is the kind of
      // dead link that reads as a broken account area.
      href: name === "cart-icon" ? "/cart" : "/account/wishlist",
      showCount: true,
      ...ADVANCED_DEFAULTS,
    },
    contentModel: { children: "none" },
    defaultClasses:
      "relative inline-flex items-center justify-center w-10 h-10 no-underline text-base-content",
    staticClasses: BADGE,
    // The number is per-visitor, so it arrives from the runtime; without this
    // the script is not injected on a page whose only interactive element is
    // the cart icon, and the badge stays hidden for ever.
    needsRuntime: true,
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
              className: BADGE,
            })
          : null
      ),
  }
}

const CartIcon = counter("cart-icon", "shopping-cart2", "Cart", "data-bapp-cart")
const SavedIcon = counter("saved-icon", "heart", "Saved items", "data-bapp-saved")

// ── account menu ─────────────────────────────────────────────────────────────

const ACCOUNT_SIGNED_OUT =
  "inline-flex items-center gap-1.5 text-sm no-underline text-base-content"
const ACCOUNT_TRIGGER =
  "inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-content text-xs font-bold"
const ACCOUNT_MENU =
  "absolute right-0 top-full z-40 mt-1 min-w-56 rounded-md border border-base-300 bg-base-100 p-1 shadow-lg"
const ACCOUNT_ITEM =
  "flex w-full items-center rounded px-3 py-2 text-left text-sm no-underline text-base-content transition-colors hover:bg-base-200"
const ACCOUNT_HEAD = "px-3 py-2 text-xs text-base-content/60"

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
 *
 * ── Why the inner classes are props ────────────────────────────────────────
 *
 * A template that puts this in a storefront strip has already decided what a
 * control there looks like: the height of the pill, its radius, its hover. The
 * module cannot know those, and a module-owned pill dropped into a design is
 * the one visible seam between "the brand built this page" and "we did". So
 * each is a prop with the sensible default above, and `classProps` makes the
 * utility generator emit CSS for whatever a design passes — without it the
 * class lands on the element and nothing styles it.
 *
 * `children`, when a template supplies any, are the signed-out pill's contents
 * — an icon and the word, authored as ordinary nodes, so a design keeps its
 * own glyph instead of ours.
 */
const AccountMenu: ModuleDefinition = {
  name: "account-menu",
  category: "advanced",
  schema: {
    signedOutLabel: { type: "plain", label: "signed-out label" },
    signedOutHref: { type: "url", label: "sign-in page" },
    signedOutClasses: { type: "plain", label: "signed-out classes" },
    triggerClasses: { type: "plain", label: "avatar classes" },
    menuClasses: { type: "plain", label: "menu classes" },
    menuItemClasses: { type: "plain", label: "menu item classes" },
    menuHeadClasses: { type: "plain", label: "menu heading classes" },
    ...ADVANCED_SCHEMA,
  },
  defaults: {
    signedOutLabel: "Sign in",
    signedOutHref: "/sign-in",
    signedOutClasses: ACCOUNT_SIGNED_OUT,
    triggerClasses: ACCOUNT_TRIGGER,
    menuClasses: ACCOUNT_MENU,
    menuItemClasses: ACCOUNT_ITEM,
    menuHeadClasses: ACCOUNT_HEAD,
    ...ADVANCED_DEFAULTS,
  },
  classProps: [
    "signedOutClasses",
    "triggerClasses",
    "menuClasses",
    "menuItemClasses",
    "menuHeadClasses",
  ],
  contentModel: { children: "any" },
  defaultClasses: "relative inline-flex items-center",
  // Who is reading this page is per-visitor, so the swap is the runtime's job.
  needsRuntime: true,
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
          href: str(p.props.signedOutHref, "/sign-in"),
          className: str(p.props.signedOutClasses, ACCOUNT_SIGNED_OUT),
        },
        p.children ??
          createElement(
            RFragment,
            null,
            glyph("account-circle", "inline-block w-5 h-5"),
            str(p.props.signedOutLabel, "Sign in")
          )
      ),
      // Signed IN: the trigger and its menu, unhidden by the runtime. The
      // initials go in a child span so the runtime writes text without
      // touching the button's own attributes.
      createElement(
        "button",
        {
          type: "button",
          "data-bapp-dropdown-trigger": "",
          "data-bapp-account-trigger": "",
          hidden: true,
          "aria-label": "Account",
          className: str(p.props.triggerClasses, ACCOUNT_TRIGGER),
        },
        createElement("span", { "data-bapp-account-initials": "" })
      ),
      createElement("div", {
        "data-bapp-dropdown-menu": "",
        "data-bapp-account-menu": "",
        hidden: true,
        // The runtime builds the rows and needs the design's own classes for
        // them; carried as data rather than looked up, because the script has
        // no access to the document's props.
        "data-item-class": str(p.props.menuItemClasses, ACCOUNT_ITEM),
        "data-head-class": str(p.props.menuHeadClasses, ACCOUNT_HEAD),
        className: str(p.props.menuClasses, ACCOUNT_MENU),
      })
    ),
}

export const BRAND_MODULES: ModuleDefinition[] = [
  Logo,
  CartIcon,
  SavedIcon,
  AccountMenu,
]
