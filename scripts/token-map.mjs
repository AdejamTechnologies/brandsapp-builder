/**
 * Single source of truth for remapping hardcoded Tailwind palette classes
 * (gray/slate/zinc/white/black + indigo/blue/violet/purple/sky accents) in the
 * HyperUI/Meraki block library HTML into daisyUI semantic design tokens, so
 * blocks recolor with the page theme instead of being stuck on gray/indigo.
 *
 * Used by both scripts/tokenize-blocks.mjs (one-shot rewrite of the checked-in
 * src/lib/blocks-data.json) and scripts/gen-blocks.mjs (so freshly generated
 * blocks come out pre-tokenized too).
 */

// gray/slate/zinc are treated identically everywhere.
const GRAY_ALIASES = ["gray", "slate", "zinc"]

const expandGrayAliases = (map) => {
  const out = { ...map }
  for (const [key, value] of Object.entries(map)) {
    if (!key.includes("gray-")) continue
    for (const alias of GRAY_ALIASES) {
      if (alias === "gray") continue
      out[key.replace("gray-", `${alias}-`)] = value
    }
  }
  return out
}

// --- Neutral surfaces / borders / rings / divides — context independent ---
const NEUTRAL_MAP = expandGrayAliases({
  "bg-white": "bg-base-100",
  "bg-gray-50": "bg-base-200",
  "bg-gray-100": "bg-base-200",
  "bg-gray-200": "bg-base-300",
  "bg-gray-300": "bg-base-300",
  "bg-gray-600": "bg-neutral",
  "bg-gray-700": "bg-neutral",
  "bg-gray-800": "bg-neutral",
  "bg-gray-900": "bg-neutral",
  "bg-black": "bg-neutral",

  "border-white": "border-neutral-content/20",
  "border-gray-100": "border-base-300",
  "border-gray-200": "border-base-300",
  "border-gray-300": "border-base-300",
  "border-gray-400": "border-base-300",
  "border-gray-600": "border-base-300",
  "border-gray-700": "border-base-300",

  "ring-white": "ring-neutral-content/30",
  "ring-gray-200": "ring-base-300",
  "ring-gray-300": "ring-base-300",
  "ring-gray-600": "ring-base-300",
  "ring-gray-700": "ring-base-300",
  "ring-gray-900": "ring-base-content/20",

  "divide-gray-200": "divide-base-300",
  "divide-gray-300": "divide-base-300",
  "divide-gray-700": "divide-base-300",

  "placeholder-gray-400": "placeholder-base-content/40",
})

// --- Text — depends on whether the block as a whole is "dark" ---
const TEXT_LIGHT_MAP = expandGrayAliases({
  "text-gray-900": "text-base-content",
  "text-gray-800": "text-base-content",
  "text-gray-700": "text-base-content/80",
  "text-gray-600": "text-base-content/70",
  "text-gray-500": "text-base-content/60",
  "text-gray-400": "text-base-content/50",
  "text-gray-300": "text-base-content/40",
  "text-gray-200": "text-base-content/30",
  "text-gray-100": "text-base-content/20",
  "text-white": "text-neutral-content",
})

const TEXT_DARK_MAP = expandGrayAliases({
  "text-white": "text-neutral-content",
  "text-gray-100": "text-neutral-content",
  "text-gray-200": "text-neutral-content/80",
  "text-gray-300": "text-neutral-content/70",
  "text-gray-400": "text-neutral-content/60",
  "text-gray-500": "text-neutral-content/50",
  "text-gray-600": "text-neutral-content/50",
  "text-gray-700": "text-neutral-content/40",
  "text-gray-800": "text-base-content",
  "text-gray-900": "text-base-content",
})

// --- Accent → primary (themeable CTAs) ---
const ACCENT_HUES = ["indigo", "blue", "violet", "purple", "sky"]
const ACCENT_MAP = {}
for (const hue of ACCENT_HUES) {
  for (const shade of [500, 600, 700, 800]) ACCENT_MAP[`bg-${hue}-${shade}`] = "bg-primary"
  for (const shade of [500, 600, 700]) {
    ACCENT_MAP[`text-${hue}-${shade}`] = "text-primary"
    ACCENT_MAP[`border-${hue}-${shade}`] = "border-primary"
  }
  for (const shade of [500, 600]) ACCENT_MAP[`ring-${hue}-${shade}`] = "ring-primary"
}

// Bases that never depend on block-darkness (neutral surfaces + accents).
const BASE_MAP = { ...NEUTRAL_MAP, ...ACCENT_MAP }

const CLASS_ATTR_RE = /class="([^"]*)"/g

/** A block counts as "dark" if it has a bare (unprefixed) dark-surface bg class. */
function computeIsDark(html) {
  let match
  CLASS_ATTR_RE.lastIndex = 0
  while ((match = CLASS_ATTR_RE.exec(html))) {
    const tokens = match[1].split(/\s+/).filter(Boolean)
    for (const tok of tokens) {
      if (tok === "bg-gray-800" || tok === "bg-gray-900" || tok === "bg-black") return true
    }
  }
  return false
}

/** Split a class token into its variant-prefix chain (e.g. "dark:hover:") and its base utility. */
function splitPrefix(token) {
  const idx = token.lastIndexOf(":")
  if (idx === -1) return { prefix: "", base: token }
  return { prefix: token.slice(0, idx + 1), base: token.slice(idx + 1) }
}

function mapToken(token, textMap) {
  const { prefix, base } = splitPrefix(token)

  // Gradient stops are left untouched regardless of hue.
  if (base.startsWith("from-") || base.startsWith("to-") || base.startsWith("via-")) return token

  const mapped = BASE_MAP[base] ?? textMap[base]
  if (!mapped) return token
  return prefix + mapped
}

/**
 * Rewrite every class="..." attribute in `html`, remapping hardcoded palette
 * classes to daisyUI semantic tokens. Idempotent: already-tokenized classes
 * (bg-base-100, text-primary, etc.) never match a table base, so re-running
 * this is a no-op.
 */
export function tokenizeClasses(html) {
  const isDark = computeIsDark(html)
  const textMap = isDark ? TEXT_DARK_MAP : TEXT_LIGHT_MAP
  return html.replace(CLASS_ATTR_RE, (full, classList) => {
    const tokens = classList.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return full
    return `class="${tokens.map((tok) => mapToken(tok, textMap)).join(" ")}"`
  })
}

export { NEUTRAL_MAP, TEXT_LIGHT_MAP, TEXT_DARK_MAP, ACCENT_MAP, computeIsDark }
