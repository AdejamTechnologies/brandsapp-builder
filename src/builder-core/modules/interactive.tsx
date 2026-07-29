/**
 * Interactive OUTPUT primitives (the Preline model): they render static,
 * SSR-safe HTML with `data-*` hooks and become interactive on the published page.
 * `tabs` and `dropdown` are driven by the shared vanilla runtime (BUILDER_RUNTIME);
 * `accordion` is authored as native `<details>`, so it works with NO JS and the
 * runtime only upgrades it (animation, chevron, one-open-at-a-time). In the editor
 * (`isEditor`) they render expanded and editable so every panel is reachable.
 *
 * Colours here come from the doc's daisyUI theme vars (`--b1`/`--b3`) with literal
 * fallbacks — never a hardcoded white/slate, which would ignore the tenant's palette.
 */

import { createElement, type CSSProperties } from "react"

import { ADVANCED_DEFAULTS, ADVANCED_SCHEMA, rootAttrs } from "../advanced"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

/** The shared look of a menu row, reused by the module defaults and the variants. */
export const MENU_ITEM =
  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-base-content no-underline hover:bg-base-200"

const str = (v: unknown, d = "") => (v == null ? d : String(v))

const EDITOR_LABEL: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#64748b",
  marginBottom: "8px",
  paddingBottom: "4px",
  borderBottom: "1px solid #eef2f6",
}

// ── Tabs (runtime-driven) ─────────────────────────────────────────────────────
const Tabs: ModuleDefinition = {
  name: "tabs",
  category: "interactive",
  schema: {},
  defaults: {},
  contentModel: { children: ["tab-panel"] },
  needsRuntime: true,
  // Drops in as a working three-tab set. An empty `tabs` renders nothing at all
  // (the runtime builds the bar FROM the panels), so it needs starter panels the
  // way a form needs fields. Add or remove panels freely afterwards.
  defaultChildren: [
    { module: "tab-panel", props: { title: "Overview" }, children: [{ module: "text", props: { text: "Overview content." } }] },
    { module: "tab-panel", props: { title: "Features" }, children: [{ module: "text", props: { text: "Features content." } }] },
    { module: "tab-panel", props: { title: "Pricing" }, children: [{ module: "text", props: { text: "Pricing content." } }] },
  ],
  Component: (p: ModuleRenderProps) =>
    createElement("div", { className: p.className, "data-bapp-tabs": "", ...rootAttrs(p) }, p.children),
}

const TabPanel: ModuleDefinition = {
  name: "tab-panel",
  category: "interactive",
  schema: { title: { type: "plain" } },
  defaults: { title: "Tab" },
  contentModel: { children: "any" },
  Component: (p: ModuleRenderProps) =>
    createElement(
      "div",
      { className: p.className, "data-bapp-tab-panel": "", "data-title": str(p.props.title, "Tab"), ...rootAttrs(p) },
      p.isEditor ? createElement("div", { style: EDITOR_LABEL }, `Tab: ${str(p.props.title, "Tab")}`) : null,
      p.children
    ),
}

// ── Accordion (native <details>; the runtime upgrades it) ─────────────────────
// Authored as real <details>/<summary>, so it opens and closes with NO JS at all.
// The runtime then enhances it in place: height animation, a rotating chevron, and
// — unless `multi` is set — closing its siblings so only one panel stays open.
const Accordion: ModuleDefinition = {
  name: "accordion",
  category: "interactive",
  schema: { multi: { type: "boolean", label: "allow several open" } },
  defaults: { multi: false },
  contentModel: { children: ["accordion-item"] },
  needsRuntime: true,
  defaultChildren: [
    { module: "accordion-item", props: { title: "What's included?" }, children: [{ module: "text", props: { text: "Everything in the plan, with no setup fee." } }] },
    { module: "accordion-item", props: { title: "How does billing work?" }, children: [{ module: "text", props: { text: "You're billed monthly and can change plans anytime." } }] },
    { module: "accordion-item", props: { title: "Can I cancel anytime?" }, children: [{ module: "text", props: { text: "Yes — cancel from your dashboard, no phone calls." } }] },
  ],
  defaultClasses: "flex flex-col gap-2",
  Component: (p: ModuleRenderProps) =>
    createElement(
      "div",
      {
        className: p.className,
        "data-bapp-accordion": "",
        ...(p.props.multi ? { "data-multi": "" } : {}),
        ...rootAttrs(p),
      },
      p.children
    ),
}

const AccordionItem: ModuleDefinition = {
  name: "accordion-item",
  category: "interactive",
  schema: { title: { type: "plain" } },
  defaults: { title: "Section title" },
  contentModel: { children: "any" },
  defaultClasses: "border border-base-300 rounded-2xl px-5 bg-base-100",
  Component: (p: ModuleRenderProps) =>
    createElement(
      "details",
      { className: p.className, open: p.isEditor || undefined, ...rootAttrs(p) },
      createElement(
        "summary",
        { style: { cursor: "pointer", padding: "12px 0", fontWeight: 600, listStyle: "none" } },
        str(p.props.title, "Section title")
      ),
      createElement("div", { style: { paddingBottom: "12px" } }, p.children)
    ),
}

// ── Dropdown (runtime-driven) ─────────────────────────────────────────────────
const Dropdown: ModuleDefinition = {
  name: "dropdown",
  category: "interactive",
  schema: {
    /**
     * SIMPLE renders a built-in trigger button and wraps the children in a menu —
     * what every existing dropdown in every stored doc relies on, so it stays the
     * default and those docs need no migration. CUSTOM renders the children
     * untouched, so a variant can supply its own `dropdown-trigger` (an avatar, a
     * bare icon) and `dropdown-menu`, which a prop-driven trigger cannot express.
     */
    mode: {
      type: "select",
      label: "structure",
      segmented: true,
      options: [
        { label: "Simple", value: "simple" },
        { label: "Custom", value: "custom" },
      ],
    },
    label: { type: "plain", showIf: { mode: ["simple"] } },
    // Editor-only: hold the menu open so its items can be selected and styled.
    // Published pages always start closed.
    menuOpen: {
      type: "select",
      label: "menu",
      segmented: true,
      options: [
        { label: "Hide", value: "false" },
        { label: "Show", value: "true" },
      ],
    },
    openOnHover: { type: "boolean", label: "open menu on hover" },
    closeDelay: { type: "number", label: "close delay (ms)" },
  },
  defaults: { mode: "simple", label: "Menu", menuOpen: "false", openOnHover: false, closeDelay: 0 },
  contentModel: { children: "any" },
  needsRuntime: true,
  // Without items the menu opens onto nothing, so seed a few links.
  defaultChildren: [
    { module: "link", props: { text: "First item", href: "#" }, classes: "block px-3 py-2 rounded-md text-sm text-base-content no-underline hover:bg-base-200" },
    { module: "link", props: { text: "Second item", href: "#" }, classes: "block px-3 py-2 rounded-md text-sm text-base-content no-underline hover:bg-base-200" },
    { module: "link", props: { text: "Third item", href: "#" }, classes: "block px-3 py-2 rounded-md text-sm text-base-content no-underline hover:bg-base-200" },
  ],
  defaultClasses: "relative inline-block",
  Component: (p: ModuleRenderProps) => {
    const root = {
      className: p.className,
      "data-bapp-dropdown": "",
      ...(p.props.openOnHover ? { "data-hover": "" } : {}),
      ...(Number(p.props.closeDelay) > 0 ? { "data-close-delay": String(Number(p.props.closeDelay)) } : {}),
      ...rootAttrs(p),
    }
    // Custom: the children ARE the trigger and menu. The runtime finds them by
    // `:scope >`, so they have to stay direct children — which is why the
    // dropdown-trigger/-menu modules declare `allowedParents: ["dropdown"]`.
    if (str(p.props.mode, "simple") === "custom") return createElement("div", root, p.children)
    return createElement(
      "div",
      root,
      createElement(
        "button",
        {
          "data-bapp-dropdown-trigger": "",
          type: "button",
          style: {
            display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px",
            // Themed from the doc's own daisyUI vars (with literal fallbacks) so a
            // tenant's palette flows through instead of a baked-in white/slate.
            border: "1px solid hsl(var(--b3, 180 2% 90%))", borderRadius: "8px",
            background: "hsl(var(--b1, 0 0% 100%))", color: "inherit",
            cursor: "pointer", fontWeight: 500, font: "inherit",
          },
        },
        `${str(p.props.label, "Menu")} ▾`
      ),
      createElement(
        "div",
        {
          "data-bapp-dropdown-menu": "",
          style: {
            // In the editor the author can pin the menu open to style it; on a
            // published page it always starts closed and the runtime opens it.
            display: p.isEditor && String(p.props.menuOpen) === "true" ? "block" : "none", position: "absolute", top: "calc(100% + 6px)", left: 0,
            minWidth: "180px", background: "hsl(var(--b1, 0 0% 100%))",
            border: "1px solid hsl(var(--b3, 180 2% 90%))", borderRadius: "10px",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,.2)", padding: "6px", zIndex: 50,
          },
        },
        p.children
      )
    )
  },
}

/**
 * The clickable half of a custom dropdown. A `<button>` whose CONTENT is the
 * author's — an avatar, a bare icon, text plus a chevron — which is exactly what
 * the simple mode's `label` prop cannot express.
 */
const DropdownTrigger: ModuleDefinition = {
  name: "dropdown-trigger",
  category: "interactive",
  schema: { ...ADVANCED_SCHEMA },
  defaults: { ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  allowedParents: ["dropdown"],
  defaultClasses:
    "inline-flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-3.5 py-2 text-sm font-medium text-base-content cursor-pointer",
  defaultChildren: [{ module: "text", props: { tag: "span", text: "Menu" }, classes: "text-sm" }],
  Component: (p: ModuleRenderProps) =>
    createElement(
      "button",
      { className: p.className, type: "button", "data-bapp-dropdown-trigger": "", ...rootAttrs(p) },
      p.children
    ),
}

/**
 * The panel. Starts hidden — the runtime owns the open state — with the same
 * editor-only pin as `nav-menu`, because a canvas that never runs the runtime
 * otherwise gives the author no way to see or style the open menu.
 */
const DropdownMenu: ModuleDefinition = {
  name: "dropdown-menu",
  category: "interactive",
  schema: {
    menuOpen: {
      type: "select",
      label: "menu",
      segmented: true,
      options: [
        { label: "Hide", value: "false" },
        { label: "Show", value: "true" },
      ],
    },
    ...ADVANCED_SCHEMA,
  },
  defaults: { menuOpen: "false", ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  allowedParents: ["dropdown"],
  defaultClasses:
    "absolute top-[calc(100%+6px)] left-0 z-50 min-w-56 rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-lg",
  defaultChildren: [
    { module: "link", props: { text: "First item", href: "#" }, classes: MENU_ITEM },
    { module: "link", props: { text: "Second item", href: "#" }, classes: MENU_ITEM },
  ],
  Component: (p: ModuleRenderProps) =>
    createElement(
      "div",
      {
        className: p.className,
        "data-bapp-dropdown-menu": "",
        style: { display: p.isEditor && String(p.props.menuOpen) === "true" ? "block" : "none" },
        ...rootAttrs(p),
      },
      p.children
    ),
}

export const INTERACTIVE_MODULES: ModuleDefinition[] = [
  Tabs,
  TabPanel,
  Accordion,
  AccordionItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
]
