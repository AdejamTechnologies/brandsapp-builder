import type { Doc, Node, StyleRule } from "@brandsapp/builder-core"

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
  defaults: Record<string, unknown> = {},
  classes?: string
): { doc: Doc; id: string } {
  const parent = doc.nodes[parentId]
  if (!parent) return { doc, id: "" }
  const id = newId()
  const child: Node = { id, module, props: { ...defaults }, styleIds: [], children: [], ...(classes ? { classes } : {}) }
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
  defaults: Record<string, unknown> = {},
  classes?: string
): { doc: Doc; id: string } {
  const parent = doc.nodes[parentId]
  if (!parent) return { doc, id: "" }
  const id = newId()
  const child: Node = { id, module, props: { ...defaults }, styleIds: [], children: [], ...(classes ? { classes } : {}) }
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

// ── reusable classes (Webflow-style): a StyleRule is a named class; node.styleIds
// are the classes applied to it; the renderer emits each as `.s-<id>`. ──────────
const newStyleId = () =>
  "s" + (crypto.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10))

/** Create a new named class (StyleRule) and return its id. */
export function createClass(doc: Doc, name: string): { doc: Doc; id: string } {
  const id = newStyleId()
  const rule: StyleRule = { id, kind: "local", name, base: {} }
  return { doc: { ...doc, styles: { ...doc.styles, [id]: rule } }, id }
}

/** Apply an existing class to a node (no-op if already applied). */
export function addClassToNode(doc: Doc, nodeId: string, styleId: string): Doc {
  const node = doc.nodes[nodeId]
  if (!node || node.styleIds.includes(styleId)) return doc
  return { ...doc, nodes: { ...doc.nodes, [nodeId]: { ...node, styleIds: [...node.styleIds, styleId] } } }
}

/** Remove a class from a node (the class definition itself is kept). */
export function removeClassFromNode(doc: Doc, nodeId: string, styleId: string): Doc {
  const node = doc.nodes[nodeId]
  if (!node) return doc
  return { ...doc, nodes: { ...doc.nodes, [nodeId]: { ...node, styleIds: node.styleIds.filter((s) => s !== styleId) } } }
}

/** Rename a class (updates every node that uses it, since they reference by id). */
export function renameClass(doc: Doc, styleId: string, name: string): Doc {
  const rule = doc.styles[styleId]
  if (!rule) return doc
  return { ...doc, styles: { ...doc.styles, [styleId]: { ...rule, name } } }
}

/** Write style keys onto a class at the active breakpoint: base (bp null) or context[bp]. */
export function updateClassStyle(
  doc: Doc,
  styleId: string,
  bp: string | null,
  patch: Record<string, string>
): Doc {
  const rule = doc.styles[styleId]
  if (!rule) return doc
  const clean = (bag: Record<string, string>) => {
    const out = { ...bag }
    for (const k of Object.keys(out)) if (out[k] === "") delete out[k]
    return out
  }
  if (!bp) {
    return { ...doc, styles: { ...doc.styles, [styleId]: { ...rule, base: clean({ ...rule.base, ...patch }) } } }
  }
  const context = { ...(rule.context ?? {}), [bp]: clean({ ...(rule.context?.[bp] ?? {}), ...patch }) }
  return { ...doc, styles: { ...doc.styles, [styleId]: { ...rule, context } } }
}
