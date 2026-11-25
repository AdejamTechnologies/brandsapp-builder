// New file (24 Nov 2026): reading and patching a stored page document in the compact tree
// format, for designers working through the partners MCP (Claude, ChatGPT).
//
// ── Why patches, not a round trip ────────────────────────────────────────────
// A document carries more than the compact tree can say: named styles,
// per-breakpoint overrides, bindings, components. Turning a stored page into a
// tree and back would quietly drop all of it. So the tree is a READ view, and
// every change is an operation applied to the stored document by node id —
// what an edit did not touch comes back byte for byte.
//
// ── Why the same tree format ─────────────────────────────────────────────────
// A new node in an edit is written exactly like a node in `create_page`
// ({ m, c, p, k, a }) and converted by the same `docFromAiPage` rules, so one
// vocabulary serves both and an unknown module is refused the same way.

import { createDefaultRegistry, safeParseDoc, type Doc, type Node } from "../index"
import { pruneInteractions } from "../interactions"
import { PAGE_TRANSITIONS, safeStateName } from "../motion"
import { closedSetValue, docFromAiPage, type AiNode } from "./author"

/** A node as an MCP client reads it: the compact format plus its id. */
export interface TreeNode extends AiNode {
  /** The node id — what an edit operation points at. */
  i: string
  k?: TreeNode[]
  /** Set when the node carries data the tree cannot show (styles, breakpoints, bindings). */
  x?: string[]
}

/** The stored document as a compact tree with ids. Read-only view. */
export function treeFromDoc(doc: Doc, maxNodes = 600): { root: TreeNode | null; truncated: boolean } {
  let count = 0
  let truncated = false
  const walk = (id: string, depth: number): TreeNode | null => {
    const n = doc.nodes[id]
    if (!n) return null
    if (count >= maxNodes || depth > 40) {
      truncated = true
      return null
    }
    count++
    const out: TreeNode = { i: n.id, m: n.module }
    if (n.classes) out.c = n.classes
    if (n.props && Object.keys(n.props).length) out.p = n.props
    if (n.anim) out.a = n.anim as Record<string, unknown>
    // 24 Nov 2026: states and interactions read back in the same short keys they are written in.
    if (n.states && Object.keys(n.states).length) out.s = n.states
    if (n.on?.length) out.o = n.on as unknown as Array<Record<string, unknown>>
    const extra: string[] = []
    if (n.styleIds?.length || (n.style && Object.keys(n.style).length)) extra.push("styles")
    if (n.responsive && Object.keys(n.responsive).length) extra.push("breakpoints")
    if (n.bindings && Object.keys(n.bindings).length) extra.push("bindings")
    if (n.hidden) extra.push("hidden")
    if (extra.length) out.x = extra
    const kids = (n.children ?? []).map((c) => walk(c, depth + 1)).filter((c): c is TreeNode => !!c)
    if (kids.length) out.k = kids
    return out
  }
  return { root: walk(doc.rootId, 0), truncated }
}

/** One change to a stored document. */
export type EditOp =
  /** Merge props into a node (null removes a prop). */
  | { op: "set_props"; id: string; props: Record<string, unknown> }
  /** Replace a node's utility classes ("" clears them). */
  | { op: "set_classes"; id: string; classes: string }
  /** Replace a node's motion (null clears it). */
  | { op: "set_anim"; id: string; anim: Record<string, unknown> | null }
  /** Remove a node and everything under it. */
  | { op: "remove"; id: string }
  /** Insert a new subtree under a parent, at an index (end when omitted). */
  | { op: "insert"; parentId: string; index?: number; node: AiNode }
  /** Swap a node (and its subtree) for a new subtree, in the same place. */
  | { op: "replace"; id: string; node: AiNode }
  /** Move an existing node to a new parent/index. */
  | { op: "move"; id: string; parentId: string; index?: number }
  /** Page title / description. */
  | { op: "set_meta"; title?: string; description?: string; pageTransition?: string }
  /** Replace a node's named states (null clears them). 24 Nov 2026. */
  | { op: "set_states"; id: string; states: Record<string, string> | null }
  /** Replace a node's interactions (null clears them). Targets are node ids. */
  | { op: "set_on"; id: string; on: Array<Record<string, unknown>> | null }

export type EditResult =
  | { ok: true; doc: Doc; applied: number; notes: string[] }
  | { ok: false; reason: string }

/**
 * Turn one compact subtree into document nodes with fresh ids.
 *
 * Built through `docFromAiPage` (wrapped in a throwaway root) so a node added
 * by an edit passes exactly the checks a node in a new page does.
 */
function subtree(node: AiNode, notes: string[]): { nodes: Record<string, Node>; rootId: string } | { error: string } {
  const dropped: string[] = []
  // A box wrapper so the 8-node minimum (meant for whole pages) never refuses a one-line edit.
  const wrapped = { root: { m: "box", k: [node, ...Array.from({ length: 8 }, () => ({ m: "box" }))] } }
  const built = docFromAiPage(wrapped as never, undefined, dropped)
  if ("error" in built) return { error: built.error }
  for (const d of dropped) notes.push(`dropped ${d}`)
  const root = built.doc.nodes[built.doc.rootId]
  const firstId = root?.children?.[0]
  if (!firstId) return { error: `"${node?.m}" is not a module` }
  // Collect the real subtree; re-key ids so they cannot collide with the target document's.
  const stamp = Math.random().toString(36).slice(2, 7)
  const map = new Map<string, string>()
  const order: string[] = []
  const collect = (id: string) => {
    map.set(id, `e${stamp}${order.length.toString(36)}`)
    order.push(id)
    for (const c of built.doc.nodes[id]?.children ?? []) collect(c)
  }
  collect(firstId)
  const nodes: Record<string, Node> = {}
  for (const id of order) {
    const n = built.doc.nodes[id]!
    nodes[map.get(id)!] = {
      ...n,
      id: map.get(id)!,
      children: (n.children ?? []).map((c) => map.get(c)!),
      // An interaction inside the new subtree may target a sibling in it (24 Nov 2026).
      ...(n.on ? { on: n.on.map((it) => ({ ...it, ...(it.targets ? { targets: it.targets.map((t) => map.get(t) ?? t) } : {}) })) } : {}),
    }
  }
  return { nodes, rootId: map.get(firstId)! }
}

/** Every id under (and including) `id`. */
function descendants(doc: Doc, id: string, out: string[] = []): string[] {
  out.push(id)
  for (const c of doc.nodes[id]?.children ?? []) descendants(doc, c, out)
  return out
}

function parentOf(doc: Doc, id: string): string | null {
  for (const n of Object.values(doc.nodes)) if (n.children?.includes(id)) return n.id
  return null
}

/**
 * Apply edits in order. All or nothing: the first operation that cannot apply
 * refuses the whole batch with the reason, because a half-applied redesign is a
 * page nobody asked for.
 */
export function applyEdits(input: Doc, ops: EditOp[]): EditResult {
  if (!Array.isArray(ops) || !ops.length) return { ok: false, reason: "No operations." }
  if (ops.length > 200) return { ok: false, reason: "At most 200 operations per call." }
  const registry = createDefaultRegistry()
  const doc: Doc = structuredClone(input)
  const notes: string[] = []
  const need = (id: string, i: number) => {
    if (!doc.nodes[id]) throw new Error(`operation ${i + 1}: there is no node "${id}"`)
    return doc.nodes[id]!
  }
  const canHoldChildren = (id: string) => registry.get(doc.nodes[id]!.module)?.contentModel.children !== "none"

  try {
    ops.forEach((op, i) => {
      switch (op.op) {
        case "set_props": {
          const n = need(op.id, i)
          const schema = registry.get(n.module)?.schema ?? {}
          const props = { ...n.props }
          for (const [k, v] of Object.entries(op.props ?? {})) {
            if (!(k in schema)) {
              notes.push(`dropped prop "${k}" on "${n.module}" — not one of its props`)
              continue
            }
            if (v === null) {
              delete props[k]
              continue
            }
            // Same closed-set rule as a new node (author.ts) — "h1" becomes "1".
            const fixed = closedSetValue(schema[k]?.options, v)
            if (!fixed.ok) {
              notes.push(`dropped ${k}: "${String(v)}" on "${n.module}" — use one of ${fixed.allowed.join(", ")}`)
              continue
            }
            props[k] = fixed.value
          }
          n.props = props
          break
        }
        case "set_classes": {
          const n = need(op.id, i)
          if (op.classes?.trim()) n.classes = op.classes.trim()
          else delete n.classes
          break
        }
        case "set_anim": {
          const n = need(op.id, i)
          if (op.anim) n.anim = op.anim as never
          else delete n.anim
          break
        }
        case "remove": {
          need(op.id, i)
          if (op.id === doc.rootId) throw new Error(`operation ${i + 1}: the page root cannot be removed`)
          const parent = parentOf(doc, op.id)
          if (parent) doc.nodes[parent]!.children = doc.nodes[parent]!.children.filter((c) => c !== op.id)
          for (const d of descendants(doc, op.id)) delete doc.nodes[d]
          break
        }
        case "insert": {
          need(op.parentId, i)
          if (!canHoldChildren(op.parentId)) throw new Error(`operation ${i + 1}: "${doc.nodes[op.parentId]!.module}" cannot hold children`)
          const sub = subtree(op.node, notes)
          if ("error" in sub) throw new Error(`operation ${i + 1}: ${sub.error}`)
          Object.assign(doc.nodes, sub.nodes)
          const kids = doc.nodes[op.parentId]!.children
          const at = op.index === undefined ? kids.length : Math.max(0, Math.min(op.index, kids.length))
          kids.splice(at, 0, sub.rootId)
          notes.push(`inserted ${op.node.m} as ${sub.rootId}`)
          break
        }
        case "replace": {
          need(op.id, i)
          if (op.id === doc.rootId) throw new Error(`operation ${i + 1}: replace the root's children instead of the root`)
          const parent = parentOf(doc, op.id)
          if (!parent) throw new Error(`operation ${i + 1}: "${op.id}" is not on the page`)
          const sub = subtree(op.node, notes)
          if ("error" in sub) throw new Error(`operation ${i + 1}: ${sub.error}`)
          for (const d of descendants(doc, op.id)) delete doc.nodes[d]
          Object.assign(doc.nodes, sub.nodes)
          const kids = doc.nodes[parent]!.children
          kids[kids.indexOf(op.id)] = sub.rootId
          notes.push(`replaced ${op.id} with ${op.node.m} as ${sub.rootId}`)
          break
        }
        case "move": {
          need(op.id, i)
          need(op.parentId, i)
          if (descendants(doc, op.id).includes(op.parentId)) throw new Error(`operation ${i + 1}: a node cannot move inside itself`)
          if (!canHoldChildren(op.parentId)) throw new Error(`operation ${i + 1}: "${doc.nodes[op.parentId]!.module}" cannot hold children`)
          const from = parentOf(doc, op.id)
          if (from) doc.nodes[from]!.children = doc.nodes[from]!.children.filter((c) => c !== op.id)
          const kids = doc.nodes[op.parentId]!.children
          const at = op.index === undefined ? kids.length : Math.max(0, Math.min(op.index, kids.length))
          kids.splice(at, 0, op.id)
          break
        }
        case "set_meta": {
          if (op.pageTransition !== undefined && !(PAGE_TRANSITIONS as readonly string[]).includes(op.pageTransition)) {
            throw new Error(`operation ${i + 1}: pageTransition is one of ${PAGE_TRANSITIONS.join(", ")}`)
          }
          doc.meta = {
            ...(doc.meta ?? {}),
            ...(op.title !== undefined ? { title: op.title } : {}),
            ...(op.description !== undefined ? { description: op.description } : {}),
            ...(op.pageTransition !== undefined ? { pageTransition: op.pageTransition as never } : {}),
          }
          break
        }
        case "set_states": {
          const n = need(op.id, i)
          if (!op.states || !Object.keys(op.states).length) {
            delete n.states
            break
          }
          const next: Record<string, string> = {}
          for (const [name, cls] of Object.entries(op.states)) {
            if (!safeStateName(name) || typeof cls !== "string") throw new Error(`operation ${i + 1}: state "${name}" — names are lowercase words, values are classes`)
            next[name] = cls
          }
          n.states = next
          break
        }
        case "set_on": {
          const n = need(op.id, i)
          if (!op.on || !op.on.length) {
            delete n.on
            break
          }
          for (const it of op.on) for (const t of (it.targets as string[] | undefined) ?? []) need(t, i)
          n.on = op.on as never // the schema check below refuses a malformed one, with the reason
          break
        }
        default:
          throw new Error(`operation ${i + 1}: unknown op "${(op as { op?: string }).op}"`)
      }
    })
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "edit failed" }
  }

  // Triggers left pointing at a removed node or state are dropped (25 Nov 2026).
  const pruned = pruneInteractions(doc)
  if (pruned.removed) notes.push(`dropped ${pruned.removed} trigger(s) that pointed at something no longer on the page`)
  const parsed = safeParseDoc(pruned.doc)
  if (!parsed.success) {
    return {
      ok: false,
      reason: parsed.error.issues.slice(0, 3).map((x) => `${x.path.join(".")}: ${x.message}`).join("; "),
    }
  }
  return { ok: true, doc: parsed.data, applied: ops.length, notes }
}
