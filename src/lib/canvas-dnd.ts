import type { Doc } from "@brandsapp/builder-core"

import { parentOf } from "./doc-ops"
import { registry } from "./registry"

/** A horizontal insertion line, in coordinates relative to the canvas wrapper. */
export interface DropIndicator {
  x: number
  y: number
  w: number
}
export interface DropTarget {
  parentId: string
  index: number
  indicator: DropIndicator
}

const MAX_EDGE = 16

function elFor(scrollEl: HTMLElement, nodeId: string): HTMLElement | null {
  return scrollEl.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(nodeId)}"]`)
}

/**
 * Given a pointer position over the canvas, work out where a new `dragModule`
 * would land. Borrowed from Instatic's canvasDnd: the node under the pointer is
 * the deepest `[data-node-id]` (via elementFromPoint); its top/bottom edge-zones
 * mean "drop as a sibling before/after", the middle band means "drop inside" (if
 * the module's contentModel allows the child). Returns the parent + index to
 * insert at, plus a horizontal indicator line. `null` = not a legal drop here.
 */
export function resolveDrop(
  scrollEl: HTMLDivElement | null,
  clientX: number,
  clientY: number,
  doc: Doc,
  dragModule: string
): DropTarget | null {
  const wrap = scrollEl?.parentElement
  if (!scrollEl || !wrap) return null
  const wb = wrap.getBoundingClientRect()
  if (clientX < wb.left || clientX > wb.right || clientY < wb.top || clientY > wb.bottom) return null

  const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null
  const el = hit?.closest<HTMLElement>("[data-node-id]")
  // Over empty canvas (padding, or below the page) → append to the page root.
  if (!el || !scrollEl.contains(el)) return appendToRoot(scrollEl, doc, dragModule, wb)

  const hoveredId = el.dataset.nodeId
  const hovered = hoveredId ? doc.nodes[hoveredId] : undefined
  if (!hoveredId || !hovered) return null

  const rect = el.getBoundingClientRect()
  const allowInside =
    !!registry.get(hovered.module) && registry.allowsChild(hovered.module, dragModule)
  const edge = Math.min(MAX_EDGE, rect.height * 0.25)
  const relY = clientY - rect.top

  let zone: "before" | "after" | "inside"
  if (hoveredId === doc.rootId) zone = "inside"
  else if (relY < edge) zone = "before"
  else if (relY > rect.height - edge) zone = "after"
  else zone = allowInside ? "inside" : relY < rect.height / 2 ? "before" : "after"

  if (zone === "inside") {
    if (!allowInside) return null
    const { index, lineY } = insideIndex(scrollEl, hovered.children, rect, clientY)
    return {
      parentId: hoveredId,
      index,
      indicator: { x: rect.left - wb.left + 8, y: lineY - wb.top, w: Math.max(24, rect.width - 16) },
    }
  }

  // sibling before/after — needs a parent that accepts the child
  const parent = parentOf(doc, hoveredId)
  if (!parent || !registry.get(parent.module) || !registry.allowsChild(parent.module, dragModule)) {
    return null
  }
  const refIndex = parent.children.indexOf(hoveredId)
  const index = zone === "before" ? refIndex : refIndex + 1
  const lineY = zone === "before" ? rect.top : rect.bottom
  return { parentId: parent.id, index, indicator: { x: rect.left - wb.left, y: lineY - wb.top, w: rect.width } }
}

/** Pick the insertion index among a container's children by pointer y, + the line's y. */
function insideIndex(
  scrollEl: HTMLElement,
  children: string[],
  containerRect: DOMRect,
  clientY: number
): { index: number; lineY: number } {
  let lastBottom = containerRect.top + 8
  for (let i = 0; i < children.length; i++) {
    const cel = elFor(scrollEl, children[i])
    if (!cel) continue
    const cr = cel.getBoundingClientRect()
    if (clientY < cr.top + cr.height / 2) return { index: i, lineY: cr.top }
    lastBottom = cr.bottom
  }
  return { index: children.length, lineY: lastBottom }
}

function appendToRoot(scrollEl: HTMLElement, doc: Doc, dragModule: string, wb: DOMRect): DropTarget | null {
  const root = doc.nodes[doc.rootId]
  if (!root || !registry.allowsChild(root.module, dragModule)) return null
  const rootEl = elFor(scrollEl, doc.rootId)
  const rr = rootEl?.getBoundingClientRect()
  const index = root.children.length
  const { lineY } = insideIndex(scrollEl, root.children, rr ?? new DOMRect(wb.x, wb.y, wb.width, wb.height), Infinity)
  const x = rr ? rr.left - wb.left + 8 : 8
  const w = rr ? Math.max(24, rr.width - 16) : wb.width - 16
  return { parentId: doc.rootId, index, indicator: { x, y: lineY - wb.top, w } }
}
