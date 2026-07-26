import { useState } from "react"

import type { Doc, Node } from "@brandsapp/builder-core"
import {
  addClassToNode,
  createClass,
  removeClassFromNode,
  updateClassStyle,
  updateProps,
  updateResponsiveStyle,
} from "../lib/doc-ops"
import { moduleInfo } from "../lib/registry"
import { MediaDialog } from "./media-dialog"
import { RichTextDialog } from "./richtext-dialog"
import { Button } from "./ui/button"
import { Select } from "./ui/select"
import { Switch } from "./ui/switch"
import { Tabs, TabsList, TabsPanel, TabsTab } from "./ui/tabs"
import { cn } from "../lib/utils"

type Anim = NonNullable<Node["anim"]>
const ANIM_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "fade-up", label: "Fade up" },
  { value: "fade-down", label: "Fade down" },
  { value: "fade-left", label: "Fade left" },
  { value: "fade-right", label: "Fade right" },
  { value: "zoom", label: "Zoom" },
]

interface InspectorProps {
  doc: Doc
  node?: Node
  onChange: (d: Doc, coalesceKey?: string) => void
  /** Active breakpoint id, or null for the base layer. Style edits target it. */
  activeBp: string | null
  /** Play the selected node's animation once in the canvas (preview). */
  onPreview?: (nodeId: string, anim: Anim) => void
}

const SELECTS: Record<string, string[]> = {
  display: ["", "block", "flex", "inline-flex", "grid", "inline-block", "none"],
  flexDirection: ["", "row", "column", "row-reverse", "column-reverse"],
  flexWrap: ["", "nowrap", "wrap", "wrap-reverse"],
  alignItems: ["", "flex-start", "center", "flex-end", "stretch", "baseline"],
  justifyContent: ["", "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"],
  textAlign: ["", "left", "center", "right", "justify"],
  textTransform: ["", "none", "uppercase", "lowercase", "capitalize"],
  fontWeight: ["", "300", "400", "500", "600", "700", "800"],
}

// Human labels for CSS keys (camelCase → friendly). Falls back to the key.
const LABELS: Record<string, string> = {
  flexDirection: "direction",
  flexWrap: "wrap",
  alignItems: "align",
  justifyContent: "justify",
  maxWidth: "max width",
  minWidth: "min width",
  fontSize: "size",
  fontWeight: "weight",
  lineHeight: "line height",
  letterSpacing: "spacing",
  textAlign: "align",
  textTransform: "transform",
  borderRadius: "radius",
  borderColor: "border color",
  boxShadow: "shadow",
}

type FieldKind = "text" | "select" | "color"
const GROUPS: { title: string; fields: { key: string; kind: FieldKind }[] }[] = [
  {
    title: "Layout",
    fields: [
      { key: "display", kind: "select" },
      { key: "flexDirection", kind: "select" },
      { key: "flexWrap", kind: "select" },
      { key: "gap", kind: "text" },
      { key: "alignItems", kind: "select" },
      { key: "justifyContent", kind: "select" },
    ],
  },
  { title: "Spacing", fields: [{ key: "padding", kind: "text" }, { key: "margin", kind: "text" }] },
  {
    title: "Size",
    fields: [
      { key: "width", kind: "text" },
      { key: "maxWidth", kind: "text" },
      { key: "minWidth", kind: "text" },
      { key: "height", kind: "text" },
    ],
  },
  {
    title: "Typography",
    fields: [
      { key: "color", kind: "color" },
      { key: "fontSize", kind: "text" },
      { key: "fontWeight", kind: "select" },
      { key: "lineHeight", kind: "text" },
      { key: "letterSpacing", kind: "text" },
      { key: "textAlign", kind: "select" },
      { key: "textTransform", kind: "select" },
    ],
  },
  { title: "Background", fields: [{ key: "background", kind: "color" }] },
  {
    title: "Border",
    fields: [
      { key: "border", kind: "text" },
      { key: "borderColor", kind: "color" },
      { key: "borderRadius", kind: "text" },
      { key: "boxShadow", kind: "text" },
    ],
  },
  { title: "Effects", fields: [{ key: "opacity", kind: "text" }] },
]

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)
const tokenVar = (name: string) => `var(--color-${name})`

export function Inspector({ doc, node, onChange, activeBp, onPreview }: InspectorProps) {
  const [mediaKey, setMediaKey] = useState<string | null>(null)
  const [richKey, setRichKey] = useState<string | null>(null)
  const [newClass, setNewClass] = useState("")
  const [activeClassId, setActiveClassId] = useState<string | null>(null)

  if (!node) return <div className="inspector muted small">Select a layer to edit it.</div>

  const info = moduleInfo(node.module)
  const hasContent = info != null && Object.keys(info.schema).length > 0
  const tokens = Object.entries(doc.theme.colors ?? {}) // [name, value] — the variables
  const setProp = (key: string, value: unknown) =>
    onChange(updateProps(doc, node.id, { [key]: value }), `prop:${node.id}:${key}`)
  // The active style target: a class (StyleRule id) if the node has one, else the
  // element itself. Editing a class restyles every element that uses it.
  const target =
    (activeClassId && node.styleIds.includes(activeClassId) ? activeClassId : node.styleIds[node.styleIds.length - 1]) ??
    null
  const setStyle = (key: string, value: string) =>
    onChange(
      target
        ? updateClassStyle(doc, target, activeBp, { [key]: value })
        : updateResponsiveStyle(doc, node.id, activeBp, { [key]: value }),
      `style:${target ?? node.id}:${activeBp ?? "base"}:${key}`
    )
  const applyClass = (name: string) => {
    const clean = name.trim()
    if (!clean) return
    const existing = Object.values(doc.styles).find((s) => s.name === clean)
    if (existing) {
      onChange(addClassToNode(doc, node.id, existing.id))
      setActiveClassId(existing.id)
    } else {
      const { doc: d1, id } = createClass(doc, clean)
      onChange(addClassToNode(d1, node.id, id))
      setActiveClassId(id)
    }
    setNewClass("")
  }
  const dropClass = (id: string) => {
    onChange(removeClassFromNode(doc, node.id, id))
    if (activeClassId === id) setActiveClassId(null)
  }
  const patch = (p: Partial<Node>, key?: string) =>
    onChange({ ...doc, nodes: { ...doc.nodes, [node.id]: { ...node, ...p } } }, key)
  const animKey = `anim:${node.id}`
  const setEffect = (e: string) =>
    patch({ anim: e === "none" ? undefined : { trigger: "load", duration: 600, delay: 0, ...node.anim, effect: e } }, animKey)
  const setAnim = (field: keyof Anim, val: string | number) =>
    patch({ anim: { effect: "fade", ...node.anim, [field]: val } as Anim }, animKey)

  // Read a style value from the active target (class or element), respecting the breakpoint.
  const baseStyle = (k: string): string => (target ? doc.styles[target]?.base?.[k] ?? "" : node.style?.[k] ?? "")
  const styleVal = (k: string): string => {
    if (!activeBp) return baseStyle(k)
    return target
      ? doc.styles[target]?.context?.[activeBp]?.[k] ?? ""
      : node.responsive?.[activeBp]?.style?.[k] ?? ""
  }

  // Color control: native picker + text field + a row of theme-variable swatches.
  // Picking a swatch writes `var(--color-<token>)`, so the value tracks the theme.
  const colorControl = (key: string) => {
    const val = styleVal(key)
    return (
      <div className="ins-color">
        <div className="color-row">
          <input type="color" value={isHex(val) ? val : "#000000"} onChange={(e) => setStyle(key, e.target.value)} />
          <input
            value={val}
            placeholder={activeBp ? baseStyle(key) || "—" : "—"}
            onChange={(e) => setStyle(key, e.target.value)}
          />
        </div>
        {tokens.length > 0 && (
          <div className="token-swatches">
            {tokens.map(([name, v]) => (
              <button
                key={name}
                title={name}
                onClick={() => setStyle(key, val === tokenVar(name) ? "" : tokenVar(name))}
                style={{ background: v }}
                className={cn("token-swatch", val === tokenVar(name) && "is-active")}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const contentFields =
    info &&
    Object.entries(info.schema).map(([key, control]) => {
      const value = node.props[key]
      const label = control.label ?? key
      if (control.type === "media") {
        return (
          <div key={key} className="field">
            <span>{label}</span>
            <div className="media-field">
              <input value={value == null ? "" : String(value)} onChange={(e) => setProp(key, e.target.value)} />
              <button className="mini" onClick={() => setMediaKey(key)}>
                Choose
              </button>
            </div>
          </div>
        )
      }
      if (control.type === "richtext") {
        return (
          <div key={key} className="field">
            <span>{label}</span>
            <button className="mini wide" onClick={() => setRichKey(key)}>
              Edit rich text…
            </button>
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
        <label key={key} className="field">
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
      )
    })

  return (
    <div className="inspector">
      <div className="inspector-head">
        <div className="section-title" style={{ padding: 0 }}>
          {node.module}
        </div>
        <input
          className="ins-label"
          placeholder="layer name"
          value={node.label ?? ""}
          onChange={(e) => patch({ label: e.target.value || undefined }, `label:${node.id}`)}
        />
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="border-b border-border px-2 pt-1">
          <TabsTab value="settings">Settings</TabsTab>
          <TabsTab value="style">Style{activeBp ? ` · ${activeBp}` : ""}</TabsTab>
        </TabsList>

        <TabsPanel value="settings">
          {hasContent ? (
            <div className="pt-1">{contentFields}</div>
          ) : (
            <div className="muted small" style={{ padding: "12px" }}>
              This element has no settings — switch to Style to design it.
            </div>
          )}
        </TabsPanel>

        <TabsPanel value="style">
          <div className="section-title">Utility classes</div>
          <div style={{ padding: "0 12px 6px" }}>
            <input
              className="ins-label"
              style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
              placeholder="flex gap-4 p-6 rounded-xl bg-base-100"
              value={node.classes ?? ""}
              onChange={(e) => patch({ classes: e.target.value || undefined }, `classes:${node.id}`)}
            />
          </div>

          <div className="section-title style-head">
            Classes
            {activeBp && <span className="bp-tag">{activeBp}</span>}
          </div>
          <div className="px-3 pb-2">
            {node.styleIds.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {node.styleIds.map((sid) => {
                  const rule = doc.styles[sid]
                  if (!rule) return null
                  return (
                    <span
                      key={sid}
                      onClick={() => setActiveClassId(sid)}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium",
                        sid === target ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/70"
                      )}
                    >
                      {rule.name ?? sid}
                      <button
                        className="opacity-60 hover:opacity-100"
                        title="Remove class"
                        onClick={(e) => {
                          e.stopPropagation()
                          dropClass(sid)
                        }}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            <input
              className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
              placeholder={node.styleIds.length ? "add a class…" : "name a class to style…"}
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyClass(newClass)
              }}
            />
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              Editing{" "}
              {target ? (
                <b className="text-foreground">.{doc.styles[target]?.name ?? target}</b>
              ) : (
                <b className="text-foreground">this element</b>
              )}
            </div>
          </div>

          {GROUPS.map((g) => (
            <div key={g.title} className="field-group">
              <div className="group-title">{g.title}</div>
              {g.fields.map((f) => {
                const label = LABELS[f.key] ?? f.key
                if (f.kind === "select") {
                  return (
                    <div key={f.key} className="field">
                      <span>{label}</span>
                      <Select
                        value={styleVal(f.key)}
                        onValueChange={(v) => setStyle(f.key, v)}
                        options={(SELECTS[f.key] ?? [""]).map((o) => ({ value: o, label: o || "—" }))}
                      />
                    </div>
                  )
                }
                if (f.kind === "color") {
                  return (
                    <div key={f.key} className="field">
                      <span>{label}</span>
                      {colorControl(f.key)}
                    </div>
                  )
                }
                return (
                  <label key={f.key} className="field">
                    <span>{label}</span>
                    <input
                      value={styleVal(f.key)}
                      placeholder={activeBp ? baseStyle(f.key) || "—" : "—"}
                      onChange={(e) => setStyle(f.key, e.target.value)}
                    />
                  </label>
                )
              })}
            </div>
          ))}

          <div className="section-title">Animation</div>
          <div className="field">
            <span>effect</span>
            <Select value={node.anim?.effect ?? "none"} onValueChange={setEffect} options={ANIM_OPTIONS} />
          </div>
          {node.anim && (
            <>
              <div className="field">
                <span>trigger</span>
                <Select
                  value={node.anim.trigger ?? "load"}
                  onValueChange={(v) => setAnim("trigger", v)}
                  options={[
                    { value: "load", label: "On load" },
                    { value: "scroll", label: "On scroll" },
                  ]}
                />
              </div>
              <label className="field">
                <span>duration</span>
                <input type="number" value={node.anim.duration ?? 600} onChange={(e) => setAnim("duration", Number(e.target.value) || 600)} />
              </label>
              <label className="field">
                <span>delay</span>
                <input type="number" value={node.anim.delay ?? 0} onChange={(e) => setAnim("delay", Number(e.target.value) || 0)} />
              </label>
              <div className="field">
                <span />
                <Button variant="outline" size="sm" onClick={() => onPreview?.(node.id, node.anim!)}>
                  ▶ Play
                </Button>
              </div>
            </>
          )}
        </TabsPanel>
      </Tabs>

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
    </div>
  )
}
