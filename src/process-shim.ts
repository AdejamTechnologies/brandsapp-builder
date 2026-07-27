// `unocss-preset-daisy` bundles autoprefixer, whose `gridStatus` reads
// `process.env.AUTOPREFIXER_GRID`. The browser has no `process`, so
// `generateUtilityCss` would throw in the canvas — dropping every UnoCSS
// utility (bg-primary, text-base-content, …) and leaving content mis-styled
// (the chrome's Tailwind then wrongly supplies bg-primary from a shadcn token).
// A minimal shim keeps utility generation working in the browser.
/* eslint-disable @typescript-eslint/no-explicit-any */
if (!(globalThis as any).process) (globalThis as any).process = { env: {} }
export {}
