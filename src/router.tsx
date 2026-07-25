import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
} from "@tanstack/react-router"

import { TooltipProvider } from "./components/ui/tooltip"
import { EditorPage } from "./routes/editor"
import { HomePage } from "./routes/home"

const rootRoute = createRootRoute({
  component: () => (
    <TooltipProvider>
      <div className="app">
        <header className="flex items-center gap-2.5 h-12 px-4 border-b border-border bg-background shrink-0">
          <Link to="/" className="font-semibold tracking-tight text-foreground">
            BrandsApp <span className="text-foreground">Builder</span>
          </Link>
          <span className="text-xs text-muted-foreground">central editor</span>
        </header>
        <Outlet />
      </div>
    </TooltipProvider>
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
