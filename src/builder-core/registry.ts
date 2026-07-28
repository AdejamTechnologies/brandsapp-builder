/**
 * The module registry: primitives-as-code. Each module declares a prop `schema`
 * (drives the editor panel AND selects the escaper per prop), a `contentModel`
 * (allow-list gate for untrusted nesting), and a React `Component` used for BOTH
 * SSR render and editor preview. The registry is small, stable, and team-owned —
 * everything else is data.
 */

import type { ComponentType, ReactNode } from "react"

import type { ControlType } from "./escape"
import type { ThemeTokens } from "./schema"

export interface PropControl {
  type: ControlType
  label?: string
  options?: Array<{ label: string; value: string }>
  default?: unknown
}
export type PropSchema = Record<string, PropControl>

export interface ModuleRenderProps {
  /** Resolved props (defaults ← node.props ← bindings), already escaped by control type. */
  props: Record<string, unknown>
  /** Rendered child elements. */
  children: ReactNode
  /** Style classes for this node (style-source + per-node classes). */
  className: string
  theme: ThemeTokens
  nodeId: string
  isEditor: boolean
}

/** A node in a module's starter subtree (see `defaultChildren`). */
export interface DefaultChild {
  module: string
  /** Merged over the child module's own `defaults`. */
  props?: Record<string, unknown>
  /** Overrides the child module's `defaultClasses` when given. */
  classes?: string
  children?: DefaultChild[]
}

export interface ModuleDefinition {
  name: string
  category: string
  schema: PropSchema
  defaults: Record<string, unknown>
  /** "none" = leaf, "any" = any child, or an allow-list of module names. */
  contentModel: { children: "none" | "any" | string[] }
  /** Needs per-request data → rendered as a hole in the static bake (see render). */
  dynamic?: boolean
  /**
   * Editor-only: this module's text is editable in-place on the canvas. `prop` is
   * the prop that holds the text (e.g. "label" for button). The editor makes the
   * rendered element contentEditable on double-click and writes back to this prop.
   */
  inlineTextEdit?: {
    prop: string
    multiline?: boolean
    /**
     * The prop holds HTML, not plain text (richtext). The editor commits the
     * element's innerHTML instead of its textContent — committing textContent
     * would silently flatten every tag the author had written.
     */
    html?: boolean
  }
  /**
   * Utility classes seeded onto a freshly-inserted node's `classes`, so a new
   * element is visible and reasonably styled out of the box (containers get a
   * border + padding + min-height; a button looks like a button). Fully editable
   * or removable afterwards via the Inspector.
   */
  defaultClasses?: string
  /**
   * A starter subtree inserted with the node, so a container arrives usable
   * rather than empty — a `form` drops in with real fields and a submit button.
   * Seeded once at insert time (like `defaults`/`defaultClasses`) and fully
   * editable afterwards; it is NOT re-applied on render.
   */
  defaultChildren?: DefaultChild[]
  /**
   * This module is interactive on the published page via the shared vanilla-JS
   * runtime (BUILDER_RUNTIME) — e.g. tabs. The renderer flags `usesRuntime` so the
   * host injects the script. Static/native-interactive modules (a `<details>`
   * accordion) don't need this.
   */
  needsRuntime?: boolean
  Component: ComponentType<ModuleRenderProps>
}

export class ModuleRegistry {
  private map = new Map<string, ModuleDefinition>()

  register(def: ModuleDefinition): this {
    this.map.set(def.name, def)
    return this
  }
  registerAll(defs: ModuleDefinition[]): this {
    for (const d of defs) this.register(d)
    return this
  }
  get(name: string): ModuleDefinition | undefined {
    return this.map.get(name)
  }
  has(name: string): boolean {
    return this.map.has(name)
  }
  names(): string[] {
    return [...this.map.keys()]
  }
  controlFor(moduleName: string, prop: string): ControlType | undefined {
    return this.map.get(moduleName)?.schema[prop]?.type
  }
  /** Is `child` allowed inside `parent` per the parent's contentModel? */
  allowsChild(parent: string, child: string): boolean {
    const model = this.map.get(parent)?.contentModel
    if (!model) return false
    if (model.children === "none") return false
    if (model.children === "any") return true
    return model.children.includes(child)
  }
}
