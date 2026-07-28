/**
 * Form + media element modules — real, native HTML (`<form>`, `<input>`,
 * `<textarea>`, `<select>`, `<video>`…). Like the primitives, each applies the
 * node's className and tags the root with `data-node-id` in editor mode. Fields
 * are UNCONTROLLED (placeholder / defaultValue only) so they behave in the live
 * editor canvas and post normally on the published page.
 */

import { createElement, type ReactNode } from "react"

import { rootAttrs } from "../advanced"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const num = (v: unknown, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}
const bool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1"

const INPUT_CLASSES =
  "w-full rounded-xl border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content placeholder:text-base-content/40 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"

// ── form container ────────────────────────────────────────────────────────────

/**
 * The tenant's built-in submission endpoint. It stores the post and surfaces it
 * on the admin's Leads screen, so a dropped form works with no configuration.
 * Point `action` anywhere else and the runtime posts there instead.
 */
export const DEFAULT_FORM_ACTION = "/api/public/contact"

const DEFAULT_SUCCESS_MESSAGE = "Thanks — we'll be in touch."
const DEFAULT_ERROR_MESSAGE = "Oops! Something went wrong while submitting the form."

/** Shared look for the success/error message blocks — same radius/padding
 *  rhythm as a field, coloured with the daisyUI semantic tokens so it re-skins
 *  with the doc theme instead of a hardcoded green/red. */
const FORM_MESSAGE_CLASSES = "rounded-xl px-4 py-3 text-sm"

/**
 * Resolve the form's post-submit redirect target from its `redirectMode` +
 * the matching destination field — mirrors `resolveHref`'s "page"/"url" cases
 * in link.ts, kept local since a form redirect isn't a navigable link (no
 * section/email/phone/file destinations make sense here). Emitted as
 * `data-redirect` for the runtime to act on; this module never navigates
 * itself — that's runtime.ts's job.
 */
function resolveFormRedirect(props: Record<string, unknown>): string {
  const mode = str(props.redirectMode, "none")
  if (mode === "page") {
    const slug = str(props.redirectPage).trim()
    return slug ? (slug.startsWith("/") ? slug : `/${slug}`) : ""
  }
  if (mode === "url") {
    // Already sanitized by escapeByControl (control type "url") before it
    // reaches here — see resolveProps in render.tsx.
    return str(props.redirectUrl).trim()
  }
  return ""
}

const Form: ModuleDefinition = {
  name: "form",
  category: "forms",
  schema: {
    action: { type: "url" },
    method: { type: "select", options: [{ label: "POST", value: "post" }, { label: "GET", value: "get" }] },
    successMessage: { type: "plain", label: "message shown after sending" },
    errorMessage: { type: "plain", label: "message shown after a failed submission" },
    // Editor-only preview: lets the author see/style the success or error
    // state without ever actually submitting the form. A published page
    // always renders the real fields — see Component below.
    state: {
      type: "select",
      label: "preview state",
      segmented: true,
      options: [
        { label: "Normal", value: "normal" },
        { label: "Success", value: "success" },
        { label: "Error", value: "error" },
      ],
    },
    redirectMode: {
      type: "select",
      label: "redirect",
      segmented: true,
      options: [
        { label: "None", value: "none" },
        { label: "Page", value: "page" },
        { label: "URL", value: "url" },
      ],
    },
    redirectPage: { type: "plain", label: "page", showIf: { redirectMode: ["page"] } },
    redirectUrl: { type: "url", label: "URL", showIf: { redirectMode: ["url"] } },
  },
  defaults: {
    action: DEFAULT_FORM_ACTION,
    method: "post",
    successMessage: DEFAULT_SUCCESS_MESSAGE,
    errorMessage: DEFAULT_ERROR_MESSAGE,
    state: "normal",
    redirectMode: "none",
    redirectPage: "",
    redirectUrl: "",
  },
  contentModel: { children: "any" },
  defaultClasses: "flex flex-col gap-4 w-full max-w-md",
  // Submitted by the runtime (fetch + inline confirmation) rather than a full
  // page navigation. The markup still posts natively if JS never runs.
  needsRuntime: true,
  // Drops in as a WORKING contact form. The field `name`s match what
  // /api/public/contact reads (name + message required, email/phone optional).
  // Fields carry their own `label` now (see Input/Textarea below), so the
  // starter form needs no separate form-label elements alongside them.
  defaultChildren: [
    { module: "input", props: { type: "text", name: "name", label: "Name", placeholder: "Your name", required: true } },
    { module: "input", props: { type: "email", name: "email", label: "Email", placeholder: "you@example.com" } },
    {
      module: "textarea",
      props: { name: "message", label: "Message", placeholder: "How can we help?", rows: 4, required: true },
    },
    { module: "submit", props: { label: "Send message" } },
  ],
  Component: (p: ModuleRenderProps) => {
    const successMessage = str(p.props.successMessage, DEFAULT_SUCCESS_MESSAGE)
    const errorMessage = str(p.props.errorMessage, DEFAULT_ERROR_MESSAGE)
    const redirect = resolveFormRedirect(p.props)
    const state = str(p.props.state, "normal")

    // Always rendered (hidden) so the runtime has something real to reveal
    // after a live submit — this module never toggles these itself.
    const successBlock = createElement(
      "div",
      { "data-bapp-form-success": "", hidden: true, className: `${FORM_MESSAGE_CLASSES} bg-success/10 text-success` },
      successMessage
    )
    const errorBlock = createElement(
      "div",
      { "data-bapp-form-error": "", hidden: true, className: `${FORM_MESSAGE_CLASSES} bg-error/10 text-error` },
      errorMessage
    )

    // EDITOR-ONLY preview: swap the fields for the matching (visible) message
    // block so the author can style each state without submitting anything.
    // A published page (isEditor false) ignores `state` and always shows the
    // real fields.
    const previewBlock =
      p.isEditor && state === "success"
        ? createElement("div", { className: `${FORM_MESSAGE_CLASSES} bg-success/10 text-success` }, successMessage)
        : p.isEditor && state === "error"
          ? createElement("div", { className: `${FORM_MESSAGE_CLASSES} bg-error/10 text-error` }, errorMessage)
          : null

    return createElement(
      "form",
      {
        className: p.className,
        action: str(p.props.action, DEFAULT_FORM_ACTION) || undefined,
        method: str(p.props.method, "post"),
        "data-bapp-form": "",
        "data-success": successMessage,
        ...(redirect ? { "data-redirect": redirect } : {}),
        ...rootAttrs(p),
      },
      previewBlock ?? p.children,
      successBlock,
      errorBlock
    )
  },
}

// ── fields ────────────────────────────────────────────────────────────────────

const FIELD_ID_UNSAFE_RE = /[^A-Za-z0-9_:.-]+/g
const FIELD_STACK_CLASSES = "flex flex-col gap-1.5 w-full"
const FIELD_LABEL_CLASSES = "text-sm font-medium text-base-content"

/**
 * A stable id for a field's control, so its own `<label>` can point `htmlFor`
 * at something real — every field owns its label now (see `withOwnLabel`
 * below): requiring a separate Label element per field is friction, and
 * authors routinely fail to wire `for`/`id` by hand, which quietly breaks
 * accessibility. Prefers the field's `name` (human-legible, stable across
 * edits that don't touch it); falls back to the node id when no name is set
 * yet. Always prefixed so the id is guaranteed to start with a letter.
 */
function fieldControlId(name: unknown, nodeId: string): string {
  const raw = str(name).trim() || nodeId
  const safe = raw.replace(FIELD_ID_UNSAFE_RE, "-").replace(/^-+|-+$/g, "")
  return `field-${safe || nodeId}`
}

/**
 * Renders a field's own `<label>` when `label` is non-empty, correctly
 * associated to `id`. An empty `label` renders no label element at all, so
 * the standalone `form-label` module still works for custom layouts.
 *
 * `buildControl` receives the attrs the control should carry ONLY when it
 * ends up being the rendered root itself (i.e. `rootAttrs(p)` — unlabelled
 * case). When labelled, the wrapping `<div>` becomes the root instead, since
 * `data-node-id`/`elementId`/etc. belong to the field as a whole, not just
 * its input.
 */
function withOwnLabel(
  p: ModuleRenderProps,
  id: string,
  buildControl: (rootAttrsIfRoot: Record<string, unknown>) => ReactNode
): ReactNode {
  const label = str(p.props.label).trim()
  if (!label) return buildControl(rootAttrs(p))
  return createElement(
    "div",
    { className: FIELD_STACK_CLASSES, ...rootAttrs(p) },
    createElement("label", { htmlFor: id, className: FIELD_LABEL_CLASSES }, label),
    buildControl({})
  )
}

// Webflow's own field-type vocabulary — a plain-text field is "Plain" there
// too, not "text".
const INPUT_TYPES = [
  { label: "Plain", value: "text" },
  { label: "Email", value: "email" },
  { label: "Password", value: "password" },
  { label: "Phone", value: "tel" },
  { label: "Number", value: "number" },
  { label: "URL", value: "url" },
]

const Input: ModuleDefinition = {
  name: "input",
  category: "forms",
  schema: {
    type: { type: "select", options: INPUT_TYPES },
    name: { type: "plain" },
    label: { type: "plain" },
    placeholder: { type: "plain" },
    required: { type: "boolean" },
    autofocus: { type: "boolean" },
  },
  defaults: { type: "text", name: "", label: "", placeholder: "Enter text…", required: false, autofocus: false },
  contentModel: { children: "none" },
  defaultClasses: INPUT_CLASSES,
  Component: (p: ModuleRenderProps) => {
    const id = fieldControlId(p.props.name, p.nodeId)
    return withOwnLabel(p, id, (rootAttrsIfRoot) =>
      createElement("input", {
        id,
        className: p.className,
        type: str(p.props.type, "text"),
        name: str(p.props.name) || undefined,
        placeholder: str(p.props.placeholder) || undefined,
        required: bool(p.props.required) || undefined,
        autoFocus: bool(p.props.autofocus) || undefined,
        ...rootAttrsIfRoot,
      })
    )
  },
}

const Textarea: ModuleDefinition = {
  name: "textarea",
  category: "forms",
  schema: {
    name: { type: "plain" },
    label: { type: "plain" },
    placeholder: { type: "plain" },
    rows: { type: "number" },
    required: { type: "boolean" },
    autofocus: { type: "boolean" },
  },
  defaults: { name: "", label: "", placeholder: "Your message…", rows: 4, required: false, autofocus: false },
  contentModel: { children: "none" },
  defaultClasses: INPUT_CLASSES,
  Component: (p: ModuleRenderProps) => {
    const id = fieldControlId(p.props.name, p.nodeId)
    return withOwnLabel(p, id, (rootAttrsIfRoot) =>
      createElement("textarea", {
        id,
        className: p.className,
        name: str(p.props.name) || undefined,
        placeholder: str(p.props.placeholder) || undefined,
        rows: num(p.props.rows, 4),
        required: bool(p.props.required) || undefined,
        autoFocus: bool(p.props.autofocus) || undefined,
        ...rootAttrsIfRoot,
      })
    )
  },
}

interface Choice {
  label: string
  value: string
}

const DEFAULT_CHOICES: Choice[] = [
  { label: "Option one", value: "Option one" },
  { label: "Option two", value: "Option two" },
  { label: "Option three", value: "Option three" },
]

/** Legacy shape: options as a newline/comma separated string ("Nigeria\nGhana"
 *  or "a,b,c") — how `select-field` stored its options before `choices`
 *  existed. Still parsed the same way as a fallback so already-published
 *  documents keep rendering unchanged. */
const parseOptions = (raw: unknown): string[] =>
  str(raw)
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)

/**
 * Resolve a select's option list. `choices` (structured `{label,value}`
 * pairs) is the current shape; a document authored before it existed only has
 * the old `options` string, so that's read as a fallback. Neither present (a
 * freshly dropped field) falls back to a visible sample list.
 */
function resolveChoices(props: Record<string, unknown>): Choice[] {
  const structured = props.choices
  if (Array.isArray(structured) && structured.length) {
    const parsed = structured
      .map((c): Choice | null => {
        if (!c || typeof c !== "object") return null
        const label = str((c as Record<string, unknown>).label).trim()
        const value = str((c as Record<string, unknown>).value).trim()
        const finalValue = value || label
        return finalValue ? { label: label || value, value: finalValue } : null
      })
      .filter((c): c is Choice => c !== null)
    if (parsed.length) return parsed
  }
  const legacy = parseOptions(props.options)
  if (legacy.length) return legacy.map((o) => ({ label: o, value: o }))
  return DEFAULT_CHOICES
}

const SelectField: ModuleDefinition = {
  name: "select-field",
  category: "forms",
  schema: {
    name: { type: "plain" },
    label: { type: "plain" },
    choices: { type: "json", label: "choices" },
    multiple: { type: "boolean" },
    required: { type: "boolean" },
  },
  defaults: { name: "", label: "", choices: [], multiple: false, required: false },
  contentModel: { children: "none" },
  defaultClasses: INPUT_CLASSES,
  Component: (p: ModuleRenderProps) => {
    const id = fieldControlId(p.props.name, p.nodeId)
    const opts: ReactNode[] = resolveChoices(p.props).map((c, i) =>
      createElement("option", { key: i, value: c.value }, c.label)
    )
    return withOwnLabel(p, id, (rootAttrsIfRoot) =>
      createElement(
        "select",
        {
          id,
          className: p.className,
          name: str(p.props.name) || undefined,
          multiple: bool(p.props.multiple) || undefined,
          required: bool(p.props.required) || undefined,
          ...rootAttrsIfRoot,
        },
        opts
      )
    )
  },
}

const TOGGLE_STYLE_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Custom", value: "custom" },
]

/** A checkbox or radio wrapped in its label (one row) — the wrapping `<label>`
 *  already associates the text to the control with no `for`/`id` needed, so
 *  (unlike input/textarea/select-field) this shape doesn't change: `label`
 *  keeps driving the visible text, just with two new capabilities on top. */
const makeToggle = (name: "checkbox" | "radio"): ModuleDefinition => ({
  name,
  category: "forms",
  schema: {
    name: { type: "plain" },
    label: { type: "plain" },
    value: { type: "plain" },
    required: { type: "boolean" },
    startChecked: { type: "boolean", label: "start checked" },
    style: { type: "select", label: "style", segmented: true, options: TOGGLE_STYLE_OPTIONS },
    // Radio-only: the shared `name` that makes a set of radios mutually
    // exclusive. Radios that DON'T share one aren't a group at all — each
    // just toggles independently — which is the single most common radio
    // bug, so it gets its own explicit field instead of quietly reusing the
    // generic `name` prop above.
    ...(name === "radio" ? { group: { type: "plain", label: "group (shared name)" } } : {}),
  },
  defaults: {
    name: "",
    label: name === "checkbox" ? "I agree" : "Option",
    value: "",
    required: false,
    startChecked: false,
    style: "default",
    ...(name === "radio" ? { group: "" } : {}),
  },
  contentModel: { children: "none" },
  defaultClasses: "inline-flex items-center gap-2 text-sm text-base-content",
  inlineTextEdit: { prop: "label" },
  Component: (p: ModuleRenderProps) => {
    // "Custom" style simply omits the native appearance classes so the author
    // can style the control themselves — there is no second widget.
    const custom = str(p.props.style, "default") === "custom"
    return createElement(
      "label",
      { className: p.className, ...rootAttrs(p) },
      createElement("input", {
        type: name,
        // A radio's grouping key is `group`; a legacy `name` value (from a
        // doc authored before `group` existed, where authors hand-shared
        // `name` across the set) is honoured as a fallback so those already-
        // published radios keep grouping correctly.
        name: str(name === "radio" ? p.props.group || p.props.name : p.props.name) || undefined,
        value: str(p.props.value) || undefined,
        required: bool(p.props.required) || undefined,
        defaultChecked: bool(p.props.startChecked) || undefined,
        className: custom ? undefined : "size-4 accent-primary",
      }),
      createElement("span", null, str(p.props.label))
    )
  },
})

const Checkbox = makeToggle("checkbox")
const Radio = makeToggle("radio")

const FormLabel: ModuleDefinition = {
  name: "form-label",
  category: "forms",
  schema: { text: { type: "plain" }, for: { type: "plain" } },
  defaults: { text: "Label", for: "" },
  contentModel: { children: "none" },
  defaultClasses: "text-sm font-medium text-base-content",
  inlineTextEdit: { prop: "text" },
  Component: (p: ModuleRenderProps) =>
    createElement("label", { className: p.className, htmlFor: str(p.props.for) || undefined, ...rootAttrs(p) }, str(p.props.text)),
}

const DEFAULT_WAITING_TEXT = "Please wait…"

const Submit: ModuleDefinition = {
  name: "submit",
  category: "forms",
  schema: {
    label: { type: "plain" },
    waitingText: { type: "plain", label: "waiting text" },
  },
  defaults: { label: "Submit", waitingText: DEFAULT_WAITING_TEXT },
  contentModel: { children: "none" },
  inlineTextEdit: { prop: "label" },
  // Matches the `button` primitive exactly — a form's submit is the same control
  // as any other CTA, and having one be a pill and the other a rounded rectangle
  // is the sort of drift that makes a page look assembled rather than designed.
  defaultClasses:
    "inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-primary-content text-sm font-medium transition-colors hover:bg-primary/90",
  Component: (p: ModuleRenderProps) =>
    createElement(
      "button",
      {
        className: p.className,
        type: "submit",
        // Read by the runtime to swap the button's text while the form is
        // in flight; this module never toggles it itself.
        "data-wait": str(p.props.waitingText, DEFAULT_WAITING_TEXT),
        ...rootAttrs(p),
      },
      str(p.props.label)
    ),
}

// ── media ─────────────────────────────────────────────────────────────────────

// In Webflow the "Video" element is EMBED-BY-URL first (YouTube/Vimeo/etc, via a
// Title field for the iframe's accessible name) and a raw file player second.
// Ours started as file-only; `url`/`title` below add the embed path on top
// without dropping the file behaviour that's already useful on its own.
const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/
const VIMEO_VIDEO_ID_RE = /^[0-9]+$/

/**
 * Resolve a pasted embed URL to a same-origin-safe iframe src we build
 * ourselves — never the author's raw string. Only YouTube and Vimeo shapes are
 * recognized (watch/short/embed links, or player.vimeo.com); anything else
 * returns null so the caller can show a friendly placeholder instead of
 * guessing at an iframe src for an unknown provider.
 */
function resolveVideoEmbedSrc(raw: unknown): string | null {
  const value = str(raw).trim()
  if (!value) return null
  let url: URL
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, "")
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0]
    return id && YOUTUBE_VIDEO_ID_RE.test(id) ? `https://www.youtube.com/embed/${id}` : null
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const vParam = url.searchParams.get("v")
    if (vParam && YOUTUBE_VIDEO_ID_RE.test(vParam)) return `https://www.youtube.com/embed/${vParam}`
    const parts = url.pathname.split("/").filter(Boolean)
    const last = parts[parts.length - 1]
    return last && YOUTUBE_VIDEO_ID_RE.test(last) ? `https://www.youtube.com/embed/${last}` : null
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean)
    const id = parts[parts.length - 1]
    return id && VIMEO_VIDEO_ID_RE.test(id) ? `https://player.vimeo.com/video/${id}` : null
  }
  return null
}

const Video: ModuleDefinition = {
  name: "video",
  category: "media",
  schema: {
    url: { type: "url", label: "embed URL (YouTube or Vimeo)" },
    title: { type: "plain", label: "title" },
    src: { type: "url", label: "video file URL" },
    poster: { type: "media" },
    controls: { type: "boolean" },
    autoplay: { type: "boolean" },
    loop: { type: "boolean" },
    muted: { type: "boolean" },
  },
  defaults: {
    url: "",
    title: "",
    src: "",
    poster: "",
    controls: true,
    autoplay: false,
    loop: false,
    muted: false,
  },
  contentModel: { children: "none" },
  defaultClasses: "w-full rounded-2xl",
  Component: (p: ModuleRenderProps) => {
    const url = str(p.props.url).trim()
    const title = str(p.props.title).trim() || "Video"

    if (url) {
      const embedSrc = resolveVideoEmbedSrc(url)
      // The aspect-ratio wrapper keeps the slot sized (and visible, with a
      // tinted ground) whether or not the URL resolved — an unrecognized
      // provider still shows a real, selectable placeholder instead of nothing.
      return createElement(
        "div",
        {
          className: `${p.className} relative w-full overflow-hidden bg-base-200`,
          style: { aspectRatio: "16/9" },
          ...rootAttrs(p),
        },
        embedSrc
          ? createElement("iframe", {
              className: "absolute inset-0 h-full w-full",
              src: embedSrc,
              title,
              allow:
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
              allowFullScreen: true,
              loading: "lazy",
            })
          : createElement(
              "span",
              {
                className:
                  "absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-base-content/60",
              },
              "Video embed — paste a YouTube or Vimeo URL."
            )
      )
    }

    const src = str(p.props.src).trim()
    if (!src) {
      // Neither an embed URL nor a file src is set — keep the slot visible with
      // a placeholder rather than a bare, sizeless <video>.
      return createElement(
        "div",
        { className: `${p.className} flex min-h-40 items-center justify-center bg-base-200`, ...rootAttrs(p) },
        createElement(
          "span",
          { className: "px-4 text-center text-sm text-base-content/60" },
          "Video — paste an embed URL or a file URL in Settings."
        )
      )
    }

    return createElement("video", {
      className: p.className,
      src,
      poster: str(p.props.poster) || undefined,
      controls: bool(p.props.controls) || undefined,
      autoPlay: bool(p.props.autoplay) || undefined,
      loop: bool(p.props.loop) || undefined,
      muted: bool(p.props.muted) || undefined,
      playsInline: true,
      ...rootAttrs(p),
    })
  },
}

export const FORM_MODULES: ModuleDefinition[] = [
  Form,
  Input,
  Textarea,
  SelectField,
  Checkbox,
  Radio,
  FormLabel,
  Submit,
  Video,
]
