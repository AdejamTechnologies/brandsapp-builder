import { useState } from "react"

import type { Doc, Node } from "@brandsapp/builder-core"
import { updateProps, updateResponsiveStyle } from "../lib/doc-ops"
import { moduleInfo } from "../lib/registry"
import { MediaDialog } from "./media-dialog"
import { RichTextDialog } from "./richtext-dialog"
import { Button } from "./ui/button"
import { Select } from "./ui/select"
import { Switch } from "./ui/switch"

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
  alignItems: ["", "flex-start", "center", "flex-end", "stretch", "baseline"],
  justifyContent: ["", "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"],
  textAlign: ["", "left", "center", "right", "justify"],
  fontWeight: ["", "300", "400", "500", "600", "700", "800"],
}

const GROUPS: { title: string; fields: { key: string; kind: "text" | "select" | "color" }[] }[] = [
  {
    title: "Layout",
    fields: [
      { key: "display", kind: "select" },
      { key: "flexDirection", kind: "select" },
      { key: "gap", kind: "text" },
      { key: "alignItems", kind: "select" },
      { key: "justifyContent", kind: "select" },
    ],
  },
  { title: "Spacing", fields: [{ key: "padding", kind: "text" }, { key: "margin", kind: "text" }] },
  {
    title: "Size",
    fields: [{ key: "width", kind: "text" }, { key: "maxWidth", kind: "text" }, { key: "height", kind: "text" }],
  },
  {
    title: "Typography",
    fields: [
      { key: "color", kind: "color" },
      { key: "fontSize", kind: "text" },
      { key: "fontWeight", kind: "select" },
      { key: "textAlign", kind: "select" },
      { key: "lineHeight", kind: "text" },
    ],
  },
  {
    title: "Background & border",
    fields: [
      { key: "background", kind: "color" },
      { key: "borderRadius", kind: "text" },
      { key: "border", kind: "text" },
    ],
  },
]

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)

export function Inspector({ doc, node, onChange, activeBp, onPreview }: InspectorProps) {
  const [mediaKey, setMediaKey] = useState<string | null>(null)
  const [richKey, setRichKey] = useState<string | null>(null)

  if (!node) return <div className="inspector muted small">Select a layer to edit it.</div>

  const info = moduleInfo(node.module)
  const setProp = (key: string, value: unknown) =>
    onChange(updateProps(doc, node.id, { [key]: value }), `prop:${node.id}:${key}`)
  const setStyle = (key: string, value: string) =>
    onChange(updateResponsiveStyle(doc, node.id, activeBp, { [key]: value }), `style:${node.id}:${activeBp ?? "base"}:${key}`)
  const patch = (p: Partial<Node>, key?: string) =>
    onChange({ ...doc, nodes: { ...doc.nodes, [node.id]: { ...node, ...p } } }, key)
  const animKey = `anim:${node.id}`
  const setEffect = (e: string) =>
    patch({ anim: e === "none" ? undefined : { trigger: "load", duration: 600, delay: 0, ...node.anim, effect: e } }, animKey)
  const setAnim = (field: keyof Anim, val: string | number) =>
    patch({ anim: { effect: "fade", ...node.anim, [field]: val } as Anim }, animKey)

  // Style value for the active layer; when on a breakpoint show the base as placeholder.
  const baseStyle = (k: string) => node.style?.[k] ?? ""
  const styleVal = (k: string) => (activeBp ? node.responsive?.[activeBp]?.style?.[k] ?? "" : baseStyle(k))

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

      <div className="section-title">Utility classes</div>
      <div style={{ padding: "0 12px 6px" }}>
        <input
          className="ins-label"
          style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
          placeholder="flex gap-4 p-6 rounded-xl bg-white"
          value={node.classes ?? ""}
          onChange={(e) => patch({ classes: e.target.value || undefined }, `classes:${node.id}`)}
        />
      </div>

      {info && Object.keys(info.schema).length > 0 && <div className="section-title">Content</div>}
      {info &&
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
        })}

      <div className="section-title style-head">
        Style
        {activeBp && <span className="bp-tag">{activeBp}</span>}
      </div>
      {GROUPS.map((g) => (
        <div key={g.title} className="field-group">
          <div className="group-title">{g.title}</div>
          {g.fields.map((f) =>
            f.kind === "select" ? (
              <div key={f.key} className="field">
                <span>{f.key}</span>
                <Select
                  value={styleVal(f.key)}
                  onValueChange={(v) => setStyle(f.key, v)}
                  options={(SELECTS[f.key] ?? [""]).map((o) => ({ value: o, label: o || "—" }))}
                />
              </div>
            ) : (
              <label key={f.key} className="field">
                <span>{f.key}</span>
                {f.kind === "color" ? (
                <div className="color-row">
                  <input
                    type="color"
                    value={isHex(styleVal(f.key)) ? styleVal(f.key) : "#000000"}
                    onChange={(e) => setStyle(f.key, e.target.value)}
                  />
                  <input
                    value={styleVal(f.key)}
                    placeholder={activeBp ? baseStyle(f.key) || "—" : "—"}
                    onChange={(e) => setStyle(f.key, e.target.value)}
                  />
                </div>
              ) : (
                <input
                  value={styleVal(f.key)}
                  placeholder={activeBp ? baseStyle(f.key) || "—" : "—"}
                  onChange={(e) => setStyle(f.key, e.target.value)}
                />
              )}
            </label>
          ))}
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
