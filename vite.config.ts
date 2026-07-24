import { resolve } from "node:path"

import { cloudflare } from "@cloudflare/vite-plugin"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const here = import.meta.dirname

export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      "@": resolve(here, "src"),
      // Shared engine — single source of truth. Points at the sibling repo until
      // builder-core is extracted to its own package (spec §11). Same source, so
      // no duplication.
      "@brandsapp/builder-core": resolve(here, "../brandsapp-multitenant/lib/builder-core"),
    },
  },
})
