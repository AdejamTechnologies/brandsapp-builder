import { useMemo } from "react"
import { AlertTriangle, Repeat, Trash2 } from "lucide-react"

import {
  FEED_SOURCES,
  listRepeats,
  listSlots,
  REPEAT_PROP,
  repeatOf,
  SLOT_KINDS,
  SLOT_PROP,
  slotOf,
  sourcesFor,
  validateTemplate,
  type Doc,
  type Node,
  type SlotKind,
  type SlotSpec,
} from "@brandsapp/builder-core"

import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { cn } from "../lib/utils"

/**
 * Turning a page into a TEMPLATE.
 *
 * A template is an ordinary document. What makes it one is that some nodes
 * carry a `bappSlot` saying "this heading is the brand's name" and some
 * containers carry a `bappRepeat` saying "clone this card once per product".
 * Without those a design is a beautiful page about a company that does not
 * exist — it cannot be filled with anybody's name, photographs or prices.
 *
 * Until now there was no way to add them except by hand-editing JSON, which is
 * why every template we have was written by one person. That does not scale to
 * partners and designers selling templates, and it is the single thing
 * standing between the builder and a marketplace.
 *
 * ── Two decisions worth keeping ───────────────────────────────────────────
 *
 * THE SOURCE IS PICKED, NOT TYPED. `brand.name` typed as `brand.nmae` does not
 * fail: it resolves to nothing, the placeholder survives, and a brand's
 * homepage ships saying "Your business name here". The engine carries the
 * catalogue (`template-sources.ts`) and this offers it, filtered to the ones
 * that can honestly fill the kind of slot being made.
 *
 * THE PROBLEMS ARE SHOWN HERE, NOT AT APPLY TIME. `validateTemplate` already
 * knew about duplicate ids and slots pointing at props a node does not set.
 * Nobody ever saw it, because it ran in a test in another repository.
 */

interface Props {
  doc: Doc
  node: Node
  onChange: (d: Doc, coalesceKey?: string) => void
}

/** Props worth offering as a slot target, by what the module actually draws. */
const LIKELY_PROPS: Record<SlotKind, string[]> = {
  text: ["text", "label", "title", "heading", "eyebrow", "caption", "alt"],
  richtext: ["text", "html", "body"],
  image: ["src", "image", "poster", "logo"],
  href: ["href", "link", "url", "action"],
}

function setProp(doc: Doc, node: Node, key: string, value: unknown): Doc {
  const props = { ...(node.props ?? {}) }
  if (value === undefined) delete props[key]
  else props[key] = value
  return { ...doc, nodes: { ...doc.nodes, [node.id]: { ...node, props } } }
}

/** The feed of the nearest repeating ancestor, or null. */
function feedAround(doc: Doc, nodeId: string): string | null {
  const parent = new Map<string, string>()
  for (const n of Object.values(doc.nodes)) for (const c of n.children ?? []) parent.set(c, n.id)
  let cursor: string | undefined = parent.get(nodeId)
  while (cursor) {
    const n = doc.nodes[cursor]
    if (n) {
      const rep = repeatOf(n)
      if (rep) return rep.source
    }
    cursor = parent.get(cursor)
  }
  return null
}

export function TemplateFields({ doc, node, onChange }: Props) {
  const slot = slotOf(node)
  const repeat = repeatOf(node)
  const feed = useMemo(() => feedAround(doc, node.id), [doc, node.id])
  const problems = useMemo(() => validateTemplate(doc), [doc])
  const mine = problems.filter((p) => p.nodeId === node.id)
  const slots = useMemo(() => listSlots(doc), [doc])
  const repeats = useMemo(() => listRepeats(doc), [doc])

  const propNames = Object.keys(node.props ?? {}).filter(
    (k) => k !== SLOT_PROP && k !== REPEAT_PROP
  )

  const writeSlot = (next: Partial<SlotSpec> | null) => {
    if (next === null) return onChange(setProp(doc, node, SLOT_PROP, undefined), `slot:${node.id}`)
    const merged = { ...(slot ?? { id: "", prop: "", kind: "text" as SlotKind }), ...next }
    onChange(setProp(doc, node, SLOT_PROP, merged), `slot:${node.id}`)
  }

  const addSlot = () => {
    /**
     * Guess the prop, and guess well enough to be right most of the time.
     *
     * A heading's words live on `text`, an image's on `src`, a link's on
     * `href`. Offering the node's OWN props first means the guess is drawn
     * from what this element actually draws rather than from a fixed list.
     */
    const prop =
      LIKELY_PROPS.text.find((p) => propNames.includes(p)) ??
      LIKELY_PROPS.image.find((p) => propNames.includes(p)) ??
      propNames[0] ??
      "text"
    const kind: SlotKind = LIKELY_PROPS.image.includes(prop)
      ? "image"
      : LIKELY_PROPS.href.includes(prop)
        ? "href"
        : "text"
    writeSlot({ id: suggestId(doc, node, prop), prop, kind })
  }

  return (
    <div className="flex flex-col gap-4 p-3 text-xs">
      <section className="flex flex-col gap-2">
        <Head
          title="Content slot"
          hint="Marks this element as something a brand's own content fills."
        />

        {!slot ? (
          <button
            type="button"
            onClick={addSlot}
            className="rounded-md border border-border px-2 py-1.5 text-left hover:bg-muted"
          >
            Make this a slot
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <Field label="Name">
              <Input
                className="h-7 text-xs"
                value={slot.id}
                placeholder="hero.heading"
                onChange={(e) => writeSlot({ id: e.target.value })}
              />
            </Field>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Section first, and unique on the page — it is how both the filler
              and a person refer to this one place.
            </p>

            <Field label="Kind">
              <Select
                value={slot.kind}
                onValueChange={(v) => writeSlot({ kind: v as SlotKind, source: undefined })}
                options={SLOT_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
                className="w-full"
              />
            </Field>

            <Field label="Fills">
              <Select
                value={slot.prop}
                onValueChange={(v) => writeSlot({ prop: v })}
                options={(propNames.length ? propNames : LIKELY_PROPS[slot.kind]).map((p) => ({
                  value: p,
                  label: p,
                }))}
                className="w-full"
              />
            </Field>

            <Field label="From">
              <Select
                value={slot.source ?? ""}
                onValueChange={(v) => writeSlot({ source: v || undefined })}
                options={[
                  { value: "", label: "Nothing we hold — keep the design's words" },
                  ...sourcesFor(slot.kind, feed).map((s) => ({ value: s.path, label: s.label })),
                ]}
                className="w-full"
              />
            </Field>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {feed ? (
                <>
                  Inside a repeat over <code>{feed}</code>, so this fills from the
                  row rather than from the brand.
                </>
              ) : (
                <>
                  A slot with a source is filled free, from what the brand already
                  told us. One without keeps the design&rsquo;s own words until
                  somebody pays to have them rewritten.
                </>
              )}
            </p>

            {(slot.kind === "text" || slot.kind === "richtext") && (
              <Field label="Fits about">
                <Input
                  className="h-7 w-20 text-xs"
                  type="number"
                  min={1}
                  value={slot.max ?? ""}
                  placeholder="chars"
                  onChange={(e) =>
                    writeSlot({ max: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </Field>
            )}
            {slot.kind === "image" && (
              <Field label="Aspect">
                <Input
                  className="h-7 w-20 text-xs"
                  type="number"
                  step="0.01"
                  min={0.01}
                  value={slot.aspect ?? ""}
                  placeholder="w / h"
                  onChange={(e) =>
                    writeSlot({ aspect: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </Field>
            )}
            <p className="text-[11px] leading-snug text-muted-foreground">
              A statement about the design, not a rule about the brand&rsquo;s data:
              this was set at a size that holds roughly that much.
            </p>

            <Field label="Note to the AI">
              <Input
                className="h-7 text-xs"
                value={slot.hint ?? ""}
                placeholder="what belongs here"
                onChange={(e) => writeSlot({ hint: e.target.value || undefined })}
              />
            </Field>

            <button
              type="button"
              onClick={() => writeSlot(null)}
              className="flex items-center gap-1.5 self-start rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted"
            >
              <Trash2 className="size-3" />
              Not a slot
            </button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 border-t border-border pt-3">
        <Head
          title="Repeat over a feed"
          hint="The first child is the card; the filler clones it once per row."
        />
        <Field label="Feed">
          <Select
            value={repeat?.source ?? ""}
            onValueChange={(v) =>
              onChange(
                setProp(doc, node, REPEAT_PROP, v ? { ...repeat, source: v } : undefined),
                `repeat:${node.id}`
              )
            }
            options={[
              { value: "", label: "Does not repeat" },
              ...FEED_SOURCES.map((f) => ({ value: f.source, label: f.label })),
            ]}
            className="w-full"
          />
        </Field>
        {repeat && (
          <>
            <div className="flex gap-2">
              <Field label="At least">
                <Input
                  className="h-7 w-16 text-xs"
                  type="number"
                  min={0}
                  value={repeat.min ?? ""}
                  onChange={(e) =>
                    onChange(
                      setProp(doc, node, REPEAT_PROP, {
                        ...repeat,
                        min: e.target.value ? Number(e.target.value) : undefined,
                      }),
                      `repeat:${node.id}`
                    )
                  }
                />
              </Field>
              <Field label="At most">
                <Input
                  className="h-7 w-16 text-xs"
                  type="number"
                  min={1}
                  value={repeat.max ?? ""}
                  onChange={(e) =>
                    onChange(
                      setProp(doc, node, REPEAT_PROP, {
                        ...repeat,
                        max: e.target.value ? Number(e.target.value) : undefined,
                      }),
                      `repeat:${node.id}`
                    )
                  }
                />
              </Field>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              What the design actually holds. Three cards fill a row and eleven
              do not; the filler trims rather than guessing.
            </p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 border-t border-border pt-3">
        <Head
          title={`This page: ${slots.length} slot${slots.length === 1 ? "" : "s"}, ${repeats.length} repeat${repeats.length === 1 ? "" : "s"}`}
          hint="Every problem below produces a page that renders and is wrong."
        />
        {problems.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Nothing wrong with it.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {problems.map((p, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-1.5 rounded-md px-2 py-1.5 text-[11px] leading-snug",
                  mine.includes(p)
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span>{p.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {slots.length > 0 && (
        <section className="flex flex-col gap-1 border-t border-border pt-3">
          {slots.map((s) => (
            <div
              key={s.nodeId}
              className={cn(
                "flex items-center justify-between gap-2 rounded px-1.5 py-1",
                s.nodeId === node.id && "bg-muted"
              )}
            >
              <span className="truncate font-medium">{s.id}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {s.source ?? "own words"}
              </span>
            </div>
          ))}
          {repeats.map((r) => (
            <div key={r.nodeId} className="flex items-center gap-1.5 px-1.5 py-1 text-muted-foreground">
              <Repeat className="size-3" />
              <span className="truncate">{r.source}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

const KIND_LABEL: Record<SlotKind, string> = {
  text: "Words",
  richtext: "Words with formatting",
  image: "Picture",
  href: "Link address",
}

/**
 * A first name for a new slot, from where it sits.
 *
 * Section-first (`hero.heading`) is the convention every template follows, and
 * a name offered is a name more likely to follow it than a name demanded.
 */
function suggestId(doc: Doc, node: Node, prop: string): string {
  const parent = new Map<string, string>()
  for (const n of Object.values(doc.nodes)) for (const c of n.children ?? []) parent.set(c, n.id)
  let section = "section"
  let cursor: string | undefined = node.id
  while (cursor) {
    const n: Node | undefined = doc.nodes[cursor]
    const tag = typeof n?.props?.tag === "string" ? n.props.tag : ""
    if (tag === "section" || tag === "header" || tag === "footer" || tag === "main") {
      section = tag
      break
    }
    cursor = parent.get(cursor)
  }
  const taken = new Set(listSlots(doc).map((s) => s.id))
  const base = `${section}.${prop}`
  if (!taken.has(base)) return base
  for (let i = 2; i < 100; i++) if (!taken.has(`${base}${i}`)) return `${base}${i}`
  return base
}

function Head({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
