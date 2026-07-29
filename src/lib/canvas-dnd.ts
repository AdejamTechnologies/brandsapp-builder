import type { Doc } from "@brandsapp/builder-core"

import { isDescendant, parentOf } from "./doc-ops"
import { registry } from "./registry"

/** An insertion bar, in coordinates relative to the canvas wrapper. */
export interface DropIndicator {
  x: number
  y: number
  w: number
  h: number
}
export interface DropTarget {
  parentId: string
  index: number
  indicator: DropIndicator
}

const MAX_EDGE = 18
const BAR = 3

function elFor(scrollEl: HTMLElement, nodeId: string): HTMLElement | null {
  return scrollEl.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(nodeId)}"]`)
}

/**
 * Both halves of the nesting contract: the parent's own `contentModel`/the child's
 * `allowedParents` (which the registry can answer alone), plus `allowedAncestors`,
 * which needs the tree — a `nav-menu` only has to be somewhere inside a navbar, and
 * real bars wrap their contents in a full-bleed box or an inner max-width row.
 */
export function canDropInto(doc: Doc, parentId: string, child: string): boolean {
  const parent = doc.nodes[parentId]
  if (!parent || !registry.get(parent.module)) return false
  if (!registry.allowsChild(parent.module, child)) return false

  const needs = registry.requiredAncestors(child)
  if (!needs?.length) return true
  for (let n = parent; n; ) {
    if (needs.includes(n.module)) return true
    const up = parentOf(doc, n.id)
    if (!up) return false
    n = up
  }
  return false
}

/** Does this element lay its children out horizontally (row flex, or multi-col grid)? */
function isRow(el: HTMLElement): boolean {
  const cs = getComputedStyle(el)
  if (cs.display.includes("grid")) {
    return cs.gridTemplateColumns.split(" ").filter((c) => c && c !== "none").length > 1
  }
  return cs.display.includes("flex") && cs.flexDirection.startsWith("row")
}

/**
 * Where would `dragModule` land if dropped at (clientX, clientY)? Instatic-style:
 * the deepest node under the pointer decides — its leading/trailing edge-zone means
 * "sibling before/after", the middle means "inside" (contentModel permitting). The
 * axis follows the container's real layout direction (row vs column), so drops feel
 * right in flex/grid rows too. `excludeId` (set when dragging an existing node) skips
 * that node's own subtree as a target. Returns null when there's no legal drop.
 */
export function resolveDrop(
  scrollEl: HTMLDivElement | null,
  clientX: number,
  clientY: number,
  doc: Doc,
  dragModule: string,
  excludeId?: string
): DropTarget | null {
  const wrap = scrollEl?.parentElement
  if (!scrollEl || !wrap) return null
  const wb = wrap.getBoundingClientRect()
  if (clientX < wb.left || clientX > wb.right || clientY < wb.top || clientY > wb.bottom) return null

  const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null
  let el = hit?.closest<HTMLElement>("[data-node-id]") ?? null
  // Climb out of the dragged node's own subtree — you can't drop a node into itself.
  while (el && excludeId && el.dataset.nodeId && isDescendant(doc, excludeId, el.dataset.nodeId)) {
    el = el.parentElement?.closest<HTMLElement>("[data-node-id]") ?? null
  }
  if (!el || !scrollEl.contains(el)) return appendToRoot(scrollEl, doc, dragModule, wb)

  const hoveredId = el.dataset.nodeId
  const hovered = hoveredId ? doc.nodes[hoveredId] : undefined
  if (!hoveredId || !hovered) return null

  const rect = el.getBoundingClientRect()
  const allowInside = canDropInto(doc, hoveredId, dragModule)
  const parent = parentOf(doc, hoveredId)
  const parentEl = parent ? elFor(scrollEl, parent.id) : null
  const siblingRow = parentEl ? isRow(parentEl) : false

  // decide zone along the sibling axis
  const pos = siblingRow ? clientX - rect.left : clientY - rect.top
  const span = siblingRow ? rect.width : rect.height
  const edge = Math.min(MAX_EDGE, span * 0.25)
  let zone: "before" | "after" | "inside"
  if (hoveredId === doc.rootId) zone = "inside"
  else if (pos < edge) zone = "before"
  else if (pos > span - edge) zone = "after"
  else zone = allowInside ? "inside" : pos < span / 2 ? "before" : "after"

  if (zone === "inside") {
    if (!allowInside) return null
    const insideRow = isRow(el)
    const { index, line } = insideTarget(scrollEl, hovered.children, rect, clientX, clientY, insideRow)
    return { parentId: hoveredId, index, indicator: toWrap(line, wb) }
  }

  // sibling before/after
  if (!parent || !canDropInto(doc, parent.id, dragModule)) return null
  const refIndex = parent.children.indexOf(hoveredId)
  const index = zone === "before" ? refIndex : refIndex + 1
  const line = siblingRow
    ? { x: zone === "before" ? rect.left : rect.right, y: rect.top, w: BAR, h: rect.height }
    : { x: rect.left, y: zone === "before" ? rect.top : rect.bottom, w: rect.width, h: BAR }
  return { parentId: parent.id, index, indicator: toWrap(line, wb) }
}

interface Line {
  x: number
  y: number
  w: number
  h: number
}

/** Pick the insertion index among a container's children by pointer position + the bar. */
function insideTarget(
  scrollEl: HTMLElement,
  children: string[],
  cRect: DOMRect,
  clientX: number,
  clientY: number,
  row: boolean
): { index: number; line: Line } {
  const pad = 8
  let trailing = row ? cRect.left + pad : cRect.top + pad
  for (let i = 0; i < children.length; i++) {
    const cel = elFor(scrollEl, children[i])
    if (!cel) continue
    const cr = cel.getBoundingClientRect()
    const mid = row ? cr.left + cr.width / 2 : cr.top + cr.height / 2
    if ((row ? clientX : clientY) < mid) {
      const line = row
        ? { x: cr.left, y: cr.top, w: BAR, h: cr.height }
        : { x: cr.left, y: cr.top, w: cr.width, h: BAR }
      return { index: i, line }
    }
    trailing = row ? cr.right : cr.bottom
  }
  const line = row
    ? { x: trailing, y: cRect.top + pad, w: BAR, h: Math.max(24, cRect.height - pad * 2) }
    : { x: cRect.left + pad, y: trailing, w: Math.max(24, cRect.width - pad * 2), h: BAR }
  return { index: children.length, line }
}

function appendToRoot(scrollEl: HTMLElement, doc: Doc, dragModule: string, wb: DOMRect): DropTarget | null {
  const root = doc.nodes[doc.rootId]
  if (!root || !canDropInto(doc, root.id, dragModule)) return null
  const rootEl = elFor(scrollEl, doc.rootId)
  const rr = rootEl?.getBoundingClientRect() ?? new DOMRect(wb.x, wb.y, wb.width, wb.height)
  const { index, line } = insideTarget(scrollEl, root.children, rr, Infinity, Infinity, false)
  return { parentId: doc.rootId, index, indicator: toWrap(line, wb) }
}

function toWrap(line: Line, wb: DOMRect): DropIndicator {
  // center the bar on the edge it marks
  const cx = line.w <= BAR ? line.x - BAR / 2 : line.x
  const cy = line.h <= BAR ? line.y - BAR / 2 : line.y
  return { x: cx - wb.left, y: cy - wb.top, w: line.w, h: line.h }
}
