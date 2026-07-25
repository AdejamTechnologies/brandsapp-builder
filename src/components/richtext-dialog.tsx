import { useEffect, useRef, type ReactNode } from "react"

import { Button } from "./ui/button"
import { Dialog, DialogFooter } from "./ui/dialog"

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

  const btn = (label: ReactNode, title: string, run: () => void) => (
    <button
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-line bg-panel px-2 text-[13px] text-ink hover:border-accent"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        run()
      }}
    >
      {label}
    </button>
  )

  return (
    <Dialog open onClose={onClose} title="Edit rich text" className="max-w-3xl">
      <div className="mb-2.5 flex flex-wrap gap-1">
        {btn(<b>B</b>, "Bold", () => exec("bold"))}
        {btn(<i>I</i>, "Italic", () => exec("italic"))}
        {btn(<u>U</u>, "Underline", () => exec("underline"))}
        {btn("H2", "Heading", () => exec("formatBlock", "H2"))}
        {btn("¶", "Paragraph", () => exec("formatBlock", "P"))}
        {btn("• ⋯", "Bulleted list", () => exec("insertUnorderedList"))}
        {btn("1.", "Numbered list", () => exec("insertOrderedList"))}
        {btn("🔗", "Link", () => {
          const href = window.prompt("Link URL")
          if (href) exec("createLink", href)
        })}
        {btn("⌫", "Clear formatting", () => exec("removeFormat"))}
      </div>
      <div
        ref={ref}
        className="max-h-[50vh] min-h-64 overflow-auto rounded-lg border border-line px-3.5 py-3 text-[15px] leading-relaxed outline-none focus:border-accent"
        contentEditable
        suppressContentEditableWarning
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave(ref.current?.innerHTML ?? "")}>Save</Button>
      </DialogFooter>
    </Dialog>
  )
}
