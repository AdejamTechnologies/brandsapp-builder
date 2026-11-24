// Moved from lib/ai/slop-gate.ts (24 Nov 2026) so the partners MCP in main-repo designs by the SAME rules as the in-app AI; builder-core is what main-repo vendors.
/**
 * The check that makes "never again" mean something.
 *
 * A prompt is advice. It can say "never write Lorem", "never invent a
 * statistic", "spend motion where it means something" — and a model will
 * mostly comply, which is exactly the problem: mostly is the failure rate you
 * ship. Everything in here is a rule the prompt already states and that nobody
 * could previously verify had been followed.
 *
 * `safeParseDoc` already rejects a document that is malformed. This is the same
 * idea moved one level up: from VALID to ACCEPTABLE. A failure is not an error
 * shown to an owner — it is a regeneration, with the specific complaint fed
 * back, exactly like the existing repair round for bad JSON.
 *
 * ── Why a fingerprint ────────────────────────────────────────────────────────
 * Slop is not ugliness. Every page this thing produced was individually
 * defensible; they were only damning side by side. "Looks like all the others"
 * is a comparison, so it can be measured — and anything measurable can be
 * refused. The structural fingerprint is the one check here that could not be
 * expressed as a prompt instruction at all, because the model cannot see the
 * other pages.
 */

import type { Doc, Node } from "../index"
import type { DesignSystemSpec } from "../design-systems"

export interface SlopFinding {
  /** Stable id, so a repeat offender can be tracked rather than re-discovered. */
  rule: string
  /** Fed back to the model verbatim. Written as an instruction, not a grievance. */
  message: string
  /** hard = regenerate. soft = record, ship anyway. */
  severity: "hard" | "soft"
}

/**
 * Phrases that survive being moved to a competitor's site.
 *
 * The prompt already asks for copy only this business could have written; this
 * is the list of things that get written instead when a model has nothing
 * specific to say. Deliberately narrow — a broad list would reject real copy,
 * and a false rejection costs a regeneration and teaches nothing.
 */
const EMPTY_PHRASES = [
  "lorem ipsum",
  "your tagline here",
  "your text here",
  "elevate your",
  "unlock the power",
  "take your business to the next level",
  "seamlessly integrate",
  "one-stop shop",
  "world-class",
  "cutting-edge solutions",
  "we are passionate about",
  "your trusted partner",
  "best-in-class",
  "revolutionize",
  "empowering you to",
]

/**
 * A number presented as a claim.
 *
 * The prompt forbids inventing statistics, and this is what an invented one
 * looks like: a round figure with a plus, or a percentage, attached to nothing
 * the brief supplied. Checked against the brief's own text so a real figure the
 * owner gave us passes untouched.
 */
const STAT_SHAPES = [
  /\b\d{1,3}(,\d{3})*\+\s/i,
  /\b\d{2,3}%/,
  /\b\d+(\.\d+)?\s*(million|billion|k\+)\b/i,
  /\b\d+\s*(happy|satisfied)\s+(customers|clients)/i,
]

function collectText(doc: Doc): string {
  const out: string[] = []
  for (const node of Object.values(doc.nodes) as Node[]) {
    for (const key of ["text", "label", "title", "eyebrow", "subtitle"]) {
      const v = (node.props as Record<string, unknown>)?.[key]
      if (typeof v === "string" && v.trim()) out.push(v)
    }
  }
  return out.join("\n")
}

/**
 * What a page IS, structurally.
 *
 * The first version recorded module name and child count, which for a page made
 * of `section` bands is almost the same string every time — so two genuinely
 * different pages read as a 100% match and a real duplicate would have too. A
 * fingerprint that cannot tell a photographic hero from a plain list is not
 * measuring sameness, it is measuring band count.
 *
 * This records what a READER would notice about each band: does it carry
 * imagery, roughly how much copy, is it pinned, does it travel sideways, is it
 * deeply nested. Counts are bucketed, because two pages are not different
 * because one has seven paragraphs and the other eight.
 *
 * Still excludes copy and colour: two pages with different words and the same
 * skeleton are exactly what this exists to catch.
 */
export function structuralFingerprint(doc: Doc): string {
  const root = doc.nodes[doc.rootId]

  /** What KIND of band this is, in the terms a reader would notice. */
  const describe = (id: string): string => {
    const node = doc.nodes[id]
    if (!node) return "?"

    let media = 0
    let text = 0
    let pinned = false
    let horizontal = false
    let depth = 0

    const walk = (nid: string, d: number) => {
      const n = doc.nodes[nid]
      if (!n) return
      depth = Math.max(depth, d)
      if (n.module === "image" || n.module === "video" || n.module === "scene") media++
      if (n.module === "text" || n.module === "heading") text++
      if (n.module === "horizontal") horizontal = true
      const scroll = (n.anim as { scroll?: Record<string, unknown> } | undefined)?.scroll
      if (scroll?.pin) pinned = true
      for (const c of n.children ?? []) walk(c, d + 1)
    }
    walk(id, 0)

    // Buckets, not exact counts: two pages are not different because one has
    // seven paragraphs and the other eight.
    const t = text === 0 ? "0" : text <= 3 ? "s" : text <= 8 ? "m" : "l"
    const m = media === 0 ? "" : media === 1 ? "i" : "I"
    return `${node.module}${m}${t}${pinned ? "P" : ""}${horizontal ? "H" : ""}${depth > 4 ? "+" : ""}`
  }

  return (root?.children ?? []).map(describe).join(">")
}

/** How close two skeletons are, 0 (unrelated) to 1 (identical). */
export function fingerprintSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const x = a.split(">")
  const y = b.split(">")
  if (!x.length || !y.length) return 0
  // Longest common subsequence over bands — order matters, because two pages
  // with the same sections in a different order do read as different pages.
  const dp: number[][] = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0))
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      dp[i]![j]! = x[i - 1] === y[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
    }
  }
  return (2 * dp[x.length]![y.length]!) / (x.length + y.length)
}

export interface GateInput {
  doc: Doc
  /** The art direction that was SUPPLIED. Drift from it is a hard failure. */
  preset: DesignSystemSpec
  /** Everything the owner told us, so a real figure of theirs is not rejected. */
  briefText: string
  /** Unsplash ids the page was allowed to use. */
  allowedImages: string[]
  /** Fingerprints of pages already generated — for this trade, or this tenant. */
  priorFingerprints?: string[]
  /** Above this, the page is too much like one we already made. */
  similarityCeiling?: number
}

/**
 * Judge a generated page. Empty result = ship it.
 */
export function checkForSlop(input: GateInput): SlopFinding[] {
  const findings: SlopFinding[] = []
  const { doc, preset } = input
  const nodes = Object.values(doc.nodes) as Node[]
  const text = collectText(doc)
  const lower = text.toLowerCase()
  const brief = input.briefText.toLowerCase()

  // ── copy ──────────────────────────────────────────────────────────────────
  for (const phrase of EMPTY_PHRASES) {
    if (lower.includes(phrase)) {
      findings.push({
        rule: "empty-phrase",
        severity: "hard",
        message: `The copy contains "${phrase}", which would read identically on a competitor's site. Replace it with something only this business could say.`,
      })
    }
  }

  for (const shape of STAT_SHAPES) {
    const m = shape.exec(text)
    // A figure the owner gave us is theirs to use; one that appears only in the
    // output was invented, and an invented statistic is a lie we published.
    if (m && !brief.includes(m[0].trim().toLowerCase())) {
      findings.push({
        rule: "invented-statistic",
        severity: "hard",
        message: `"${m[0].trim()}" is a statistic that was not in the brief. Remove it, or rebuild the section so it does not need a number.`,
      })
      break
    }
  }

  // ── art direction ─────────────────────────────────────────────────────────
  const fonts = doc.theme?.fonts ?? {}
  if (fonts.display !== preset.fonts.display || fonts.body !== preset.fonts.body) {
    findings.push({
      rule: "theme-drift",
      severity: "hard",
      message: "The typography does not match the supplied look. Do not emit theme.",
    })
  }
  if ((doc.theme?.colors ?? {}).primary !== preset.colors.primary) {
    findings.push({
      rule: "theme-drift",
      severity: "hard",
      message: "The palette does not match the supplied look. Do not emit theme.",
    })
  }

  // ── motion budget ─────────────────────────────────────────────────────────
  // The prompt says motion on every band reads as a template. This is that
  // sentence as arithmetic.
  const animated = nodes.filter((n) => n.anim).length
  const share = nodes.length ? animated / nodes.length : 0
  const ceiling = preset.scale.motion === 0 ? 0 : preset.scale.motion >= 1.3 ? 0.45 : 0.3
  if (share > ceiling) {
    findings.push({
      rule: "motion-budget",
      severity: "hard",
      message:
        preset.scale.motion === 0
          ? "This is a still page and must carry no animation at all. Remove every \"a\" annotation."
          : `${Math.round(share * 100)}% of the page is animated. Keep it under ${Math.round(ceiling * 100)}% — animate only the bands that carry the argument.`,
    })
  }

  // ── the bottom of the screen belongs to the bottom bar ───────────────────
  //
  // Navbar rules (23 Nov 2026). Every brand page has a floating bottom bar, so
  // anything pinned to the bottom of the viewport (a floating WhatsApp button,
  // back-to-top, a sticky buy bar) lands on top of it. The prompt says so; this
  // makes it stick. `fixed` together with a `bottom-*` utility, at any breakpoint
  // (a full-screen `fixed inset-0` menu overlay is fine and not matched).
  const pinnedLow = nodes.filter((n) => {
    const c = ` ${n.classes ?? ""} `
    return /\s(?:[a-z0-9]+:)*fixed\s/.test(c) && /\s(?:[a-z0-9]+:)*bottom-/.test(c)
  }).length
  if (pinnedLow > 0) {
    findings.push({
      rule: "pinned-to-bottom",
      severity: "hard",
      message:
        "Something is fixed to the bottom of the screen. Every brand page has a floating bottom bar there (with WhatsApp, cart and account), so remove it or make it part of the page flow.",
    })
  }

  // ── images ────────────────────────────────────────────────────────────────
  //
  // ANY remote image, not just Unsplash ones. The first version inspected
  // `images.unsplash.com` and nothing else, so when a model invented
  // `picsum.photos/seed/...` — a placeholder service — the check looked straight
  // past it and the page shipped with a random stock photo standing in for a
  // real one. The rule is that a page may only use the pictures it was given;
  // the host it invents them from is not the point.
  if (input.allowedImages.length) {
    const allowed = new Set(input.allowedImages.map((i) => i.replace(/^photo-/, "")))
    for (const node of nodes) {
      const src = (node.props as Record<string, unknown>)?.src
      if (typeof src !== "string" || !/^https?:/.test(src)) continue
      const id = /photo-([\w-]+)/.exec(src)?.[1]
      if (id && allowed.has(id)) continue
      findings.push({
        rule: "unlisted-image",
        severity: "hard",
        message: `The image "${src.slice(0, 70)}" was not in the supplied list. Use only the photo ids given, and never a placeholder service.`,
      })
      break
    }
  }

  // ── structure ─────────────────────────────────────────────────────────────
  const bands = (doc.nodes[doc.rootId]?.children ?? []).length
  if (bands < 4) {
    findings.push({
      rule: "too-thin",
      severity: "hard",
      message: `The page has only ${bands} top-level sections. Build 6–10 between the navbar and the footer.`,
    })
  }


  // ── the shapes every generated page reaches for ──────────────────────────
  //
  // `anti-ai-slop` names these in the prompt and, until now, claimed an
  // enforcement it did not have: its enforcedBy listed empty-phrase and
  // too-similar, neither of which can see a three-card row. So the model was
  // told not to build one and built one on every page, and the gate signed it
  // off. This is that rule made real.
  //
  // A trio is not banned outright — three genuine things are three things. What
  // is caught is the SHAPE repeated: several sibling groups of exactly three,
  // each a heading and a paragraph, which is the feature-grid the model falls
  // back on when it has not decided what the page is for.
  const triples = (() => {
    let count = 0
    for (const node of nodes) {
      const kids = (node.children ?? []).map((id) => doc.nodes[id]).filter(Boolean) as Node[]
      if (kids.length !== 3) continue
      const uniform = kids.every((k) => {
        const inner = (k.children ?? []).map((id) => doc.nodes[id]).filter(Boolean) as Node[]
        if (inner.length < 2 || inner.length > 3) return false
        return (
          inner.some((n) => n.module === "heading") &&
          inner.some((n) => n.module === "text")
        )
      })
      if (uniform) count++
    }
    return count
  })()
  if (triples >= 2) {
    findings.push({
      rule: "template-shape",
      severity: "hard",
      message: `The page uses the same three-card heading-and-paragraph row ${triples} times. That grid is what gets built when a page has not decided what it is for — say the thing once, at the size it deserves, and cut the rest.`,
    })
  }

  // Every band the same height and the same contents is a page with no
  // hierarchy: nothing is more important than anything else, which is the
  // visual signature of generated work.
  const bandKinds = new Set(
    (doc.nodes[doc.rootId]?.children ?? []).map((id) => {
      const n = doc.nodes[id]
      if (!n) return "?"
      const kids = (n.children ?? []).length
      return `${n.module}:${kids}`
    })
  )
  const bandCount = (doc.nodes[doc.rootId]?.children ?? []).length
  if (bandCount >= 6 && bandKinds.size <= 2) {
    findings.push({
      rule: "template-shape",
      severity: "hard",
      message: `All ${bandCount} sections are built the same way. Give the page a shape: one band should dominate, and at least one should be structurally unlike the others.`,
    })
  }

  // ── sameness ──────────────────────────────────────────────────────────────
  // The one check no prompt could ever make, because the model cannot see the
  // pages that came before this one.
  const ceilingSim = input.similarityCeiling ?? 0.82
  const fp = structuralFingerprint(doc)
  for (const prior of input.priorFingerprints ?? []) {
    const sim = fingerprintSimilarity(fp, prior)
    if (sim >= ceilingSim) {
      findings.push({
        rule: "too-similar",
        severity: "hard",
        message: `This page has almost the same structure as one already built (${Math.round(sim * 100)}% match). Change the section order, the band count and the geometry — not the wording.`,
      })
      break
    }
  }

  return findings
}

/** The complaint fed back on a regeneration. */
export function repairInstruction(findings: SlopFinding[]): string {
  const hard = findings.filter((f) => f.severity === "hard")
  return [
    "The page was rejected. Fix every point and return the corrected COMPLETE JSON object:",
    ...hard.map((f, i) => `${i + 1}. ${f.message}`),
  ].join("\n")
}
