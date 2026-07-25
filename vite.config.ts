import { resolve } from "node:path"

import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const here = import.meta.dirname

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      "@": resolve(here, "src"),
      // Shared engine, VENDORED into this repo (src/builder-core) so CI — which
      // only checks out this repo — can build it standalone. Canonical source is
      // brandsapp-multitenant/lib/builder-core; re-sync with `pnpm sync:builder-core`.
      // (spec §11 will replace this with a published package.)
      "@brandsapp/builder-core": resolve(here, "src/builder-core"),
    },
  },
})
