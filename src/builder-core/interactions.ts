/**
 * Keeping interactions honest after things are deleted (new file, 25 Nov 2026).
 *
 * A trigger names a STATE on a TARGET node. Delete the node, or remove the
 * state, and the trigger points at nothing: harmless at runtime (it finds no
 * element), but it sits in the inspector as a trigger to nowhere, and an AI
 * reading the page back is told the page does something it does not.
 *
 * One pass, used by every path that removes things — the edit operations the
 * MCP and in-app AI use, the inspector, and the editor's own delete — so none
 * of them has to remember the rule.
 */
import type { Doc } from "./schema"

/** Drop targets that no longer exist, and triggers whose state no target still has. */
export function pruneInteractions(doc: Doc): { doc: Doc; removed: number } {
  let removed = 0
  const nodes = { ...doc.nodes }
  for (const [id, node] of Object.entries(nodes)) {
    if (!node.on?.length) continue
    const kept = node.on
      .map((it) => {
        if (!it.targets) return it
        const targets = it.targets.filter((t) => nodes[t])
        return targets.length ? { ...it, targets } : null
      })
      .filter((it): it is NonNullable<typeof it> => {
        if (!it) return false
        const targets = it.targets ?? [id]
        return targets.some((t) => nodes[t]?.states?.[it.state] !== undefined)
      })
    if (kept.length !== node.on.length || kept.some((k, i) => k !== node.on![i])) {
      removed += node.on.length - kept.length
      const { on: _drop, ...rest } = node
      void _drop
      nodes[id] = kept.length ? { ...node, on: kept } : (rest as typeof node)
    }
  }
  return removed || Object.keys(nodes).some((k) => nodes[k] !== doc.nodes[k]) ? { doc: { ...doc, nodes }, removed } : { doc, removed: 0 }
}
