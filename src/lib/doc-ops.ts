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
