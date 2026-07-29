import { useMemo, useState } from "react"
import { ICONS, ICON_CATEGORIES, iconMatches, type IconDef } from "@brandsapp/builder-core"

import { cn } from "../lib/utils"

/**
 * Pick an icon for any `svg` control.
 *
 * Before this the control was a single-line text input, so setting an icon meant
 * pasting raw SVG markup into a one-line box — which is why nothing on the canvas
 * had a decent glyph. The set is the same Remix Icon family the admin app uses, so
 * a page an author builds here looks like the product it belongs to.
 *
 * The value stored on the node is the SVG MARKUP, not an icon id. That keeps the
 * published page self-contained — a tenant's HTML never has to resolve an id
 * against a catalog it doesn't ship — and it is what makes the custom-paste path
 * below just another value rather than a special case.
 */
export function IconDialog({
  value,
  onPick,
  onClose,
}: {
  value: string
  onPick: (svg: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [custom, setCustom] = useState(false)
  const [customSvg, setCustomSvg] = useState(value.trim().startsWith("<svg") ? value : "")

  const shown = useMemo(() => {
    const q = query.trim()
    return ICONS.filter((i) => (!category || i.category === category) && iconMatches(i, q))
  }, [query, category])

  // Compare on markup because that is what the node stores.
  const isCurrent = (i: IconDef) => i.svg === value

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Choose an icon</span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            Close
          </button>
        </div>

        <div className="flex gap-2 border-b border-border px-4 py-2.5">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons…"
            className="h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-xs outline-none focus:border-ring"
          />
          <button
            type="button"
            onClick={() => setCustom((c) => !c)}
            className={cn(
              "cursor-pointer rounded-md border px-2.5 text-xs transition-colors",
              custom ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            Custom SVG
          </button>
        </div>

        {custom ? (
          <div className="flex flex-col gap-2 p-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Paste any SVG. Give it <code className="text-foreground">width=&quot;100%&quot;</code> and{" "}
              <code className="text-foreground">height=&quot;100%&quot;</code> so it fills the box your classes set, and{" "}
              <code className="text-foreground">fill=&quot;currentColor&quot;</code> so it follows the text colour.
            </p>
            <textarea
              rows={7}
              value={customSvg}
              onChange={(e) => setCustomSvg(e.target.value)}
              placeholder="<svg viewBox='0 0 24 24' …>"
              className="w-full resize-y rounded-md border border-border bg-background p-2 font-mono text-[11px] outline-none focus:border-ring"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustom(false)}
                className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted"
              >
                Back to library
              </button>
              <button
                type="button"
                disabled={!customSvg.trim().startsWith("<svg")}
                onClick={() => {
                  onPick(customSvg.trim())
                  onClose()
                }}
                className="cursor-pointer rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Use this SVG
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2">
              <CategoryChip label="All" active={category === null} onClick={() => setCategory(null)} />
              {ICON_CATEGORIES.map((c) => (
                <CategoryChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {shown.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  Nothing matches “{query}”. Try a different word, or paste your own SVG.
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5">
                  {shown.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      title={`${i.label} · ${i.category}`}
                      onClick={() => {
                        onPick(i.svg)
                        onClose()
                      }}
                      className={cn(
                        "flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 transition-colors",
                        isCurrent(i) ? "border-primary bg-primary/5" : "border-transparent hover:border-border hover:bg-muted"
                      )}
                    >
                      <span
                        aria-hidden
                        className="size-5 text-foreground"
                        dangerouslySetInnerHTML={{ __html: i.svg }}
                      />
                      <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">
                        {i.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border px-4 py-2 text-[10.5px] text-muted-foreground">
              {shown.length} of {ICONS.length} icons
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
        active ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  )
}
