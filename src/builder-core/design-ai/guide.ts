// New file (24 Nov 2026): the design guide an outside designer (Claude, ChatGPT through the
// partners MCP) works from. Assembled from the SAME pieces the in-app AI author uses —
// vocabulary, craft, worked examples, playbooks, art-direction description — so a page
// designed in Claude obeys the rules a page designed in the builder does.
//
// What differs is only the plumbing: the in-app model returns JSON to our code, while an
// MCP client sends its tree to the `create_page` tool. The guide says so up front and
// lets everything else stand as written.

import { DESIGN_SYSTEMS, type DesignSystemSpec } from "../design-systems"
import { buildSystem, describePreset, PLAYBOOKS, type Playbook } from "./author"
import { inferImageCategory, STOCK_IMAGES, type ImageCategory } from "./stock-images"

export const PLAYBOOK_IDS = Object.keys(PLAYBOOKS) as Playbook[]

/**
 * The look in plain words, derived from the scale (24 Nov 2026) — so a
 * designer can search "dark rounded lively" instead of guessing ids. Same
 * thresholds as `describePreset` in author.ts.
 */
function feelOf(d: DesignSystemSpec): string {
  const s = d.scale
  return [
    d.atmosphere ? "dark" : "light",
    s.radius <= 0.2 ? "sharp" : s.radius >= 1.6 ? "rounded soft" : "modest-corners",
    s.density >= 1.15 ? "airy editorial" : s.density <= 0.85 ? "dense compact" : "balanced",
    s.typeScale >= 1.25 ? "big-type dramatic" : s.typeScale <= 0.85 ? "restrained-type quiet" : "",
    s.motion <= 0.5 ? "still calm" : s.motion >= 1.3 ? "lively animated" : "",
    /serif|garamond|playfair|lora|fraunces|cormorant|dm serif/i.test(d.fonts.display) ? "serif classic elegant" : "sans modern",
  ]
    .filter(Boolean)
    .join(" ")
}

/** One line per design system, for choosing. 127 of them, so it stays terse. */
export function designSystemList(filter?: string): Array<{
  id: string
  name: string
  category: string
  ground: "dark" | "light"
  feel: string
  accent: string
  fonts: string
}> {
  // Every word must match somewhere (24 Nov 2026) — "dark serif" narrows, it does not widen.
  const words = (filter ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean)
  return Object.values(DESIGN_SYSTEMS)
    .map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      ground: (d.atmosphere ? "dark" : "light") as "dark" | "light",
      feel: feelOf(d),
      accent: d.colors.primary ?? "",
      fonts: `${d.fonts.display} / ${d.fonts.body}`,
    }))
    .filter((d) => {
      const hay = `${d.id} ${d.name} ${d.category} ${d.feel} ${d.fonts}`.toLowerCase()
      return words.every((w) => hay.includes(w))
    })
}

export function designSystem(id: string | undefined | null): DesignSystemSpec | undefined {
  return id ? DESIGN_SYSTEMS[id] : undefined
}

/** Every verified stock photo, as full urls. The only pictures a pitch page may use. */
export function allStockImageUrls(): string[] {
  const out = new Set<string>()
  for (const cat of Object.values(STOCK_IMAGES)) for (const u of [...cat.hero, ...cat.gallery, ...cat.team]) out.add(u)
  return [...out]
}

/** The photos for one kind of business, labelled by slot. */
export function stockImagesFor(text: string, category?: ImageCategory): { category: ImageCategory; hero: string[]; gallery: string[]; team: string[] } {
  const cat = category && STOCK_IMAGES[category] ? category : inferImageCategory(text)
  return { category: cat, ...STOCK_IMAGES[cat] }
}

/**
 * The whole guide, as one text.
 *
 * `buildSystem` is the in-app author's system prompt, used verbatim, with a
 * short preface that translates its plumbing ("output JSON") into the tool's
 * ("send this as `root` to create_page").
 */
export function mcpDesignGuide(input: {
  playbook?: Playbook
  designSystemId?: string
  businessText?: string
}): string {
  const preset = designSystem(input.designSystemId)
  const images = stockImagesFor(input.businessText ?? "")
  return `# How this works through the BrandsApp tools

You are designing a BrandsApp pitch page. Everything below is the brief our own
page author works from; read "output JSON" as "the object you pass to the
create_page tool": { "meta": {...}, "root": <node> }, plus "design_system"
(an id) and "playbook". The tool validates the tree, renders it with the same
engine a brand's live site uses, runs the quality gate, and saves a new version.

If the tool returns findings, fix them and call create_page (or edit_page) again.
A finding is a reason the page would look like a template or tell a lie — treat
"hard" ones as blocking.

The design system decides colour, type, spacing, corners and motion budget. Pick
one with list_design_systems, then compose inside it. Do not send a theme.

${preset ? `# The art direction you picked\n\n${describePreset(preset)}\n` : "# Art direction\n\nNo design system chosen yet — call list_design_systems and pass one as design_system.\n"}
# Pictures you may use (${images.category}) — copy these urls exactly

hero:
${images.hero.map((u) => `  ${u}`).join("\n")}
gallery:
${images.gallery.map((u) => `  ${u}`).join("\n")}
team:
${images.team.map((u) => `  ${u}`).join("\n")}

Any other url is refused, unless the agency's brief itself contains it (the
business's own photos). get_design_guide with image_category gives another set.

# Interaction states — how a page answers a hand

Entrance and scroll motion are below under "Motion". What a page does when it
is touched lives in the classes, as Tailwind variants, and is generated for
you (added 24 Nov 2026):
  hover:   "transition duration-300 hover:-translate-y-1 hover:shadow-xl"
  press:   "active:scale-95"
  reveal on hover of a parent: parent "group", child "opacity-0 group-hover:opacity-100 transition"
  image zoom in a card: card "group overflow-hidden", image "transition duration-500 group-hover:scale-105"
Use them on things a visitor can act on — buttons, cards that link, gallery
tiles. A page where nothing responds to the cursor reads as a document.

${buildSystem(input.playbook)}`
}
