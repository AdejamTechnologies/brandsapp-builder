/**
 * Where a template admits content, and where it does not.
 *
 * A template is an ordinary `Doc` — it renders on its own, it opens in the
 * builder, and it round-trips through the editor unharmed. What makes it a
 * template is that some of its nodes carry a `bappSlot` prop saying "this
 * particular string is the brand's name" or "these cards repeat over the
 * brand's products".
 *
 * THE SLOTS LIVE ON THE NODES, not in a manifest beside the Doc. That is the
 * whole design decision here, and it is the one worth not re-litigating:
 * templates are authored IN the builder, so anything kept alongside the Doc
 * drifts the first time somebody drags a section — the manifest would claim a
 * slot the Doc no longer has, or miss one it gained. A marker that travels
 * inside the node cannot get out of step with the node. `props` is an open
 * record (`z.record(z.string(), z.unknown())`), so this needs no schema change
 * and an older renderer ignores it.
 *
 * Which also means a template is never a special file format. It is a page.
 * Anything that can read a page can read a template, and `listSlots` below is
 * the only thing that has to understand the difference.
 *
 * ── The two kinds of filling ────────────────────────────────────────────────
 *
 * `source` is what makes the FREE path possible. A slot that names a source is
 * filled by copying a fact the brand already gave us — its name, its logo, its
 * catalogue rows — with no model call and no cost. A slot with no source keeps
 * the template's own words until somebody pays for them to be rewritten.
 *
 * So a brand with no credits still gets a finished site, and the AI is an
 * upgrade on copy rather than the thing standing between an owner and a page.
 */

import type { Doc, Node } from "./schema"

/** The prop a template author sets to mark a slot. */
export const SLOT_PROP = "bappSlot"
/** The prop that marks a container as repeating over a feed. */
export const REPEAT_PROP = "bappRepeat"

/**
 * What kind of content a slot takes.
 *
 * Deliberately about the SHAPE of the value rather than the module it sits on:
 * a heading, a paragraph and a button label are all `text` and differ only in
 * their budget. `image` and `href` are separate because substituting the wrong
 * one produces a broken page rather than ugly copy.
 */
export const SLOT_KINDS = ["text", "richtext", "image", "href"] as const
export type SlotKind = (typeof SLOT_KINDS)[number]

/** A slot as the template author writes it, on the node. */
export interface SlotSpec {
  /**
   * Dotted, section-first: `hero.heading`, `about.body`, `contact.whatsapp`.
   *
   * Unique within a template, because it is how both the filler and a human
   * refer to one place on the page.
   */
  id: string
  /** Which prop of this node the value is written to — `text`, `src`, `href`. */
  prop: string
  kind: SlotKind
  /**
   * A dotted path into the brand's own facts, for the free fill: `brand.name`,
   * `brand.logo`, `contact.whatsapp`. Omitted means "nothing we hold answers
   * this" — the template's own words stand until an AI fill rewrites them.
   */
  source?: string
  /**
   * Character budget. Not a validation rule on the brand's data — a statement
   * about the DESIGN: this headline was set at a size that holds about forty
   * characters, and sixty will wrap into the image below it. The AI fill is
   * given it as an instruction; the free fill uses it to decide whether a fact
   * fits or the placeholder is the better answer.
   */
  max?: number
  /** For `image`: the ratio the layout reserves, as width/height. */
  aspect?: number
  /** A sentence to the AI about what belongs here. Never shown to a visitor. */
  hint?: string
}

/** A container that repeats over a feed of the brand's own rows. */
export interface RepeatSpec {
  /** A feed name: `catalogue.products`, `faq.items`, `gallery.images`. */
  source: string
  /**
   * How many the design actually holds. A five-piece collection and a
   * two-hundred-SKU shop are not the same page, and a template that looks
   * composed with three cards looks broken with eleven — so the template says
   * what it can carry and the filler trims rather than guessing.
   */
  min?: number
  max?: number
}

export interface TemplateSlot extends SlotSpec {
  /** The node carrying it. */
  nodeId: string
}

export interface TemplateRepeat extends RepeatSpec {
  nodeId: string
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null
}

/** Read a slot off one node, or null when it carries none. */
export function slotOf(node: Node): SlotSpec | null {
  const raw = asRecord(node.props?.[SLOT_PROP])
  if (!raw) return null
  const id = typeof raw.id === "string" ? raw.id : ""
  const prop = typeof raw.prop === "string" ? raw.prop : ""
  const kind = raw.kind as SlotKind
  if (!id || !prop || !SLOT_KINDS.includes(kind)) return null
  return {
    id,
    prop,
    kind,
    ...(typeof raw.source === "string" ? { source: raw.source } : {}),
    ...(typeof raw.max === "number" ? { max: raw.max } : {}),
    ...(typeof raw.aspect === "number" ? { aspect: raw.aspect } : {}),
    ...(typeof raw.hint === "string" ? { hint: raw.hint } : {}),
  }
}

/** Read a repeat off one node, or null. */
export function repeatOf(node: Node): RepeatSpec | null {
  const raw = asRecord(node.props?.[REPEAT_PROP])
  if (!raw) return null
  const source = typeof raw.source === "string" ? raw.source : ""
  if (!source) return null
  return {
    source,
    ...(typeof raw.min === "number" ? { min: raw.min } : {}),
    ...(typeof raw.max === "number" ? { max: raw.max } : {}),
  }
}

/**
 * Every slot in a Doc, in document order.
 *
 * Document order and not the node map's key order: the map is a hash and its
 * order is incidental, while "the first heading on the page" is a thing both a
 * filler and a person reason about. Walking from `rootId` through `children`
 * gives the order somebody reading the page would use.
 */
export function listSlots(doc: Doc): TemplateSlot[] {
  const out: TemplateSlot[] = []
  walk(doc, (node) => {
    const slot = slotOf(node)
    if (slot) out.push({ ...slot, nodeId: node.id })
  })
  return out
}

/** Every repeating container in a Doc, in document order. */
export function listRepeats(doc: Doc): TemplateRepeat[] {
  const out: TemplateRepeat[] = []
  walk(doc, (node) => {
    const rep = repeatOf(node)
    if (rep) out.push({ ...rep, nodeId: node.id })
  })
  return out
}

/**
 * Depth-first from the root, following `children`.
 *
 * Guards against a cycle rather than trusting the Doc: a Doc is data, it
 * arrives from a file somebody hand-edited or from another repo, and a node
 * whose child list points back up it would otherwise hang the Worker rendering
 * it. Cheap insurance for a walk this short.
 */
function walk(doc: Doc, visit: (node: Node) => void): void {
  const seen = new Set<string>()
  const stack = [doc.rootId]
  const order: string[] = []
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    const node = doc.nodes[id]
    if (!node) continue
    order.push(id)
    // Reversed, so popping yields left-to-right.
    const kids = node.children ?? []
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]!)
  }
  for (const id of order) {
    const node = doc.nodes[id]
    if (node) visit(node)
  }
}

export interface SlotProblem {
  nodeId: string
  slotId?: string
  message: string
}

/**
 * What is wrong with a template, said plainly enough to fix.
 *
 * This is the guard that makes hand-authored templates safe to ship. Every
 * problem here is one that produces a page which renders — so none of them
 * would be caught by the Doc schema, by tsc, or by looking at the template in
 * the builder. They show up much later as one brand's homepage with a heading
 * that never got filled.
 */
export function validateTemplate(doc: Doc): SlotProblem[] {
  const problems: SlotProblem[] = []
  const slots = listSlots(doc)
  const byId = new Map<string, string>()

  for (const slot of slots) {
    const clash = byId.get(slot.id)
    if (clash) {
      problems.push({
        nodeId: slot.nodeId,
        slotId: slot.id,
        // Two nodes claiming one slot means the filler writes both and only one
        // of them was designed for the content.
        message: `slot "${slot.id}" is already used by node ${clash}`,
      })
    } else byId.set(slot.id, slot.nodeId)

    const node = doc.nodes[slot.nodeId]
    if (node && !(slot.prop in (node.props ?? {}))) {
      problems.push({
        nodeId: slot.nodeId,
        slotId: slot.id,
        // The prop has to exist with the template's own content in it, or the
        // page has a hole in it before anybody fills anything.
        message: `slot "${slot.id}" targets prop "${slot.prop}", which this node does not set — a template must ship with its own placeholder content`,
      })
    }

    if (slot.max !== undefined && slot.max <= 0) {
      problems.push({
        nodeId: slot.nodeId,
        slotId: slot.id,
        message: `slot "${slot.id}" has a max of ${slot.max}`,
      })
    }

    if (slot.kind === "image" && slot.aspect !== undefined && slot.aspect <= 0) {
      problems.push({
        nodeId: slot.nodeId,
        slotId: slot.id,
        message: `slot "${slot.id}" has an aspect of ${slot.aspect}`,
      })
    }
  }

  for (const rep of listRepeats(doc)) {
    if (rep.min !== undefined && rep.max !== undefined && rep.min > rep.max) {
      problems.push({
        nodeId: rep.nodeId,
        message: `repeat over "${rep.source}" asks for at least ${rep.min} and at most ${rep.max}`,
      })
    }
    const node = doc.nodes[rep.nodeId]
    if (node && (node.children ?? []).length === 0) {
      problems.push({
        nodeId: rep.nodeId,
        // The children ARE the pattern: the filler clones the first one per row.
        message: `repeat over "${rep.source}" has no children to repeat — the first child is the card that gets cloned per row`,
      })
    }
  }

  return problems
}
