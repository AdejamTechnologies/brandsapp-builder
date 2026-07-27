import "./process-shim" // must run before UnoCSS/preset-daisy touches process.env
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"

import { router } from "./router"
import "./tailwind.css"
import "./styles.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
