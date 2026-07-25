import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from "react"

import { ANIMATION_KEYFRAMES, generateUtilityCss, renderDocToReact, type Doc } from "@brandsapp/builder-core"
import { resolveDrop, type DropIndicator, type DropTarget } from "./canvas-dnd"
import { registry } from "./registry"
import { SelectionOverlay } from "./selection-overlay"

interface CanvasProps {
  doc: Doc
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Commit inline-edited text back to the node's prop. */
  onCommitText: (nodeId: string, prop: string, value: string) => void
  /** Re-parent an existing node (canvas drag-to-reorder). */
  onMoveNode: (id: string, parentId: string, index: number) => void
  /** Shared with the editor so palette drag can measure/insert into this canvas. */
  scrollRef: RefObject<HTMLDivElement | null>
  /** Insertion bar shown while dragging a palette chip over the canvas. */
  dropIndicator?: DropIndicator | null
  /** Fixed page width in px (breakpoint preview); undefined = fill. */
  width?: number
  /** Breakpoint id whose overrides to flatten into the preview; null = base. */
  previewBp?: string | null
}

/**
 * The live editing canvas: renders the Doc as a real in-page React tree (NOT an
 * iframe) using the same engine that publishes, so what you see is what ships.
 * Every node carries `data-node-id` (editor mode): one delegated handler maps a
 * click to its node, double-click makes text editable in place, and press-drag
 * re-parents a node.
 */
export function Canvas({
  doc,
  selectedId,
  onSelect,
  onCommitText,
  onMoveNode,
  scrollRef,
  dropIndicator,
  width,
  previewBp,
}: CanvasProps) {
  // nodeId currently in contentEditable — clicks are ignored while editing.
  const editingRef = useRef<string | null>(null)
  // suppress the click that follows a drag gesture so it doesn't reselect
  const suppressClick = useRef(false)
  const dragTarget = useRef<DropTarget | null>(null)
  const [nodeIndicator, setNodeIndicator] = useState<DropIndicator | null>(null)

  const result = useMemo(() => {
    try {
      return {
        ...renderDocToReact(doc, { registry, isEditor: true, previewBreakpoint: previewBp ?? undefined }),
        error: undefined as string | undefined,
      }
    } catch (e) {
      return {
        node: null,
        css: "",
        missing: [] as string[],
        classes: [] as string[],
        error: e instanceof Error ? e.message : String(e),
      }
    }
  }, [doc, previewBp])

  // Utility classes → atomic CSS (UnoCSS). Async; regenerate only when the class set
  // actually changes, and inject alongside the engine's own CSS.
  const [utilCss, setUtilCss] = useState("")
  const classKey = result.classes.join(" ")
  useEffect(() => {
    let cancelled = false
    generateUtilityCss(classKey ? [classKey] : []).then((css) => {
      if (!cancelled) setUtilCss(css)
    })
    return () => {
      cancelled = true
    }
  }, [classKey])

  const nodeIdAt = (target: EventTarget | null): string | null => {
    const el = (target as HTMLElement | null)?.closest?.("[data-node-id]") as HTMLElement | null
    return el?.dataset.nodeId ?? null
  }

  const onClick = (e: MouseEvent) => {
    // Stop authored anchors/buttons from navigating/submitting inside the editor.
    e.preventDefault()
    if (suppressClick.current || editingRef.current) return
    onSelect(nodeIdAt(e.target))
  }

  // Press a node and move to re-parent it; a press without movement is a click.
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || editingRef.current) return
    const el = (e.target as HTMLElement).closest("[data-node-id]") as HTMLElement | null
    const id = el?.dataset.nodeId
    if (!id || id === doc.rootId) return
    const start = { x: e.clientX, y: e.clientY }
    let active = false
    const move = (ev: globalThis.PointerEvent) => {
      if (!active) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return
        active = true
        suppressClick.current = true
        document.body.style.cursor = "grabbing"
        document.body.style.userSelect = "none"
      }
      const t = resolveDrop(scrollRef.current, ev.clientX, ev.clientY, doc, doc.nodes[id].module, id)
      dragTarget.current = t
      setNodeIndicator(t?.indicator ?? null)
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      if (active) {
        const t = dragTarget.current
        if (t) onMoveNode(id, t.parentId, t.index)
        // release the click suppressor after the trailing click has fired
        setTimeout(() => (suppressClick.current = false), 0)
      }
      dragTarget.current = null
      setNodeIndicator(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
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

  const indicator = dropIndicator ?? nodeIndicator

  return (
    <div className="canvas-wrap">
      <div
        className="canvas-scroll"
        ref={scrollRef}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        <style>{result.css}</style>
        <style>{utilCss}</style>
        <style>{ANIMATION_KEYFRAMES}</style>
        <div className="canvas-page" style={width ? { width, margin: "0 auto" } : undefined}>
          {result.node}
        </div>
      </div>
      <SelectionOverlay scrollRef={scrollRef} selectedId={selectedId} label={doc.nodes[selectedId ?? ""]?.module} />
      {indicator && (
        <div
          className="drop-indicator"
          style={{
            transform: `translate(${indicator.x}px, ${indicator.y}px)`,
            width: indicator.w,
            height: indicator.h,
          }}
        />
      )}
      {result.error && <div className="canvas-error">render error: {result.error}</div>}
      {!result.error && result.missing.length > 0 && (
        <div className="canvas-missing">missing modules: {result.missing.join(", ")}</div>
      )}
    </div>
  )
}
