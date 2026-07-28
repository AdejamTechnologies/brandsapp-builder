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

import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const ed = (p: ModuleRenderProps): { "data-node-id"?: string } =>
  p.isEditor ? { "data-node-id": p.nodeId } : {}

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
  Component: (p: ModuleRenderProps) =>
    createElement("div", { className: p.className, "data-bapp-tabs": "", ...ed(p) }, p.children),
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
      { className: p.className, "data-bapp-tab-panel": "", "data-title": str(p.props.title, "Tab"), ...ed(p) },
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
  defaultClasses: "flex flex-col gap-2",
  Component: (p: ModuleRenderProps) =>
    createElement(
      "div",
      {
        className: p.className,
        "data-bapp-accordion": "",
        ...(p.props.multi ? { "data-multi": "" } : {}),
        ...ed(p),
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
  defaultClasses: "border border-base-300 rounded-xl px-4",
  Component: (p: ModuleRenderProps) =>
    createElement(
      "details",
      { className: p.className, open: p.isEditor || undefined, ...ed(p) },
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
  schema: { label: { type: "plain" } },
  defaults: { label: "Menu" },
  contentModel: { children: "any" },
  needsRuntime: true,
  defaultClasses: "relative inline-block",
  Component: (p: ModuleRenderProps) =>
    createElement(
      "div",
      { className: p.className, "data-bapp-dropdown": "", ...ed(p) },
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
            display: p.isEditor ? "block" : "none", position: "absolute", top: "calc(100% + 6px)", left: 0,
            minWidth: "180px", background: "hsl(var(--b1, 0 0% 100%))",
            border: "1px solid hsl(var(--b3, 180 2% 90%))", borderRadius: "10px",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,.2)", padding: "6px", zIndex: 50,
          },
        },
        p.children
      )
    ),
}

export const INTERACTIVE_MODULES: ModuleDefinition[] = [Tabs, TabPanel, Accordion, AccordionItem, Dropdown]
