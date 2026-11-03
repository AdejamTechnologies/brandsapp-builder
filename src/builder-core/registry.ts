/**
 * The module registry: primitives-as-code. Each module declares a prop `schema`
 * (drives the editor panel AND selects the escaper per prop), a `contentModel`
 * (allow-list gate for untrusted nesting), and a React `Component` used for BOTH
 * SSR render and editor preview. The registry is small, stable, and team-owned —
 * everything else is data.
 */

import type { ComponentType, ReactNode } from "react"

import type { ControlType } from "./escape"
import type { PropBinding, ThemeTokens } from "./schema"

export interface PropControl {
  type: ControlType
  label?: string
  options?: Array<{ label: string; value: string }>
  default?: unknown
  /**
   * Only show this field when another prop has one of these values — a link's
   * URL box is meaningless once its type is "email". Keyed by prop name; the
   * field shows when EVERY listed prop matches one of its allowed values.
   */
  showIf?: Record<string, string[]>
  /**
   * Presentation hint only — the renderer is untouched by this flag. Use when
   * the value is long-form copy (a paragraph, a quote): the editor renders a
   * textarea instead of a single-line input so the author can see/write more
   * than one line at a time.
   */
  multiline?: boolean
  /**
   * Presentation hint only — the renderer is untouched by this flag. Use with
   * a SMALL `options` list (roughly <= 6 short values) that reads better as a
   * row of buttons than a dropdown — heading level 1–6, a Visible/Hidden pair.
   * Anything longer (or with long labels) should stay a plain `select`.
   */
  segmented?: boolean
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
  /**
   * The `site` data frame — brand settings the host resolved for this render.
   *
   * Read-only, and the ONLY host data a module sees. It exists for the handful
   * of "advanced" modules that are about the brand rather than the page: the
   * logo has to come from branding settings, not be re-uploaded into every
   * navbar an author builds.
   *
   * Bindings already reach this frame (`source: "site"` in binding.ts), but a
   * binding has to be authored per node and `DefaultChild` cannot declare one,
   * so a module that is MEANT to read a brand value could not express it.
   *
   * Undefined in the editor and on any host that resolves no site frame, so
   * every module reading it needs a fallback that still renders.
   */
  site?: Record<string, unknown>
  /**
   * True only when this node is authored `hidden` but also has `keepInHtml`
   * set — the renderer mounts it instead of dropping it (so scripts/anchors
   * can still find it), but the module must render it INERT. `rootAttrs`
   * (see advanced.ts) reads this and emits the `hidden` attribute plus a
   * `display:none` override; a module using `rootAttrs` needs no extra code.
   */
  keptHidden?: boolean
}

/** A node in a module's starter subtree (see `defaultChildren`). */
export interface DefaultChild {
  module: string
  /** Merged over the child module's own `defaults`. */
  props?: Record<string, unknown>
  /** Overrides the child module's `defaultClasses` when given. */
  classes?: string
  /**
   * Data bindings the starter subtree arrives with.
   *
   * Needed by any starter tree that is a LOOP over a feed: the card inside it
   * is only a card because its image, title, price and link read `item.*`.
   * Without this a "featured products" element would drop in as a grid of
   * identical placeholder cards and the author would have to bind four props
   * by hand before it showed a single real product.
   */
  bindings?: Record<string, PropBinding>
  children?: DefaultChild[]
}

export interface ModuleDefinition {
  name: string
  category: string
  schema: PropSchema
  defaults: Record<string, unknown>
  /** "none" = leaf, "any" = any child, or an allow-list of module names. */
  contentModel: { children: "none" | "any" | string[] }
  /**
   * This module may only be placed somewhere INSIDE one of these — at any depth.
   * Use when the containing element finds its parts by descendant query, so a
   * wrapper between them is legitimate (`nav-menu` inside a navbar's inner row).
   * For "must be a direct child", use `allowedParents`.
   */
  allowedAncestors?: string[]
  /**
   * This module may ONLY be placed inside these parents. The child half of the
   * nesting contract — a `list-item` outside a `list` is invalid HTML, and the
   * parent's own allow-list can't prevent a Div from accepting one.
   */
  allowedParents?: string[]
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
   * Utility classes this module's OWN markup emits, on elements the author never
   * touches — a lightbox's absolutely-positioned `<img>`, a map's `<iframe>`, a
   * video's poster layer.
   *
   * The atomic CSS is generated from the tokens the RENDERER collected, and it
   * only ever saw `node.classes`. A class hardcoded inside a Component
   * therefore got no rule generated unless some node on the same page happened
   * to use the same token — so a lightbox thumbnail rendered unpositioned and a
   * map iframe collapsed to its intrinsic height, on one page and not the next,
   * which is the worst kind of bug to chase. Declaring them here is the fix: the
   * renderer folds them into the collected set whenever the module renders.
   *
   * Only for classes NOT in `defaultClasses` — those live on the node, so the
   * author's copy is collected the normal way.
   */
  staticClasses?: string
  /**
   * Props whose VALUE is a list of utility classes, for the inner elements a
   * module draws but an author still wants to style — an account menu's panel,
   * the pill it shows when nobody is signed in.
   *
   * `staticClasses` cannot cover these: it is a constant, and the whole point
   * of the prop is that each design passes its own. Without this they fail in
   * exactly the way `staticClasses` was added to stop — the class reaches the
   * element, the generator never sees it, and the element renders with no CSS
   * at all on one page and correctly on the next, depending on whether some
   * other node happened to use the same token.
   */
  classProps?: string[]
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
  /** Every registered definition — used to DERIVE the AI vocabulary from code. */
  all(): ModuleDefinition[] {
    return [...this.map.values()]
  }
  controlFor(moduleName: string, prop: string): ControlType | undefined {
    return this.map.get(moduleName)?.schema[prop]?.type
  }
  /**
   * Is `child` allowed inside `parent`? BOTH sides must agree: the parent's
   * contentModel has to accept the child, AND — if the child declares
   * `allowedParents` — the parent has to be one of them. Without the second
   * rule a `list-item` could be dropped into any Div, producing an <li> with no
   * list around it.
   */
  allowsChild(parent: string, child: string): boolean {
    const model = this.map.get(parent)?.contentModel
    if (!model) return false
    if (model.children === "none") return false

    const only = this.map.get(child)?.allowedParents
    if (only && !only.includes(parent)) return false

    if (model.children === "any") return true
    return model.children.includes(child)
  }

  /**
   * The modules `child` must sit SOMEWHERE inside, if any. Separate from
   * `allowedParents` because the two rules are genuinely different: a `list-item`
   * has to be a DIRECT child of a list (an <li> one div down is invalid HTML),
   * whereas a `nav-menu` only has to be somewhere within a navbar — real bars wrap
   * their contents in a full-bleed box or an inner max-width row, and the runtime
   * finds it by descendant query.
   *
   * Callers with the document walk the chain themselves; the registry only knows
   * the rule, not the tree.
   */
  requiredAncestors(child: string): string[] | undefined {
    return this.map.get(child)?.allowedAncestors
  }
}
