/**
 * Web-font registry + resolution for the Doc theme. The theme stores a font NAME
 * ("Poppins", "Playfair Display", "" = system) for `display` and `body`; this maps
 * a name → a real CSS stack (always ending in a clean system fallback, never an
 * accidental serif) and the Google Fonts spec to load. One source of truth shared
 * by the renderer (CSS vars), the editor canvas/preview, and the tenant SSR (link).
 */

import type { ThemeTokens } from "./schema"

const SYSTEM_SANS =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const SYSTEM_SERIF = "ui-serif, Georgia, Cambria, 'Times New Roman', serif"

interface FontDef {
  family: string
  serif?: boolean
  /** Google Fonts `family+weights` spec, e.g. "Inter:wght@400;500;600;700". */
  google: string
}

/** Curated, tasteful set — sans for body/UI, serif/display for headings. */
export const FONTS: Record<string, FontDef> = {
  // sans
  Inter: { family: "Inter", google: "Inter:wght@400;500;600;700;800;900" },
  "DM Sans": { family: "DM Sans", google: "DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700" },
  Poppins: { family: "Poppins", google: "Poppins:wght@400;500;600;700;800" },
  Montserrat: { family: "Montserrat", google: "Montserrat:wght@400;500;600;700;800" },
  "Space Grotesk": { family: "Space Grotesk", google: "Space+Grotesk:wght@400;500;600;700" },
  "Plus Jakarta Sans": { family: "Plus Jakarta Sans", google: "Plus+Jakarta+Sans:wght@400;500;600;700;800" },
  Manrope: { family: "Manrope", google: "Manrope:wght@400;500;600;700;800" },
  Sora: { family: "Sora", google: "Sora:wght@400;500;600;700;800" },
  Figtree: { family: "Figtree", google: "Figtree:wght@400;500;600;700;800" },
  "Work Sans": { family: "Work Sans", google: "Work+Sans:wght@400;500;600;700;800" },
  // serif / display
  "Playfair Display": { family: "Playfair Display", serif: true, google: "Playfair+Display:wght@500;600;700;800" },
  Lora: { family: "Lora", serif: true, google: "Lora:wght@400;500;600;700" },
  Fraunces: { family: "Fraunces", serif: true, google: "Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700" },
  "DM Serif Display": { family: "DM Serif Display", serif: true, google: "DM+Serif+Display:ital@0;1" },
  "Instrument Serif": { family: "Instrument Serif", serif: true, google: "Instrument+Serif:ital@0;1" },
}

/** Names for the Variables font picker (System first). */
export const FONT_OPTIONS: string[] = Object.keys(FONTS)

const def = (name?: string | null): FontDef | undefined => (name ? FONTS[name.trim()] : undefined)

/** A name → full CSS font-family stack (clean system fallback if unknown). */
export function fontStack(name?: string | null, serifFallback = false): string {
  const d = def(name)
  if (!d) return serifFallback ? SYSTEM_SERIF : SYSTEM_SANS
  return `'${d.family}', ${d.serif ? SYSTEM_SERIF : SYSTEM_SANS}`
}

/** Resolved display/body stacks for the theme (display falls back to serif). */
export function themeFontStacks(theme: ThemeTokens): { display: string; body: string } {
  return {
    display: fontStack(theme.fonts?.display, true),
    body: fontStack(theme.fonts?.body, false),
  }
}

/** One Google Fonts stylesheet URL loading the theme's display + body faces (or
 * null if both are system). Hosts inject this as a <link>/@import. */
export function themeFontHref(theme: ThemeTokens): string | null {
  const specs = new Set<string>()
  for (const name of [theme.fonts?.display, theme.fonts?.body]) {
    const d = def(name)
    if (d) specs.add(d.google)
  }
  if (specs.size === 0) return null
  const families = [...specs].map((s) => `family=${s}`).join("&")
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}
