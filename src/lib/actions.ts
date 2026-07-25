import {
  extractFragment,
  reIdFragment,
  type Doc,
  type Fragment,
  type FragmentManifest,
} from "@brandsapp/builder-core"

import { parentOf } from "./doc-ops"
import { registry } from "./registry"

const rand = () => "p" + (crypto.randomUUID?.().slice(0, 6) ?? Math.random().toString(36).slice(2, 8))

const throwawayManifest = (name: string): FragmentManifest => ({
  id: rand(),
  name,
  category: "component",
  version: "1.0.0",
})

/** Insert a fragment's subtree under `parentId` at `index`, returning the new root id. */
function insertFragment(doc: Doc, fragment: Fragment, parentId: string, index?: number): { doc: Doc; id: string } {
  const fresh = reIdFragment(fragment, rand())
  const parent = doc.nodes[parentId]
  if (!parent) return { doc, id: "" }
  const children = [...parent.children]
  const at = Math.max(0, Math.min(index ?? children.length, children.length))
  children.splice(at, 0, fresh.rootId)
  return {
    doc: {
      ...doc,
      nodes: { ...doc.nodes, ...fresh.nodes, [parentId]: { ...parent, children } },
      styles: { ...doc.styles, ...fresh.styles },
    },
    id: fresh.rootId,
  }
}

/** Snapshot a node's subtree for the clipboard. */
export function copyNode(doc: Doc, id: string): Fragment | null {
  const node = doc.nodes[id]
  if (!node || id === doc.rootId) return null
  return extractFragment(doc, id, throwawayManifest(node.label ?? node.module))
}

/** Duplicate a node in place — a clone right after it in its parent. */
export function duplicateNode(doc: Doc, id: string): { doc: Doc; id: string } {
  const node = doc.nodes[id]
  if (!node || id === doc.rootId) return { doc, id: "" }
  const parent = parentOf(doc, id)
  if (!parent) return { doc, id: "" }
  const frag = extractFragment(doc, id, throwawayManifest(node.module))
  const index = parent.children.indexOf(id) + 1
  return insertFragment(doc, frag, parent.id, index)
}

/**
 * Paste a fragment relative to a target node: inside it if it accepts the child,
 * otherwise as a sibling right after it. Falls back to the page root.
 */
export function pasteFragment(doc: Doc, frag: Fragment, targetId: string | null): { doc: Doc; id: string } {
  const rootModule = frag.nodes[frag.rootId]?.module ?? ""
  const target = targetId ? doc.nodes[targetId] : undefined
  if (target && targetId) {
    if (registry.get(target.module) && registry.allowsChild(target.module, rootModule)) {
      return insertFragment(doc, frag, targetId)
    }
    const parent = parentOf(doc, targetId)
    if (parent && registry.allowsChild(parent.module, rootModule)) {
      return insertFragment(doc, frag, parent.id, parent.children.indexOf(targetId) + 1)
    }
  }
  if (registry.allowsChild(doc.nodes[doc.rootId].module, rootModule)) {
    return insertFragment(doc, frag, doc.rootId)
  }
  return { doc, id: "" }
}
