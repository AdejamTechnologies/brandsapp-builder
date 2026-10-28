/**
 * Render a local demo page to a standalone HTML file — the same way it
 * publishes (isEditor: false), so a page can be eyeballed, screenshotted or
 * diffed without starting the dev server or driving a browser.
 *
 *   node_modules/.bin/tsx scripts/render-demo.mts bolt out/bolt.html
 *
 * It is deliberately the PUBLISH path: renderDoc + generateUtilityCss + the
 * same runtime scripts the preview route injects. If a page looks right here it
 * looks right on a tenant.
 */

import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import {
  ANIMATION_LOADER,
  BUILDER_RUNTIME,
  CHALLENGE_LOADER,
  LIGHTBOX_RUNTIME,
  SCENE_LOADER,
  SHADER_LOADER,
  createDefaultRegistry,
  generateUtilityCss,
  renderDoc,
  themeFontHref,
  parseDoc,
} from "@brandsapp/builder-core"

import { docFor } from "../src/lib/demo-docs"

const [pageId = "bolt", outArg = `out/${pageId}.html`] = process.argv.slice(2)

const doc = parseDoc(docFor(pageId))
const result = renderDoc(doc, { registry: createDefaultRegistry(), isEditor: false })
const utilCss = await generateUtilityCss(result.classes)
const fontHref = themeFontHref(doc.theme)

if (result.missing.length) {
  console.error(`  ! modules missing from the registry: ${result.missing.join(", ")}`)
}

// Same conditional injection the tenant host does: a loader only ships when the
// page actually contains the element it drives.
const runtime = result.usesRuntime
  ? [
      BUILDER_RUNTIME,
      /data-bapp-(lottie|spline|rive)/.test(result.html) ? ANIMATION_LOADER : "",
      /data-bapp-(challenge|form)/.test(result.html) ? CHALLENGE_LOADER : "",
      /data-bapp-lightbox/.test(result.html) ? LIGHTBOX_RUNTIME : "",
      /data-bapp-aurora/.test(result.html) ? SHADER_LOADER : "",
      /data-bapp-scene/.test(result.html) ? SCENE_LOADER : "",
    ]
      .filter(Boolean)
      .join("\n")
  : ""

const html = `<!doctype html>
<html lang="en-NG">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${doc.meta?.title ?? pageId}</title>
${doc.meta?.description ? `<meta name="description" content="${doc.meta.description.replace(/"/g, "&quot;")}">` : ""}
${fontHref ? `<link rel="stylesheet" href="${fontHref}">` : ""}
<style>*{box-sizing:border-box}body{margin:0}</style>
<style>${result.css}</style>
<style>@scope (.bapp-root) { ${utilCss} }</style>
</head>
<body>
${result.html}
${runtime ? `<script>${runtime}</script>` : ""}
</body>
</html>
`

const out = resolve(process.cwd(), outArg)
await mkdir(dirname(out), { recursive: true })
await writeFile(out, html, "utf8")
console.log(`  ${pageId} → ${out} (${(html.length / 1024).toFixed(0)} KB, ${result.classes.length} utility tokens)`)
