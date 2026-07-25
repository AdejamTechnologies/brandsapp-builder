import { useMemo, useRef, type MouseEvent, type RefObject } from "react"

import { renderDocToReact, type Doc } from "@brandsapp/builder-core"
import type { DropIndicator } from "./canvas-dnd"
import { registry } from "./registry"
import { SelectionOverlay } from "./selection-overlay"

interface CanvasProps {
  doc: Doc
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Commit inline-edited text back to the node's prop. */
  onCommitText: (nodeId: string, prop: string, value: string) => void
  /** Shared with the editor so palette drag can measure/insert into this canvas. */
  scrollRef: RefObject<HTMLDivElement | null>
  /** Insertion line shown while dragging a palette chip over the canvas. */
  dropIndicator?: DropIndicator | null
}

/**
 * The live editing canvas: renders the Doc as a real in-page React tree (NOT an
 * iframe) using the same engine that publishes, so what you see is what ships.
 * Every node carries `data-node-id` (editor mode), so a single delegated handler
 * maps a click to its node, and double-click makes text editable in place.
 */
export function Canvas({ doc, selectedId, onSelect, onCommitText, scrollRef, dropIndicator }: CanvasProps) {
  // nodeId currently in contentEditable — clicks are ignored while editing.
  const editingRef = useRef<string | null>(null)

  const result = useMemo(() => {
    try {
      return { ...renderDocToReact(doc, { registry, isEditor: true }), error: undefined as string | undefined }
    } catch (e) {
      return { node: null, css: "", missing: [] as string[], error: e instanceof Error ? e.message : String(e) }
    }
  }, [doc])

  const nodeIdAt = (target: EventTarget | null): string | null => {
    const el = (target as HTMLElement | null)?.closest?.("[data-node-id]") as HTMLElement | null
    return el?.dataset.nodeId ?? null
  }

  const onClick = (e: MouseEvent) => {
    // Stop authored anchors/buttons from navigating/submitting inside the editor.
    e.preventDefault()
    if (editingRef.current) return
    onSelect(nodeIdAt(e.target))
  }

  const onDoubleClick = (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-node-id]") as HTMLElement | null
    const id = el?.dataset.nodeId
    if (!el || !id) return
    const def = registry.get(doc.nodes[id]?.module ?? "")
    const edit = def?.inlineTextEdit
    if (!edit) return
    startInlineEdit(el, id, edit.prop)
  }

  const startInlineEdit = (el: HTMLElement, id: string, prop: string) => {
    editingRef.current = id
    el.setAttribute("contenteditable", "true")
    el.focus()
    // Select all existing text so typing replaces it.
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)

    const finish = (commit: boolean) => {
      el.removeEventListener("blur", onBlur)
      el.removeEventListener("keydown", onKey)
      el.removeAttribute("contenteditable")
      editingRef.current = null
      if (commit) {
        onCommitText(id, prop, el.textContent ?? "")
      } else {
        // Discard: restore the element's text from the (unchanged) doc.
        el.textContent = String(doc.nodes[id]?.props[prop] ?? "")
      }
    }
    const onBlur = () => finish(true)
    const onKey = (ev: KeyboardEvent) => {
      const multiline = registry.get(doc.nodes[id]?.module ?? "")?.inlineTextEdit?.multiline
      if (ev.key === "Enter" && (!multiline || !ev.shiftKey)) {
        ev.preventDefault()
        el.blur()
      } else if (ev.key === "Escape") {
        ev.preventDefault()
        finish(false)
      }
    }
    el.addEventListener("blur", onBlur)
    el.addEventListener("keydown", onKey)
  }

  return (
    <div className="canvas-wrap">
      <div className="canvas-scroll" ref={scrollRef} onClick={onClick} onDoubleClick={onDoubleClick}>
        <style>{result.css}</style>
        {result.node}
      </div>
      <SelectionOverlay scrollRef={scrollRef} selectedId={selectedId} label={doc.nodes[selectedId ?? ""]?.module} />
      {dropIndicator && (
        <div
          className="drop-indicator"
          style={{ transform: `translate(${dropIndicator.x}px, ${dropIndicator.y}px)`, width: dropIndicator.w }}
        />
      )}
      {result.error && <div className="canvas-error">render error: {result.error}</div>}
      {!result.error && result.missing.length > 0 && (
        <div className="canvas-missing">missing modules: {result.missing.join(", ")}</div>
      )}
    </div>
  )
}
