import { createDefaultRegistry, renderDoc } from "@brandsapp/builder-core"

// The SAME engine the tenant Worker serves with — the editor previews exactly
// what will publish. (Legacy section modules get registered here too once the
// tenant registry is shared as a package.)
const registry = createDefaultRegistry()

export interface PreviewResult {
  html: string
  css: string
  missing: string[]
  error?: string
}

export function preview(docJson: unknown): PreviewResult {
  try {
    const { html, css, missing } = renderDoc(docJson, { registry })
    return { html, css, missing }
  } catch (e) {
    return { html: "", css: "", missing: [], error: e instanceof Error ? e.message : String(e) }
  }
}

/** An isolated iframe document for the preview pane (styles don't leak). */
export function previewSrcDoc(result: PreviewResult): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    *{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    ${result.css}
  </style></head><body>${result.html}</body></html>`
}
