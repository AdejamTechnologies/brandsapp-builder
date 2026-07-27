import { useRef, useState } from "react"
import { useSearch } from "@tanstack/react-router"

import { Button } from "./ui/button"
import { Dialog, DialogFooter } from "./ui/dialog"
import { Input } from "./ui/input"

interface MediaDialogProps {
  value: string
  onPick: (url: string) => void
  onClose: () => void
}

/**
 * Pick an image by URL or upload one. Upload streams the file to the tenant
 * (/api/upload → tenant B2, server-side) and returns an absolute media URL, so it
 * works both on the canvas and when published. URL entry still covers CDN /
 * marketplace assets.
 */
export function MediaDialog({ value, onPick, onClose }: MediaDialogProps) {
  const search = useSearch({ strict: false }) as { tenant?: string }
  const tenant = search.tenant ?? ""
  const [url, setUrl] = useState(value)
  const [ok, setOk] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const fileRef = useRef<HTMLInputElement | null>(null)

  const upload = async (file: File) => {
    if (!tenant) return setErr("Add ?tenant=<url> to the editor to upload.")
    setBusy(true)
    setErr("")
    try {
      const res = await fetch(`/api/upload?name=${encodeURIComponent(file.name)}&tenant=${encodeURIComponent(tenant)}`, {
        method: "POST",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      })
      const d = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (res.ok && d?.url) {
        setUrl(d.url)
        setOk(null)
      } else {
        setErr(d?.error ?? `Upload failed (${res.status})`)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title="Choose image">
      <div className="flex gap-2">
        <Input
          className="h-9 text-sm"
          autoFocus
          placeholder="https://…/image.jpg"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setOk(null)
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) upload(f)
            e.target.value = ""
          }}
        />
        <Button variant="outline" className="shrink-0" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Uploading…" : "Upload"}
        </Button>
      </div>
      {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
      <div className="mt-3 flex min-h-40 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg bg-muted">
        {url ? (
          <img
            src={url}
            alt="preview"
            className="max-h-72 max-w-full object-contain"
            onLoad={() => setOk(true)}
            onError={() => setOk(false)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">No image</span>
        )}
        {ok === false && <span className="text-xs text-red-600">Couldn’t load that URL</span>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {value && (
          <Button
            variant="ghost"
            onClick={() => {
              onPick("")
              onClose()
            }}
          >
            Clear
          </Button>
        )}
        <Button
          onClick={() => {
            onPick(url.trim())
            onClose()
          }}
        >
          Use image
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
