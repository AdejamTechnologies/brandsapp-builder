/**
 * Makes utility breakpoints respond to the CANVAS width instead of the browser
 * window.
 *
 * The canvas is an in-page React tree, not an iframe — a device preview is just
 * a fixed width on a wrapper div. The real viewport never changes, so every
 * `@media (min-width: 768px)` in the generated utility CSS keeps matching and a
 * `md:flex` row stays a row inside a 390px phone frame. That is why a navbar
 * looked identical at every breakpoint and overflowed the frame.
 *
 * So before injecting the CSS we evaluate its width queries ourselves against
 * the simulated width: a matching block is UNWRAPPED (its rules apply flat) and
 * a non-matching one is dropped. Unwrapping in place keeps source order, so the
 * cascade resolves exactly as it would at that real viewport width.
 *
 * Queries that aren't about width — `prefers-reduced-motion`, `hover`, `print` —
 * are passed through untouched: they describe the visitor's device, which the
 * canvas is not simulating, and dropping them would silently change behaviour.
 */

/** Split `(min-width: 768px)` style conditions and test them against `width`. */
function evaluateWidthQuery(condition: string, width: number): boolean | null {
  const cleaned = condition.trim().toLowerCase()
  // A comma is a query LIST (an OR). Any arm matching is a match, but bail out
  // unless every arm is width-only, so a mixed list is never half-understood.
  const arms = cleaned.split(",")
  let sawWidth = false
  let matched = false

  for (const arm of arms) {
    const terms = arm.split(/\band\b/).map((t) => t.trim()).filter(Boolean)
    let armMatches = true
    for (const term of terms) {
      if (term === "screen" || term === "all") continue
      const m = /^\(\s*(min|max)-width\s*:\s*([\d.]+)px\s*\)$/.exec(term)
      if (!m) return null // not a pure width query — leave the block alone
      sawWidth = true
      const bound = Number(m[2])
      if (m[1] === "min" ? width < bound : width > bound) armMatches = false
    }
    if (armMatches) matched = true
  }
  return sawWidth ? matched : null
}

/**
 * Rewrite `css` as it would apply at a viewport of `width` px. Returns the input
 * unchanged when `width` is undefined (desktop = the real window, no simulation).
 */
export function flattenMediaForWidth(css: string, width?: number): string {
  if (!width || !css.includes("@media")) return css

  let out = ""
  let i = 0
  while (i < css.length) {
    const at = css.indexOf("@media", i)
    if (at === -1) {
      out += css.slice(i)
      break
    }
    out += css.slice(i, at)

    const open = css.indexOf("{", at)
    if (open === -1) {
      out += css.slice(at)
      break
    }
    const condition = css.slice(at + "@media".length, open)

    // Walk to the matching close brace so nested blocks don't end it early.
    let depth = 1
    let j = open + 1
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++
      else if (css[j] === "}") depth--
      j++
    }
    const body = css.slice(open + 1, j - 1)

    const verdict = evaluateWidthQuery(condition, width)
    if (verdict === null) out += css.slice(at, j) // not width-based — keep as authored
    else if (verdict) out += body // matches at this width — apply flat
    // else: dropped

    i = j
  }
  return out
}
