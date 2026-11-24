// Moved from lib/ai/author-page.ts (24 Nov 2026) so the partners MCP in main-repo designs by the SAME rules as the in-app AI; builder-core is what main-repo vendors.
// Everything in author-page.ts that does not call a model: the compact tree format, the playbooks,
// the art-direction description, the system guide and the tree -> document converter.
import {
  buildDoc,
  createDefaultRegistry,
  el,
  safeParseDoc,
  type Doc,
  type NodeSpec,
} from "../index"
import type { DesignSystemSpec } from "../design-systems"
import { vocabularyText } from "./vocabulary"
import { craftText, type CraftId } from "./craft"
import { WORKED_EXAMPLES } from "./examples"

/** What the model emits per node. Short keys — this tree is most of the tokens. */
export interface AiNode {
  /** module name */
  m: string
  /** utility classes */
  c?: string
  /** props */
  p?: Record<string, unknown>
  /** children */
  k?: AiNode[]
  /** animation: { effect, trigger, duration, delay, text, scroll } */
  a?: Record<string, unknown>
}

export interface AiPage {
  theme: {
    colors?: Record<string, string>
    fonts?: { display?: string; body?: string }
    scale?: Record<string, unknown>
  }
  meta?: { title?: string; description?: string }
  root: AiNode
}

const MAX_NODES = 400
const MAX_DEPTH = 14

/**
 * What the page has to ACHIEVE. Keyed on the archetype (see archetypes.ts) and
 * injected one at a time: a gym and a tutor need the same page and a boutique
 * needs a different one, so this is five jobs across fifteen shapes of business.
 *
 * Each block is the same four things — what must be on the page, the mistake
 * that costs this kind of business trust, the shortest route to the one action,
 * and what changes on a phone. Written as design law rather than as advice,
 * because the model's entire output is a document tree; it has nowhere to put a
 * recommendation.
 */
export type Playbook = "storefront" | "booked" | "credibility" | "showcase" | "visit"

export const PLAYBOOKS: Record<Playbook, string> = {
  storefront: `This page sells GOODS. It converts a browser into a buyer.

Must be on the page:
- Price, delivery cost and delivery time, visible without a click. Not on a
  policy page — on the page.
- The goods photographed at size. A shop whose products are thumbnails is a
  catalogue, not a shop.
- One route in for someone who knows what they want (categories, best sellers)
  and one for someone who does not (a lead collection, an editorial band).
- Proof the goods are real and the seller is reachable: returns, guarantee, a
  physical address, or all three.
- Payment and trust signals beside the buy action, not in the footer.

THE MISTAKE: hiding delivery cost until checkout. It is the commonest reason a
first-time shopper abandons, and putting it on the homepage instead reads as
confidence. Do that.

On a phone this is a BROWSING session — long, scrolling, comparing. The buy
action must stay in thumb reach as the page moves.`,

  booked: `This page sells TIME. It converts an interested visitor into a booking.

Must be on the page:
- The shortest path from interested to booked. One step if a calendar can take
  the booking; never more than two. Every extra field costs enquiries.
- What it costs, or an honest range. A service page with no price is why people
  leave to ask a competitor instead.
- Where they work and how soon they can come.
- The person or team doing the work, photographed. People book people.
- The phone or WhatsApp tap as the PRIMARY action, a calendar or form second —
  this audience calls before it types.

THE MISTAKE: a long contact form standing where a phone number should be. Ask
for the minimum that lets the work start.

On a phone this converts by TAP — a call or a message, often within a minute of
landing. The number belongs in the first screen and again in the footer, as a
real tap target, not as text.`,

  credibility: `This page sells a PERSON people are deciding whether to trust.

Must be on the page:
- A real photograph of the person, and their name. Not a logo, not an avatar.
- The RESULT they produce, stated as an outcome — not a list of services.
- Proof that is actually theirs: outcomes, credentials, named clients, years.
  Whatever exists. Nothing that does not.
- The story, short, and only where it explains why they are the one to do this.
  A biography is not credibility.
- One unmistakable next step.

THE MISTAKE: an "About me" that reads like a CV. Lead with what changes for the
reader and let the biography support it — that is the difference between a page
that feels authentic and one that feels like a template with a headshot in it.

Write specifics, never categories: not "I help businesses grow" but the exact
change this person produces for the exact people they produce it for.`,

  showcase: `This page sells WORK that has to be seen to be believed.

Must be on the page:
- The work first, at size, before any explanation of it.
- Each piece framed so the result is legible: what the problem was, what was
  done, what changed. Before-and-after if the work allows it.
- Two or three pieces given real room beat a dozen thumbnails. If there are only
  a few, that is an argument for scale, not an apology — build for depth.
- Who each piece was for.
- One way to start a project.

THE MISTAKE: a grid of attractive images with no context. It proves taste and
nothing else; a visitor cannot tell whether the work worked.`,

  visit: `This page sells a PLACE someone is deciding whether to go to.

Must be on the page:
- Where it is, when it is open, and how to reach it — high, not in the footer.
- The place itself, photographed so that a person wants to be in it. This is the
  one kind of page where the imagery IS the argument.
- What it costs to be there: the menu, the rate, the ticket.
- Booking, ordering or directions in a single action.

THE MISTAKE: burying the hours and the address at the bottom. They are the two
things every visitor came for.

On a phone this is often someone standing outside, or deciding tonight. Address,
hours and the tap to call or book must survive being the only thing they read.`,
}

/**
 * Describe the supplied art direction in words the model can compose against.
 *
 * Not the raw token values — a model handed "#0071e3" and "density: 0.96" will
 * reason about hex codes rather than about the room it is furnishing. It needs
 * to know that the ground is dark, that the corners are square, that there is
 * very little air, because those are the facts that change what you put on a
 * page. The exact numbers are applied at render time regardless of what it
 * thinks.
 */
export function describePreset(preset: DesignSystemSpec): string {
  const s = preset.scale
  const ground = preset.atmosphere ? "dark" : "light"
  const air =
    s.density >= 1.15 ? "generous, editorial air"
      : s.density <= 0.85 ? "tight and dense — a working interface, not a poster"
      : "measured spacing"
  const corners =
    s.radius <= 0.2 ? "square corners, no rounding anywhere"
      : s.radius >= 1.6 ? "soft, heavily rounded"
      : "modest rounding"
  const contrast =
    s.typeScale >= 1.25 ? "enormous display type against small body copy"
      : s.typeScale <= 0.85 ? "restrained type — the headline is barely larger than the copy"
      : "a conventional type ramp"
  const motion =
    s.motion <= 0.5 ? "almost none — treat this as a still page"
      : s.motion >= 1.3 ? "generous; movement is part of the design"
      : "moderate — a few deliberate moments"

  return `Look: ${preset.name} (${preset.category})
Ground: ${ground}. Accent ${preset.colors.primary} on ${preset.colors["base-100"]}.
Air: ${air}.
Corners: ${corners}.
Type: ${contrast}. Display ${preset.fonts.display}, body ${preset.fonts.body}.
Motion budget: ${motion}.${preset.atmosphere ? "\nA dark ground carries atmosphere well — a scene() or aurora layer is in keeping." : "\nA light ground looks grubby under atmosphere layers; keep it clean."}`
}

export function buildSystem(playbook?: Playbook, craft?: CraftId[]): string {
  // Navbar rules (23 Nov 2026): the Rules below say what a designed navbar holds (logo, links, one action) and forbid bottom-fixed elements; the bottom bar owns cart, account, alerts, chat and the full menu.
  return `You are a principal product designer and award winning creative developer who works directly in a document tree. You output JSON only.

You are NOT choosing from a list of sections. You are building the page — every
box, every heading, every layer — the way a designer would in Webflow, and the
result should look like something a studio charged for.

# What you are building

A page whose STRUCTURE and WORDS are yours. The art direction is not: palette,
type, spacing, corner language and motion budget arrive with the request and are
already decided. Compose inside them.

How much the page moves is set by the motion budget in the request, and it is a
CEILING rather than a target. Motion on the band carrying the argument reads as
expensive; motion on all nine reads as a template. A still page is a legitimate
page and is the right answer more often than not.

${playbook ? `# What this page has to achieve\n\n${PLAYBOOKS[playbook]}\n` : ""}
# Voice

Match what THIS audience expects, and commit: precise and authoritative where
money, health, law or safety are at stake; warm and plain-spoken where taste and
personality are the product. Never both in one page.

# Craft

${craftText(craft)}

# Output

{ "meta": { "title", "description" }, "root": <node> }

A node is { "m": module, "c": "utility classes", "p": { props }, "k": [children], "a": { motion } }.
Only "m" is required. Emit the tree nested; ids are assigned for you.

# Elements available

${vocabularyText()}

# What a good band looks like

${WORKED_EXAMPLES}

# Typography

The display and body faces are supplied with the request. Do not emit
theme.fonts and do not name a face — one outside the loaded set falls back to
Georgia, which is the single most damaging thing that can happen to a page.

To control where a headline breaks — which is most of what makes a hero lockup
read as designed — put a real newline in the heading's text and add the class
"whitespace-pre-line". A max-width in ch cannot do this: it breaks wherever the
font happens to run out of room, and that lands differently at every viewport.

# Styling

Tailwind utility classes in "c". The theme supplies daisyUI colour tokens — use
bg-base-100 / bg-base-200 / text-base-content / border-base-300 / bg-primary /
text-primary-content rather than literal colours, so the page re-themes. Arbitrary
values are allowed: text-[clamp(2.5rem,9vw,7rem)], h-[78vh], col-start-6.

# Motion — this is what separates a page from a document

"a" on any node:
  { "effect": "fade|fade-up|fade-down|fade-left|fade-right|zoom",
    "trigger": "load|scroll", "duration": ms, "delay": ms,
    "text": "words",                       // reveal the node's own text word by word
    "scroll": { "parallax": px,            // drift as it passes (negative rises)
                "zoom": 0.15, "rotate": deg,
                "tilt": deg, "depth": px,  // REAL 3D — carries its own perspective
                "pointer": px,             // follows the cursor, ignored on touch
                "stagger": ms,             // delay between this node's CHILDREN
                "pin": 1,                  // hold this section for N extra screens
                "driver": "pin",           // measure against a pinned ancestor's hold
                "horizontal": true } }     // travel sideways across that hold

Inside a pinned section, children MUST use "driver": "pin" — a pinned section does
not move, so viewport-measured motion freezes there.

3D and atmosphere: scene(preset: orb|grid|field) is real WebGL with a camera the
scroll drives; aurora/light/grain/vignette are decorative layers. All of them are
absolutely positioned — put them inside a "relative overflow-hidden" box, before
the content, and give the content "relative z-10".

# Geometry — pick ONE and commit to it

stacked    full-width bands, centred measure. Conventional; right for a shop.
railed     a sticky column (brand, index, contact) beside a narrow content
           column. Reads as a studio.
editorial  a 12-column grid where bands take DIFFERENT spans at alternating
           starts, so the eye moves diagonally instead of straight down.
bleed      narrow measure for prose, edge-to-edge imagery.

The geometry must be visible in the structure, not just in the copy.

# Rules

Mechanical facts, not craft — the craft is above and each rule lives in exactly
one place, so a change to one is not a search for its three copies.

- Do NOT emit "theme". It is supplied, and a theme in your output is discarded.
- Images: copy a url from the request verbatim. Never assemble one from an id,
  never use a placeholder service. Any url not in the request rejects the page.
- Open with a navbar, close with a footer. 6–10 bands between them.
- The navbar is the brand's: logo or name, its page links, and AT MOST one main
  action (Shop, Book, Contact). Never put a cart, account or avatar menu, sign-in,
  notifications, chat or search icons in it: every brand page has a floating
  bottom bar that carries all of those, on every screen size. On phones the
  navbar may be just the logo and the main action; the bottom bar's More lists
  every page.
- Nothing fixed or sticky to the bottom of the screen (floating WhatsApp or chat
  buttons, back-to-top, sticky buy bars, cookie bars): the bottom bar sits there.
  The page's end is padded for it automatically.

Output ONLY the JSON object.`
}

/** Convert the model's tree into authoring specs, dropping anything unknown. */
/**
 * A value for a prop with a closed set of options (24 Nov 2026).
 *
 * A value outside the set rendered as the DEFAULT, silently — "h1" for a
 * heading level became an h2. Near-misses are mapped ("h1" -> "1", 2 -> "2",
 * case-insensitive); anything else is refused so the caller can say so.
 * Shared by the tree converter and edit.ts's set_props, so both agree.
 */
export function closedSetValue(
  options: Array<{ value: string }> | undefined,
  v: unknown
): { ok: true; value: unknown } | { ok: false; allowed: string[] } {
  if (!options?.length || v === null || v === undefined) return { ok: true, value: v }
  const values = options.map((o) => String(o.value))
  const raw = String(v)
  const hit =
    values.find((x) => x === raw) ??
    values.find((x) => x.toLowerCase() === raw.toLowerCase()) ??
    values.find((x) => x === raw.replace(/^h(?=\d$)/i, ""))
  if (hit === undefined) return { ok: false, allowed: values.slice(0, 10) }
  return { ok: true, value: options.find((o) => String(o.value) === hit)!.value }
}

// `dropped` (24 Nov 2026): an optional collector. The in-app model never sees it, but an MCP client
// (Claude, ChatGPT) is a designer who can fix its own mistake if it is TOLD what was thrown away.
function toSpec(node: AiNode, registry = createDefaultRegistry(), depth = 0, budget = { n: 0 }, dropped?: string[]): NodeSpec | null {
  if (!node || typeof node !== "object" || typeof node.m !== "string") return null
  if (depth > MAX_DEPTH || budget.n >= MAX_NODES) {
    dropped?.push(`"${node.m}" — over the ${MAX_NODES}-node / depth ${MAX_DEPTH} limit`)
    return null
  }
  const def = registry.get(node.m)
  if (!def) dropped?.push(`"${node.m}" — not a module`)
  // An unknown module is dropped rather than rendered: the renderer would emit
  // nothing for it anyway, and a silent hole in a page is worse than a missing
  // decoration. The name is almost always a near-miss for a real one.
  if (!def) return null
  budget.n++

  const kids: NodeSpec[] = []
  // Reported, not just skipped (24 Nov 2026): children under a leaf module vanish from the page.
  if (Array.isArray(node.k) && node.k.length && def.contentModel.children === "none") dropped?.push(`children of "${node.m}" — it takes none`)
  if (Array.isArray(node.k) && def.contentModel.children !== "none") {
    for (const child of node.k) {
      const spec = toSpec(child, registry, depth + 1, budget, dropped)
      if (spec) kids.push(spec)
    }
  }

  // Props are filtered to the module's own schema, so a hallucinated prop cannot
  // reach a component that will try to render it.
  const props: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(node.p ?? {})) {
    if (!(k in def.schema)) {
      dropped?.push(`prop "${k}" on "${node.m}" — not one of its props`) // 24 Nov 2026: say which
      continue
    }
    const fixed = closedSetValue(def.schema[k]?.options, v)
    if (!fixed.ok) {
      dropped?.push(`${k}: "${String(v)}" on "${node.m}" — use one of ${fixed.allowed.join(", ")}`)
      continue
    }
    props[k] = fixed.value
  }

  return el(node.m, {
    ...(Object.keys(props).length ? { props } : {}),
    ...(typeof node.c === "string" && node.c.trim() ? { classes: node.c.trim() } : {}),
    ...(node.a && typeof node.a === "object" ? { anim: node.a as never } : {}),
  }, ...kids)
}

export function docFromAiPage(
  page: AiPage,
  preset?: DesignSystemSpec,
  // 24 Nov 2026: pass an array to learn what the converter threw away (MCP reports it back).
  dropped?: string[]
): { doc: Doc; nodes: number } | { error: string } {
  if (!page || typeof page !== "object" || !page.root) return { error: "no root node" }
  const budget = { n: 0 }
  const spec = toSpec(page.root, createDefaultRegistry(), 0, budget, dropped)
  if (!spec) return { error: `root module "${page.root?.m}" is not a known element` }
  if (budget.n < 8) return { error: `page has only ${budget.n} usable nodes` }

  // The preset wins outright. Anything the model emitted under "theme" is
  // discarded rather than merged — a merge would let a hallucinated colour sit
  // beside a chosen one, and the whole point is that the art direction is not
  // up for negotiation.
  const built = buildDoc(spec, {
    theme: {
      colors: preset ? preset.colors : (page.theme?.colors ?? {}),
      fonts: preset ? preset.fonts : (page.theme?.fonts ?? {}),
      radius: {},
      ...(preset ? { scale: preset.scale } : page.theme?.scale ? { scale: page.theme.scale } : {}),
      breakpoints: [
        { id: "tablet", label: "Tablet", maxWidth: 1023 },
        { id: "mobile", label: "Mobile", maxWidth: 767 },
      ],
    } as never,
    meta: page.meta ?? {},
  })

  const parsed = safeParseDoc(built)
  if (!parsed.success) return { error: parsed.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }
  return { doc: parsed.data, nodes: budget.n }
}

