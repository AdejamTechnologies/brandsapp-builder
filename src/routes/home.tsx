import { Link } from "@tanstack/react-router"

export function HomePage() {
  return (
    <main className="home">
      <h1>Central Builder</h1>
      <p className="muted">
        The shared visual editor for BrandsApp pages. Renders and previews with the
        same <code>builder-core</code> engine the tenant Workers serve with. Opened
        from a tenant dashboard as <code>/edit/&lt;pageId&gt;?tenant=&lt;url&gt;</code>.
      </p>
      <div className="cards">
        <Link to="/edit/$pageId" params={{ pageId: "sample" }} className="card">
          <strong>Open the sample page →</strong>
          <span className="muted">Edit the Doc JSON and see a live preview.</span>
        </Link>
      </div>
      <p className="muted small">
        Next: the Polaris editor UI (canvas, drag-and-drop, properties panel) moves
        in here over this scaffold; realtime collab runs through the DocRoom DO.
      </p>
    </main>
  )
}
