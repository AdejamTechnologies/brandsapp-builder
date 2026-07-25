/**
 * Code-authoring DSL — "devs build sections in code, ship pure data" (spec §7/§8).
 * A small functional builder (webstudio's `$.Box` idea, minus the JSX proxy) that
 * compiles a spec tree + named styles into a Fragment, the marketplace unit.
 */

import {
  CORE_DOC_VERSION,
  type Doc,
  type Fragment,
  type FragmentManifest,
  type Node,
  type PropBinding,
  type StyleRule,
  type ThemeTokens,
} from "./schema"

export type StyleInput = Omit<StyleRule, "id" | "kind"> & { kind?: StyleRule["kind"] }

function compileStyles(styles: Record<string, StyleInput> | undefined): Record<string, StyleRule> {
  const out: Record<string, StyleRule> = {}
  for (const [sid, rule] of Object.entries(styles ?? {})) {
    out[sid] = {
      id: sid,
      kind: rule.kind ?? "token",
      base: rule.base ?? {},
      ...(rule.name ? { name: rule.name } : {}),
      ...(rule.context ? { context: rule.context } : {}),
    }
  }
  return out
}

function compileTree(root: NodeSpec, prefix: string): { nodes: Record<string, Node>; rootId: string } {
  const nodes: Record<string, Node> = {}
  let n = 0
  const nextId = () => `${prefix}${(n++).toString(36)}`
  const walk = (spec: NodeSpec): string => {
    const id = nextId()
    const children = (spec.children ?? []).map(walk)
    nodes[id] = {
      id,
      module: spec.module,
      props: spec.props ?? {},
      styleIds: spec.styleIds ?? [],
      children,
      ...(spec.style ? { style: spec.style } : {}),
      ...(spec.bindings ? { bindings: spec.bindings } : {}),
    }
    return id
  }
  return { nodes, rootId: walk(root) }
}

export interface NodeSpec {
  module: string
  props?: Record<string, unknown>
  style?: Record<string, string>
  styleIds?: string[]
  bindings?: Record<string, PropBinding>
  children?: NodeSpec[]
}

/** Author a node: `el("box", { styleIds:["wrap"] }, el("text", { props:{text:"hi"} }))`. */
export function el(
  module: string,
  opts: Omit<NodeSpec, "module" | "children"> = {},
  ...children: NodeSpec[]
): NodeSpec {
  return { module, ...opts, children }
}

/** Compile a spec tree + named styles into a Fragment (the marketplace unit). */
export function buildFragment(
  root: NodeSpec,
  opts: { styles?: Record<string, StyleInput>; manifest: FragmentManifest }
): Fragment {
  const { nodes, rootId } = compileTree(root, "a")
  return {
    version: CORE_DOC_VERSION,
    rootId,
    nodes,
    styles: compileStyles(opts.styles),
    manifest: opts.manifest,
  }
}

/** Compile a spec tree + styles + theme into a full Doc (a page). */
export function buildDoc(
  root: NodeSpec,
  opts: { styles?: Record<string, StyleInput>; theme: ThemeTokens; meta?: Doc["meta"] }
): Doc {
  const { nodes, rootId } = compileTree(root, "a")
  return {
    version: CORE_DOC_VERSION,
    rootId,
    nodes,
    styles: compileStyles(opts.styles),
    theme: opts.theme,
    ...(opts.meta ? { meta: opts.meta } : {}),
  }
}
