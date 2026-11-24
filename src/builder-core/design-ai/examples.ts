// Moved from lib/ai/examples.ts (24 Nov 2026) so the partners MCP in main-repo designs by the SAME rules as the in-app AI; builder-core is what main-repo vendors.
/**
 * Two bands, written out in full, so the model has seen one.
 *
 * The vocabulary block lists module NAMES — `horizontal(hold, gap) +children`,
 * `scene(preset, tone, intensity, speed)`. That tells a model what exists and
 * nothing about what it looks like or when it earns its place. Asked to invent
 * structure from a list of names, it reaches for the layout it has seen ten
 * million times: a hero with text left and a photograph right, three feature
 * cards, an alternating image-and-words pair, a team grid. Both real
 * generations did exactly that, and the copy inside them was excellent.
 *
 * Telling a model not to produce a template, without showing it what else looks
 * like, gets you a template with better copy.
 *
 * ── Why two, and why these ───────────────────────────────────────────────────
 * Two, because one reads as "do this" and three starts to read as a catalogue —
 * which is the thing being escaped. They are deliberately NOT a hero and a
 * feature row: those are the shapes the model already defaults to, and spending
 * the example budget on them would teach it nothing. One shows type carrying a
 * band with no imagery at all; the other shows a held section a reader scrolls
 * through. Both are things the vocabulary allows and the model never used.
 *
 * They are also deliberately generic in CONTENT — a placeholder trade, no real
 * business — so nothing here can be lifted into a real page. The copy rules
 * still apply and the gate still refuses anything that reads like these words.
 */

export const WORKED_EXAMPLES = `Two bands, written out. Copy the TECHNIQUE, never
the words — this copy would fail the specificity rule if you used it.

A band where type does the work and there is no photograph. Note the newline
inside the heading with "whitespace-pre-line", the measure held narrow, and that
only ONE element carries motion:

{ "m": "section", "c": "px-6",
  "k": [{ "m": "container", "p": { "maxWidth": "xl" }, "c": "mx-auto py-32 md:py-44",
    "k": [
      { "m": "text", "p": { "text": "Since 1998" },
        "c": "text-xs uppercase tracking-[0.26em] opacity-60" },
      { "m": "heading", "p": { "text": "We only make\\\\none thing.", "level": "1" },
        "c": "mt-7 max-w-4xl whitespace-pre-line text-[clamp(2.5rem,8vw,6rem)] font-bold leading-[0.98] tracking-[-0.03em]",
        "a": { "effect": "fade-up", "trigger": "load", "duration": 900, "text": "words" } },
      { "m": "text", "p": { "text": "One product, made the same way for twenty-six years." },
        "c": "mt-8 max-w-xl text-lg leading-relaxed opacity-75" }
    ] }] }

A section the reader scrolls THROUGH while it holds still. The pin goes on the
wrapper; everything inside it that moves carries "driver": "pin", because a
pinned section does not travel and viewport-measured motion freezes there:

{ "m": "section", "c": "relative px-6",
  "k": [{ "m": "box", "c": "relative overflow-hidden",
    "a": { "effect": "fade", "trigger": "scroll", "scroll": { "pin": 1 } },
    "k": [
      { "m": "image", "p": { "src": "<a url from the request>", "alt": "" },
        "c": "absolute inset-0 h-full w-full object-cover opacity-40",
        "a": { "effect": "fade", "trigger": "scroll", "scroll": { "parallax": -36, "driver": "pin" } } },
      { "m": "box", "c": "absolute inset-0 bg-base-100/70" },
      { "m": "container", "p": { "maxWidth": "lg" }, "c": "relative z-10 mx-auto py-32 text-center md:py-44",
        "k": [{ "m": "heading", "p": { "text": "Everything is cut by hand.", "level": "2" },
          "c": "mx-auto max-w-3xl text-[clamp(1.9rem,5vw,3.6rem)] font-semibold leading-[1.06]",
          "a": { "effect": "fade-up", "trigger": "scroll", "scroll": { "driver": "pin" } } }] }
    ] }] }

Things worth taking from these:
- A container needs "mx-auto" in its classes. Your classes REPLACE the module's
  defaults, so a container given classes and no mx-auto is not centred.
- A section needs "px-6" for the same reason, or type touches the phone's edge.
- Absolutely positioned layers go BEFORE the content, and the content gets
  "relative z-10".
- Type over a photograph needs a scrim between them — a box with a translucent
  or gradient background, never bare ink on the image.
- Grids need their stacked base: "grid-cols-1 md:grid-cols-12". Without it every
  column survives onto a 390px phone about thirty pixels wide, one word a line.

Bands you should NOT build unless the brief genuinely calls for them, because
they are what gets produced when a page has not decided what it is for: a row of
three cards each with a heading and a sentence; a strip of round numbers; a
grid of staff photographs; a row of client logos.`
