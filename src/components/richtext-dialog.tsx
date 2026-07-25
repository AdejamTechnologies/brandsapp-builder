import { useEffect, useRef } from "react"

interface RichTextDialogProps {
  html: string
  onSave: (html: string) => void
  onClose: () => void
}

// document.execCommand is deprecated but remains the pragmatic way to drive a
// contentEditable region without pulling in a full rich-text framework. Output is
// re-sanitized by the renderer (richtext module → sanitizeHtml) on the way out.
const exec = (cmd: string, value?: string) => document.execCommand(cmd, false, value)

export function RichTextDialog({ html, onSave, onClose }: RichTextDialogProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html
    ref.current?.focus()
  }, [html])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="section-title">Edit rich text</div>
        <div className="rt-toolbar">
          <button className="rt-btn" title="Bold" onMouseDown={(e) => (e.preventDefault(), exec("bold"))}>
            <b>B</b>
          </button>
          <button className="rt-btn" title="Italic" onMouseDown={(e) => (e.preventDefault(), exec("italic"))}>
            <i>I</i>
          </button>
          <button className="rt-btn" title="Underline" onMouseDown={(e) => (e.preventDefault(), exec("underline"))}>
            <u>U</u>
          </button>
          <button className="rt-btn" title="Heading" onMouseDown={(e) => (e.preventDefault(), exec("formatBlock", "H2"))}>
            H2
          </button>
          <button className="rt-btn" title="Paragraph" onMouseDown={(e) => (e.preventDefault(), exec("formatBlock", "P"))}>
            ¶
          </button>
          <button className="rt-btn" title="Bulleted list" onMouseDown={(e) => (e.preventDefault(), exec("insertUnorderedList"))}>
            • ⋯
          </button>
          <button className="rt-btn" title="Numbered list" onMouseDown={(e) => (e.preventDefault(), exec("insertOrderedList"))}>
            1.
          </button>
          <button
            className="rt-btn"
            title="Link"
            onMouseDown={(e) => {
              e.preventDefault()
              const href = window.prompt("Link URL")
              if (href) exec("createLink", href)
            }}
          >
            🔗
          </button>
          <button className="rt-btn" title="Clear formatting" onMouseDown={(e) => (e.preventDefault(), exec("removeFormat"))}>
            ⌫
          </button>
        </div>
        <div ref={ref} className="rt-area" contentEditable suppressContentEditableWarning />
        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button onClick={() => onSave(ref.current?.innerHTML ?? "")}>Save</button>
        </div>
      </div>
    </div>
  )
}
