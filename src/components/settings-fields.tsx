import { useMemo, useRef, useState } from "react"
import { Popover as P } from "@base-ui/react/popover"
import { Check, ChevronDown, Search } from "lucide-react"

import {
  ALL_BUTTON_TOKENS,
  buttonClasses,
  filterCustomAttributes,
  type CustomAttributeEntry,
  type Doc,
  type Node,
  type PropBinding,
  type PropControl,
} from "@brandsapp/builder-core"
import { setBinding, updateProps } from "../lib/doc-ops"
import { moduleInfo } from "../lib/registry"
import { IconDialog } from "./icon-dialog"
import { MediaDialog } from "./media-dialog"
import { RichTextDialog } from "./richtext-dialog"
import { Select } from "./ui/select"
import { Switch } from "./ui/switch"
import { cn } from "../lib/utils"

// A parallel edit to builder-core/registry.ts is landing two OPTIONAL, purely
// presentational hints on `PropControl` (`multiline`, `segmented`). Widen the
// type locally instead of depending on the exact vendored snapshot having them
// yet — an intersection with the same optional key/type is a no-op once the
// upstream type catches up, so this works before AND after that sync.
type ExtControl = PropControl & {
  multiline?: boolean
  segmented?: boolean
}

// Shared 28px control chrome (matches ui/select.tsx's trigger) for plain
// inputs/buttons in this file that aren't styled by the legacy `.field input`
// CSS selector (e.g. a <textarea>, or an action button standing in for a row).
const CONTROL_CLASS =
  "flex h-7 w-full items-center rounded-[7px] border border-input bg-white px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"

// ── Segmented button row (Webflow-style) — reuses the existing `.bp-switch`
// chrome (styles.css) that the breakpoint switcher already established as
// "one row of small buttons, the active one filled", so this reads as the
// same control family rather than a new one-off. ──
function SegmentedField({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ label: string; value: string }>
}) {
  return (
    <div className="bp-switch" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={cn("ghost", value === o.value && "on")}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// CMS binding: which prop types can be overlaid from a data field, and the sources.
const BINDABLE = new Set(["plain", "url", "media", "richtext", "number"])
const BIND_SOURCES: { value: PropBinding["source"]; label: string }[] = [
  { value: "item", label: "Loop item" },
  { value: "parentItem", label: "Parent item" },
  { value: "page", label: "Page" },
  { value: "site", label: "Site" },
  { value: "route", label: "Route" },
]

// ── Custom attributes repeater ──
// `filterCustomAttributes` (imported from builder-core) is the actual gate the
// RENDERER applies at publish time — it alone decides what survives. We call it
// per-row (a single-entry array) purely to know whether THIS row would survive,
// and show a non-blocking hint when it wouldn't; the author's typed value is
// still saved either way (the renderer is free to drop it later; nothing here
// blocks authoring). `attrRefusalReason` below is a best-effort, MESSAGE-ONLY
// mirror of the filter's known rejection cases so the hint can say WHY —
// it is never consulted to decide accept/reject, only to phrase the hint that
// `filterCustomAttributes` already told us is warranted. If it drifts from the
// real rules, worst case is a vague hint, never a wrong accept/reject.
const ATTR_BLOCKED_NAMES = new Set([
  "style",
  "id",
  "class",
  "data-node-id",
  "ref",
  "key",
  "children",
  "dangerouslysetinnerhtml",
])
const ATTR_NAME_RE = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/
function attrRefusalReason(name: string, value: string): string | null {
  const n = name.trim()
  if (!n) return null
  if (!ATTR_NAME_RE.test(n)) return "not a valid attribute name"
  const lower = n.toLowerCase()
  if (/^on/i.test(lower)) return "event-handler attributes (on*) are never applied"
  if (ATTR_BLOCKED_NAMES.has(lower)) return "this name is reserved by the editor/renderer"
  if (/^\s*javascript:/i.test(value.trim().toLowerCase())) return "javascript: values are never applied"
  return null
}

function CustomAttributesField({
  entries,
  onChange,
}: {
  entries: CustomAttributeEntry[]
  onChange: (next: CustomAttributeEntry[]) => void
}) {
  const update = (i: number, patch: Partial<CustomAttributeEntry>) =>
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i))
  const add = () => onChange([...entries, { name: "", value: "" }])

  return (
    <div className="flex flex-col gap-1.5 py-1">
      {entries.map((entry, i) => {
        const name = entry.name ?? ""
        const value = entry.value ?? ""
        // The renderer is the source of truth for whether this survives —
        // ask it directly rather than re-deriving the verdict ourselves.
        const applied = name.trim() === "" || filterCustomAttributes([{ name, value }]).length > 0
        const reason = applied ? null : attrRefusalReason(name, value)
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <input
                value={name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="name"
                className={cn(CONTROL_CLASS, "w-[38%]")}
              />
              <input
                value={value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="value"
                className={cn(CONTROL_CLASS, "flex-1")}
              />
              <button type="button" className="mini" title="Remove attribute" onClick={() => remove(i)}>
                ×
              </button>
            </div>
            {reason && <div className="text-[11px] text-amber-600">Won't apply — {reason}</div>}
          </div>
        )
      })}
      <button type="button" className="mini wide" onClick={add}>
        + Add attribute
      </button>
    </div>
  )
}

// ── Select-field choices repeater ──
// Modelled on CustomAttributesField above: one row per choice, label + value
// inputs, a delete button. Move-up/move-down (rather than drag-and-drop) since
// order is meaningful in a dropdown and buttons are far more robust here.
interface ChoiceEntry {
  label: string
  value: string
}
function ChoicesField({
  choices,
  onChange,
}: {
  choices: ChoiceEntry[]
  onChange: (next: ChoiceEntry[]) => void
}) {
  const update = (i: number, patch: Partial<ChoiceEntry>) =>
    onChange(choices.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const remove = (i: number) => onChange(choices.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= choices.length) return
    const next = choices.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const add = () => onChange([...choices, { label: "", value: "" }])

  return (
    <div className="flex flex-col gap-1.5 py-1">
      {choices.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={c.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="label"
            className={cn(CONTROL_CLASS, "w-[38%]")}
          />
          <input
            value={c.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="value"
            className={cn(CONTROL_CLASS, "flex-1")}
          />
          <button type="button" className="mini" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
            ↑
          </button>
          <button
            type="button"
            className="mini"
            title="Move down"
            disabled={i === choices.length - 1}
            onClick={() => move(i, 1)}
          >
            ↓
          </button>
          <button type="button" className="mini" title="Remove choice" onClick={() => remove(i)}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="mini wide" onClick={add}>
        + Add choice
      </button>
    </div>
  )
}

/** Mirrors builder-core forms.tsx `parseOptions`: split on newlines/commas, trim, drop empties. */
function parseLegacyOptions(raw: string): ChoiceEntry[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({ label: s, value: s }))
}

// ── `select-field` choices editor (Webflow-parity) ──
// Deliberately NOT a name-keyed exception inside the schema-iteration loop
// below (unlike customAttributes) — its shape depends on the NODE'S DATA, not
// on whether `choices` happens to be declared in the schema yet. A doc
// authored before builder-core's `select-field` module grew a `choices` prop
// still carries a plain newline-separated `options` string; this renders the
// same editor either way once a `choices` array exists, and a conversion
// button (never an automatic rewrite) otherwise.
function selectFieldChoicesUI(
  schema: Record<string, PropControl>,
  node: Node,
  setProp: (k: string, v: unknown) => void
) {
  const choicesVal = node.props.choices
  const hasChoices = Array.isArray(choicesVal)
  const legacyOptions = typeof node.props.options === "string" ? (node.props.options as string) : ""
  const choicesLabel = schema.choices?.label ?? "choices"
  const optionsLabel = schema.options?.label ?? "options"

  if (hasChoices) {
    const arr = (choicesVal as unknown[]).map((c) => {
      const entry = c as Partial<ChoiceEntry> | null
      return { label: String(entry?.label ?? ""), value: String(entry?.value ?? "") }
    })
    return (
      <div key="choices">
        <div className="field" style={{ alignItems: "start" }}>
          <span className="pt-1">{choicesLabel}</span>
          <ChoicesField choices={arr} onChange={(next) => setProp("choices", next)} />
        </div>
      </div>
    )
  }

  return (
    <div key="choices">
      <label className="field">
        <span>{optionsLabel}</span>
        <input value={legacyOptions} onChange={(e) => setProp("options", e.target.value)} />
      </label>
      {legacyOptions.trim() && (
        <div className="flex flex-col gap-1 px-3 pb-1.5">
          <div className="text-[11px] text-amber-600">
            This field still uses the old one-per-line list — convert it to reorder choices or edit them individually.
          </div>
          <button
            type="button"
            className="mini wide"
            onClick={() => setProp("choices", parseLegacyOptions(legacyOptions))}
          >
            Convert to choices
          </button>
        </div>
      )}
    </div>
  )
}

// ── `form` "Fields" list (Webflow-parity, READ-ONLY) ──
// Selection lives in editor.tsx, which this file does not own, so there is no
// prop here to wire "click a row to select it" — this is informational only.
// If a selection callback is ever threaded down into SettingsCtx/props, a row
// click could call it with the field node's id.
const FORM_FIELD_MODULES = new Set([
  "input",
  "textarea",
  "select-field",
  "checkbox",
  "radio",
  "file-upload",
  "recaptcha",
])
const FORM_FIELD_TYPE_LABELS: Record<string, string> = {
  textarea: "Textarea",
  "select-field": "Select",
  checkbox: "Checkbox",
  radio: "Radio",
  "file-upload": "File upload",
  recaptcha: "reCAPTCHA",
}
function fieldTypeLabel(n: Node): string {
  if (n.module === "input") return `Input · ${String(n.props.type ?? "text")}`
  return FORM_FIELD_TYPE_LABELS[n.module] ?? n.module
}
function fieldDisplayName(n: Node, index: number): string {
  const name = typeof n.props.name === "string" ? n.props.name.trim() : ""
  if (name) return name
  const label = typeof n.props.label === "string" ? n.props.label.trim() : ""
  if (label) return label
  const placeholder = typeof n.props.placeholder === "string" ? n.props.placeholder.trim() : ""
  if (placeholder) return placeholder
  return `Field ${index + 1}`
}
/** Walks `doc` from the form node's children (not just direct children — fields can sit inside layout wrappers) collecting form-field nodes. */
function collectFormFields(doc: Doc, formNode: Node): Node[] {
  const out: Node[] = []
  const seen = new Set<string>()
  const walk = (id: string) => {
    if (seen.has(id)) return // guard against any accidental cycle in `children`
    seen.add(id)
    const n = doc.nodes[id]
    if (!n) return
    if (FORM_FIELD_MODULES.has(n.module)) out.push(n)
    for (const childId of n.children) walk(childId)
  }
  for (const childId of formNode.children) walk(childId)
  return out
}
function FormFieldsList({ doc, node }: { doc: Doc; node: Node }) {
  const fieldNodes = useMemo(() => collectFormFields(doc, node), [doc, node])
  return (
    <div className="flex flex-col gap-1 px-3 py-1.5">
      <div className="text-[11px] font-medium text-muted-foreground">Fields</div>
      {fieldNodes.length === 0 ? (
        <div className="muted small">No fields yet — drop an input, select, or checkbox into this form.</div>
      ) : (
        <ul className="flex flex-col gap-1">
          {fieldNodes.map((n, i) => (
            <li
              key={n.id}
              className="flex items-center justify-between gap-2 rounded-md border border-input bg-white px-2 py-1 text-xs"
            >
              <span className="truncate">{fieldDisplayName(n, i)}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{fieldTypeLabel(n)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

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
  const [iconKey, setIconKey] = useState<string | null>(null)
  const [richKey, setRichKey] = useState<string | null>(null)
  const [bindProp, setBindProp] = useState<string | null>(null)
  const [bindSource, setBindSource] = useState<PropBinding["source"]>("item")
  const [bindField, setBindField] = useState("")

  // ── Visibility (node.hidden) ──
  // Lives on the NODE, not in `props` — a module's schema knows nothing about
  // it — so it's rendered as its own row rather than folded into the
  // per-module field map below, and it patches `doc.nodes` directly through
  // the same `onChange(doc)` mechanism every other control here uses.
  const setHidden = (hidden: boolean) =>
    onChange(
      { ...doc, nodes: { ...doc.nodes, [node.id]: { ...node, hidden: hidden || undefined } } },
      `hidden:${node.id}`
    )
  const visibilityRow = (
    <div className="field">
      <span>visibility</span>
      <SegmentedField
        value={node.hidden ? "hidden" : "visible"}
        onChange={(v) => setHidden(v === "hidden")}
        options={[
          { value: "visible", label: "Visible" },
          { value: "hidden", label: "Hidden" },
        ]}
      />
    </div>
  )

  const info = moduleInfo(node.module)
  if (!info || Object.keys(info.schema).length === 0) {
    return (
      <>
        <div className="pt-1">{visibilityRow}</div>
        <div className="muted small" style={{ padding: "12px" }}>
          This element has no settings — switch to Styles to design it.
        </div>
      </>
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
    // select-field's `choices`/`options` are rendered by the dedicated
    // selectFieldChoicesUI block below instead (its editor choice depends on
    // the NODE'S DATA — legacy string vs. converted array — not on which of
    // these two keys the schema currently declares).
    .filter(([key]) => !(node.module === "select-field" && (key === "choices" || key === "options")))
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

      // Repeater, not the useless single text box a "json" control falls
      // through to by default — keyed by NAME (like pageSlug/sectionId above)
      // since the {name,value}[] shape is specific to this one prop.
      if (key === "customAttributes") {
        const arr: CustomAttributeEntry[] = Array.isArray(value) ? (value as CustomAttributeEntry[]) : []
        return (
          <div key={key}>
            <div className="field" style={{ alignItems: "start" }}>
              <span className="pt-1">{label}</span>
              <CustomAttributesField entries={arr} onChange={(next) => setProp(key, next)} />
            </div>
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
      if (control.type === "svg") {
        const current = value == null ? "" : String(value)
        return (
          <div key={key}>
            <div className="field">
              <span>{label}</span>
              <div className="media-field">
                {/* A preview, not the markup: the value is a whole SVG element and
                    no useful part of it fits in a text input. */}
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border p-1.5 text-foreground"
                  dangerouslySetInnerHTML={{ __html: current }}
                />
                <button className="mini" onClick={() => setIconKey(key)}>
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
              <button type="button" className={CONTROL_CLASS} onClick={() => setRichKey(key)}>
                Edit Rich Text
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
        const opts = control.options.map((o) => ({ value: String(o.value), label: o.label }))
        return (
          <div key={key} className="field">
            <span>{label}</span>
            {(control as ExtControl).segmented ? (
              <SegmentedField value={String(value ?? "")} onChange={(v) => setProp(key, v)} options={opts} />
            ) : (
              <Select value={String(value ?? "")} onValueChange={(v) => setProp(key, v)} options={opts} />
            )}
          </div>
        )
      }
      if ((control as ExtControl).multiline) {
        return (
          <div key={key}>
            <label className="field" style={{ alignItems: "start" }}>
              <span className="pt-1">{label}</span>
              <textarea
                rows={4}
                value={value == null ? "" : String(value)}
                onChange={(e) => setProp(key, e.target.value)}
                className={cn(CONTROL_CLASS, "h-auto min-h-[72px] resize-y items-start py-1.5")}
              />
            </label>
            {bindable && bindingUI(key)}
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
      <div className="pt-1">
        {visibilityRow}
        {fields}
        {node.module === "select-field" && selectFieldChoicesUI(info.schema, node, setProp)}
        {node.module === "form" && <FormFieldsList doc={doc} node={node} />}
      </div>
      {iconKey && (
        <IconDialog
          value={String(node.props[iconKey] ?? "")}
          onPick={(svg) => setProp(iconKey, svg)}
          onClose={() => setIconKey(null)}
        />
      )}
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
