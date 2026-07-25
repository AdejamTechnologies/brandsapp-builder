/**
 * The renderer: an AST Doc → { html, css }. Reconstructs the tree from the flat
 * node map, resolves props (defaults ← node.props ← bindings, escaped by control
 * type), resolves styles (style-sources + per-node + responsive → scoped CSS),
 * and renders each module's React Component with `renderToString`. Pure and
 * Worker-safe. See docs/builder-foundation-spec.md §5.
 */

import { createElement, Fragment as RFragment, type ReactNode } from "react"
import { renderToString } from "react-dom/server"

import { animCss, ANIMATION_KEYFRAMES } from "./anim"
import { applyBindings, emptyDataContext, type DataContext } from "./binding"
import { escapeByControl } from "./escape"
import { migrateDoc } from "./migrate"
import type { ModuleDefinition, ModuleRegistry } from "./registry"
import { parseDoc, type Doc, type Node } from "./schema"
import {
  classForNode,
  classForStyle,
  ruleToCss,
  styleRuleToCss,
  themeToCss,
} from "./style"

export type LoopSource = (config: Record<string, unknown>) => Array<Record<string, unknown>>

export interface RenderOptions {
  registry: ModuleRegistry
  data?: DataContext
  isEditor?: boolean
  /** collection sources for the `loop` module (P3). */
  loopSources?: Record<string, LoopSource>
  /**
   * Editor-only: flatten this breakpoint's responsive overrides onto each node's
   * base (props + style) and drop the `@media` rules, so the inline canvas shows the
   * breakpoint's resolved look at ANY window width. Publish rendering leaves this
   * unset and emits real `@media` queries.
   */
  previewBreakpoint?: string
}

export interface RenderResult {
  html: string
  css: string
  /** module names referenced by the doc but not in the registry. */
  missing: string[]
  /** utility-class tokens used — feed to generateUtilityCss for the atomic CSS. */
  classes: string[]
  /** a runtime-driven module is present → inject BUILDER_RUNTIME on the page. */
  usesRuntime: boolean
}

export interface ReactRenderResult {
  /** The live React tree, wrapped in `.bapp-root` (same wrapper the HTML render uses). */
  node: ReactNode
  css: string
  /** module names referenced by the doc but not in the registry. */
  missing: string[]
  /** utility-class tokens used — feed to generateUtilityCss for the atomic CSS. */
  classes: string[]
  /** a runtime-driven module is present → inject BUILDER_RUNTIME on the page. */
  usesRuntime: boolean
}

const ROOT_CLASS = "bapp-root"

class RenderCtx {
  cssParts: string[] = []
  missing: string[] = []
  /** utility-class tokens present in the render (for render-time UnoCSS generation). */
  classes = new Set<string>()
  /** a runtime-driven module (e.g. tabs) is present → host should inject BUILDER_RUNTIME. */
  usesRuntime = false
  /** a node animates → include the shared keyframes. */
  usesAnim = false

  useNodeAnim(node: Node): void {
    if (!node.anim) return
    this.usesAnim = true
    if (node.anim.trigger === "scroll") this.usesRuntime = true
    this.cssParts.push(animCss(node.id, node.anim))
  }
  private seenStyle = new Set<string>()
  private seenNode = new Set<string>()
  constructor(
    readonly doc: Doc,
    readonly registry: ModuleRegistry,
    readonly isEditor: boolean,
    readonly loopSources: Record<string, LoopSource>,
    readonly previewBreakpoint: string | null = null
  ) {}

  useStyleRule(id: string): void {
    if (this.seenStyle.has(id)) return
    this.seenStyle.add(id)
    const rule = this.doc.styles[id]
    if (rule) this.cssParts.push(styleRuleToCss(rule, this.doc.theme.breakpoints))
  }
  useNodeStyle(node: Node): void {
    if (!node.style && !node.responsive) return
    if (this.seenNode.has(node.id)) return
    this.seenNode.add(node.id)
    const context: Record<string, Record<string, string>> = {}
    if (node.responsive) {
      for (const [bp, ov] of Object.entries(node.responsive)) {
        if (ov.style) context[bp] = ov.style
      }
    }
    this.cssParts.push(
      ruleToCss(`.${classForNode(node.id)}`, node.style, context, this.doc.theme.breakpoints)
    )
  }
}

function classNamesFor(node: Node, ctx: RenderCtx): string {
  const classes: string[] = []
  for (const sid of node.styleIds) {
    ctx.useStyleRule(sid)
    classes.push(classForStyle(sid))
  }
  if (node.responsive) {
    for (const ov of Object.values(node.responsive)) {
      for (const sid of ov.styleIds ?? []) {
        ctx.useStyleRule(sid)
        classes.push(classForStyle(sid))
      }
    }
  }
  if (node.style || node.responsive) {
    ctx.useNodeStyle(node)
    classes.push(classForNode(node.id))
  }
  if (node.classes) {
    classes.push(node.classes)
    for (const c of node.classes.split(/\s+/)) if (c) ctx.classes.add(c)
  }
  // Entrance animations are publish-only (editor stays static + editable).
  if (node.anim && !ctx.isEditor) {
    classes.push("bapp-anim", classForNode(node.id))
    if (node.anim.trigger === "scroll") classes.push("bapp-reveal")
    ctx.useNodeAnim(node)
  }
  return classes.join(" ")
}

/**
 * Fold a breakpoint's overrides onto the node's base and clear `responsive`, so the
 * editor previews the breakpoint's look with no `@media` (which wouldn't match an
 * inline canvas). Only used when `previewBreakpoint` is set.
 */
function effectiveNode(node: Node, bp: string | null): Node {
  const ov = bp ? node.responsive?.[bp] : undefined
  if (!ov) return node
  return {
    ...node,
    props: ov.props ? { ...node.props, ...ov.props } : node.props,
    style: ov.style ? { ...(node.style ?? {}), ...ov.style } : node.style,
    styleIds: ov.styleIds ? [...node.styleIds, ...ov.styleIds] : node.styleIds,
    responsive: undefined,
  }
}

function resolveProps(node: Node, def: ModuleDefinition, data: DataContext): Record<string, unknown> {
  const merged = { ...def.defaults, ...node.props }
  const bound = applyBindings(merged, node.bindings, data)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(bound)) {
    out[k] = escapeByControl(v, def.schema[k]?.type)
  }
  return out
}

function renderNode(id: string, ctx: RenderCtx, data: DataContext, key: string): ReactNode {
  const raw = ctx.doc.nodes[id]
  if (!raw || raw.hidden) return null

  if (raw.module === "loop") return renderLoop(raw, ctx, data, key)

  const def = ctx.registry.get(raw.module)
  if (!def) {
    ctx.missing.push(raw.module)
    return null
  }
  if (def.needsRuntime && !ctx.isEditor) ctx.usesRuntime = true
  const node = effectiveNode(raw, ctx.previewBreakpoint)
  const children = node.children.length
    ? createElement(
        RFragment,
        null,
        ...node.children.map((cid, i) => renderNode(cid, ctx, data, `${cid}-${i}`))
      )
    : null
  return createElement(def.Component, {
    key,
    props: resolveProps(node, def, data),
    children,
    className: classNamesFor(node, ctx),
    theme: ctx.doc.theme,
    nodeId: node.id,
    isEditor: ctx.isEditor,
  })
}

function renderLoop(raw: Node, ctx: RenderCtx, data: DataContext, key: string): ReactNode {
  const node = effectiveNode(raw, ctx.previewBreakpoint)
  const sourceId = String(node.props.source ?? "")
  const source = ctx.loopSources[sourceId]
  const items = source ? source(node.props) : []
  const className = classNamesFor(node, ctx)
  const wrapperTag = typeof node.props.tag === "string" ? node.props.tag : "div"
  const rendered = items.flatMap((item, i) => {
    const childData: DataContext = { ...data, entryStack: [...data.entryStack, item] }
    return node.children.map((cid, ci) => renderNode(cid, ctx, childData, `${i}-${cid}-${ci}`))
  })
  const editorAttrs = ctx.isEditor ? { "data-node-id": node.id } : {}
  return createElement(wrapperTag, { key, className, ...editorAttrs }, ...rendered)
}

/**
 * Render a Doc to a LIVE React tree + CSS (no serialization). This is what the
 * editor canvas mounts so it can attach selection/edit handlers to real DOM —
 * `renderDoc` below is just this + `renderToString`. Same tree, same CSS, same
 * `.bapp-root` wrapper, so the canvas previews exactly what will publish.
 */
export function renderDocToReact(input: unknown, opts: RenderOptions): ReactRenderResult {
  const parsed = parseDoc(migrateDoc(input))
  const ctx = new RenderCtx(
    parsed,
    opts.registry,
    opts.isEditor ?? false,
    opts.loopSources ?? {},
    opts.previewBreakpoint ?? null
  )
  const data = opts.data ?? emptyDataContext()
  const rootEl = renderNode(parsed.rootId, ctx, data, parsed.rootId)
  const node = createElement("div", { className: ROOT_CLASS }, rootEl)
  const themeCss = themeToCss(parsed.theme, `.${ROOT_CLASS}`)
  const css = [themeCss, ctx.usesAnim ? ANIMATION_KEYFRAMES : "", ...ctx.cssParts].filter(Boolean).join("")
  return { node, css, missing: ctx.missing, classes: [...ctx.classes], usesRuntime: ctx.usesRuntime }
}

/** Render a Doc (unknown, will be migrated + validated) to HTML + CSS. */
export function renderDoc(input: unknown, opts: RenderOptions): RenderResult {
  const { node, css, missing, classes, usesRuntime } = renderDocToReact(input, opts)
  return { html: renderToString(node), css, missing, classes, usesRuntime }
}
