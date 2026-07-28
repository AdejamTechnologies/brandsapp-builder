/**
 * Embed + utility modules — third-party/native embeds (YouTube, maps, Facebook,
 * X/Twitter), a background-video hero shell, and a couple of small native
 * controls (file upload, search) that don't belong in forms.tsx's contact-form
 * vocabulary but still need to look like the rest of our form fields. Like the
 * other module files, each root element gets the node's className and, in
 * editor mode, a `data-node-id` so the canvas can select it.
 */

import { createElement, type CSSProperties } from "react"

import { rootAttrs } from "../advanced"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const num = (v: unknown, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}
const bool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1"

/** Validate a select-style prop against its own option list; falls back rather than emitting garbage into a URL/data-* attribute. */
function pick(v: unknown, options: string[], d: string): string {
  const s = str(v, d)
  return options.includes(s) ? s : d
}

// ── youtube ───────────────────────────────────────────────────────────────────

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/

/**
 * Accepts a full watch URL, a youtu.be short link, an /embed/ or /shorts/ link,
 * or a bare 11-char video id — whatever an author is likely to paste. Returns
 * null (never a guess) when nothing recognizable can be parsed, so the caller
 * can fall back to a placeholder instead of pointing an iframe at garbage.
 */
function extractYouTubeId(raw: unknown): string | null {
  const value = str(raw).trim()
  if (!value) return null
  if (YOUTUBE_ID_RE.test(value)) return value
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`)
    const host = url.hostname.replace(/^www\./, "")
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0]
      return id && YOUTUBE_ID_RE.test(id) ? id : null
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const vParam = url.searchParams.get("v")
      if (vParam && YOUTUBE_ID_RE.test(vParam)) return vParam
      // /embed/<id> or /shorts/<id>
      const parts = url.pathname.split("/").filter(Boolean)
      const last = parts[parts.length - 1]
      return last && YOUTUBE_ID_RE.test(last) ? last : null
    }
    return null
  } catch {
    return null
  }
}

const ASPECT_OPTIONS = ["16:9", "4:3", "1:1", "9:16"].map((v) => ({ label: v, value: v }))

/**
 * "00:00", "mm:ss", or "hh:mm:ss" → seconds for the `start=` param. A bare
 * digit string ("90") is accepted as already-seconds. Anything else (empty,
 * garbage) resolves to 0, which means "omit the param" to the caller — there's
 * no such thing as an invalid start time worth guessing at, only "no start time".
 */
function parseStartSeconds(raw: unknown): number {
  const s = str(raw).trim()
  if (!s) return 0
  if (/^\d+$/.test(s)) return Number(s)
  const parts = s.split(":").map((p) => p.trim())
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return 0
  const nums = parts.map(Number)
  return nums.length === 3 ? nums[0] * 3600 + nums[1] * 60 + nums[2] : nums[0] * 60 + nums[1]
}

const Youtube: ModuleDefinition = {
  name: "youtube",
  category: "media",
  schema: {
    url: { type: "url" },
    aspect: { type: "select", options: ASPECT_OPTIONS },
    startAt: { type: "plain", label: "start at (mm:ss)" },
    mute: { type: "boolean" },
    autoplay: { type: "boolean" },
    controls: { type: "boolean" },
    privacyMode: { type: "boolean", label: "privacy-enhanced mode (youtube-nocookie.com)" },
    limitRelated: { type: "boolean", label: "limit related videos to this channel" },
  },
  defaults: {
    url: "",
    aspect: "16:9",
    startAt: "",
    mute: false,
    autoplay: false,
    controls: true,
    privacyMode: false,
    limitRelated: true,
  },
  contentModel: { children: "none" },
  // The aspect-ratio wrapper (rather than a padding-bottom hack) keeps the slot
  // sized — and visible, with the tinted ground — even with no url yet, or a
  // url that fails to parse, instead of collapsing to a broken 0-height iframe.
  defaultClasses: "w-full overflow-hidden rounded-2xl bg-base-200",
  Component: (p: ModuleRenderProps) => {
    const id = extractYouTubeId(p.props.url)
    const ratio = str(p.props.aspect, "16:9").replace(":", "/") || "16/9"
    const style: CSSProperties = { aspectRatio: ratio }
    if (!id) {
      return createElement(
        "div",
        { className: `${p.className} flex min-h-40 items-center justify-center`, style, ...rootAttrs(p) },
        createElement("span", { className: "px-4 text-center text-sm text-base-content/60" }, "YouTube — paste a video URL in Settings.")
      )
    }

    const autoplay = bool(p.props.autoplay)
    // Modern browsers refuse unmuted autoplay outright — an autoplaying-but-
    // silent-forever embed reads as "broken" to the author with no clue why.
    // Rather than silently ship that, force mute whenever autoplay is on; the
    // author's own `mute` toggle only matters when autoplay is off.
    const mute = bool(p.props.mute) || autoplay
    const controls = bool(p.props.controls)
    const limitRelated = bool(p.props.limitRelated)
    const host = bool(p.props.privacyMode) ? "www.youtube-nocookie.com" : "www.youtube.com"
    const start = parseStartSeconds(p.props.startAt)

    const params = new URLSearchParams()
    params.set("mute", mute ? "1" : "0")
    params.set("autoplay", autoplay ? "1" : "0")
    params.set("controls", controls ? "1" : "0")
    // rel=0 restricts "related videos" (shown at the end) to the same channel;
    // rel=1 (YouTube's own default) allows any channel.
    params.set("rel", limitRelated ? "0" : "1")
    if (start > 0) params.set("start", String(start))

    return createElement(
      "div",
      { className: p.className, style, ...rootAttrs(p) },
      createElement("iframe", {
        className: "h-full w-full rounded-2xl",
        src: `https://${host}/embed/${id}?${params.toString()}`,
        title: "YouTube video player",
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        allowFullScreen: true,
        loading: "lazy",
      })
    )
  },
}

// ── background video ─────────────────────────────────────────────────────────

const BackgroundVideo: ModuleDefinition = {
  name: "background-video",
  category: "media",
  schema: {
    src: { type: "url" },
    poster: { type: "media" },
    overlay: { type: "number", label: "overlay darkness (0-100)" },
    loop: { type: "boolean" },
    autoplay: { type: "boolean" },
    showControls: { type: "boolean", label: "show play/pause button" },
  },
  defaults: { src: "", poster: "", overlay: 40, loop: true, autoplay: true, showControls: true },
  contentModel: { children: "any" },
  // min-height + a tinted ground so the section holds its shape (and stays
  // selectable) before a src is set — an empty `src` on a bare <video> collapses
  // to zero height the same way an <img> with no source does.
  defaultClasses:
    "relative w-full min-h-[420px] overflow-hidden rounded-2xl bg-base-300 flex items-center justify-center",
  defaultChildren: [
    { module: "heading", props: { text: "Your headline here", level: "1" }, classes: "text-neutral-content text-center" },
  ],
  // The play/pause button + prefers-reduced-motion override are wired by the
  // shared vanilla runtime (BUILDER_RUNTIME, owned elsewhere) off the
  // `data-bapp-bgvideo`/`data-loop`/`data-autoplay`/`data-controls` hooks below
  // — this module only ever emits markup + hooks, never the behaviour itself.
  Component: (p: ModuleRenderProps) => {
    const src = str(p.props.src)
    const poster = str(p.props.poster)
    const overlay = Math.min(Math.max(num(p.props.overlay, 40), 0), 100)
    const loop = bool(p.props.loop)
    const autoplay = bool(p.props.autoplay)
    const showControls = bool(p.props.showControls)
    return createElement(
      "div",
      {
        className: p.className,
        "data-bapp-bgvideo": "",
        "data-loop": loop ? "1" : "0",
        "data-autoplay": autoplay ? "1" : "0",
        "data-controls": showControls ? "1" : "0",
        ...rootAttrs(p),
      },
      src
        ? createElement("video", {
            className: "absolute inset-0 h-full w-full object-cover",
            src,
            poster: poster || undefined,
            // Browsers block unmuted autoplay outright, so autoplay ALWAYS
            // implies muted+playsInline in the markup — there's no such thing
            // as an autoplaying-with-sound background video. Kept muted even
            // with autoplay off: this is an ambient background shell, not a
            // video player, so it never plays audio on its own either way —
            // any unmuting would have to be an explicit visitor action wired
            // by the runtime's play/pause button.
            autoPlay: autoplay,
            muted: true,
            loop,
            playsInline: true,
          })
        : null,
      // Drawn in a daisyUI token (bg-neutral) rather than a hardcoded black, so
      // the darkening layer — and the neutral-content heading sitting on it —
      // re-skin with the tenant's theme like everything else on the page.
      createElement("div", {
        className: "absolute inset-0 bg-neutral",
        style: { opacity: overlay / 100 },
        "aria-hidden": true,
      }),
      createElement("div", { className: "relative z-10 w-full px-6 py-16" }, p.children)
    )
  },
}

// ── file upload ───────────────────────────────────────────────────────────────

// Matches forms.tsx's INPUT_CLASSES (rounded-xl, border-base-300, bg-base-100,
// same padding/focus ring) plus styling for the file input's own picker button,
// which browsers render as an independent sub-element (`::file-selector-button`
// / the `file:*` Tailwind variant) — left unstyled it renders as a bare OS
// button that clashes with everything else on the page.
const FILE_INPUT_CLASSES =
  "w-full rounded-xl border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-content hover:file:bg-primary/90"

const FileUpload: ModuleDefinition = {
  name: "file-upload",
  category: "forms",
  schema: {
    name: { type: "plain" },
    accept: { type: "plain" },
    multiple: { type: "boolean" },
    required: { type: "boolean" },
  },
  defaults: { name: "file", accept: "", multiple: false, required: false },
  contentModel: { children: "none" },
  defaultClasses: FILE_INPUT_CLASSES,
  Component: (p: ModuleRenderProps) =>
    createElement("input", {
      className: p.className,
      type: "file",
      name: str(p.props.name, "file") || undefined,
      accept: str(p.props.accept) || undefined,
      multiple: bool(p.props.multiple) || undefined,
      required: bool(p.props.required) || undefined,
      ...rootAttrs(p),
    }),
}

// ── search ────────────────────────────────────────────────────────────────────

const SEARCH_INPUT_CLASSES =
  "min-w-0 flex-1 rounded-xl border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content placeholder:text-base-content/40 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"

// Same pill CTA as the `button`/`submit` modules — a search box's action is
// just another CTA and shouldn't read as a visually distinct control.
const SEARCH_BUTTON_CLASSES =
  "inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-primary-content text-sm font-medium transition-colors hover:bg-primary/90"

// Input + button live in their own row so an optional label can sit above them
// without fighting the form's own layout — the row keeps exactly the old
// "flex items-center gap-2" arrangement.
const SEARCH_ROW_CLASSES = "flex items-center gap-2"

// A GET form field name has to be a plain token: letters/digits/underscore/
// hyphen, starting with a letter or underscore. Anything else (empty, spaces,
// stray `=`/`&`) would either silently fail to round-trip through the results
// page's query string or corrupt the string entirely, so an invalid value
// falls back to "q" rather than being emitted as-is.
const PARAM_NAME_RE = /^[a-zA-Z_][\w-]*$/
function sanitizeParamName(raw: unknown): string {
  const s = str(raw).trim()
  return PARAM_NAME_RE.test(s) ? s : "q"
}

const Search: ModuleDefinition = {
  name: "search",
  category: "forms",
  schema: {
    label: { type: "plain" },
    placeholder: { type: "plain" },
    buttonLabel: { type: "plain" },
    resultsPage: { type: "url", label: "results page" },
    paramName: { type: "plain", label: "query parameter name" },
  },
  defaults: {
    label: "",
    placeholder: "Search…",
    buttonLabel: "Search",
    resultsPage: "/search",
    paramName: "q",
  },
  contentModel: { children: "none" },
  defaultClasses: "flex w-full max-w-md flex-col gap-1.5",
  Component: (p: ModuleRenderProps) => {
    const label = str(p.props.label).trim()
    const paramName = sanitizeParamName(p.props.paramName)
    return createElement(
      "form",
      {
        className: p.className,
        role: "search",
        action: str(p.props.resultsPage, "/search") || "/search",
        method: "get",
        ...rootAttrs(p),
      },
      label ? createElement("span", { className: "text-sm font-medium text-base-content" }, label) : null,
      createElement(
        "div",
        { className: SEARCH_ROW_CLASSES },
        createElement("input", {
          className: SEARCH_INPUT_CLASSES,
          type: "search",
          name: paramName,
          placeholder: str(p.props.placeholder, "Search…"),
        }),
        createElement("button", { className: SEARCH_BUTTON_CLASSES, type: "submit" }, str(p.props.buttonLabel, "Search"))
      )
    )
  },
}

// ── map ───────────────────────────────────────────────────────────────────────

const MAP_PROVIDER_OPTIONS = [
  { label: "OpenStreetMap", value: "osm" },
  { label: "Google", value: "google" },
]
const MAP_TYPE_OPTIONS = [
  { label: "Road", value: "road" },
  { label: "Terrain", value: "terrain" },
  { label: "Satellite", value: "satellite" },
  { label: "Hybrid", value: "hybrid" },
]

/**
 * OpenStreetMap — KEPT as the default provider deliberately: it needs no API
 * key, so it's the only choice that actually works the instant a tenant drops
 * the block, with nothing to sign up for. This goes through Nominatim's own
 * search UI (nominatim.openstreetmap.org/ui/search.html?q=…), the widely-used
 * no-key way to drop a free-text address straight into an iframe — the
 * standard `openstreetmap.org/export/embed.html` widget (the one behind OSM's
 * own "Share" button) needs a numeric bbox, not an address, and getting one
 * would mean geocoding the address ourselves server-side on every render,
 * against Nominatim's usage policy for automated/anonymous traffic.
 *
 * Two things this key-free widget genuinely can't do, rather than fake:
 *   - `mapType` has NO effect: the search UI only ever draws OSM's standard
 *     road-style tiles — there's no key-free satellite/terrain/hybrid tile
 *     layer behind it, so Terrain/Satellite/Hybrid silently render as Road.
 *   - `zoom` is passed through best-effort only. `nominatim-ui` (the app this
 *     page runs) does read `zoom` as a URL param elsewhere in its own router,
 *     but the search page isn't a documented embed API with a guaranteed
 *     contract, so this is "give it a shot", not "verified to work forever".
 */
function buildOsmSrc(query: string, zoom: number): string {
  const params = new URLSearchParams({ q: query, zoom: String(zoom) })
  return `https://nominatim.openstreetmap.org/ui/search.html?${params.toString()}`
}

/**
 * Google — via the officially-documented (key-required) Maps Embed API
 * `place` mode, NOT the undocumented `maps.google.com/maps?...&output=embed`
 * legacy endpoint some tutorials use keyless: that endpoint isn't part of
 * Google's published API surface and can change or vanish without notice,
 * which is a bad trade for a primitive that renders on every tenant page that
 * uses it. So Google mode always needs a real key — see the placeholder
 * below for what renders without one.
 *
 * The Embed API's own `maptype` param only ever accepts "roadmap" or
 * "satellite" — there is no "terrain" or "hybrid" value. `hybrid`
 * (satellite-with-labels) is approximated with `satellite`, since Google's
 * satellite tiles there already carry road/place labels; `terrain` has no
 * reasonable equivalent in this API and falls back to `roadmap`.
 */
function buildGoogleSrc(query: string, apiKey: string, zoom: number, mapType: string): string {
  const googleMapType = mapType === "satellite" || mapType === "hybrid" ? "satellite" : "roadmap"
  const params = new URLSearchParams({ key: apiKey, q: query, zoom: String(zoom), maptype: googleMapType })
  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`
}

const Map: ModuleDefinition = {
  name: "map",
  category: "media",
  schema: {
    provider: { type: "select", options: MAP_PROVIDER_OPTIONS },
    // Kept as `query` (not renamed to `address`) so nothing authored against
    // the old schema breaks — only the label changes to match how authors
    // actually think about this field.
    query: { type: "plain", label: "address" },
    apiKey: { type: "plain", label: "Google Maps API key", showIf: { provider: ["google"] } },
    title: { type: "plain", label: "title (map frame name)" },
    tooltip: { type: "plain", label: "marker tooltip" },
    zoom: { type: "number" },
    mapType: { type: "select", options: MAP_TYPE_OPTIONS, segmented: true },
    scrollZoom: { type: "boolean", label: "scroll-wheel zoom" },
    touchDrag: { type: "boolean", label: "touch drag (pan)" },
  },
  defaults: {
    provider: "osm",
    query: "",
    apiKey: "",
    title: "",
    tooltip: "",
    zoom: 12,
    mapType: "road",
    scrollZoom: true,
    touchDrag: true,
  },
  contentModel: { children: "none" },
  defaultClasses: "w-full h-80 rounded-2xl bg-base-200",
  Component: (p: ModuleRenderProps) => {
    const provider = pick(p.props.provider, ["osm", "google"], "osm")
    const query = str(p.props.query).trim()
    const apiKey = str(p.props.apiKey).trim()
    const title = str(p.props.title).trim()
    const tooltip = str(p.props.tooltip).trim()
    const zoom = Math.min(Math.max(Math.round(num(p.props.zoom, 12)), 0), 21)
    const mapType = pick(p.props.mapType, ["road", "terrain", "satellite", "hybrid"], "road")
    const scrollZoom = bool(p.props.scrollZoom)
    const touchDrag = bool(p.props.touchDrag)

    if (!query) {
      return createElement(
        "div",
        { className: `${p.className} flex items-center justify-center`, ...rootAttrs(p) },
        createElement("span", { className: "px-4 text-center text-sm text-base-content/60" }, "Map — set an address in Settings.")
      )
    }

    // A Google key is the one thing this module refuses to guess at — an
    // iframe with a missing/invalid key renders Google's own "This page can't
    // load Google Maps correctly" error box, which reads as our bug, not a
    // configuration gap. A themed placeholder that explains the fix (add a
    // key, or just switch providers — OSM needs none) beats shipping that.
    if (provider === "google" && !apiKey) {
      return createElement(
        "div",
        { className: `${p.className} flex items-center justify-center`, ...rootAttrs(p) },
        createElement(
          "span",
          { className: "px-4 text-center text-sm text-base-content/60" },
          "Google Maps needs an API key — add one in Settings, or switch the provider to OpenStreetMap (no key required)."
        )
      )
    }

    const src = provider === "google" ? buildGoogleSrc(query, apiKey, zoom, mapType) : buildOsmSrc(query, zoom)

    // Cross-origin iframe content can't be reached from the parent page at
    // all — there is no way, for EITHER provider, to inject a real per-marker
    // hover tooltip into it from here. Rather than pretend `tooltip` does
    // that, it's surfaced as the wrapper's own native `title` attribute — a
    // real, zero-JS browser tooltip on hover, just scoped to the whole map
    // box rather than the pin specifically. The iframe's own `title` (its
    // accessible name, not a visual tooltip) comes from the `title` prop.
    //
    // `scrollZoom`/`touchDrag` are native iframe gestures on both providers'
    // embeds, and neither exposes a URL param to toggle one independently of
    // the other — splitting them apart would need a client script wired
    // through the shared runtime, out of scope here. The one combination
    // expressible with zero JS is "neither": freeze the iframe completely
    // with `pointer-events: none` when both are off.
    const frozen = !scrollZoom && !touchDrag

    return createElement(
      "div",
      { className: p.className, title: tooltip || undefined, ...rootAttrs(p) },
      createElement("iframe", {
        className: "h-full w-full rounded-2xl border-0",
        style: frozen ? { pointerEvents: "none" } : undefined,
        src,
        title: title || `Map: ${query}`,
        loading: "lazy",
      })
    )
  },
}

// ── facebook (like/share button) ────────────────────────────────────────────

const FACEBOOK_LAYOUT_OPTIONS = [
  { label: "Standard", value: "standard" },
  { label: "Box", value: "box_count" },
  { label: "Button", value: "button_count" },
]
const FACEBOOK_LAYOUT_VALUES = FACEBOOK_LAYOUT_OPTIONS.map((o) => o.value)

const FACEBOOK_LOCALE_OPTIONS = [
  { label: "English (US)", value: "en_US" },
  { label: "English (UK)", value: "en_GB" },
  { label: "French", value: "fr_FR" },
  { label: "Spanish", value: "es_ES" },
  { label: "Portuguese (Brazil)", value: "pt_BR" },
  { label: "German", value: "de_DE" },
  { label: "Arabic", value: "ar_AR" },
]
const FACEBOOK_LOCALE_VALUES = FACEBOOK_LOCALE_OPTIONS.map((o) => o.value)

/**
 * Facebook's own iframe plugin (plugins/like.php) — no SDK script needed. This
 * is the OLD-STYLE direct-iframe embed (what you get from the Like Button
 * configurator's "IFrame" tab), as opposed to the `<div class="fb-like">` +
 * `connect.facebook.net/.../sdk.js` form, which pulls down Facebook's full
 * JS SDK just to render the same button. Every value here reaches the src via
 * URLSearchParams, never raw string interpolation, so nothing authored into
 * `url` can break out of the query string.
 */
const Facebook: ModuleDefinition = {
  name: "facebook",
  category: "media",
  schema: {
    url: { type: "url", label: "page/URL to like" },
    layout: { type: "select", options: FACEBOOK_LAYOUT_OPTIONS, segmented: true },
    width: { type: "number" },
    height: { type: "number" },
    locale: { type: "select", options: FACEBOOK_LOCALE_OPTIONS },
  },
  defaults: { url: "", layout: "standard", width: 225, height: 35, locale: "en_US" },
  contentModel: { children: "none" },
  Component: (p: ModuleRenderProps) => {
    const url = str(p.props.url).trim()
    if (!url) {
      return createElement(
        "div",
        {
          className: `${p.className} flex min-h-9 min-w-[160px] items-center justify-center rounded bg-base-200`,
          ...rootAttrs(p),
        },
        createElement(
          "span",
          { className: "px-3 text-center text-xs text-base-content/60" },
          "Facebook Like — paste a page URL in Settings."
        )
      )
    }

    const layout = pick(p.props.layout, FACEBOOK_LAYOUT_VALUES, "standard")
    const width = Math.max(Math.round(num(p.props.width, 225)), 1)
    const height = Math.max(Math.round(num(p.props.height, 35)), 1)
    const locale = pick(p.props.locale, FACEBOOK_LOCALE_VALUES, "en_US")

    const params = new URLSearchParams({
      href: url,
      layout,
      width: String(width),
      height: String(height),
      locale,
      action: "like",
    })

    // Wrapped in a div (rather than the iframe being the root) so the node id
    // / advanced-capability attrs land on something that isn't itself replaced
    // by cross-origin content, matching every other iframe-based module here
    // (youtube, map).
    return createElement(
      "div",
      { className: `${p.className} inline-block leading-none`, ...rootAttrs(p) },
      createElement("iframe", {
        src: `https://www.facebook.com/plugins/like.php?${params.toString()}`,
        title: "Facebook Like",
        // Native width/height HTML attributes give the iframe a real
        // intrinsic size on their own (the UA stylesheet maps them straight
        // to CSS width/height) — the button is never zero-size even before
        // any classes/CSS load.
        width,
        height,
        style: { border: "none", overflow: "hidden" },
        scrolling: "no",
        loading: "lazy",
      })
    )
  },
}

// ── x (twitter) ──────────────────────────────────────────────────────────────

const X_MODE_OPTIONS = [
  { label: "Tweet", value: "tweet" },
  { label: "Follow", value: "follow" },
]
const X_LAYOUT_OPTIONS = [
  { label: "Horizontal", value: "horizontal" },
  { label: "Vertical", value: "vertical" },
]
const X_SIZE_OPTIONS = [
  { label: "Regular", value: "regular" },
  { label: "Large", value: "large" },
]

/**
 * Deliberately rendered as a plain anchor to X's officially-documented "Web
 * Intents" URLs — NOT via platform.twitter.com/widgets.js, the vendor script
 * behind the classic `<a class="twitter-share-button">` embed. That script
 * pulls down X's own tracking/analytics bundle on every page view just to
 * render a button an anchor tag does for free. An intent link opens the exact
 * same compose/follow flow (in a new tab) with zero JS and zero third-party
 * request until the visitor actually clicks it.
 */
function buildTweetIntentUrl(shareUrl: string, tweetText: string): string {
  const params = new URLSearchParams()
  if (shareUrl) params.set("url", shareUrl)
  if (tweetText) params.set("text", tweetText)
  const qs = params.toString()
  return `https://twitter.com/intent/tweet${qs ? `?${qs}` : ""}`
}

function buildFollowIntentUrl(username: string): string {
  const handle = username.trim().replace(/^@+/, "")
  if (!handle) return ""
  return `https://twitter.com/intent/follow?${new URLSearchParams({ screen_name: handle }).toString()}`
}

// Simplified official "X" logo mark, drawn at currentColor so it re-skins
// with the pill's own text color instead of shipping a fixed-color asset.
const X_LOGO_PATH =
  "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"

function xLogo(sizeClass: string) {
  return createElement(
    "svg",
    { viewBox: "0 0 24 24", className: sizeClass, fill: "currentColor", "aria-hidden": true },
    createElement("path", { d: X_LOGO_PATH })
  )
}

const XTwitter: ModuleDefinition = {
  name: "x-twitter",
  category: "media",
  schema: {
    mode: { type: "select", options: X_MODE_OPTIONS, segmented: true },
    shareUrl: { type: "url", label: "share URL", showIf: { mode: ["tweet"] } },
    tweetText: { type: "plain", label: "tweet text", showIf: { mode: ["tweet"] } },
    username: { type: "plain", label: "@ username", showIf: { mode: ["follow"] } },
    showCount: { type: "boolean", label: "show count bubble" },
    layout: { type: "select", options: X_LAYOUT_OPTIONS, segmented: true, showIf: { mode: ["tweet"] } },
    size: { type: "select", options: X_SIZE_OPTIONS, segmented: true },
  },
  defaults: {
    mode: "tweet",
    shareUrl: "",
    tweetText: "",
    username: "",
    showCount: false,
    layout: "horizontal",
    size: "regular",
  },
  contentModel: { children: "none" },
  Component: (p: ModuleRenderProps) => {
    const mode = pick(p.props.mode, ["tweet", "follow"], "tweet")
    const layout = pick(p.props.layout, ["horizontal", "vertical"], "horizontal")
    const size = pick(p.props.size, ["regular", "large"], "regular")
    const showCount = bool(p.props.showCount)

    let href: string
    let label: string
    if (mode === "follow") {
      const handle = str(p.props.username).trim().replace(/^@+/, "")
      href = buildFollowIntentUrl(handle)
      label = handle ? `Follow @${handle}` : "Follow"
      if (!href) {
        return createElement(
          "div",
          {
            className: `${p.className} inline-flex items-center justify-center rounded-full bg-base-200 px-4 py-2`,
            ...rootAttrs(p),
          },
          createElement("span", { className: "text-xs text-base-content/60" }, "X Follow — set a @username in Settings.")
        )
      }
    } else {
      href = buildTweetIntentUrl(str(p.props.shareUrl).trim(), str(p.props.tweetText))
      label = "Tweet"
    }

    const iconSize = size === "large" ? "h-5 w-5" : "h-3.5 w-3.5"
    const textSize = size === "large" ? "text-sm" : "text-xs"
    const padding = size === "large" ? "px-4 py-2" : "px-3 py-1.5"
    // `layout` only applies to Tweet mode (Follow is a single button, nothing
    // to lay out vertically vs. horizontally).
    const direction = mode === "tweet" && layout === "vertical" ? "flex-col" : "flex-row"

    return createElement(
      "a",
      {
        // Styled as a small X-branded pill using theme tokens (bg-neutral /
        // text-neutral-content) rather than the tenant's own primary accent —
        // X's brand identity is a monochrome mark, not the site's brand color.
        className: `${p.className} inline-flex ${direction} items-center gap-1.5 rounded-full bg-neutral ${padding} font-medium text-neutral-content ${textSize}`,
        href,
        target: "_blank",
        rel: "noopener noreferrer",
        ...rootAttrs(p),
      },
      xLogo(`${iconSize} shrink-0`),
      createElement("span", null, label),
      // `showCount` can't show a REAL live retweet/follower count without
      // either X's own widget script (the heavy tracker this module
      // deliberately avoids) or a paid v2 API call server-side — there's no
      // keyless source for the number. Rather than fabricate one, the flag
      // only toggles this small decorative bubble shape.
      showCount ? createElement("span", { className: "rounded-full bg-neutral-content/20 px-1.5 text-[10px]" }, "•") : null
    )
  },
}

// ── custom element ───────────────────────────────────────────────────────────

// Conservative allow-list for a tag name: lowercase, starts with a letter, only
// letters/digits/hyphens after that (covers both native HTML tags and custom
// elements like `my-widget`). Never interpolated unchecked into createElement —
// anything that fails the check is rendered as a plain `div` instead.
const TAG_NAME_RE = /^[a-z][a-z0-9-]*$/

const CustomElement: ModuleDefinition = {
  name: "custom-element",
  category: "advanced",
  schema: { tag: { type: "plain" } },
  defaults: { tag: "div" },
  contentModel: { children: "any" },
  defaultClasses: "p-6 rounded-2xl border border-base-300 bg-base-100 min-h-12",
  Component: (p: ModuleRenderProps) => {
    const requested = str(p.props.tag, "div").trim().toLowerCase()
    const tag = TAG_NAME_RE.test(requested) ? requested : "div"
    return createElement(tag, { className: p.className, ...rootAttrs(p) }, p.children)
  },
}

export const EMBED_MODULES: ModuleDefinition[] = [
  Youtube,
  BackgroundVideo,
  FileUpload,
  Search,
  Map,
  Facebook,
  XTwitter,
  CustomElement,
]
