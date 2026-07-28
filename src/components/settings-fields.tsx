import { useMemo, useRef, useState } from "react"
import { Popover as P } from "@base-ui/react/popover"
import { Check, ChevronDown, Search } from "lucide-react"

import { ALL_BUTTON_TOKENS, buttonClasses, type Doc, type Node, type PropBinding } from "@brandsapp/builder-core"
import { setBinding, updateProps } from "../lib/doc-ops"
import { moduleInfo } from "../lib/registry"
import { MediaDialog } from "./media-dialog"
import { RichTextDialog } from "./richtext-dialog"
import { Select } from "./ui/select"
import { Switch } from "./ui/switch"
import { cn } from "../lib/utils"

// CMS binding: which prop types can be overlaid from a data field, and the sources.
const BINDABLE = new Set(["plain", "url", "media", "richtext", "number"])
const BIND_SOURCES: { value: PropBinding["source"]; label: string }[] = [
  { value: "item", label: "Loop item" },
  { value: "parentItem", label: "Parent item" },
  { value: "page", label: "Page" },
  { value: "site", label: "Site" },
  { value: "route", label: "Route" },
]

export interface SettingsCtx {
  /** Pages in this site, for the Page picker. May be empty. */
  pages?: Array<{ id: string; title: string; slug: string }>
  /** Linkable sections on the CURRENT page, for the Section picker. May be empty. */
  sections?: Array<{ id: string; label: string }>
}

interface SettingsFieldsProps {
  doc: Doc
  node: Node
  onChange: (d: Doc, coalesceKey?: string) => void
  ctx?: SettingsCtx
}

// ── Generic searchable picker (used by the Page and Section fields) ──
// Trigger chrome matches ui/select.tsx exactly so it reads as the same control
// family. Callers fall back to a plain text input themselves when their list is
// empty — this component always assumes a non-empty item list.
interface PickerItem {
  value: string
  label: string
  sub?: string
}
function PickerField({
  value,
  onValueChange,
  items,
  placeholder,
  searchPlaceholder,
}: {
  value: string
  onValueChange: (v: string) => void
  items: PickerItem[]
  placeholder: string
  searchPlaceholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement | null>(null)
  const current = items.find((i) => i.value === value)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.value.toLowerCase().includes(q))
  }, [items, query])

  return (
    <P.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setQuery("")
      }}
      onOpenChangeComplete={(next) => {
        if (next) searchRef.current?.focus()
      }}
    >
      <P.Trigger
        className="flex h-7 w-full items-center justify-between gap-1.5 rounded-[7px] border border-input bg-white px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
        render={<button type="button" />}
      >
        <span className={cn("truncate text-left", !current && "text-muted-foreground")}>
          {current ? current.label : placeholder}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </P.Trigger>
      <P.Portal>
        <P.Positioner side="bottom" sideOffset={4} align="start" className="z-50">
          <P.Popup
            className="w-[--anchor-width] min-w-56 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false)
            }}
          >
            <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-6 w-full border-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filtered.length === 1) {
                    onValueChange(filtered[0].value)
                    setOpen(false)
                  }
                }}
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.length === 0 && (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</div>
              )}
              {filtered.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => {
                    onValueChange(i.value)
                    setOpen(false)
                  }}
                  className="relative flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-7 pl-2 text-left text-xs outline-none select-none hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{i.label}</span>
                    {i.sub && <span className="truncate text-[10px] text-muted-foreground">{i.sub}</span>}
                  </span>
                  {i.value === value && <Check className="absolute right-2 size-3.5" />}
                </button>
              ))}
            </div>
          </P.Popup>
        </P.Positioner>
      </P.Portal>
    </P.Root>
  )
}

function PagePicker({
  value,
  onChange,
  pages,
}: {
  value: string
  onChange: (v: string) => void
  pages: NonNullable<SettingsCtx["pages"]>
}) {
  const items: PickerItem[] = pages.map((p) => ({ value: p.slug, label: p.title, sub: `/${p.slug.replace(/^\//, "")}` }))
  return (
    <PickerField
      value={value}
      onValueChange={onChange}
      items={items}
      placeholder="Choose a page…"
      searchPlaceholder="Search pages…"
    />
  )
}

function SectionPicker({
  value,
  onChange,
  sections,
}: {
  value: string
  onChange: (v: string) => void
  sections: NonNullable<SettingsCtx["sections"]>
}) {
  const items: PickerItem[] = sections.map((s) => ({ value: s.id, label: s.label }))
  return (
    <PickerField
      value={value}
      onValueChange={onChange}
      items={items}
      placeholder="Choose a section…"
      searchPlaceholder="Search sections…"
    />
  )
}

/**
 * Renders the Settings-tab controls for a node's module schema — extracted from
 * Inspector so the same field renderer can be reused by an on-canvas settings
 * popover. Behaviour (showIf filtering, media/richtext dialogs, CMS binding UI,
 * and the button variant/size → classes rewrite) is preserved verbatim.
 */
export function SettingsFields({ doc, node, onChange, ctx }: SettingsFieldsProps): React.ReactNode {
  const [mediaKey, setMediaKey] = useState<string | null>(null)
  const [richKey, setRichKey] = useState<string | null>(null)
  const [bindProp, setBindProp] = useState<string | null>(null)
  const [bindSource, setBindSource] = useState<PropBinding["source"]>("item")
  const [bindField, setBindField] = useState("")

  const info = moduleInfo(node.module)
  if (!info || Object.keys(info.schema).length === 0) {
    return (
      <div className="muted small" style={{ padding: "12px" }}>
        This element has no settings — switch to Styles to design it.
      </div>
    )
  }

  const setProp = (key: string, value: unknown) => {
    let next = updateProps(doc, node.id, { [key]: value })
    // A variant is only real if it restyles. Classes are seeded at insert time
    // and the author can edit them, so changing variant/size REWRITES the button's
    // class string from the new pair — otherwise the control would look wired up
    // and do nothing. Anything the author added beyond the variant set is kept.
    if (node.module === "button" && (key === "variant" || key === "size")) {
      const n = next.nodes[node.id]
      const variant = String(key === "variant" ? value : (n?.props?.variant ?? "default"))
      const size = String(key === "size" ? value : (n?.props?.size ?? "default"))
      const generated = new Set(buttonClasses(variant, size).split(/\s+/).filter(Boolean))
      const everyVariantToken = new Set(ALL_BUTTON_TOKENS)
      const authored = String(n?.classes ?? "")
        .split(/\s+/)
        .filter((c) => c && !everyVariantToken.has(c)) // drop the previous variant's tokens
      next = {
        ...next,
        nodes: { ...next.nodes, [node.id]: { ...n!, classes: [...generated, ...authored].join(" ") } },
      }
    }
    onChange(next, `prop:${node.id}:${key}`)
  }

  // ── CMS binding controls (Settings tab) ──
  const setBind = (prop: string, binding: PropBinding | null) =>
    onChange(setBinding(doc, node.id, prop, binding), `bind:${node.id}:${prop}`)
  const openBind = (prop: string) => {
    const b = node.bindings?.[prop]
    setBindSource(b?.source ?? "item")
    setBindField(b?.field ?? "")
    setBindProp(prop)
  }
  const bindingUI = (prop: string) => {
    const bound = node.bindings?.[prop]
    const editing = bindProp === prop
    return (
      <div className="bind-row">
        {bound ? (
          <span className="bind-chip">
            ↔ {bound.source}.{bound.field}
            <button title="Unbind" onClick={() => setBind(prop, null)}>
              ×
            </button>
            <button title="Edit binding" onClick={() => openBind(prop)}>
              ✎
            </button>
          </span>
        ) : editing ? null : (
          <button className="bind-link" onClick={() => openBind(prop)}>
            ↔ Bind to data
          </button>
        )}
        {editing && (
          <div className="bind-editor">
            <Select
              value={bindSource}
              onValueChange={(v) => setBindSource(v as PropBinding["source"])}
              options={BIND_SOURCES}
            />
            <input
              placeholder="field (e.g. title, price)"
              value={bindField}
              onChange={(e) => setBindField(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && bindField.trim()) {
                  setBind(prop, { source: bindSource, field: bindField.trim() })
                  setBindProp(null)
                }
              }}
            />
            <div className="bind-actions">
              <button
                className="mini"
                onClick={() => {
                  if (bindField.trim()) setBind(prop, { source: bindSource, field: bindField.trim() })
                  setBindProp(null)
                }}
              >
                Bind
              </button>
              <button className="mini" onClick={() => setBindProp(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const fields = Object.entries(info.schema)
    // A field can declare `showIf`, so a module only surfaces the inputs that
    // apply right now — a link's URL box is meaningless once its type is
    // "email". Hidden fields keep their stored value; they just aren't shown.
    .filter(([, control]) =>
      Object.entries(control.showIf ?? {}).every(([dep, allowed]) => allowed.includes(String(node.props[dep] ?? "")))
    )
    .map(([key, control]) => {
      const value = node.props[key]
      const label = control.label ?? key
      const bindable = BINDABLE.has(control.type)

      // Field-name-keyed pickers (link model props — see builder-core/link.ts).
      // Keyed by NAME rather than control type because the shared ControlType
      // union doesn't (and shouldn't) know about "page"/"section" pickers.
      if (key === "pageSlug") {
        const strVal = value == null ? "" : String(value)
        return (
          <div key={key}>
            <div className="field">
              <span>{label}</span>
              {ctx?.pages && ctx.pages.length > 0 ? (
                <PagePicker value={strVal} onChange={(v) => setProp(key, v)} pages={ctx.pages} />
              ) : (
                <input value={strVal} onChange={(e) => setProp(key, e.target.value)} />
              )}
            </div>
            {bindable && bindingUI(key)}
          </div>
        )
      }
      if (key === "sectionId") {
        const strVal = value == null ? "" : String(value)
        return (
          <div key={key}>
            <div className="field">
              <span>{label}</span>
              {ctx?.sections && ctx.sections.length > 0 ? (
                <SectionPicker value={strVal} onChange={(v) => setProp(key, v)} sections={ctx.sections} />
              ) : (
                <input value={strVal} onChange={(e) => setProp(key, e.target.value)} />
              )}
            </div>
            {bindable && bindingUI(key)}
          </div>
        )
      }

      if (control.type === "media") {
        return (
          <div key={key}>
            <div className="field">
              <span>{label}</span>
              <div className="media-field">
                <input value={value == null ? "" : String(value)} onChange={(e) => setProp(key, e.target.value)} />
                <button className="mini" onClick={() => setMediaKey(key)}>
                  Choose
                </button>
              </div>
            </div>
            {bindingUI(key)}
          </div>
        )
      }
      if (control.type === "richtext") {
        return (
          <div key={key}>
            <div className="field">
              <span>{label}</span>
              <button className="mini wide" onClick={() => setRichKey(key)}>
                Edit rich text…
              </button>
            </div>
            {bindingUI(key)}
          </div>
        )
      }
      if (control.type === "boolean") {
        return (
          <div key={key} className="field">
            <span>{label}</span>
            <Switch checked={Boolean(value)} onCheckedChange={(c: boolean) => setProp(key, c)} />
          </div>
        )
      }
      if (control.type === "select" && control.options) {
        return (
          <div key={key} className="field">
            <span>{label}</span>
            <Select
              value={String(value ?? "")}
              onValueChange={(v) => setProp(key, v)}
              options={control.options.map((o) => ({ value: String(o.value), label: o.label }))}
            />
          </div>
        )
      }
      return (
        <div key={key}>
          <label className="field">
            <span>{label}</span>
            {control.type === "number" ? (
              <input
                type="number"
                value={value == null ? "" : String(value)}
                onChange={(e) => setProp(key, e.target.value === "" ? undefined : Number(e.target.value))}
              />
            ) : (
              <input value={value == null ? "" : String(value)} onChange={(e) => setProp(key, e.target.value)} />
            )}
          </label>
          {bindable && bindingUI(key)}
        </div>
      )
    })

  return (
    <>
      <div className="pt-1">{fields}</div>
      {mediaKey && (
        <MediaDialog
          value={String(node.props[mediaKey] ?? "")}
          onPick={(url) => setProp(mediaKey, url)}
          onClose={() => setMediaKey(null)}
        />
      )}
      {richKey && (
        <RichTextDialog
          html={String(node.props[richKey] ?? "")}
          onSave={(h) => {
            setProp(richKey, h)
            setRichKey(null)
          }}
          onClose={() => setRichKey(null)}
        />
      )}
    </>
  )
}
