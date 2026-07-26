/**
 * Interactive OUTPUT primitives (the Preline model): they render static,
 * SSR-safe HTML with `data-*` hooks and become interactive on the published page —
 * `tabs` via the shared vanilla runtime (BUILDER_RUNTIME), `accordion` via native
 * `<details>` (no JS at all). In the editor (`isEditor`) they render in an expanded,
 * editable state so every panel/section is reachable.
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

// ── Accordion (native <details>, no JS) ───────────────────────────────────────
const Accordion: ModuleDefinition = {
  name: "accordion",
  category: "interactive",
  schema: {},
  defaults: {},
  contentModel: { children: ["accordion-item"] },
  defaultClasses: "flex flex-col gap-2",
  Component: (p: ModuleRenderProps) => createElement("div", { className: p.className, ...ed(p) }, p.children),
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
            border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", fontWeight: 500,
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
            minWidth: "180px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,.2)", padding: "6px", zIndex: 50,
          },
        },
        p.children
      )
    ),
}

export const INTERACTIVE_MODULES: ModuleDefinition[] = [Tabs, TabPanel, Accordion, AccordionItem, Dropdown]
