/**
 * Fragments — the transferable/marketplace unit. A Fragment is a self-contained
 * subtree (nodes + styles + manifest). `reIdFragment` gives every node/style a
 * fresh id so a purchased Fragment can be merged into any Doc without collisions;
 * `mergeFragmentIntoDoc` installs it under a parent; `extractFragment` pulls a
 * subtree of a Doc out as a Fragment. See docs/builder-foundation-spec.md §8.
 */

import type { Doc, Fragment, FragmentManifest, Node, StyleRule } from "./schema"

/** Deterministic-ish fresh id: prefix + counter (caller supplies a unique prefix). */
function makeIdGen(prefix: string) {
  let n = 0
  return () => `${prefix}${(n++).toString(36)}`
}

/**
 * Return a copy of the fragment with every node id + style id remapped to fresh
 * ids (children refs, styleIds, and responsive styleIds all rewritten).
 */
export function reIdFragment(fragment: Fragment, prefix: string): Fragment {
  const nid = makeIdGen(`${prefix}n`)
  const sid = makeIdGen(`${prefix}s`)
  const nodeMap = new Map<string, string>()
  const styleMap = new Map<string, string>()
  for (const id of Object.keys(fragment.nodes)) nodeMap.set(id, nid())
  for (const id of Object.keys(fragment.styles)) styleMap.set(id, sid())

  const remapStyleIds = (ids: string[] | undefined) =>
    (ids ?? []).map((s) => styleMap.get(s) ?? s)

  const nodes: Record<string, Node> = {}
  for (const [oldId, node] of Object.entries(fragment.nodes)) {
    const newId = nodeMap.get(oldId)!
    nodes[newId] = {
      ...node,
      id: newId,
      styleIds: remapStyleIds(node.styleIds),
      children: node.children.map((c) => nodeMap.get(c) ?? c),
      responsive: node.responsive
        ? Object.fromEntries(
            Object.entries(node.responsive).map(([bp, ov]) => [
              bp,
              { ...ov, styleIds: ov.styleIds ? remapStyleIds(ov.styleIds) : undefined },
            ])
          )
        : undefined,
    }
  }
  const styles: Record<string, StyleRule> = {}
  for (const [oldId, rule] of Object.entries(fragment.styles)) {
    const newId = styleMap.get(oldId)!
    styles[newId] = { ...rule, id: newId }
  }
  return {
    ...fragment,
    rootId: nodeMap.get(fragment.rootId) ?? fragment.rootId,
    nodes,
    styles,
  }
}

/**
 * Install a fragment into `doc` under `parentId` (appended to its children, or at
 * `index`). Returns a NEW doc (pure). Re-IDs first to avoid collisions.
 */
export function mergeFragmentIntoDoc(
  doc: Doc,
  fragment: Fragment,
  parentId: string,
  opts: { index?: number; prefix?: string } = {}
): Doc {
  const prefix = opts.prefix ?? "f"
  const fresh = reIdFragment(fragment, prefix)
  const parent = doc.nodes[parentId]
  if (!parent) throw new Error(`mergeFragmentIntoDoc: parent ${parentId} not found`)
  const children = [...parent.children]
  const at = opts.index ?? children.length
  children.splice(at, 0, fresh.rootId)
  return {
    ...doc,
    nodes: { ...doc.nodes, ...fresh.nodes, [parentId]: { ...parent, children } },
    styles: { ...doc.styles, ...fresh.styles },
  }
}

/** Pull the subtree rooted at `nodeId` out of `doc` as a Fragment. */
export function extractFragment(doc: Doc, nodeId: string, manifest: FragmentManifest): Fragment {
  const nodes: Record<string, Node> = {}
  const styleIds = new Set<string>()
  const visit = (id: string) => {
    const node = doc.nodes[id]
    if (!node || nodes[id]) return
    nodes[id] = node
    for (const s of node.styleIds) styleIds.add(s)
    if (node.responsive) {
      for (const ov of Object.values(node.responsive)) {
        for (const s of ov.styleIds ?? []) styleIds.add(s)
      }
    }
    node.children.forEach(visit)
  }
  visit(nodeId)
  const styles: Record<string, StyleRule> = {}
  for (const s of styleIds) if (doc.styles[s]) styles[s] = doc.styles[s]
  return { version: doc.version, rootId: nodeId, nodes, styles, manifest }
}
