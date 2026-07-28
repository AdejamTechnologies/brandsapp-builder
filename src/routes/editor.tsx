import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams, useSearch } from "@tanstack/react-router"
import {
  Blocks,
  Box,
  Check,
  ChevronDown,
  Code2,
  Component as ComponentIcon,
  Download,
  FileText,
  FormInput,
  Heading,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  Link2,
  ListChecks,
  Minus,
  MessageSquare,
  MousePointerClick,
  PanelTop,
  Repeat,
  Rows3,
  Star,
  Type as TypeIcon,
  Video,
  Eye,
  EyeOff,
  FileInput,
  Files,
  Home,
  Lock,
  LockOpen,
  Monitor,
  Palette as PaletteIcon,
  Pencil,
  Plus,
  Redo2,
  Rocket,
  Save,
  Search,
  Share2,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react"

// Typed layer icons (Instatic-style Explorer): module → glyph.
const MODULE_ICONS: Record<string, typeof Box> = {
  box: Box,
  "page-root": Box,
  stack: Rows3,
  grid: LayoutGrid,
  heading: Heading,
  text: TypeIcon,
  richtext: FileText,
  "form-label": TypeIcon,
  image: ImageIcon,
  icon: Star,
  video: Video,
  button: MousePointerClick,
  submit: MousePointerClick,
  link: Link2,
  form: FormInput,
  input: FormInput,
  textarea: FormInput,
  "select-field": FormInput,
  checkbox: FormInput,
  radio: FormInput,
  tabs: PanelTop,
  "tab-panel": PanelTop,
  accordion: PanelTop,
  "accordion-item": PanelTop,
  dropdown: PanelTop,
  divider: Minus,
  spacer: Minus,
  embed: Code2,
  loop: Repeat,
  instance: ComponentIcon,
}
const moduleIcon = (m: string) => MODULE_ICONS[m] ?? Box

import { Button, type ButtonProps } from "../components/ui/button"
import { Dialog, DialogFooter } from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Tabs, TabsList, TabsPanel, TabsTab } from "../components/ui/tabs"
import { Textarea } from "../components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip"
import { cn } from "../lib/utils"
import { SECTIONS, type Template } from "../lib/templates"

import {
  extractFragment,
  htmlToDoc,
  parseDoc,
  type Doc,
  type Fragment,
  type Node,
} from "@brandsapp/builder-core"
import { CommentsDialog } from "../components/comments-dialog"
import { Inspector } from "../components/inspector"
import { LibraryDialog } from "../components/library-dialog"
import { ThemeDialog } from "../components/theme-dialog"
import { copyNode, duplicateNode, insertFragmentAt, pasteFragment } from "../lib/actions"
import { Canvas } from "../lib/canvas"
import { resolveDrop, type DropIndicator, type DropTarget } from "../lib/canvas-dnd"
import {
  createComponent,
  insertChild,
  seedDefaultChildren,
  insertChildAt,
  moveChild,
  moveNode,
  removeNode,
  renameComponent,
  updateProps,
  updateTheme,
} from "../lib/doc-ops"
import { useHistory } from "../lib/history"
import { useDocRoom } from "../lib/realtime"
import { moduleInfo, registry, type ModuleInfo } from "../lib/registry"
import { entryMatches, paletteSections } from "../lib/palette"
import { SAMPLE_DOC } from "../lib/sample"
import { ADEJAM_DOC } from "../lib/adejam-sample"
import { BLANK_DOC } from "../lib/blank"

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
      <TooltipTrigger render={<Button variant="ghost" size="iconSm" aria-label={tip} {...props} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}

export function EditorPage() {
  const { pageId } = useParams({ from: "/edit/$pageId" })
  const search = useSearch({ strict: false }) as { tenant?: string }
  const tenant = search.tenant ?? ""
  const navigate = useNavigate()

  // Only the two demo ids load a demo page. Everything else starts BLANK — that
  // gives /edit/blank as a scratch canvas for trying components, and stops a real
  // tenant page from briefly showing someone else's demo markup while its own
  // definition is still being fetched below.
  const [initialDoc] = useState(() =>
    parseDoc(pageId === "adejam" ? ADEJAM_DOC : pageId === "sample" ? SAMPLE_DOC : BLANK_DOC)
  )
  const sendRef = useRef<(s: string) => void>(() => {})
  const commit = useCallback((d: Doc) => sendRef.current(JSON.stringify(d)), [])
  const { doc, apply, undo, redo, canUndo, canRedo, reset } = useHistory(initialDoc, commit)
  const [selectedId, setSelectedId] = useState<string | null>(initialDoc.rootId)
  const [showCode, setShowCode] = useState(false)
  const [activeBp, setActiveBp] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  // When set, the canvas + navigator show a linked component's master subtree for
  // editing (the real doc.rootId is untouched; we just swap the view root).
  const [editingComponent, setEditingComponent] = useState<string | null>(null)
  const [commentsOpen, setCommentsOpen] = useState(false)
  // Multi-page: the project's pages, listed on demand for the switcher.
  const [pagesOpen, setPagesOpen] = useState(false)
  const [pages, setPages] = useState<
    { id: string; title: string; slug: string; status: string; isHomepage: number }[]
  >([])
  const clipboard = useRef<Fragment | null>(null)
  const [status, setStatus] = useState("")
  const [pageStatus, setPageStatus] = useState<string>("draft")
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [exportJson, setExportJson] = useState<string | null>(null)
  const drag = useRef<{ parentId: string; index: number } | null>(null)

  // Palette → canvas drag: the shared scroll ref lets resolveDrop measure this
  // canvas; docRef keeps the drop handler on the latest doc without re-binding.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const docRef = useRef(doc)
  docRef.current = doc
  const [ghost, setGhost] = useState<{ label: string; x: number; y: number } | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
  const dropTargetRef = useRef<DropTarget | null>(null)

  useEffect(() => {
    if (!tenant || pageId === "sample" || pageId === "adejam") return
    fetch(`/api/pages/${encodeURIComponent(pageId)}?tenant=${encodeURIComponent(tenant)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ doc?: unknown; status?: string }>) : null))
      .then((d) => {
        if (d?.status) setPageStatus(d.status)
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
  // Play a node's animation once in the canvas (Inspector preview).
  const previewAnim = (nodeId: string, anim: { effect: string; duration?: number; delay?: number }) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(nodeId)}"]`)
    if (!el) return
    el.style.animation = "none"
    void el.offsetWidth // reflow so it restarts
    el.style.animation = `bapp-${anim.effect} ${anim.duration ?? 600}ms cubic-bezier(.16,1,.3,1) ${anim.delay ?? 0}ms both`
    window.setTimeout(() => (el.style.animation = ""), (anim.duration ?? 600) + (anim.delay ?? 0) + 200)
  }
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
    const parentId = canNest ? selected!.id : activeRootId
    const { doc: next, id } = insertChild(doc, parentId, m.name, m.defaults, m.defaultClasses)
    // A container with a starter subtree (e.g. form → fields + submit) arrives
    // usable rather than empty.
    apply(seedDefaultChildren(next, id, m.name, (n) => registry.get(n)))
    setSelectedId(id)
  }
  const del = (id: string) => {
    if (id === docRef.current.rootId) return
    apply(removeNode(docRef.current, id))
    setSelectedId(docRef.current.rootId)
  }
  // Navigator patch: rename / hide / lock a layer.
  const patchNode = (id: string, p: Partial<Node>, key?: string) => {
    const n = docRef.current.nodes[id]
    if (!n) return
    apply({ ...docRef.current, nodes: { ...docRef.current.nodes, [id]: { ...n, ...p } } }, key)
  }

  // ── linked components (symbols) ──
  const components = Object.values(doc.components ?? {})
  const activeComp = editingComponent ? doc.components?.[editingComponent] : undefined
  // The tree/canvas root: a component master while editing one, else the page.
  const activeRootId = activeComp?.rootId ?? doc.rootId
  const makeComponent = () => {
    const sel = selectedId
    if (!sel || sel === doc.rootId) return
    const name = window.prompt("Component name", doc.nodes[sel]?.label ?? doc.nodes[sel]?.module ?? "Component")
    if (name == null) return
    const { doc: next, instanceId } = createComponent(docRef.current, sel, name)
    if (instanceId) {
      apply(next)
      setSelectedId(instanceId)
    }
  }
  const editComponent = (cid: string) => {
    const comp = docRef.current.components?.[cid]
    if (!comp) return
    setEditingComponent(cid)
    setSelectedId(comp.rootId)
  }
  const exitComponent = () => {
    setEditingComponent(null)
    setSelectedId(docRef.current.rootId)
  }
  const startComponentDrag = (cid: string, e: React.PointerEvent) => {
    const comp = doc.components?.[cid]
    if (!comp) return
    startDrag(
      {
        label: comp.name,
        dragModule: "instance",
        insert: (pid, idx) => insertChildAt(docRef.current, pid, idx, "instance", { component: cid }),
        onClick: () => {
          const { doc: next, id } = insertChild(docRef.current, activeRootId, "instance", { component: cid })
          if (id) {
            apply(next)
            setSelectedId(id)
          }
        },
      },
      e
    )
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

  // Generic press-drag-onto-canvas insert (shared by the Components and Sections
  // tabs). A press without movement falls back to click-insert.
  const startDrag = (
    spec: { label: string; dragModule: string; insert: (parentId: string, index: number) => { doc: Doc; id: string }; onClick: () => void },
    e: React.PointerEvent
  ) => {
    e.preventDefault()
    const start = { x: e.clientX, y: e.clientY }
    let active = false
    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return
      active = true
      setGhost({ label: spec.label, x: ev.clientX, y: ev.clientY })
      const t = resolveDrop(scrollRef.current, ev.clientX, ev.clientY, docRef.current, spec.dragModule)
      dropTargetRef.current = t
      setDropIndicator(t?.indicator ?? null)
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      if (active) {
        const t = dropTargetRef.current
        if (t) {
          const { doc: next, id } = spec.insert(t.parentId, t.index)
          if (id) {
            apply(next)
            setSelectedId(id)
          }
        }
      } else {
        spec.onClick()
      }
      setGhost(null)
      setDropIndicator(null)
      dropTargetRef.current = null
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const startModuleDrag = (m: ModuleInfo & { label?: string }, e: React.PointerEvent) =>
    startDrag(
      {
        label: m.label ?? m.name,
        dragModule: m.name,
        insert: (pid, idx) => {
          const res = insertChildAt(docRef.current, pid, idx, m.name, m.defaults, m.defaultClasses)
          return { ...res, doc: seedDefaultChildren(res.doc, res.id, m.name, (n) => registry.get(n)) }
        },
        onClick: () => insert(m),
      },
      e
    )

  const startSectionDrag = (t: Template, e: React.PointerEvent) => {
    const frag = t.make()
    startDrag(
      {
        label: t.name,
        dragModule: frag.nodes[frag.rootId]?.module ?? "box",
        insert: (pid, idx) => insertFragmentAt(docRef.current, frag, pid, idx),
        onClick: () => installFragment(t.make()),
      },
      e
    )
  }

  // ── page settings (doc.meta) ──
  const setPageMeta = (patch: Partial<NonNullable<Doc["meta"]>>) =>
    apply({ ...docRef.current, meta: { ...(docRef.current.meta ?? {}), ...patch } })

  // ── multi-page project switcher ──
  const openPages = () => {
    setPagesOpen(true)
    if (!tenant) return
    fetch(`/api/pages?tenant=${encodeURIComponent(tenant)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ pages?: typeof pages }>) : null))
      .then((d) => d?.pages && setPages(d.pages))
      .catch(() => {})
  }
  const switchPage = (id: string) => {
    setPagesOpen(false)
    if (id !== pageId) navigate({ to: "/edit/$pageId", params: { pageId: id }, search: { tenant } })
  }
  const newPage = async () => {
    if (!tenant) return setStatus("Add ?tenant=<url> to manage pages.")
    const title = window.prompt("New page title", "Untitled")
    if (title == null) return
    try {
      const res = await fetch(`/api/pages?tenant=${encodeURIComponent(tenant)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      })
      const d = (await res.json().catch(() => null)) as { id?: string } | null
      if (res.ok && d?.id) {
        setPagesOpen(false)
        navigate({ to: "/edit/$pageId", params: { pageId: d.id }, search: { tenant } })
      } else setStatus(`Create failed (${res.status})`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "create failed")
    }
  }

  const share = () => {
    const url = `${window.location.origin}/preview/${encodeURIComponent(pageId)}${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ""}`
    navigator.clipboard?.writeText(url).then(
      () => setStatus("Share link copied ✓"),
      () => setStatus(url)
    )
  }
  const publish = async () => {
    if (!tenant) return setStatus("Add ?tenant=<url> to publish.")
    const goLive = pageStatus !== "published"
    setStatus(goLive ? "Publishing…" : "Unpublishing…")
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(pageId)}/publish?tenant=${encodeURIComponent(tenant)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publish: goLive }),
      })
      const d = (await res.json().catch(() => null)) as { status?: string } | null
      if (res.ok && d?.status) {
        setPageStatus(d.status)
        setStatus(d.status === "published" ? "Published ✓" : "Unpublished")
      } else setStatus(`Publish failed (${res.status})`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "publish failed")
    }
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
        <Tabs defaultValue="elements">
          <TabsList className="border-b border-border p-1.5">
            <TabsTab value="elements" aria-label="Elements" title="Elements" className="flex items-center justify-center">
              <Blocks className="size-4" />
            </TabsTab>
            <TabsTab value="sections" aria-label="Sections" title="Sections" className="flex items-center justify-center">
              <LayoutTemplate className="size-4" />
            </TabsTab>
            <TabsTab value="components" aria-label="Components" title="Components" className="flex items-center justify-center">
              <ComponentIcon className="size-4" />
            </TabsTab>
            <TabsTab value="layers" aria-label="Layers" title="Layers" className="flex items-center justify-center">
              <Layers className="size-4" />
            </TabsTab>
          </TabsList>
          <TabsPanel value="elements" className="min-h-0 flex-1">
            {/* Just the element palette. The daisyUI component set that used to
                sit underneath is parked (see COMPONENTS in lib/templates.ts). */}
            <Palette onDragStart={startModuleDrag} />
          </TabsPanel>
          <TabsPanel value="sections">
            <SectionPalette items={SECTIONS} onDragStart={startSectionDrag} searchable />
          </TabsPanel>
          <TabsPanel value="components">
            <ComponentsPanel
              components={components}
              editingId={editingComponent}
              onDragStart={startComponentDrag}
              onEdit={editComponent}
              onRename={(cid, name) => apply(renameComponent(docRef.current, cid, name))}
            />
          </TabsPanel>
          <TabsPanel value="layers">
            <div className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {activeComp ? `Component · ${activeComp.name}` : "Layers"}
            </div>
            <Tree
              doc={doc}
              nodeId={activeRootId}
              parentId={null}
              index={0}
              depth={0}
              selectedId={selectedId}
              drag={drag}
              onSelect={setSelectedId}
              onDelete={del}
              onReorder={reorder}
              onUpdate={patchNode}
            />
          </TabsPanel>
        </Tabs>
      </aside>

      <main className="col center">
        <div className="flex items-center h-12 px-3 border-b border-border bg-background shrink-0">
          <div className="flex flex-1 min-w-0 items-center gap-1 overflow-x-auto">
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
          <Button variant="ghost" size="sm" onClick={openPages}>
            <Files className="size-4" />
            Pages
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setThemeOpen(true)}>
            <PaletteIcon className="size-4" />
            Variables
          </Button>
          <IconButton tip="Insert section" onClick={() => setLibraryOpen(true)}>
            <Plus className="size-4" />
          </IconButton>
          <IconButton
            tip="Make component"
            onClick={makeComponent}
            disabled={!selectedId || selectedId === doc.rootId}
          >
            <ComponentIcon className="size-4" />
          </IconButton>
          <IconButton tip="Import HTML" onClick={() => setImportOpen(true)}>
            <FileInput className="size-4" />
          </IconButton>
          <IconButton tip="Export fragment" onClick={doExport}>
            <Download className="size-4" />
          </IconButton>
          <div className="mx-1 h-5 w-px bg-border" />
          <IconButton tip="Curate library blocks (opens in a new tab)" onClick={() => window.open("/curate", "_blank")}>
            <ListChecks className="size-4" />
          </IconButton>
          </div>
          <div className="flex shrink-0 items-center gap-1 pl-2">
          {status && <span className="mr-1 text-xs text-muted-foreground">{status}</span>}
          {pageStatus === "published" && (
            <span className="mr-1 inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-600">
              Live
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setCommentsOpen(true)}>
            <MessageSquare className="size-4" />
            Comments
            {(() => {
              const open = (doc.comments ?? []).filter((c) => !c.resolved).length
              return open > 0 ? (
                <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {open}
                </span>
              ) : null
            })()}
          </Button>
          <IconButton tip="Copy read-only share link" onClick={share}>
            <Share2 className="size-4" />
          </IconButton>
          <Button variant="ghost" size="sm" onClick={save}>
            <Save className="size-4" />
            Save
          </Button>
          <Button size="sm" onClick={publish}>
            <Rocket className="size-4" />
            {pageStatus === "published" ? "Unpublish" : "Publish"}
          </Button>
          </div>
        </div>
        {activeComp && (
          <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-3 py-1.5 text-xs text-foreground">
            <ComponentIcon className="size-3.5 text-primary" />
            Editing component <b className="font-semibold">{activeComp.name}</b> — changes apply to every instance.
            <div className="flex-1" />
            <Button variant="soft" size="sm" onClick={exitComponent}>
              <Check className="size-3.5" />
              Done
            </Button>
          </div>
        )}
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
            doc={activeComp ? { ...doc, rootId: activeRootId } : doc}
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
        <Inspector doc={doc} node={selected} onChange={apply} activeBp={activeBp} onPreview={previewAnim} />
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

      <Dialog open={pagesOpen} onClose={() => setPagesOpen(false)} title="Pages">
        <div className="mb-3 rounded-md border border-border p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            This page
          </div>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">
              Collection template — renders per row at{" "}
              <code>/&lt;collection&gt;/&lt;slug&gt;</code>. Bind fields with source “page”.
            </span>
            <input
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:border-ring"
              placeholder="e.g. blog — blank for a normal page"
              defaultValue={doc.meta?.collection ?? ""}
              onBlur={(e) => setPageMeta({ collection: e.target.value.trim() || undefined })}
            />
          </label>
        </div>
        {!tenant ? (
          <div className="text-xs text-muted-foreground">
            Add <code>?tenant=&lt;url&gt;</code> to the editor URL to list and create pages.
          </div>
        ) : (
          <>
            <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {pages.length === 0 && <div className="px-1 py-2 text-xs text-muted-foreground">No other pages yet.</div>}
              {pages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => switchPage(p.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                    p.id === pageId ? "border-primary bg-primary/5" : "border-border hover:border-ring"
                  )}
                >
                  {p.isHomepage ? <Home className="size-3.5 text-primary" /> : <Files className="size-3.5 text-muted-foreground" />}
                  <span className="flex-1 truncate">{p.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">/{p.slug}</span>
                  {p.status !== "published" && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {p.status}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPagesOpen(false)}>
                Close
              </Button>
              <Button onClick={newPage}>
                <Plus className="size-4" />
                New page
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {commentsOpen && (
        <CommentsDialog
          doc={doc}
          selectedId={selectedId}
          onChange={apply}
          onClose={() => setCommentsOpen(false)}
          onJump={(id) => setSelectedId(id)}
        />
      )}

      {libraryOpen && <LibraryDialog onInsert={installFragment} onClose={() => setLibraryOpen(false)} />}
      {themeOpen && <ThemeDialog theme={doc.theme} onChange={setTheme} onClose={() => setThemeOpen(false)} />}

      {ghost && (
        <div className="drag-ghost" style={{ left: ghost.x + 12, top: ghost.y + 12 }}>
          {ghost.label}
        </div>
      )}
    </div>
  )
}

/**
 * The Add panel. Arrangement, section names and element names follow Webflow's
 * element panel (see lib/palette.ts) so the muscle memory transfers; the chrome
 * stays ours. Sections collapse individually and a search filters across all of
 * them, auto-revealing whatever matches.
 */
function Palette({ onDragStart }: { onDragStart: (m: ModuleInfo & { label: string }, e: React.PointerEvent) => void }) {
  const [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const sections = paletteSections()
  const q = query.trim()

  const visible = sections
    .map((s) => ({ ...s, items: s.items.filter(({ entry }) => entryMatches(entry, q)) }))
    .filter((s) => s.items.length > 0)

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border p-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search elements"
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {visible.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">No elements match “{q}”.</p>
        ) : (
          visible.map((s) => {
            // A search result is always shown expanded — collapsing while
            // filtering would hide the very thing being searched for.
            const isOpen = !!q || !collapsed.has(s.id)
            return (
              <div key={s.id} className="mb-1.5 last:mb-0">
                <button type="button" onClick={() => toggle(s.id)} aria-expanded={isOpen} className="sec-head">
                  {s.label}
                  <ChevronDown className={cn("size-3.5", !isOpen && "-rotate-90")} />
                </button>
                {isOpen && (
                  <div className="mt-1 mb-2 grid grid-cols-2 gap-1.5">
                    {s.items.map(({ entry, info }) => (
                      <button
                        key={`${s.id}:${entry.label}`}
                        onPointerDown={(e) => onDragStart(info, e)}
                        title={entry.label}
                        className="flex cursor-grab items-center rounded-md border border-border bg-background px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:border-ring active:cursor-grabbing"
                      >
                        <span className="truncate">{entry.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function SectionPalette({
  items,
  onDragStart,
  searchable,
}: {
  items: Template[]
  onDragStart: (t: Template, e: React.PointerEvent) => void
  searchable?: boolean
}) {
  const [q, setQ] = useState("")
  const CAP = 150
  const query = q.trim().toLowerCase()
  const filtered = query ? items.filter((t) => `${t.name} ${t.category}`.toLowerCase().includes(query)) : items
  const shown = filtered.slice(0, CAP)
  const categories = [...new Set(shown.map((t) => t.category))]
  return (
    <div className="p-3">
      {searchable && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${items.length} blocks…`}
          className="mb-3 h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
        />
      )}
      {categories.map((cat) => (
        <div key={cat} className="mb-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{cat}</div>
          <div className="flex flex-col gap-1.5">
            {shown
              .filter((t) => t.category === cat)
              .map((t, i) => (
                <button
                  key={`${cat}:${t.name}:${i}`}
                  onPointerDown={(e) => onDragStart(t, e)}
                  className="flex cursor-grab items-center rounded-md border border-border bg-background px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:border-ring active:cursor-grabbing"
                >
                  {t.name}
                </button>
              ))}
          </div>
        </div>
      ))}
      {filtered.length > CAP && (
        <div className="px-1 py-2 text-[11px] text-muted-foreground">+{filtered.length - CAP} more — refine your search</div>
      )}
      {filtered.length === 0 && <div className="px-1 py-4 text-xs text-muted-foreground">No blocks match “{q}”.</div>}
    </div>
  )
}

function ComponentsPanel({
  components,
  editingId,
  onDragStart,
  onEdit,
  onRename,
}: {
  components: { id: string; name: string; rootId: string }[]
  editingId: string | null
  onDragStart: (cid: string, e: React.PointerEvent) => void
  onEdit: (cid: string) => void
  onRename: (cid: string, name: string) => void
}) {
  if (components.length === 0) {
    return (
      <div className="p-4 text-xs leading-relaxed text-muted-foreground">
        No components yet. Select a layer on the canvas and click{" "}
        <b className="text-foreground">Make component</b> to turn it into a reusable, linked component —
        edit the master once and every instance updates.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5 p-3">
      {components.map((c) => (
        <div
          key={c.id}
          className={cn(
            "group flex items-center gap-1 rounded-md border bg-background pl-2.5 pr-1 transition-colors",
            editingId === c.id ? "border-primary" : "border-border hover:border-ring"
          )}
        >
          <button
            onPointerDown={(e) => onDragStart(c.id, e)}
            onDoubleClick={() => {
              const name = window.prompt("Rename component", c.name)
              if (name != null) onRename(c.id, name)
            }}
            className="flex flex-1 cursor-grab items-center gap-2 py-2 text-left text-xs text-foreground active:cursor-grabbing"
            title="Drag onto the canvas to place · double-click to rename"
          >
            <ComponentIcon className="size-3.5 text-primary" />
            <span className="truncate">{c.name}</span>
          </button>
          <button
            className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
            title="Edit component"
            onClick={() => onEdit(c.id)}
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      ))}
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
  onUpdate: (id: string, patch: Partial<Node>, key?: string) => void
}

function Tree(props: TreeProps) {
  const { doc, nodeId, parentId, index, depth, selectedId, drag, onSelect, onDelete, onReorder, onUpdate } = props
  const [renaming, setRenaming] = useState(false)
  const node = doc.nodes[nodeId]
  if (!node) return null
  const isRoot = nodeId === doc.rootId
  const locked = Boolean(node.locked)
  const hidden = Boolean(node.hidden)
  return (
    <div>
      <div
        className={cn(
          "group mx-1.5 flex cursor-pointer items-center gap-0.5 rounded-md py-1 pr-1 text-[13px]",
          selectedId === nodeId ? "bg-accent text-foreground" : "text-foreground hover:bg-muted",
          hidden && "opacity-45"
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => onSelect(nodeId)}
        draggable={!isRoot && !locked}
        onDragStart={(e) => {
          if (parentId && !locked) {
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
        {(() => {
          const Icon = moduleIcon(node.module)
          return <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        })()}
        {renaming ? (
          <input
            autoFocus
            defaultValue={node.label ?? ""}
            placeholder={node.module}
            className="min-w-0 flex-1 rounded border border-ring bg-background px-1 py-0.5 text-[13px] outline-none"
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              onUpdate(nodeId, { label: e.target.value.trim() || undefined }, `label:${nodeId}`)
              setRenaming(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
              if (e.key === "Escape") setRenaming(false)
            }}
          />
        ) : (
          <span
            className="flex-1 truncate"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setRenaming(true)
            }}
          >
            {node.label ?? node.module}
          </span>
        )}
        {!isRoot && (
          <>
            <button
              className={cn(
                "shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground",
                hidden ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              title={hidden ? "Show" : "Hide"}
              onClick={(e) => {
                e.stopPropagation()
                onUpdate(nodeId, { hidden: hidden ? undefined : true })
              }}
            >
              {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
            <button
              className={cn(
                "shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground",
                locked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              title={locked ? "Unlock" : "Lock"}
              onClick={(e) => {
                e.stopPropagation()
                onUpdate(nodeId, { locked: locked ? undefined : true })
              }}
            >
              {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
            </button>
            <button
              className="shrink-0 rounded px-1 text-base leading-none text-muted-foreground opacity-0 hover:text-red-600 group-hover:opacity-100"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(nodeId)
              }}
            >
              ×
            </button>
          </>
        )}
      </div>
      {node.children.map((cid, i) => (
        <Tree key={cid} {...props} nodeId={cid} parentId={nodeId} index={i} depth={depth + 1} />
      ))}
    </div>
  )
}
