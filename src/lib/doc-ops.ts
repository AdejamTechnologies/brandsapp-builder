import type { Doc, Node } from "@brandsapp/builder-core"

/** Immutable Doc operations for the editor (no external state lib needed). */

const newId = () =>
  "n" + (crypto.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10))

export function getNode(doc: Doc, id: string): Node | undefined {
  return doc.nodes[id]
}

export function parentOf(doc: Doc, id: string): Node | undefined {
  return Object.values(doc.nodes).find((n) => n.children.includes(id))
}

export function updateProps(doc: Doc, id: string, props: Record<string, unknown>): Doc {
  const node = doc.nodes[id]
  if (!node) return doc
  return { ...doc, nodes: { ...doc.nodes, [id]: { ...node, props: { ...node.props, ...props } } } }
}

export function updateStyle(doc: Doc, id: string, style: Record<string, string>): Doc {
  const node = doc.nodes[id]
  if (!node) return doc
  const merged = { ...(node.style ?? {}), ...style }
  // drop empty values so the style bag stays clean
  for (const k of Object.keys(merged)) if (merged[k] === "") delete merged[k]
  return { ...doc, nodes: { ...doc.nodes, [id]: { ...node, style: merged } } }
}

export function insertChild(
  doc: Doc,
  parentId: string,
  module: string,
  defaults: Record<string, unknown> = {}
): { doc: Doc; id: string } {
  const parent = doc.nodes[parentId]
  if (!parent) return { doc, id: "" }
  const id = newId()
  const child: Node = { id, module, props: { ...defaults }, styleIds: [], children: [] }
  return {
    doc: {
      ...doc,
      nodes: {
        ...doc.nodes,
        [id]: child,
        [parentId]: { ...parent, children: [...parent.children, id] },
      },
    },
    id,
  }
}

export function insertChildAt(
  doc: Doc,
  parentId: string,
  index: number,
  module: string,
  defaults: Record<string, unknown> = {}
): { doc: Doc; id: string } {
  const parent = doc.nodes[parentId]
  if (!parent) return { doc, id: "" }
  const id = newId()
  const child: Node = { id, module, props: { ...defaults }, styleIds: [], children: [] }
  const children = [...parent.children]
  const at = Math.max(0, Math.min(index, children.length))
  children.splice(at, 0, id)
  return {
    doc: {
      ...doc,
      nodes: {
        ...doc.nodes,
        [id]: child,
        [parentId]: { ...parent, children },
      },
    },
    id,
  }
}

export function removeNode(doc: Doc, id: string): Doc {
  if (id === doc.rootId) return doc
  const parent = parentOf(doc, id)
  const nodes = { ...doc.nodes }
  // collect the subtree to delete
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    const n = nodes[cur]
    if (!n) continue
    stack.push(...n.children)
    delete nodes[cur]
  }
  if (parent) {
    nodes[parent.id] = { ...parent, children: parent.children.filter((c) => c !== id) }
  }
  return { ...doc, nodes }
}

export function moveChild(doc: Doc, parentId: string, from: number, to: number): Doc {
  const parent = doc.nodes[parentId]
  if (!parent) return doc
  const children = [...parent.children]
  const [m] = children.splice(from, 1)
  children.splice(to, 0, m)
  return { ...doc, nodes: { ...doc.nodes, [parentId]: { ...parent, children } } }
}

/** Is `maybe` the same node as `ancestor`, or somewhere in its subtree? */
export function isDescendant(doc: Doc, ancestor: string, maybe: string): boolean {
  if (ancestor === maybe) return true
  const stack = [...(doc.nodes[ancestor]?.children ?? [])]
  while (stack.length) {
    const cur = stack.pop()!
    if (cur === maybe) return true
    stack.push(...(doc.nodes[cur]?.children ?? []))
  }
  return false
}

/**
 * Re-parent `id` under `newParentId` at `index` (used by canvas drag-to-reorder).
 * No-ops on illegal moves: moving the root, or dropping a node into its own
 * subtree. Index is measured in the target parent AFTER the node is detached.
 */
export function moveNode(doc: Doc, id: string, newParentId: string, index: number): Doc {
  if (id === doc.rootId) return doc
  if (isDescendant(doc, id, newParentId)) return doc
  const oldParent = parentOf(doc, id)
  const newParent = doc.nodes[newParentId]
  if (!oldParent || !newParent) return doc

  const nodes = { ...doc.nodes }
  const fromIdx = oldParent.children.indexOf(id)
  const oldChildren = oldParent.children.filter((c) => c !== id)
  // If moving within the same parent and removing an earlier item shifts the
  // target left, account for it.
  let at = Math.max(0, Math.min(index, (newParentId === oldParent.id ? oldChildren : newParent.children).length))
  if (newParentId === oldParent.id && fromIdx < index) at = Math.max(0, at - 1)

  if (newParentId === oldParent.id) {
    const children = [...oldChildren]
    children.splice(at, 0, id)
    nodes[oldParent.id] = { ...oldParent, children }
  } else {
    nodes[oldParent.id] = { ...oldParent, children: oldChildren }
    const children = [...newParent.children]
    children.splice(at, 0, id)
    nodes[newParentId] = { ...newParent, children }
  }
  return { ...doc, nodes }
}

/** Update the doc's theme tokens (merged shallow-ish per section). */
export function updateTheme(doc: Doc, patch: Partial<Doc["theme"]>): Doc {
  return { ...doc, theme: { ...doc.theme, ...patch } }
}

/** Write a style key at the active breakpoint: base (bp null) or node.responsive[bp]. */
export function updateResponsiveStyle(
  doc: Doc,
  id: string,
  bp: string | null,
  style: Record<string, string>
): Doc {
  if (!bp) return updateStyle(doc, id, style)
  const node = doc.nodes[id]
  if (!node) return doc
  const prev = node.responsive?.[bp]?.style ?? {}
  const merged = { ...prev, ...style }
  for (const k of Object.keys(merged)) if (merged[k] === "") delete merged[k]
  const responsive = { ...(node.responsive ?? {}), [bp]: { ...(node.responsive?.[bp] ?? {}), style: merged } }
  return { ...doc, nodes: { ...doc.nodes, [id]: { ...node, responsive } } }
}
