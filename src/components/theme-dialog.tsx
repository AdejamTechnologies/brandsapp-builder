import { useState, type ReactNode } from "react"

import type { ThemeTokens } from "@brandsapp/builder-core"
import { Button } from "./ui/button"
import { Dialog } from "./ui/dialog"
import { Input } from "./ui/input"

interface ThemeDialogProps {
  theme: ThemeTokens
  onChange: (patch: Partial<ThemeTokens>, coalesceKey?: string) => void
  onClose: () => void
}

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)

const GroupTitle = ({ children }: { children: string }) => (
  <div className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
    {children}
  </div>
)
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mb-1.5 flex items-center gap-3">
    <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
    <div className="flex flex-1 items-center gap-2">{children}</div>
  </div>
)

/** Edit the doc theme — colors, fonts, radii. Changes apply live to the canvas. */
export function ThemeDialog({ theme, onChange, onClose }: ThemeDialogProps) {
  const [newColorKey, setNewColorKey] = useState("")
  const colors = theme.colors ?? {}
  const radius = theme.radius ?? {}

  const setColor = (k: string, v: string) => onChange({ colors: { ...colors, [k]: v } }, `theme:color:${k}`)
  // Reserved token keys — surfaced in their own groups, hidden from the freeform Colors list.
  const RESERVED = ["primary", "secondary", "accent", "neutral", "base-100", "base-200", "base-300", "base-content"]
  const removeColor = (k: string) => {
    const next = { ...colors }
    delete next[k]
    onChange({ colors: next })
  }
  const setRadius = (k: string, v: string) => onChange({ radius: { ...radius, [k]: v } }, `theme:radius:${k}`)
  const setFont = (which: "display" | "body", v: string) =>
    onChange({ fonts: { ...theme.fonts, [which]: v || undefined } }, `theme:font:${which}`)

  const swatch = (k: string, v: string) => (
    <>
      <input
        type="color"
        value={isHex(v) ? v : "#000000"}
        onChange={(e) => setColor(k, e.target.value)}
        className="size-7 shrink-0 cursor-pointer rounded-md border border-border p-0"
      />
      <Input value={v} onChange={(e) => setColor(k, e.target.value)} />
    </>
  )

  return (
    <Dialog open onClose={onClose} title="Variables">
      <GroupTitle>Brand</GroupTitle>
      <p className="mb-2 -mt-1 text-[11px] text-muted-foreground">Drives daisyUI components (buttons, cards, badges…) across the page.</p>
      {(["primary", "secondary", "accent", "neutral"] as const).map((key) => (
        <Row key={key} label={key}>
          {swatch(key, colors[key] ?? "")}
        </Row>
      ))}

      <GroupTitle>Surface</GroupTitle>
      <p className="mb-2 -mt-1 text-[11px] text-muted-foreground">Page background, surfaces, borders and text — the neutral palette everything sits on.</p>
      {([
        ["base-100", "background"],
        ["base-200", "surface"],
        ["base-300", "border"],
        ["base-content", "text"],
      ] as const).map(([key, label]) => (
        <Row key={key} label={label}>
          {swatch(key, colors[key] ?? "")}
        </Row>
      ))}

      <GroupTitle>Colors</GroupTitle>
      {Object.entries(colors)
        .filter(([k]) => !RESERVED.includes(k))
        .map(([k, v]) => (
        <Row key={k} label={k}>
          {swatch(k, v)}
          <button className="shrink-0 px-1 text-muted-foreground hover:text-red-600" onClick={() => removeColor(k)} title="Remove">
            ×
          </button>
        </Row>
      ))}
      <Row label="add">
        <Input placeholder="name (e.g. accent)" value={newColorKey} onChange={(e) => setNewColorKey(e.target.value)} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const k = newColorKey.trim()
            if (k) {
              setColor(k, "#4f46e5")
              setNewColorKey("")
            }
          }}
        >
          Add
        </Button>
      </Row>

      <GroupTitle>Fonts</GroupTitle>
      <Row label="display">
        <Input value={theme.fonts?.display ?? ""} placeholder="Georgia, serif" onChange={(e) => setFont("display", e.target.value)} />
      </Row>
      <Row label="body">
        <Input value={theme.fonts?.body ?? ""} placeholder="Inter, sans-serif" onChange={(e) => setFont("body", e.target.value)} />
      </Row>

      <GroupTitle>Radius</GroupTitle>
      {Object.entries(radius).map(([k, v]) => (
        <Row key={k} label={k}>
          <Input value={v} onChange={(e) => setRadius(k, e.target.value)} />
        </Row>
      ))}
      {Object.keys(radius).length === 0 && (
        <Row label="base">
          <Input placeholder="e.g. 10px" onChange={(e) => setRadius("base", e.target.value)} />
        </Row>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Dialog>
  )
}
