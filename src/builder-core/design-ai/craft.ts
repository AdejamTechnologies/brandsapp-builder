// Moved from lib/ai/craft.ts (24 Nov 2026) so the partners MCP in main-repo designs by the SAME rules as the in-app AI; builder-core is what main-repo vendors.
/**
 * The craft rules, as separate things instead of one long string.
 *
 * Every rule the generator obeys used to live inline in one prompt shared by
 * every page. That has three costs, and the third is the one that mattered:
 *
 *   1. Nothing is versioned. "Never imitate a specific site" changed meaning
 *      several times and no commit shows when or why.
 *   2. Nothing is reusable. The refine chat and the deterministic composer need
 *      the same rules and had their own approximations of them.
 *   3. Nothing is TESTABLE. A sentence in a string cannot be checked; a named
 *      rule with a machine-readable counterpart can. That is the difference
 *      between a prompt that asks and a system that enforces, and it is why the
 *      same failures kept coming back.
 *
 * Each module here is one idea, with the words that go into the prompt and —
 * where the idea can be verified at all — the id of the gate rule that proves
 * it. A module with no `enforcedBy` is honest about being advice.
 *
 * Modelled on Open Design's `craft.requires: [typography, color, anti-ai-slop,
 * laws-of-ux]`, which is the same idea: name the constraints so a template can
 * declare which ones apply, rather than restating them all every time.
 */

export type CraftId =
  | "specificity"
  | "anti-ai-slop"
  | "typography"
  | "restraint"
  | "motion-discipline"
  | "honesty"
  | "mobile-first"
  | "contrast"

export interface CraftModule {
  id: CraftId
  /** One line, for a picker or a log. */
  summary: string
  /** Verbatim into the system prompt. */
  text: string
  /**
   * The slop-gate rule that verifies this, when one can. Absent means the rule
   * is advice — worth saying, impossible to check, and labelled as such rather
   * than pretending otherwise.
   */
  enforcedBy?: string[]
}

export const CRAFT: Record<CraftId, CraftModule> = {
  specificity: {
    id: "specificity",
    summary: "Copy only this business could have written",
    enforcedBy: ["empty-phrase"],
    text: `Every sentence must be one only THIS business could have written.
Replace any line that would survive being moved to a competitor's site. Name
the street, the hours, the thing they actually make. "Quality service" is not a
claim, it is the absence of one.`,
  },

  "anti-ai-slop": {
    id: "anti-ai-slop",
    summary: "None of the tells that mark a page as generated",
    enforcedBy: ["empty-phrase", "too-similar", "template-shape"],
    text: `Do not write: "Elevate your", "Unlock the power of", "Seamlessly",
"Take your business to the next level", "one-stop shop", "world-class",
"best-in-class", "your trusted partner", "we are passionate about". These are
what gets written when there is nothing specific to say; say the specific thing
instead, or cut the section.

Do not reach for the shapes every generated page reaches for: three feature
cards with an icon each, a stats strip of round numbers, a testimonial from
nobody, a "trusted by" row of logos that do not exist. If the business has none
of these, the page is better without the band than with an invented one.`,
  },

  typography: {
    id: "typography",
    summary: "Type does the work, and the faces are supplied",
    enforcedBy: ["theme-drift"],
    text: `The display and body faces arrive with the request. Do not name a
face and do not emit theme.fonts — one outside the loaded set falls back to
Georgia, which is the single most damaging thing that can happen to a page.

Control where a headline BREAKS: put a real newline in the text and add
"whitespace-pre-line". That is most of what makes a hero lockup read as
designed, and a max-width in ch cannot do it — it breaks wherever the font runs
out of room, which lands differently at every viewport.`,
  },

  restraint: {
    id: "restraint",
    summary: "Premium is what you leave out",
    text: `Restraint and specificity, not more effects. Sites that read as
trustworthy in any industry share the same things: one accent colour used
sparingly, real photographs at generous size, exact numbers instead of claims,
enormous amounts of space, and copy that names things precisely.

Take the principles. Never imitate a specific site's layout or wording.`,
  },

  "motion-discipline": {
    id: "motion-discipline",
    summary: "Motion on the band that carries the argument, nowhere else",
    enforcedBy: ["motion-budget"],
    text: `The motion budget in the request is a CEILING, not a target. Motion
on the band carrying the argument reads as expensive; motion on all nine reads
as a template. A still page is a legitimate page and is the right answer more
often than not.

Pin a section and scroll THROUGH it only when the argument needs the hold. A
pinned section that exists to prove the page can pin is the clearest tell that
nobody designed this.`,
  },

  honesty: {
    id: "honesty",
    summary: "Nothing on the page that is not true",
    enforcedBy: ["invented-statistic", "unlisted-image"],
    text: `NEVER invent client names, logos, testimonials, awards or statistics.
If the brief did not supply it, it does not go on the page. A page without a
testimonial band is correct; a page with an invented one is a lie the brand
gets held to.

Use ONLY the photo ids supplied in the request.`,
  },

  "mobile-first": {
    id: "mobile-first",
    summary: "The phone is the real design; desktop is the roomy version",
    text: `Most visitors arrive on a phone, on a connection that is not fast.
Design the phone first and let the desktop be the version with more room. Every
grid needs its stacked base (grid-cols-1 md:grid-cols-3) and every display size
a fluid or responsive step.

Whatever the page is FOR — the address, the price, the button — must survive
being the only thing someone reads.`,
  },

  contrast: {
    id: "contrast",
    summary: "Type stays readable over everything it sits on",
    enforcedBy: ["low-contrast"],
    text: `THE ACCENT IS A FILL, NOT A TEXT COLOUR. Never "text-primary" on small
type — eyebrows, labels, numerals, captions, links. An accent is chosen to sit
BEHIND contrasting text on a button; used as twelve-pixel type on the page
ground it lands around 3:1 and fails. Use "text-base-content" with an opacity
step instead: text-base-content/60 for a label, /70 for a caption. The accent
belongs on a button fill, a rule, or a single word inside a heading at display
size.

Type over a photograph needs a scrim behind it, never bare theme ink. Body copy
on a coloured ground must clear the ground, not merely sit on it — this is the
most common way a page that looked fine in a preview becomes unreadable in
daylight on a phone.`,
  },
}

/** Everything, in the order it reads best. The default set. */
export const DEFAULT_CRAFT: CraftId[] = [
  "specificity",
  "anti-ai-slop",
  "honesty",
  "restraint",
  "typography",
  "motion-discipline",
  "contrast",
  "mobile-first",
]

/** Render the requested modules into the block the system prompt embeds. */
export function craftText(ids: CraftId[] = DEFAULT_CRAFT): string {
  return ids
    .map((id) => CRAFT[id])
    .filter(Boolean)
    .map((m) => `## ${m.summary}\n\n${m.text}`)
    .join("\n\n")
}

/**
 * Which craft rules the gate can actually prove.
 *
 * Useful on its own: the gap between what is asserted and what is enforced is
 * the list of things that will quietly regress, and it should be visible rather
 * than discovered later.
 */
export function unenforcedCraft(ids: CraftId[] = DEFAULT_CRAFT): CraftId[] {
  return ids.filter((id) => !(CRAFT[id]?.enforcedBy?.length))
}
