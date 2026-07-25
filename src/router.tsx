import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
} from "@tanstack/react-router"

import { EditorPage } from "./routes/editor"
import { HomePage } from "./routes/home"

const rootRoute = createRootRoute({
  component: () => (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          BrandsApp <span>Builder</span>
        </Link>
        <span className="tag">central editor · P2</span>
      </header>
      <Outlet />
    </div>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
})

const editRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/edit/$pageId",
  validateSearch: (search: Record<string, unknown>): { tenant?: string } => ({
    tenant: typeof search.tenant === "string" ? search.tenant : undefined,
  }),
  component: EditorPage,
})

const routeTree = rootRoute.addChildren([indexRoute, editRoute])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
