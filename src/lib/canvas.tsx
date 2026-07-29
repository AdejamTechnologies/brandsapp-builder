import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from "react"

import {
  ANIMATION_KEYFRAMES,
  BUILDER_RUNTIME,
  generateUtilityCss,
  renderDocToReact,
  themeFontHref,
  type Doc,
} from "@brandsapp/builder-core"
import { resolveDrop, type DropIndicator, type DropTarget } from "./canvas-dnd"
import { describeNode } from "./describe-node"
import { flattenMediaForWidth } from "./media-flatten"
import { registry } from "./registry"
import { SelectionOverlay } from "./selection-overlay"

// Editor-only sample data so `loop` nodes (CMS collections + app feeds like
// products.featured) render a few realistic rows — bound props resolve to real
// sample images / prices / titles so the section previews as it will publish.
const SAMPLE_IMGS = [
  "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&h=600&fit=crop&q=80&auto=format",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=600&fit=crop&q=80&auto=format",
  "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=600&fit=crop&q=80&auto=format",
]
const sampleField = (prop: string, i: number): string => {
  const p = prop.toLowerCase()
  if (/image|photo|thumb|cover|avatar|src/.test(p)) return SAMPLE_IMGS[i % SAMPLE_IMGS.length]
  if (/price|amount|cost/.test(p)) return ["₦4,500", "₦9,000", "₦2,750"][i % 3]
  if (/title|name|heading/.test(p)) return ["Aurora Kit", "Studio Pro", "Pulse Bundle"][i % 3]
  if (/url|href|link|slug/.test(p)) return "#"
  if (/excerpt|desc|body|summary|subtitle/.test(p)) return "A short, punchy sample description for this item."
  if (/student|enroll|count|sold/.test(p)) return ["1,204", "860", "432"][i % 3]
  return `{${prop}}`
}
const sampleRows = [0, 1, 2].map(
  (i) => new Proxy({}, { get: (_t, prop) => (typeof prop === "string" ? sampleField(prop, i) : undefined) })
) as Array<Record<string, unknown>>
const EDITOR_LOOP_SOURCES = new Proxy({}, { get: () => () => sampleRows }) as Record<
  string,
  (config: Record<string, unknown>) => Array<Record<string, unknown>>
>

interface CanvasProps {
  doc: Doc
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Right-click on a node: the editor opens the element menu at this point. */
  onContextMenu?: (id: string | null, x: number, y: number) => void
  /** Control pinned to the selection ring (Quick Stack presets, etc.). */
  selectionBadge?: ReactNode
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
  /**
   * Run the real page runtime on the canvas and let events through, so dropdowns,
   * tabs, accordions and the mobile nav actually work. Authoring is suspended
   * while it is on — the two genuinely conflict, since selecting an element and
   * activating it are the same click.
   */
  interactive?: boolean
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
  onContextMenu,
  selectionBadge,
  onCommitText,
  onMoveNode,
  scrollRef,
  dropIndicator,
  width,
  previewBp,
  interactive = false,
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
        ...renderDocToReact(doc, {
          registry,
          // Interact mode renders exactly what publishes — editor-only affordances
          // (a pinned-open dropdown, a nav panel held visible) would otherwise lie
          // about the behaviour the visitor gets.
          isEditor: !interactive,
          previewBreakpoint: previewBp ?? undefined,
          loopSources: EDITOR_LOOP_SOURCES,
        }),
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
  }, [doc, previewBp, interactive])

  /**
   * Interact mode: run the same BUILDER_RUNTIME a published page gets, scoped to
   * the canvas.
   *
   * The runtime MUTATES the DOM React owns — it appends a tab bar, chevrons, the
   * hamburger's bars. React would later reconcile over those and either drop them
   * or throw, so the canvas is remounted under a key on every toggle, giving each
   * mode a DOM built from scratch. That is also why authoring is suspended here
   * rather than merged: there is no safe way to edit a tree a foreign script is
   * rewriting underneath you.
   */
  const pageRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!interactive || !pageRef.current) return
    const w = window as unknown as { __bappRuntime?: (scope: HTMLElement) => void }
    if (!w.__bappRuntime) {
      const s = document.createElement("script")
      s.id = "bapp-runtime-editor"
      s.textContent = BUILDER_RUNTIME
      document.head.appendChild(s)
    }
    // A frame later: the remount has to have committed before the runtime can find
    // anything to enhance.
    const id = requestAnimationFrame(() => {
      if (pageRef.current) w.__bappRuntime?.(pageRef.current)
    })
    return () => cancelAnimationFrame(id)
  }, [interactive, doc])

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

  // A device preview is a fixed WIDTH on a wrapper, not a real viewport change,
  // so the utility CSS's own media queries have to be resolved against that
  // width or `md:` rules apply inside a phone frame. See media-flatten.ts.
  const previewCss = useMemo(() => flattenMediaForWidth(utilCss, width), [utilCss, width])

  const nodeIdAt = (target: EventTarget | null): string | null => {
    const el = (target as HTMLElement | null)?.closest?.("[data-node-id]") as HTMLElement | null
    return el?.dataset.nodeId ?? null
  }

  const onClick = (e: MouseEvent) => {
    // Stop authored anchors/buttons from navigating/submitting inside the editor.
    // This still applies while interacting — a link that actually navigated would
    // take the whole editor with it — but selection does not.
    e.preventDefault()
    if (interactive || suppressClick.current || editingRef.current) return
    onSelect(nodeIdAt(e.target))
  }

  const onContext = (e: MouseEvent) => {
    if (interactive || !onContextMenu) return
    e.preventDefault()
    const id = nodeIdAt(e.target)
    // Select first: the menu's actions all read the current selection, and
    // right-clicking a different element should retarget them.
    if (id) onSelect(id)
    onContextMenu(id, e.clientX, e.clientY)
  }

  // Press a node and move to re-parent it; a press without movement is a click.
  const onPointerDown = (e: PointerEvent) => {
    if (interactive || e.button !== 0 || editingRef.current) return
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
    if (interactive) return
    const el = (e.target as HTMLElement).closest("[data-node-id]") as HTMLElement | null
    const id = el?.dataset.nodeId
    if (!el || !id) return
    const def = registry.get(doc.nodes[id]?.module ?? "")
    const edit = def?.inlineTextEdit
    if (!edit) return
    startInlineEdit(el, id, edit.prop, !!edit.html)
  }

  const startInlineEdit = (el: HTMLElement, id: string, prop: string, isHtml = false) => {
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
      const stored = String(doc.nodes[id]?.props[prop] ?? "")
      if (commit) {
        // A richtext prop holds markup: commit innerHTML, or every tag the author
        // wrote would be flattened to plain text on the first edit.
        onCommitText(id, prop, isHtml ? el.innerHTML : (el.textContent ?? ""))
      } else if (isHtml) {
        el.innerHTML = stored // Discard: restore from the (unchanged) doc.
      } else {
        el.textContent = stored
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
        onContextMenu={onContext}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        {/* Load the theme's webfonts so the canvas matches what publishes (WYSIWYG). */}
        {themeFontHref(doc.theme) && <link rel="stylesheet" href={themeFontHref(doc.theme)!} />}
        <style>{result.css}</style>
        {/* Scope utility CSS to the canvas so its .bg-primary/.text-primary (daisyUI
            vars, defined only on .bapp-root) can't bleed into and break the editor
            chrome, whose own Tailwind uses the same class names. */}
        <style>{previewCss ? `@scope (.bapp-root) { ${previewCss} }` : ""}</style>
        <style>{ANIMATION_KEYFRAMES}</style>
        {/* The key is what makes the two modes safe: the runtime rewrites this
            subtree, so each toggle gets a DOM built from scratch rather than React
            reconciling over a tree a foreign script has edited. */}
        <div
          key={interactive ? "interactive" : "editing"}
          ref={pageRef}
          className="canvas-page"
          style={width ? { width, margin: "0 auto" } : undefined}
        >
          {result.node}
        </div>
      </div>
      {/* No selection ring while interacting — there is no selection. */}
      {!interactive && <SelectionOverlay
        scrollRef={scrollRef}
        selectedId={selectedId}
        label={(() => {
          const n = doc.nodes[selectedId ?? ""]
          if (!n) return undefined
          // Type badge + name, where the name is the element's own CONTENT for
          // text-bearing elements — "Paragraph" on every paragraph tells you
          // nothing. An author-set label still wins (see describeNode).
          const { badge, name } = describeNode(n)
          return (
            <>
              {badge && <span className="sel-type">{badge}</span>}
              {name}
            </>
          )
        })()}
        badge={selectionBadge}
      />}
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
