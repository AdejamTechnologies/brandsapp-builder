# Bolt World — trial tenant page

A real prospect, built as a builder page so the engine gets tested against
something a customer would actually sign off on. Open it at **`/edit/bolt`**
(editor) or **`/preview/bolt`** (exactly what publishes). Source:
`src/lib/bolt-world.ts`.

**The business** (every fact we were given, and nothing more): Bolt World, a
one-person repair and construction business in Bonny, Rivers State, selling both
services and materials. Phone/WhatsApp **+234 810 400 6439**. Audience:
homeowners, landlords, tenants and small businesses in and around Bonny.

---

## 1. Evidence log

Design reference: <https://www.barrbuild.co.uk/> — inspected 28 October 2026.
Shop-mechanics reference: <https://norr11.com/collections/all>, same date.

No browser automation was available this session, so the inspection was done by
fetching the homepage HTML (199 KB) and its stylesheet
(`/assets/css/dist/main.css`, 138 KB) and reading the declarations directly.
That makes the token table **measured, not guessed** — but nothing below was
seen rendered, and no screenshots of the reference were captured.

| Item | Status | Note |
|---|---|---|
| Reference is a construction company with a services-led site | OBSERVED | Six service pages, a projects section, a contact page |
| "a **small independent** company with a **project-enquiry** call to action" | **CONTRADICTED** | It is a four-director, nationally recognised Chartered Building Company, and the homepage has **no project-enquiry form** — the CTA is "Talk to the team" → `/contact`. The only form on the page is a newsletter sign-up. Built against what the site actually is; flagging the brief's description as wrong rather than inventing a site to match it. |
| Colour palette | OBSERVED | `:root` custom properties, verbatim: `--white #ffffff`, `--black #000000`, `--slate1 #303030`, `--slate2 #6f6f6f`, `--slate3 #979797`, `--slate4 #9e9e9e`, `--plaster #e0ccba`, `--timber #473b35`, `--offWhite1 #ece6de`, `--offWhite2 #eeedec`, `--parchment #f6f3ef` |
| Typefaces | OBSERVED | `--fontPortrait: "Portrait Text Web", Times, serif` (display), `--fontBrownLLLight` / `--fontBrownLLRegular` (body). Both proprietary — served from Typekit and Flodesk |
| Display type | OBSERVED | `h1` 88px / line-height 1.1 above 767px; `.title` 76px/95px; section headings 64px, `font-weight: 100`, `text-transform: uppercase`, `line-height: 1`; the same headings drop to 40px and lose the uppercase below 550px; `.page h2` 40px |
| Body type | OBSERVED | 16px at 150%; hero intro 24px/30px → 32px/40px at 767px; small/label text 11px with `letter-spacing: 0.1em` |
| Buttons | OBSERVED | `border: 1px solid var(--black)`, no fill, `font-size: 11px`, `letter-spacing: 0.1em`, `min-width: 142px`, `padding: 18px 18px 16px`, uppercase, `:hover { opacity: 0.5 }`. A wide variant at 191px |
| Corner language | OBSERVED | `border-radius` appears five times in 138 KB: four are `0`, one is `50%`, one is `3px`. The site is square |
| Container and gutters | OBSERVED | `max-width: 1280px`; `--spacing-sides` 20px → `4.7vw` at 550px → 55px at 1000px |
| Grid | OBSERVED | `grid-template-columns: repeat(12, 1fr)` with items spanning 6 or 12 |
| Breakpoints | OBSERVED | 550, 767 and 1000px carry almost all the rules (also 640, 900, 920, 1100, 1280) |
| Image aspect ratios | OBSERVED | Service cards `55/64`; project and journal images `3/2`; gallery items `400/560`; testimonial `1/1`; page-grid `540/372` |
| Motion | OBSERVED | `.fade-in` → `.fade-in--in-view`; a `prefers-reduced-motion` block. Scroll reveal, no parallax |
| Sticky header | INFERRED | No `position: sticky/fixed` on any header selector — only the cookie bar and one pinned column. The header appears to be static |
| Hover/focus/active states beyond the button | UNKNOWN | Not rendered, not inspected |
| Mobile menu behaviour | UNKNOWN | Markup not exercised |
| norr11 filters, sort, grid columns, card hover, pagination | UNKNOWN | The capture returned category links and product tiles only — no filter panel, no sort control, no prices, no layout information. Shop mechanics below are therefore **our own**, not reproduced from it |

## 2. Design token table

What this page uses, and how it maps back. Substituted faces are marked.

| Token | Reference | This page | Note |
|---|---|---|---|
| Display face | Portrait Text Web | **Instrument Serif** | SUBSTITUTION — proprietary. Closest in the builder's font registry: a light, high-contrast serif that holds up uppercase at 88px |
| Body face | BrownLL Light / Regular | **Work Sans** | SUBSTITUTION — proprietary. Closest grotesque in the registry |
| `primary` | `--plaster #e0ccba` as a tint | `#9B4A26` | Our own burnt clay, applied the way the reference applies its accent: section tints and small marks, never a filled button |
| `secondary` | — | `#E2D3C0` | Sand tint |
| `neutral` | `--timber #473b35` | `#2E2A26` | The one dark band (the closing contact block) |
| `base-100 / 200 / 300` | `#ffffff` / `--parchment #f6f3ef` / — | `#FFFFFF` / `#F5F1EA` / `#E4DCD0` | Warm paper, slightly deeper than the reference's |
| `base-content` | `--slate1 #303030` | `#2B2724` | Warm ink rather than neutral slate |
| Corner radius | 0 | `scale.radius: 0` | One theme number squares every corner on the page |
| Container | 1280px | `max-w-[1280px]` | Identical |
| Side gutter | 20px → 55px | `px-5 md:px-[55px]` | Identical at both ends; the 4.7vw middle step is not reproduced |
| Hero `h1` | 88px / 1.1 | `text-[2.5rem] md:text-[5.5rem]` | 40px → 88px |
| Section heading | 64px → 40px, uppercase, weight 100 | `text-[2.5rem] md:text-[4rem]` uppercase | Matches; Instrument Serif has one weight, so "100" reads as the face's own lightness |
| Hero intro | 24/30 → 32/40 | `text-[1.5rem] md:text-[2rem]` | Matches |
| Body | 16px / 150% | `text-base leading-[1.5]` | Matches |
| Label | 11px / 0.1em / uppercase | `text-[11px] uppercase tracking-[0.1em]` | Matches |
| Button | 1px border, 11px, 142px min, 18/18/16 padding, hover 0.5 | `border … min-w-[142px] px-[18px] pt-[18px] pb-4 … hover:opacity-50` | Matches |
| Card image | 55/64 | `aspect-[55/64]` | Matches |
| Gallery image | 400/560 | `aspect-[400/560]` | Matches |
| Strip image | 3/2 | `aspect-[3/2]` | Matches |
| Breakpoints | 550 / 767 / 1000 | 767 / 1024 (Tailwind `md:` / `lg:`) | DIFFERENT — the utility classes carry Tailwind's scale. The doc's own breakpoint list (tablet ≤1023, mobile ≤767) follows the builder's convention so the editor's device switcher behaves normally |
| Motion | fade-in on scroll | `anim: fade-up / scroll / 700ms` per block | Matches in kind |

## 3. Section inventory

| Reference section | Decision | What it became |
|---|---|---|
| Hero: logo, five project photos, short statement | **Adapt** | Same shape — eyebrow, serif statement, place line, paragraph, two buttons, five-photo strip — but the buttons are "Shop now" and "Request a site inspection" |
| "Discover our services" intro | **Adapt** | "Two catalogues, one WhatsApp order", plus the three things we can honestly say |
| Four service cards (55/64 image, title, blurb, arrow) | **Adapt** | The catalogue card. The arrow enquiry link becomes "Add to order" / "Order on WhatsApp" + "Call" |
| Two extra service cards + "View all services" | **Adapt** | Folded into the catalogue; the All / Services / Products switch replaces "view all" |
| "Who we are" — four directors, two decades, Chartered status | **Replace** | A short About teaser about one person. No history, no team, no accreditation — none of it is ours to claim |
| Directors' message | **Omit** | Company-specific. Replaced by "How it works" |
| Press features (House & Garden, The Times) | **Omit** | Would be fabricated awards |
| "Ideally located" + two CTAs | **Preserve** | "Bonny, and near it", a real OSM map, "Send your location" |
| Cookie notice | **Omit** | The page sets no cookies |
| Footer: info / press / enquiries / newsletter / social / CIOB + FMB logos / legal | **Adapt** | Contact, WhatsApp, area, hours placeholder. **No accreditation logos** — fabricating a trade body membership is the worst thing this page could do |
| Newsletter sign-up form | **Replace** | The site-inspection request form |
| — | **Add** | Shop with Services/Products tabs, filter chips, search field, "How it works", lightbox work gallery, delivery/estimates/payment FAQ, WhatsApp order hand-off |

## 4. What the owner must confirm before this goes live

Fifteen placeholders, each visible on the page as `[CONFIRM: …]`:

1. Logo — there is a text wordmark standing in
2. How far outside Bonny the business travels (appears three times)
3. Whether a site inspection is charged, and how much
4. Opening hours — the days and times calls are answered
5. Payment terms (deposit, balance, cash or transfer)
6. Bank account details, if they should appear on the page at all
7. Whether there is delivery, to where, and at what cost
8. Whether customers can collect, and from where
9. Cement — which brands are stocked
10. Sand and gravel — the measures sold (trip, tipper, bucket)
11. Blocks — the sizes stocked
12. Cordless drills — brands and battery sizes
13. Nails, screws and fixings — sold by packet, by weight, or both
14. PVC pipe, wire and cable, paint — sizes, tin sizes, and whether sold per metre or per roll
15. Five to ten photographs of real finished jobs, with a line about each, to replace the placeholder photography (hero strip and work gallery)

Plus one invitation, not a blocker: anything else the owner wants customers to
know — how long they have been working, trades trained in, the kind of job they
prefer.

## 5. Deliberate honesty decisions

- **No prices anywhere.** Services read "Quote after inspection", products "Call
  or WhatsApp for price". That is the true state of both catalogues, and a
  plausible-looking naira figure on a page a customer will read is a lie with a
  number on it.
- **Every catalogue item carries a "Sample" badge** and each grid closes with a
  line saying the range is suggested, not confirmed stock.
- **A draft notice sits at the very top of the page**, so nobody can be shown
  this and mistake it for finished.
- **The gallery captions say "Placeholder"** on every image.
- **No accreditations, awards, reviews, years in business, team, or past
  projects** — the reference leans on all six, and we were given none of them.
- **The page takes no payment and books nothing**, and says so three times: on
  the "How it works" strip, beside the form, and in the footer.

## 6. What the builder could not do

Found by building this page, in rough order of how much they matter.

1. **No cart.** There is no commerce module, so "one shared cart holding
   services and products, with a subtotal and a quoted-items count" cannot be
   expressed. Each card hands its own prefilled order straight to WhatsApp
   instead, which works and is honest, but it is not a cart: a customer cannot
   build a basket of six things and send it once.
2. **Filters, sort and search are decoration.** The chips and the search field
   render; nothing filters. There is no client-side list behaviour in the module
   set, so a catalogue of any size is a static grid.
3. **One Doc is one page.** Service and product detail pages, category pages,
   cart and checkout would each be a separate Doc. The brief's nine-page site is
   nine documents with no shared header component between them unless each one
   re-authors it (linked components exist, but only within a document).
4. **No per-item deep link.** Without detail pages, "add to cart" from a card is
   the only path; there is nowhere to put a gallery, a spec table or a quantity
   stepper per item.
5. **Arbitrary variants work, but a module's internals are not stylable.** The
   lightbox positions its own `<img>`; an author who overrides the anchor's
   classes and drops `relative` breaks every thumbnail with no warning. Worth a
   guard, or at least a note in the inspector.
6. **`choreography: "subtle"` drifts media inside its container.** Right for
   full-bleed art, wrong for a thumbnail in a fixed aspect box — the drift
   exposes the box's own background under the photo at most scroll positions.
   This page sets `choreography: "none"` and authors `fade-up` per block
   instead.

### Three engine bugs this page found, all now fixed

- **`border` utilities painted nothing.** `.border` is `border-width: 1px` and
  nothing else; the initial `border-style` is `none`, so every bordered card,
  button, chip and divider in every builder page was silently invisible —
  except on form controls, which inherit a border style from the UA sheet.
  Fixed by adding Tailwind's own preflight line to `BUILDER_RESET`
  (`lib/builder-core/unocss.ts`).
- **Modules' internal utility classes were never generated.** The atomic CSS is
  built from the tokens the renderer collected, and it only ever saw
  `node.classes`. A class hardcoded inside a Component got a rule only if some
  node on the same page happened to use the same token — so a lightbox thumbnail
  rendered unpositioned and a map iframe collapsed to its intrinsic height, on
  one page and not the next. Fixed with a `staticClasses` field on
  `ModuleDefinition`, declared on `lightbox`, `map`, `video`,
  `background-video`, `youtube`, `facebook`, `x-twitter`, `search` and `rive`.
- **The default map was a geocoder's search page.** The keyless OSM provider
  embedded `nominatim.openstreetmap.org/ui/search.html` — a search box, a
  results list and the Nominatim chrome — because an address can only be
  resolved by calling a geocoder, which SSR will not do. `buildOsmSrc` now
  recognises `lat, lng` and embeds openstreetmap.org's real map frame with a
  marker; an address still falls back to the old behaviour, so nothing
  regresses.

## 7. How this was checked

`scripts/render-demo.mts` renders a demo page to a standalone HTML file through
the **publish** path (`renderDoc` + `generateUtilityCss` + the same runtime
scripts the preview route injects), so what it produces is what a tenant serves:

```bash
node_modules/.bin/tsx scripts/render-demo.mts bolt out/bolt.html
```

That file was screenshotted in headless Chrome at 1440px and at 390px (inside a
390px iframe — headless Chrome clamps its own window to a 500px minimum width,
which silently crops a narrower screenshot and looks exactly like a layout bug),
then read section by section and corrected over four passes. The link audit
across the rendered markup: 35 WhatsApp links, all carrying the number and a
prefilled message; 31 `tel:` links, all `+2348104006439`; every in-page anchor
resolving to a real element id; no broken or placeholder hrefs.

**Not checked:** anything that needs a live browser — the tab switch, the
accordion, the lightbox overlay, the mobile menu, form validation and the form's
POST. The markup and the runtime for each are present and the reveal animation
was confirmed firing at every viewport height (61 elements revealed at a 900px
viewport), but the interactions themselves were not exercised.

**Not built, and a developer still has to:** a real cart and checkout, working
filters, sort and search, the detail pages, and a destination for the form —
the `form` module posts to the tenant's `/api/public/contact`, which exists on a
tenant and does not exist in the builder's local demo.
