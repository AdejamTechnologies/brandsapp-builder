import { useState } from "react"

import { Button } from "./ui/button"
import { Dialog, DialogFooter } from "./ui/dialog"
import { Input } from "./ui/input"

interface MediaDialogProps {
  value: string
  onPick: (url: string) => void
  onClose: () => void
}

/**
 * Pick an image by URL, with a live preview. (Upload-to-storage lands with the
 * tenant flow; for now this is URL + validation, which also covers CDN/marketplace
 * assets.)
 */
export function MediaDialog({ value, onPick, onClose }: MediaDialogProps) {
  const [url, setUrl] = useState(value)
  const [ok, setOk] = useState<boolean | null>(null)

  return (
    <Dialog open onClose={onClose} title="Choose image">
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
      <div className="mt-3 flex min-h-40 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg bg-canvas">
        {url ? (
          <img
            src={url}
            alt="preview"
            className="max-h-72 max-w-full object-contain"
            onLoad={() => setOk(true)}
            onError={() => setOk(false)}
          />
        ) : (
          <span className="text-xs text-subtle">No image</span>
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
