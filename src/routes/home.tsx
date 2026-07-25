import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

export function HomePage() {
  const navigate = useNavigate()
  const [pageId, setPageId] = useState("")
  const [tenant, setTenant] = useState("")

  const open = () => {
    const id = pageId.trim()
    if (!id) return
    navigate({
      to: "/edit/$pageId",
      params: { pageId: id },
      search: tenant.trim() ? { tenant: tenant.trim() } : undefined,
    })
  }

  return (
    <main className="home">
      <h1>Central Builder</h1>
      <p className="muted">
        The shared visual editor for BrandsApp pages. The canvas renders with the same{" "}
        <code>builder-core</code> engine the tenant Workers publish with — what you see is what ships.
      </p>

      <div className="cards">
        <Link to="/edit/$pageId" params={{ pageId: "sample" }} className="card">
          <strong>Open the sample page →</strong>
          <span className="muted">A local playground — drag, edit, and style with no sign-in.</span>
        </Link>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <strong>Open a tenant page</strong>
        <span className="muted small">
          Loads and saves against a live tenant. Provide the page id and the tenant’s app URL.
        </span>
        <div className="home-open">
          <input placeholder="page id" value={pageId} onChange={(e) => setPageId(e.target.value)} />
          <input
            placeholder="tenant url (https://acme.brandsapp.io)"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <button onClick={open} disabled={!pageId.trim()}>
            Open
          </button>
        </div>
      </div>

      <p className="muted small" style={{ marginTop: 16 }}>
        Editing: click to select, double-click text to edit, drag palette chips or existing layers on the
        canvas, ⌘Z/⌘⇧Z to undo/redo, ⌘D duplicate, ⌘C/⌘V copy-paste, Delete to remove. Realtime collab
        runs through the DocRoom DO. Sign-in gating comes later.
      </p>
    </main>
  )
}
