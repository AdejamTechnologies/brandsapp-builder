import { useState } from "react"

import { fragment as fragmentSchema, type Fragment } from "@brandsapp/builder-core"
import { TEMPLATES } from "../lib/templates"
import { Button } from "./ui/button"
import { Dialog, DialogFooter } from "./ui/dialog"
import { Textarea } from "./ui/textarea"

interface LibraryDialogProps {
  onInsert: (frag: Fragment) => void
  onClose: () => void
}

/** Add a pre-built section, or install a marketplace Fragment pasted as JSON. */
export function LibraryDialog({ onInsert, onClose }: LibraryDialogProps) {
  const [json, setJson] = useState("")
  const [err, setErr] = useState("")

  const install = () => {
    try {
      const frag = fragmentSchema.parse(JSON.parse(json))
      onInsert(frag)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid Fragment JSON")
    }
  }

  const categories = [...new Set(TEMPLATES.map((t) => t.category))]

  return (
    <Dialog open onClose={onClose} title="Add a section" className="max-w-2xl">
      <div className="max-h-[55vh] overflow-y-auto pr-1">
        {categories.map((cat) => (
          <div key={cat} className="mb-4">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{cat}</div>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.filter((t) => t.category === cat).map((t) => (
                <button
                  key={t.name}
                  className="rounded-lg border border-border bg-background p-3.5 text-left text-sm font-medium text-foreground transition-colors hover:border-ring hover:bg-muted/50"
                  onClick={() => {
                    onInsert(t.make())
                    onClose()
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Install a Fragment
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        Paste Fragment JSON (from the editor’s Export, or a marketplace listing).
      </p>
      <Textarea
        className="h-36 font-mono text-[11px]"
        placeholder='{"version":1,"rootId":"…","nodes":{…},"styles":{…},"manifest":{…}}'
        value={json}
        onChange={(e) => {
          setJson(e.target.value)
          setErr("")
        }}
      />
      {err && <div className="mt-1 text-xs text-red-600">{err}</div>}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={install} disabled={!json.trim()}>
          Install
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
