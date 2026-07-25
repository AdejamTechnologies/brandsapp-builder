import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useSearch } from "@tanstack/react-router"
import {
  Code2,
  Download,
  FileInput,
  Monitor,
  Palette as PaletteIcon,
  Plus,
  Redo2,
  Save,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react"

import { Button, type ButtonProps } from "../components/ui/button"
import { Dialog, DialogFooter } from "../components/ui/dialog"
import { Textarea } from "../components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip"
import { cn } from "../lib/utils"

import {
  extractFragment,
  htmlToDoc,
  parseDoc,
  type Doc,
  type Fragment,
  type Node,
} from "@brandsapp/builder-core"
import { Inspector } from "../components/inspector"
import { LibraryDialog } from "../components/library-dialog"
import { ThemeDialog } from "../components/theme-dialog"
import { copyNode, duplicateNode, pasteFragment } from "../lib/actions"
import { Canvas } from "../lib/canvas"
import { resolveDrop, type DropIndicator, type DropTarget } from "../lib/canvas-dnd"
import { insertChild, insertChildAt, moveChild, moveNode, removeNode, updateProps, updateTheme } from "../lib/doc-ops"
import { useHistory } from "../lib/history"
import { useDocRoom } from "../lib/realtime"
import { moduleInfo, moduleList, type ModuleInfo } from "../lib/registry"
import { SAMPLE_DOC } from "../lib/sample"

// Breakpoint id `null` = the base (desktop) layer; the others match responsive
// override keys and set the canvas preview width.
const BREAKPOINTS: { id: string | null; label: string; width?: number }[] = [
  { id: null, label: "Desktop" },
  { id: "tablet", label: "Tablet", width: 834 },
  { id: "mobile", label: "Mobile", width: 390 },
]

/** A ghost icon button with a Base UI tooltip. */
function IconButton({ tip, children, ...props }: ButtonProps & { tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="iconSm" {...props} />}>{children}</TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}

export function EditorPage() {
  const { pageId } = useParams({ from: "/edit/$pageId" })
  const search = useSearch({ strict: false }) as { tenant?: string }
  const tenant = search.tenant ?? ""

  const [initialDoc] = useState(() => parseDoc(SAMPLE_DOC))
  const sendRef = useRef<(s: string) => void>(() => {})
  const commit = useCallback((d: Doc) => sendRef.current(JSON.stringify(d)), [])
  const { doc, apply, undo, redo, canUndo, canRedo, reset } = useHistory(initialDoc, commit)
  const [selectedId, setSelectedId] = useState<string | null>(initialDoc.rootId)
  const [showCode, setShowCode] = useState(false)
  const [activeBp, setActiveBp] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const clipboard = useRef<Fragment | null>(null)
  const [status, setStatus] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [exportJson, setExportJson] = useState<string | null>(null)
  const drag = useRef<{ parentId: string; index: number } | null>(null)

  // Palette → canvas drag: the shared scroll ref lets resolveDrop measure this
  // canvas; docRef keeps the drop handler on the latest doc without re-binding.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const docRef = useRef(doc)
  docRef.current = doc
  const [ghost, setGhost] = useState<{ module: string; x: number; y: number } | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
  const dropTargetRef = useRef<DropTarget | null>(null)

  useEffect(() => {
    if (!tenant || pageId === "sample") return
    fetch(`/api/pages/${encodeURIComponent(pageId)}?tenant=${encodeURIComponent(tenant)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ doc?: unknown }>) : null))
      .then((d) => {
        if (d?.doc) {
          try {
            reset(parseDoc(d.doc))
          } catch {
            /* keep sample */
          }
        }
      })
      .catch(() => {})
  }, [tenant, pageId, reset])

  const room = `${tenant || "local"}:${pageId}`
  const { send } = useDocRoom(room, (data) => {
    try {
      reset(parseDoc(JSON.parse(data)))
    } catch {
      /* ignore malformed */
    }
  })
  sendRef.current = send

  const reorder = (parentId: string, from: number, to: number) => {
    if (from !== to) apply(moveChild(doc, parentId, from, to))
  }
  const doMoveNode = (id: string, parentId: string, index: number) => {
    const next = moveNode(docRef.current, id, parentId, index)
    if (next !== docRef.current) apply(next)
  }
  const installFragment = (frag: Fragment) => {
    const { doc: next, id } = pasteFragment(docRef.current, frag, selectedId)
    if (id) {
      apply(next)
      setSelectedId(id)
    }
  }
  const setTheme = (patch: Partial<Doc["theme"]>, coalesceKey?: string) =>
    apply(updateTheme(docRef.current, patch), coalesceKey)
  const doImport = () => {
    try {
      apply(parseDoc(htmlToDoc(importText)))
      setSelectedId(null)
      setImportOpen(false)
      setImportText("")
      setStatus("Imported ✓")
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "import failed")
    }
  }
  const doExport = () => {
    const id = selectedId ?? doc.rootId
    const node = doc.nodes[id]
    const name = node?.label ?? node?.module ?? "Section"
    const manifest = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      name,
      category: "section" as const,
      version: "1.0.0",
    }
    setExportJson(JSON.stringify(extractFragment(doc, id, manifest), null, 2))
  }

  const commitText = (nodeId: string, prop: string, value: string) =>
    apply(updateProps(doc, nodeId, { [prop]: value }))
  const selected: Node | undefined = selectedId ? doc.nodes[selectedId] : undefined

  const insert = (m: ModuleInfo) => {
    const canNest = selected && moduleInfo(selected.module)?.canHaveChildren
    const parentId = canNest ? selected!.id : doc.rootId
    const { doc: next, id } = insertChild(doc, parentId, m.name, m.defaults, m.defaultClasses)
    apply(next)
    setSelectedId(id)
  }
  const del = (id: string) => {
    if (id === docRef.current.rootId) return
    apply(removeNode(docRef.current, id))
    setSelectedId(docRef.current.rootId)
  }

  // Keyboard: undo/redo, delete, duplicate, copy/paste, deselect. Ignored while a
  // form field or contentEditable has focus so typing isn't hijacked.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      const mod = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()
      if (mod && k === "z") {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
        return
      }
      if (mod && k === "y") {
        e.preventDefault()
        redo()
        return
      }
      const sel = selectedId
      if (mod && k === "c") {
        if (sel) clipboard.current = copyNode(docRef.current, sel)
        return
      }
      if (mod && k === "v") {
        if (clipboard.current) {
          e.preventDefault()
          const { doc: next, id } = pasteFragment(docRef.current, clipboard.current, sel)
          if (id) {
            apply(next)
            setSelectedId(id)
          }
        }
        return
      }
      if (!sel) return
      if (mod && k === "d") {
        e.preventDefault()
        const { doc: next, id } = duplicateNode(docRef.current, sel)
        if (id) {
          apply(next)
          setSelectedId(id)
        }
        return
      }
      if (k === "delete" || k === "backspace") {
        e.preventDefault()
        del(sel)
        return
      }
      if (k === "escape") setSelectedId(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, undo, redo])

  // Press a palette chip and drag onto the canvas to insert at a real position.
  // A press without movement falls back to click-insert (into the selection).
  const startPaletteDrag = (m: ModuleInfo, e: React.PointerEvent) => {
    e.preventDefault()
    const start = { x: e.clientX, y: e.clientY }
    let active = false
    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return
      active = true
      setGhost({ module: m.name, x: ev.clientX, y: ev.clientY })
      const t = resolveDrop(scrollRef.current, ev.clientX, ev.clientY, docRef.current, m.name)
      dropTargetRef.current = t
      setDropIndicator(t?.indicator ?? null)
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      if (active) {
        const t = dropTargetRef.current
        if (t) {
          const { doc: next, id } = insertChildAt(docRef.current, t.parentId, t.index, m.name, m.defaults, m.defaultClasses)
          apply(next)
          setSelectedId(id)
        }
      } else {
        insert(m) // treat as a click
      }
      setGhost(null)
      setDropIndicator(null)
      dropTargetRef.current = null
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const save = async () => {
    if (!tenant) return setStatus("Add ?tenant=<url> to save.")
    setStatus("Saving…")
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(pageId)}?tenant=${encodeURIComponent(tenant)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc }),
      })
      setStatus(res.ok ? "Saved ✓" : `Save failed (${res.status})`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "save failed")
    }
  }

  return (
    <div className="editor3">
      <aside className="col left">
        <Palette onDragStart={startPaletteDrag} />
        <div className="border-t border-border px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Layers
        </div>
        <Tree
          doc={doc}
          nodeId={doc.rootId}
          parentId={null}
          index={0}
          depth={0}
          selectedId={selectedId}
          drag={drag}
          onSelect={setSelectedId}
          onDelete={del}
          onReorder={reorder}
        />
      </aside>

      <main className="col center">
        <div className="flex items-center gap-1 h-12 px-3 border-b border-border bg-background shrink-0">
          <IconButton tip="Undo (⌘Z)" onClick={undo} disabled={!canUndo}>
            <Undo2 className="size-4" />
          </IconButton>
          <IconButton tip="Redo (⌘⇧Z)" onClick={redo} disabled={!canRedo}>
            <Redo2 className="size-4" />
          </IconButton>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button variant={showCode ? "soft" : "ghost"} size="sm" onClick={() => setShowCode((s) => !s)}>
            <Code2 className="size-4" />
            {showCode ? "Canvas" : "Code"}
          </Button>
          <div className="ml-1 inline-flex items-center gap-0.5 rounded-[var(--radius)] bg-muted p-0.5">
            {BREAKPOINTS.map((b) => {
              const Icon = b.id === null ? Monitor : b.id === "tablet" ? Tablet : Smartphone
              return (
                <Tooltip key={b.label}>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => setActiveBp(b.id)}
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
                          activeBp === b.id && "bg-background text-foreground shadow-sm"
                        )}
                      />
                    }
                  >
                    <Icon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>{`${b.label}${b.width ? ` (${b.width}px)` : ""}`}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={() => setLibraryOpen(true)}>
            <Plus className="size-4" />
            Section
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setThemeOpen(true)}>
            <PaletteIcon className="size-4" />
            Theme
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
            <FileInput className="size-4" />
            Import
          </Button>
          <Button variant="ghost" size="sm" onClick={doExport} title="Export the selected layer as a marketplace Fragment">
            <Download className="size-4" />
            Export
          </Button>
          <div className="flex-1" />
          {status && <span className="mr-1 text-xs text-muted-foreground">{status}</span>}
          <Button size="sm" onClick={save}>
            <Save className="size-4" />
            Save
          </Button>
        </div>
        {showCode ? (
          <textarea
            className="code"
            spellCheck={false}
            value={JSON.stringify(doc, null, 2)}
            onChange={(e) => {
              try {
                apply(parseDoc(JSON.parse(e.target.value)))
              } catch {
                /* wait for valid JSON */
              }
            }}
          />
        ) : (
          <Canvas
            doc={doc}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCommitText={commitText}
            onMoveNode={doMoveNode}
            scrollRef={scrollRef}
            dropIndicator={dropIndicator}
            width={BREAKPOINTS.find((b) => b.id === activeBp)?.width}
            previewBp={activeBp}
          />
        )}
      </main>

      <aside className="col right">
        <Inspector doc={doc} node={selected} onChange={apply} activeBp={activeBp} />
      </aside>

      <Dialog open={importOpen} onClose={() => setImportOpen(false)} title="Import HTML → Doc">
        <Textarea
          className="h-72 font-mono text-[11px]"
          placeholder="Paste HTML here — it becomes an editable Doc."
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setImportOpen(false)}>
            Cancel
          </Button>
          <Button onClick={doImport}>Import</Button>
        </DialogFooter>
      </Dialog>

      {exportJson !== null && (
        <Dialog open onClose={() => setExportJson(null)} title="Fragment JSON — paste into the marketplace “Sell” form">
          <Textarea className="h-72 font-mono text-[11px]" readOnly value={exportJson} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportJson(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard?.writeText(exportJson).then(
                  () => setStatus("Fragment copied ✓"),
                  () => setStatus("Copy failed — select + copy manually")
                )
              }}
            >
              Copy
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {libraryOpen && <LibraryDialog onInsert={installFragment} onClose={() => setLibraryOpen(false)} />}
      {themeOpen && <ThemeDialog theme={doc.theme} onChange={setTheme} onClose={() => setThemeOpen(false)} />}

      {ghost && (
        <div className="drag-ghost" style={{ left: ghost.x + 12, top: ghost.y + 12 }}>
          {ghost.module}
        </div>
      )}
    </div>
  )
}

function Palette({ onDragStart }: { onDragStart: (m: ModuleInfo, e: React.PointerEvent) => void }) {
  const mods = moduleList().filter((m) => m.name !== "page-root")
  return (
    <div className="p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Insert</div>
      <div className="grid grid-cols-2 gap-1.5">
        {mods.map((m) => (
          <button
            key={m.name}
            onPointerDown={(e) => onDragStart(m, e)}
            className="flex cursor-grab items-center rounded-md border border-border bg-background px-2.5 py-2 text-xs capitalize text-foreground transition-colors hover:border-ring hover:text-foreground active:cursor-grabbing"
          >
            {m.name}
          </button>
        ))}
      </div>
    </div>
  )
}

interface TreeProps {
  doc: Doc
  nodeId: string
  parentId: string | null
  index: number
  depth: number
  selectedId: string | null
  drag: React.RefObject<{ parentId: string; index: number } | null>
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onReorder: (parentId: string, from: number, to: number) => void
}

function Tree(props: TreeProps) {
  const { doc, nodeId, parentId, index, depth, selectedId, drag, onSelect, onDelete, onReorder } = props
  const node = doc.nodes[nodeId]
  if (!node) return null
  const isRoot = nodeId === doc.rootId
  return (
    <div>
      <div
        className={cn(
          "group mx-1.5 flex cursor-pointer items-center justify-between rounded-md py-1 pr-1.5 text-[13px]",
          selectedId === nodeId ? "bg-accent text-foreground" : "text-foreground hover:bg-muted"
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => onSelect(nodeId)}
        draggable={!isRoot}
        onDragStart={(e) => {
          if (parentId) {
            drag.current = { parentId, index }
            e.stopPropagation()
          }
        }}
        onDragOver={(e) => {
          if (drag.current && parentId === drag.current.parentId) e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (drag.current && parentId === drag.current.parentId) {
            onReorder(parentId, drag.current.index, index)
          }
          drag.current = null
        }}
      >
        <span className="truncate">{node.label ?? node.module}</span>
        {!isRoot && (
          <button
            className="shrink-0 px-1 text-base leading-none text-muted-foreground opacity-0 hover:text-red-600 group-hover:opacity-100"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(nodeId)
            }}
          >
            ×
          </button>
        )}
      </div>
      {node.children.map((cid, i) => (
        <Tree key={cid} {...props} nodeId={cid} parentId={nodeId} index={i} depth={depth + 1} />
      ))}
    </div>
  )
}
