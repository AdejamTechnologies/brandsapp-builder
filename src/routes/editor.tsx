import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearch } from "@tanstack/react-router"

import {
  extractFragment,
  htmlToDoc,
  parseDoc,
  type Doc,
  type Node,
} from "@brandsapp/builder-core"
import { insertChild, moveChild, removeNode, updateProps, updateStyle } from "../lib/doc-ops"
import { preview, previewSrcDoc } from "../lib/preview"
import { useDocRoom } from "../lib/realtime"
import { moduleInfo, moduleList, type ModuleInfo } from "../lib/registry"
import { SAMPLE_DOC } from "../lib/sample"

const STYLE_FIELDS = [
  "background", "color", "padding", "margin", "gap", "display",
  "flexDirection", "alignItems", "justifyContent", "textAlign",
  "fontSize", "fontWeight", "borderRadius", "maxWidth", "width",
]

export function EditorPage() {
  const { pageId } = useParams({ from: "/edit/$pageId" })
  const search = useSearch({ strict: false }) as { tenant?: string }
  const tenant = search.tenant ?? ""

  const [doc, setDoc] = useState<Doc>(() => parseDoc(SAMPLE_DOC))
  const [selectedId, setSelectedId] = useState<string | null>(doc.rootId)
  const [showCode, setShowCode] = useState(false)
  const [status, setStatus] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [exportJson, setExportJson] = useState<string | null>(null)
  const drag = useRef<{ parentId: string; index: number } | null>(null)

  useEffect(() => {
    if (!tenant || pageId === "sample") return
    fetch(`/api/pages/${encodeURIComponent(pageId)}?tenant=${encodeURIComponent(tenant)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ doc?: unknown }>) : null))
      .then((d) => {
        if (d?.doc) {
          try {
            setDoc(parseDoc(d.doc))
          } catch {
            /* keep sample */
          }
        }
      })
      .catch(() => {})
  }, [tenant, pageId])

  const room = `${tenant || "local"}:${pageId}`
  const { send } = useDocRoom(room, (data) => {
    try {
      setDoc(parseDoc(JSON.parse(data)))
    } catch {
      /* ignore malformed */
    }
  })

  const apply = (next: Doc) => {
    setDoc(next)
    send(JSON.stringify(next))
  }

  const reorder = (parentId: string, from: number, to: number) => {
    if (from !== to) apply(moveChild(doc, parentId, from, to))
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

  const rendered = useMemo(() => preview(doc), [doc])
  const selected: Node | undefined = selectedId ? doc.nodes[selectedId] : undefined

  const insert = (m: ModuleInfo) => {
    const canNest = selected && moduleInfo(selected.module)?.canHaveChildren
    const parentId = canNest ? selected!.id : doc.rootId
    const { doc: next, id } = insertChild(doc, parentId, m.name, m.defaults)
    apply(next)
    setSelectedId(id)
  }
  const del = (id: string) => {
    apply(removeNode(doc, id))
    setSelectedId(doc.rootId)
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
        <Palette onInsert={insert} />
        <div className="section-title">Layers</div>
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
        <div className="toolbar">
          <button className="ghost" onClick={() => setShowCode((s) => !s)}>
            {showCode ? "Preview" : "Code"}
          </button>
          <button className="ghost" onClick={() => setImportOpen(true)}>
            Import HTML
          </button>
          <button className="ghost" onClick={doExport} title="Export the selected layer as a marketplace Fragment">
            Export Fragment
          </button>
          {rendered.error && <span className="err">{rendered.error}</span>}
          {rendered.missing.length > 0 && <span className="warn">missing: {rendered.missing.join(", ")}</span>}
          <span className="spacer" />
          <span className="muted small">{status}</span>
          <button onClick={save}>Save</button>
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
          <iframe title="preview" srcDoc={previewSrcDoc(rendered)} />
        )}
      </main>

      <aside className="col right">
        <Inspector doc={doc} node={selected} onChange={apply} />
      </aside>

      {importOpen && (
        <div className="modal-backdrop" onClick={() => setImportOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="section-title">Import HTML → Doc</div>
            <textarea
              className="import-area"
              placeholder="Paste HTML here — it becomes an editable Doc."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="modal-actions">
              <button className="ghost" onClick={() => setImportOpen(false)}>
                Cancel
              </button>
              <button onClick={doImport}>Import</button>
            </div>
          </div>
        </div>
      )}

      {exportJson !== null && (
        <div className="modal-backdrop" onClick={() => setExportJson(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="section-title">Fragment JSON — paste into the marketplace “Sell” form</div>
            <textarea className="import-area" readOnly value={exportJson} />
            <div className="modal-actions">
              <button className="ghost" onClick={() => setExportJson(null)}>
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(exportJson).then(
                    () => setStatus("Fragment copied ✓"),
                    () => setStatus("Copy failed — select + copy manually"),
                  )
                }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Palette({ onInsert }: { onInsert: (m: ModuleInfo) => void }) {
  const mods = moduleList().filter((m) => m.name !== "page-root")
  return (
    <div className="palette">
      <div className="section-title">Insert</div>
      <div className="palette-grid">
        {mods.map((m) => (
          <button key={m.name} className="chip" onClick={() => onInsert(m)}>
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
        className={"tree-row" + (selectedId === nodeId ? " sel" : "")}
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
        <span className="tree-label">{node.label ?? node.module}</span>
        {!isRoot && (
          <button
            className="tree-del"
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

function Inspector({ doc, node, onChange }: { doc: Doc; node?: Node; onChange: (d: Doc) => void }) {
  if (!node) return <div className="inspector muted small">Select a layer to edit it.</div>
  const info = moduleInfo(node.module)
  const setProp = (key: string, value: unknown) => onChange(updateProps(doc, node.id, { [key]: value }))
  const setStyle = (key: string, value: string) => onChange(updateStyle(doc, node.id, { [key]: value }))

  return (
    <div className="inspector">
      <div className="section-title">{node.module}</div>
      {info &&
        Object.entries(info.schema).map(([key, control]) => {
          const value = node.props[key]
          return (
            <label key={key} className="field">
              <span>{control.label ?? key}</span>
              {control.type === "boolean" ? (
                <input type="checkbox" checked={Boolean(value)} onChange={(e) => setProp(key, e.target.checked)} />
              ) : control.type === "number" ? (
                <input
                  type="number"
                  value={value == null ? "" : String(value)}
                  onChange={(e) => setProp(key, e.target.value === "" ? undefined : Number(e.target.value))}
                />
              ) : control.type === "select" && control.options ? (
                <select value={String(value ?? "")} onChange={(e) => setProp(key, e.target.value)}>
                  {control.options.map((o) => (
                    <option key={String(o.value)} value={String(o.value)}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={value == null ? "" : String(value)} onChange={(e) => setProp(key, e.target.value)} />
              )}
            </label>
          )
        })}

      <div className="section-title">Style</div>
      {STYLE_FIELDS.map((key) => (
        <label key={key} className="field">
          <span>{key}</span>
          <input value={node.style?.[key] ?? ""} placeholder="—" onChange={(e) => setStyle(key, e.target.value)} />
        </label>
      ))}
    </div>
  )
}
