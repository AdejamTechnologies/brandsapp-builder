import { useRef, useState } from "react"
import { ChevronDown, Frame, LayoutGrid, Maximize2, Move, PaintBucket, Sparkles, Square, Type, Wand2 } from "lucide-react"

import { type Doc, type Node } from "@brandsapp/builder-core"
import { addClassToNode, createClass, removeClassFromNode, updateClassStyle, updateResponsiveStyle } from "../lib/doc-ops"
import { MotionFields } from "./motion-fields"
import { SettingsFields } from "./settings-fields"
import { Button } from "./ui/button"
import { Select } from "./ui/select"
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
  position: ["", "static", "relative", "absolute", "fixed", "sticky"],
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
  minHeight: "min height",
  maxHeight: "max height",
  zIndex: "z-index",
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
type Field = { key: string; kind: FieldKind }
type IconType = typeof LayoutGrid
// Style categories, switched from the right-edge rail (Webflow/Instatic pattern):
// one compact, contextual section at a time instead of one long scroll.
const SECTIONS: { id: string; label: string; icon: IconType; fields: Field[] }[] = [
  {
    id: "layout",
    label: "Layout",
    icon: LayoutGrid,
    fields: [
      { key: "display", kind: "select" },
      { key: "flexDirection", kind: "select" },
      { key: "flexWrap", kind: "select" },
      { key: "gap", kind: "text" },
      { key: "alignItems", kind: "select" },
      { key: "justifyContent", kind: "select" },
    ],
  },
  {
    id: "position",
    label: "Position",
    icon: Move,
    fields: [
      { key: "position", kind: "select" },
      { key: "top", kind: "text" },
      { key: "right", kind: "text" },
      { key: "bottom", kind: "text" },
      { key: "left", kind: "text" },
      { key: "zIndex", kind: "text" },
    ],
  },
  {
    id: "size",
    label: "Size",
    icon: Maximize2,
    fields: [
      { key: "width", kind: "text" },
      { key: "height", kind: "text" },
      { key: "minWidth", kind: "text" },
      { key: "maxWidth", kind: "text" },
      { key: "minHeight", kind: "text" },
      { key: "maxHeight", kind: "text" },
    ],
  },
  { id: "spacing", label: "Spacing", icon: Frame, fields: [{ key: "padding", kind: "text" }, { key: "margin", kind: "text" }] },
  {
    id: "typography",
    label: "Typography",
    icon: Type,
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
  { id: "background", label: "Background", icon: PaintBucket, fields: [{ key: "background", kind: "color" }] },
  {
    id: "border",
    label: "Border",
    icon: Square,
    fields: [
      { key: "border", kind: "text" },
      { key: "borderColor", kind: "color" },
      { key: "borderRadius", kind: "text" },
      { key: "boxShadow", kind: "text" },
    ],
  },
  { id: "effects", label: "Effects", icon: Sparkles, fields: [{ key: "opacity", kind: "text" }] },
  { id: "animation", label: "Animation", icon: Wand2, fields: [] },
]

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)
const tokenVar = (name: string) => `var(--color-${name})`

export function Inspector({ doc, node, onChange, activeBp, onPreview }: InspectorProps) {
  const [newClass, setNewClass] = useState("")
  const [activeClassId, setActiveClassId] = useState<string | null>(null)
  // Stacked, collapsible sections + a scroll-spy rail (Instatic pattern).
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [activeSection, setActiveSection] = useState("layout")
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  if (!node) return <div className="inspector muted small">Select a layer to edit it.</div>

  const tokens = Object.entries(doc.theme.colors ?? {}) // [name, value] — the variables
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

  const styleField = (f: Field) => {
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
  }

  const toggleSection = (id: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const goToSection = (id: string) => {
    setCollapsed((prev) => {
      const n = new Set(prev)
      n.delete(id)
      return n
    })
    setActiveSection(id)
    requestAnimationFrame(() => {
      const el = sectionRefs.current[id]
      const root = scrollRef.current
      if (el && root) root.scrollTo({ top: el.offsetTop - 2, behavior: "smooth" })
    })
  }
  const onSpyScroll = () => {
    const root = scrollRef.current
    if (!root) return
    const top = root.scrollTop
    let cur = SECTIONS[0].id
    for (const s of SECTIONS) {
      const el = sectionRefs.current[s.id]
      if (el && el.offsetTop - top <= 16) cur = s.id
    }
    setActiveSection(cur)
  }

  // Box-model widget for Spacing — nested margin/padding with per-side inputs.
  const bmInput = (key: string, cls: string) => (
    <input className={cn("bm-in", cls)} value={styleVal(key)} placeholder="—" onChange={(e) => setStyle(key, e.target.value)} />
  )
  const spacingBox = () => (
    <div className="box-model">
      <span className="bm-tag bm-tag-m">margin</span>
      {bmInput("marginTop", "bm-mt")}
      {bmInput("marginRight", "bm-mr")}
      {bmInput("marginBottom", "bm-mb")}
      {bmInput("marginLeft", "bm-ml")}
      <div className="bm-inner">
        <span className="bm-tag bm-tag-p">padding</span>
        {bmInput("paddingTop", "bm-pt")}
        {bmInput("paddingRight", "bm-pr")}
        {bmInput("paddingBottom", "bm-pb")}
        {bmInput("paddingLeft", "bm-pl")}
        <div className="bm-center" />
      </div>
    </div>
  )

  const animControls = (
    <>
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
    </>
  )

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

      <Tabs defaultValue="style">
        <TabsList className="border-b border-border px-2 pt-1">
          <TabsTab value="style">Styles{activeBp ? ` · ${activeBp}` : ""}</TabsTab>
          <TabsTab value="settings">Settings</TabsTab>
        </TabsList>

        <TabsPanel value="settings">
          <SettingsFields doc={doc} node={node} onChange={onChange} />
          {/* Scroll-linked motion lives here rather than under Styles: it is a
              behaviour of the element, not a rule in the cascade. */}
          <MotionFields node={node} onChange={patch} />
        </TabsPanel>

        <TabsPanel value="style">
          {/* Selector-first: style a class (reused everywhere) or this element. */}
          <div className="selector-head">
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
              placeholder={node.styleIds.length ? "add or create a selector…" : "add or create a selector…"}
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

          {/* Stacked, collapsible sections + a scroll-spy category rail. */}
          <div className="style-body">
            <div className="style-scroll" ref={scrollRef} onScroll={onSpyScroll}>
              {SECTIONS.map((s) => {
                const open = !collapsed.has(s.id)
                return (
                  <div
                    key={s.id}
                    data-section={s.id}
                    ref={(el) => {
                      sectionRefs.current[s.id] = el
                    }}
                    className="style-section"
                  >
                    <button className="sec-head" onClick={() => toggleSection(s.id)}>
                      <span>{s.label}</span>
                      <ChevronDown className={cn("size-3 transition-transform", !open && "-rotate-90")} />
                    </button>
                    {open && (
                      <div className="style-section-body">
                        {s.id === "spacing" ? spacingBox() : s.id === "animation" ? animControls : s.fields.map(styleField)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="style-rail" role="tablist" aria-label="Style categories">
              {SECTIONS.map((s) => {
                const Icon = s.icon
                return (
                  <button
                    key={s.id}
                    className={cn("style-rail-btn", s.id === activeSection && "active")}
                    title={s.label}
                    aria-label={s.label}
                    aria-selected={s.id === activeSection}
                    onClick={() => goToSection(s.id)}
                  >
                    <Icon size={15} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="section-title">Utility classes</div>
          <div style={{ padding: "0 12px 10px" }}>
            <input
              className="ins-label"
              style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
              placeholder="flex gap-4 p-6 rounded-xl bg-base-100"
              value={node.classes ?? ""}
              onChange={(e) => patch({ classes: e.target.value || undefined }, `classes:${node.id}`)}
            />
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  )
}
