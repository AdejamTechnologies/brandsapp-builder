import { useState } from "react"

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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="section-title">Choose image</div>
        <input
          className="media-url"
          autoFocus
          placeholder="https://…/image.jpg"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setOk(null)
          }}
        />
        <div className="media-preview">
          {url ? (
            <img
              src={url}
              alt="preview"
              onLoad={() => setOk(true)}
              onError={() => setOk(false)}
            />
          ) : (
            <span className="muted small">No image</span>
          )}
          {ok === false && <span className="media-warn">Couldn’t load that URL</span>}
        </div>
        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
          {value && (
            <button
              className="ghost"
              onClick={() => {
                onPick("")
                onClose()
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={() => {
              onPick(url.trim())
              onClose()
            }}
          >
            Use image
          </button>
        </div>
      </div>
    </div>
  )
}
