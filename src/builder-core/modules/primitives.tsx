/**
 * The v1 primitive module set (primitives-as-code). Low-level, flow-layout blocks
 * that a Fragment/template composes. Each applies the node's `className` (style
 * sources + per-node CSS) to its root element; props are already sanitized by
 * control type before they arrive here.
 */

import { createElement, type CSSProperties } from "react"

import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const num = (v: unknown, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

// ── containers ──────────────────────────────────────────────────────────────

const PageRoot: ModuleDefinition = {
  name: "page-root",
  category: "layout",
  schema: {},
  defaults: {},
  contentModel: { children: "any" },
  Component: ({ className, children }: ModuleRenderProps) =>
    createElement("div", { className }, children),
}

const Box: ModuleDefinition = {
  name: "box",
  category: "layout",
  schema: { tag: { type: "plain" } },
  defaults: {},
  contentModel: { children: "any" },
  Component: ({ className, children, props }: ModuleRenderProps) =>
    createElement(str(props.tag, "div"), { className }, children),
}

const Stack: ModuleDefinition = {
  name: "stack",
  category: "layout",
  schema: {
    direction: { type: "select", options: [{ label: "Column", value: "column" }, { label: "Row", value: "row" }] },
    gap: { type: "plain" },
    align: { type: "plain" },
    justify: { type: "plain" },
  },
  defaults: { direction: "column" },
  contentModel: { children: "any" },
  Component: ({ className, children, props }: ModuleRenderProps) => {
    const style: CSSProperties = {
      display: "flex",
      flexDirection: str(props.direction, "column") === "row" ? "row" : "column",
      gap: props.gap != null ? str(props.gap) : undefined,
      alignItems: props.align != null ? str(props.align) : undefined,
      justifyContent: props.justify != null ? str(props.justify) : undefined,
    }
    return createElement("div", { className, style }, children)
  },
}

const Grid: ModuleDefinition = {
  name: "grid",
  category: "layout",
  schema: { columns: { type: "number" }, gap: { type: "plain" } },
  defaults: { columns: 3 },
  contentModel: { children: "any" },
  Component: ({ className, children, props }: ModuleRenderProps) => {
    const cols = Math.min(Math.max(num(props.columns, 3), 1), 12)
    const style: CSSProperties = {
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: props.gap != null ? str(props.gap) : "1rem",
    }
    return createElement("div", { className, style }, children)
  },
}

const Divider: ModuleDefinition = {
  name: "divider",
  category: "layout",
  schema: {},
  defaults: {},
  contentModel: { children: "none" },
  Component: ({ className }: ModuleRenderProps) => createElement("hr", { className }),
}

const Spacer: ModuleDefinition = {
  name: "spacer",
  category: "layout",
  schema: { size: { type: "plain" } },
  defaults: { size: "2rem" },
  contentModel: { children: "none" },
  Component: ({ className, props }: ModuleRenderProps) =>
    createElement("div", { className, style: { height: str(props.size, "2rem") } }),
}

// ── content ─────────────────────────────────────────────────────────────────

const Heading: ModuleDefinition = {
  name: "heading",
  category: "content",
  schema: {
    text: { type: "plain" },
    level: { type: "select", options: [1, 2, 3, 4, 5, 6].map((n) => ({ label: `H${n}`, value: String(n) })) },
  },
  defaults: { text: "Heading", level: "2" },
  contentModel: { children: "none" },
  Component: ({ className, props }: ModuleRenderProps) => {
    const lvl = Math.min(Math.max(num(props.level, 2), 1), 6)
    return createElement(`h${lvl}`, { className }, str(props.text))
  },
}

const Text: ModuleDefinition = {
  name: "text",
  category: "content",
  schema: { text: { type: "plain" }, tag: { type: "plain" } },
  defaults: { text: "Text", tag: "p" },
  contentModel: { children: "none" },
  Component: ({ className, props }: ModuleRenderProps) =>
    createElement(str(props.tag, "p"), { className }, str(props.text)),
}

const RichText: ModuleDefinition = {
  name: "richtext",
  category: "content",
  schema: { html: { type: "richtext" } },
  defaults: { html: "" },
  contentModel: { children: "none" },
  Component: ({ className, props }: ModuleRenderProps) =>
    createElement("div", { className, dangerouslySetInnerHTML: { __html: str(props.html) } }),
}

const Image: ModuleDefinition = {
  name: "image",
  category: "media",
  schema: { src: { type: "media" }, alt: { type: "plain" } },
  defaults: { src: "", alt: "" },
  contentModel: { children: "none" },
  Component: ({ className, props }: ModuleRenderProps) =>
    createElement("img", { className, src: str(props.src), alt: str(props.alt), loading: "lazy" }),
}

const Icon: ModuleDefinition = {
  name: "icon",
  category: "media",
  schema: { svg: { type: "svg" } },
  defaults: { svg: "" },
  contentModel: { children: "none" },
  Component: ({ className, props }: ModuleRenderProps) =>
    createElement("span", {
      className,
      "aria-hidden": true,
      dangerouslySetInnerHTML: { __html: str(props.svg) },
    }),
}

// ── interactive ─────────────────────────────────────────────────────────────

const Button: ModuleDefinition = {
  name: "button",
  category: "interactive",
  schema: { label: { type: "plain" }, href: { type: "url" } },
  defaults: { label: "Button", href: "" },
  contentModel: { children: "none" },
  Component: ({ className, props }: ModuleRenderProps) => {
    const href = str(props.href)
    return href
      ? createElement("a", { className, href }, str(props.label))
      : createElement("button", { className, type: "button" }, str(props.label))
  },
}

const Link: ModuleDefinition = {
  name: "link",
  category: "interactive",
  schema: { href: { type: "url" }, text: { type: "plain" } },
  defaults: { href: "#", text: "Link" },
  contentModel: { children: "any" },
  Component: ({ className, props, children }: ModuleRenderProps) =>
    createElement("a", { className, href: str(props.href, "#") }, children ?? str(props.text)),
}

const Embed: ModuleDefinition = {
  name: "embed",
  category: "advanced",
  schema: { html: { type: "richtext" } },
  defaults: { html: "" },
  contentModel: { children: "none" },
  Component: ({ className, props }: ModuleRenderProps) =>
    createElement("div", { className, dangerouslySetInnerHTML: { __html: str(props.html) } }),
}

export const PRIMITIVES: ModuleDefinition[] = [
  PageRoot,
  Box,
  Stack,
  Grid,
  Divider,
  Spacer,
  Heading,
  Text,
  RichText,
  Image,
  Icon,
  Button,
  Link,
  Embed,
]
