import { useMemo, useState } from "react"
import { AlertTriangle, Download } from "lucide-react"

import {
  ARCHETYPE_IDS,
  GOODS_CATEGORY_ID_LIST,
  emptyTemplateManifest,
  listSlots,
  problemsWithManifest,
  validateTemplate,
  type Doc,
  type TemplateManifest,
} from "@brandsapp/builder-core"

// Relative: `design-systems` is 127 palettes of data and is deliberately
// not in the engine's barrel, so it is reached by path like the palette
// picker does rather than widening the public surface for a list of names.
import { DESIGN_SYSTEM_IDS } from "../builder-core/design-systems"

import { Button } from "./ui/button"
import { Dialog } from "./ui/dialog"
import { Input } from "./ui/input"
import { cn } from "../lib/utils"

/**
 * What this design IS, and handing it over.
 *
 * The slots (the Template tab on a selected element) say which parts a brand's
 * content fills. These say who the design is FOR: without them the picker
 * cannot decide whether to show it to a tailor or to a school, and the AI path
 * has no bounded set of looks to choose from.
 *
 * Export writes ONE file per template, pages included. A template with a menu
 * page and a homepage is one thing to choose, one thing to price and one thing
 * to apply; splitting it into files that have to be kept together is how half
 * a template gets uploaded.
 */
interface Props {
  doc: Doc
  /** Every page of this project, so a multi-page template can be gathered. */
  pages: Array<{ id: string; title: string; slug?: string }>
  currentPageId: string
  /** Fetches another page's document, for the export. */
  loadPage: (id: string) => Promise<Doc | null>
  onChange: (patch: TemplateManifest | undefined, coalesceKey?: string) => void
  onClose: () => void
}

export function TemplateDialog({
  doc,
  pages,
  currentPageId,
  loadPage,
  onChange,
  onClose,
}: Props) {
  const manifest = doc.meta?.template
  const [busy, setBusy] = useState<string | null>(null)
  const designSystems = DESIGN_SYSTEM_IDS

  const slots = useMemo(() => listSlots(doc), [doc])
  const slotProblems = useMemo(() => validateTemplate(doc), [doc])
  const problems = useMemo(
    () => (manifest ? problemsWithManifest(manifest, { designSystems }) : []),
    [manifest, designSystems]
  )

  // A design being described for the first time starts from the schema's own
  // blank (`emptyTemplateManifest`). Building that blank HERE, with a parse of
  // two empty strings, threw while this module was evaluating — `id` and
  // `name` are `min(1)` — which is not a validation message an author can act
  // on, it is the editor failing to load.
  const set = (patch: Partial<TemplateManifest>) =>
    onChange(
      { ...(manifest ?? emptyTemplateManifest()), ...patch },
      "template:manifest"
    )

  const toggle = (key: "archetypes" | "categories" | "colourways", value: string) => {
    const list = manifest?.[key] ?? []
    set({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] })
  }

  /**
   * Gather every page of this project that belongs to this template.
   *
   * By the manifest's `id`, not by what is open: a two-page template is two
   * pages in the same project, and the author should not have to remember
   * which ones or export them one at a time.
   */
  const exportTemplate = async () => {
    if (!manifest?.id) return
    setBusy("Gathering pages…")
    try {
      const collected: Array<{ page: TemplateManifest["page"]; doc: Doc }> = []
      for (const p of pages) {
        const d = p.id === currentPageId ? doc : await loadPage(p.id)
        if (!d) continue
        const m = d.meta?.template
        if (m?.id !== manifest.id) continue
        collected.push({ page: m.page, doc: d })
      }
      if (collected.length === 0) collected.push({ page: manifest.page, doc })

      const record = {
        manifest: { ...manifest },
        pages: collected,
      }
      const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${manifest.id}.template.json`
      a.click()
      URL.revokeObjectURL(url)
      setBusy(`Exported ${collected.length} page${collected.length === 1 ? "" : "s"}.`)
    } catch (e) {
      setBusy(e instanceof Error ? e.message : "Could not gather the pages.")
    }
  }

  const ready = !!manifest && problems.length === 0 && slotProblems.length === 0

  return (
    <Dialog open title="This design as a template" onClose={onClose}>
      <div className="flex flex-col gap-4 text-xs">
        {!manifest ? (
          <div className="flex flex-col gap-2">
            <p className="leading-snug text-muted-foreground">
              A page becomes a template when it says who it is for. Nothing is
              added to the design itself.
            </p>
            <Button size="sm" onClick={() => set({})} className="self-start">
              Make this a template
            </Button>
          </div>
        ) : (
          <>
            <Group title="What it is">
              <Row label="Id">
                <Input
                  className="h-7 text-xs"
                  value={manifest.id}
                  placeholder="fine-dining"
                  onChange={(e) => set({ id: e.target.value.trim().toLowerCase() })}
                />
              </Row>
              <Hint>
                The same on every page of this template — it is how they are
                gathered into one file.
              </Hint>
              <Row label="Name">
                <Input
                  className="h-7 text-xs"
                  value={manifest.name}
                  placeholder="Fine dining"
                  onChange={(e) => set({ name: e.target.value })}
                />
              </Row>
              <Row label="One line">
                <Input
                  className="h-7 text-xs"
                  value={manifest.description}
                  placeholder="For a restaurant people book a table at."
                  onChange={(e) => set({ description: e.target.value })}
                />
              </Row>
              <Hint>What it is FOR, not what it looks like. The picker shows it.</Hint>
              <Row label="Revision">
                <Input
                  className="h-7 w-16 text-xs"
                  type="number"
                  min={1}
                  value={manifest.revision}
                  onChange={(e) => set({ revision: Math.max(1, Number(e.target.value) || 1) })}
                />
              </Row>
              <Hint>
                Bump it when the DESIGN changes. A brand already building on the
                old one is offered the new one rather than having its page
                rewritten underneath it.
              </Hint>
            </Group>

            <Group title="This page">
              <Row label="Title">
                <Input
                  className="h-7 text-xs"
                  value={manifest.page.title}
                  onChange={(e) => set({ page: { ...manifest.page, title: e.target.value } })}
                />
              </Row>
              <Row label="Address">
                <Input
                  className="h-7 text-xs"
                  value={manifest.page.slug}
                  placeholder="(empty = the home page)"
                  onChange={(e) =>
                    set({ page: { ...manifest.page, slug: e.target.value.trim().toLowerCase() } })
                  }
                />
              </Row>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={manifest.page.home}
                  onChange={(e) => set({ page: { ...manifest.page, home: e.target.checked } })}
                />
                <span>This is the page a brand lands on</span>
              </label>
            </Group>

            <Group title="Who it suits">
              <Chips
                values={ARCHETYPE_IDS as readonly string[]}
                selected={manifest.archetypes}
                onToggle={(v) => toggle("archetypes", v)}
              />
              <Hint>
                None means it suits anyone — right for a plain one-page site,
                wrong for a car dealership&rsquo;s.
              </Hint>
            </Group>

            <Group title="Goods it shows">
              <Chips
                values={GOODS_CATEGORY_ID_LIST as readonly string[]}
                selected={manifest.categories}
                onToggle={(v) => toggle("categories", v)}
              />
              <Hint>
                Only for a design with a catalogue. A category decides what a
                product card shows.
              </Hint>
            </Group>

            <Group title="Looks it allows">
              <Chips
                values={[
                  ...Object.keys(manifest.palettes ?? {}),
                  ...designSystems.filter((d: string) => !(d in (manifest.palettes ?? {}))),
                ]}
                selected={manifest.colourways}
                onToggle={(v) => toggle("colourways", v)}
              />
              <Hint>
                The bounded set a look may be chosen from — the line between
                &ldquo;pick a look&rdquo; and &ldquo;invent a look&rdquo;. If
                colour is part of this design, give it its own rather than
                borrowing one by the sound of its name.
              </Hint>
            </Group>

            <Group title="What it needs">
              <Row label="Apps">
                <Input
                  className="h-7 text-xs"
                  value={manifest.requires.join(", ")}
                  placeholder="commerce"
                  onChange={(e) =>
                    set({
                      requires: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Row>
              <Row label="Fewest rows">
                <Input
                  className="h-7 w-16 text-xs"
                  type="number"
                  min={1}
                  value={manifest.minProducts ?? ""}
                  onChange={(e) =>
                    set({ minProducts: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </Row>
              <Hint>
                The honest floor. A design built for nine cards looks composed
                with nine and broken with one, so the picker never offers it to
                a thinner catalogue.
              </Hint>
            </Group>

            <Group title={`${slots.length} slot${slots.length === 1 ? "" : "s"} on this page`}>
              {[...problems, ...slotProblems.map((p) => ({ field: "slots", message: p.message }))]
                .length === 0 ? (
                <p className="text-muted-foreground">
                  Nothing wrong with it. {slots.length === 0 && "Though with no slots, this design fills with nobody's content."}
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {[
                    ...problems,
                    ...slotProblems.map((p) => ({ field: "slots", message: p.message })),
                  ].map((p, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 rounded-md bg-amber-100 px-2 py-1.5 leading-snug text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    >
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                      <span>
                        <span className="font-medium">{p.field}</span> — {p.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Group>

            <div className="flex items-center gap-2 border-t border-border pt-3">
              <Button size="sm" onClick={exportTemplate} disabled={!manifest.id}>
                <Download className="size-3.5" />
                Export the template
              </Button>
              {!ready && (
                <span className="text-[11px] text-muted-foreground">
                  It will export with the problems above in it.
                </span>
              )}
              {busy && <span className="text-[11px] text-muted-foreground">{busy}</span>}
            </div>
            <button
              type="button"
              className="self-start text-[11px] text-muted-foreground underline"
              onClick={() => onChange(undefined, "template:manifest")}
            >
              This is not a template
            </button>
          </>
        )}
      </div>
    </Dialog>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1">{children}</div>
    </label>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-snug text-muted-foreground">{children}</p>
}

function Chips({
  values,
  selected,
  onToggle,
}: {
  values: readonly string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onToggle(v)}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
            selected.includes(v)
              ? "border-foreground bg-foreground text-background"
              : "border-border hover:bg-muted"
          )}
        >
          {v}
        </button>
      ))}
    </div>
  )
}
