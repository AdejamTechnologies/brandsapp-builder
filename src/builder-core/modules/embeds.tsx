/**
 * Embed + utility modules — third-party/native embeds (YouTube, OpenStreetMap),
 * a background-video hero shell, and a couple of small native controls (file
 * upload, search) that don't belong in forms.tsx's contact-form vocabulary but
 * still need to look like the rest of our form fields. Like the other module
 * files, each root element gets the node's className and, in editor mode, a
 * `data-node-id` so the canvas can select it.
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

const Youtube: ModuleDefinition = {
  name: "youtube",
  category: "media",
  schema: {
    url: { type: "url" },
    aspect: { type: "select", options: ASPECT_OPTIONS },
  },
  defaults: { url: "", aspect: "16:9" },
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
    return createElement(
      "div",
      { className: p.className, style, ...rootAttrs(p) },
      createElement("iframe", {
        className: "h-full w-full rounded-2xl",
        src: `https://www.youtube.com/embed/${id}`,
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
  },
  defaults: { src: "", poster: "", overlay: 40 },
  contentModel: { children: "any" },
  // min-height + a tinted ground so the section holds its shape (and stays
  // selectable) before a src is set — an empty `src` on a bare <video> collapses
  // to zero height the same way an <img> with no source does.
  defaultClasses:
    "relative w-full min-h-[420px] overflow-hidden rounded-2xl bg-base-300 flex items-center justify-center",
  defaultChildren: [
    { module: "heading", props: { text: "Your headline here", level: "1" }, classes: "text-neutral-content text-center" },
  ],
  Component: (p: ModuleRenderProps) => {
    const src = str(p.props.src)
    const poster = str(p.props.poster)
    const overlay = Math.min(Math.max(num(p.props.overlay, 40), 0), 100)
    return createElement(
      "div",
      { className: p.className, ...rootAttrs(p) },
      src
        ? createElement("video", {
            className: "absolute inset-0 h-full w-full object-cover",
            src,
            poster: poster || undefined,
            autoPlay: true,
            muted: true,
            loop: true,
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

const Search: ModuleDefinition = {
  name: "search",
  category: "forms",
  schema: {
    action: { type: "url" },
    placeholder: { type: "plain" },
    buttonLabel: { type: "plain" },
  },
  defaults: { action: "/search", placeholder: "Search…", buttonLabel: "Search" },
  contentModel: { children: "none" },
  defaultClasses: "flex w-full max-w-md items-center gap-2",
  Component: (p: ModuleRenderProps) =>
    createElement(
      "form",
      {
        className: p.className,
        role: "search",
        action: str(p.props.action, "/search") || "/search",
        method: "get",
        ...rootAttrs(p),
      },
      createElement("input", {
        className: SEARCH_INPUT_CLASSES,
        type: "search",
        name: "q",
        placeholder: str(p.props.placeholder, "Search…"),
      }),
      createElement("button", { className: SEARCH_BUTTON_CLASSES, type: "submit" }, str(p.props.buttonLabel, "Search"))
    ),
}

// ── map ───────────────────────────────────────────────────────────────────────

// OpenStreetMap has no key-free "search by place name" embed the way Google's
// legacy `output=embed` does — the standard `export/embed.html` widget wants a
// bbox, not free text. Nominatim's own search UI takes a plain `q=` query and
// is the widely-used no-key way to drop an address/place straight into an
// iframe, so that's what a bare "query" prop resolves to here.
function buildMapSrc(query: string): string {
  return `https://nominatim.openstreetmap.org/ui/search.html?q=${encodeURIComponent(query)}`
}

const Map: ModuleDefinition = {
  name: "map",
  category: "media",
  schema: { query: { type: "plain" } },
  defaults: { query: "" },
  contentModel: { children: "none" },
  defaultClasses: "w-full h-80 rounded-2xl border-0 bg-base-200",
  Component: (p: ModuleRenderProps) => {
    const query = str(p.props.query).trim()
    if (!query) {
      return createElement(
        "div",
        { className: `${p.className} flex items-center justify-center`, ...rootAttrs(p) },
        createElement("span", { className: "px-4 text-center text-sm text-base-content/60" }, "Map — set an address in Settings.")
      )
    }
    return createElement("iframe", {
      className: p.className,
      src: buildMapSrc(query),
      title: `Map: ${query}`,
      loading: "lazy",
      ...rootAttrs(p),
    })
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
  CustomElement,
]
