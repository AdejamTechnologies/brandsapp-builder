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

const Form: ModuleDefinition = {
  name: "form",
  category: "forms",
  schema: {
    action: { type: "url" },
    method: { type: "select", options: [{ label: "POST", value: "post" }, { label: "GET", value: "get" }] },
    successMessage: { type: "plain", label: "message shown after sending" },
  },
  defaults: {
    action: DEFAULT_FORM_ACTION,
    method: "post",
    successMessage: "Thanks — we'll be in touch.",
  },
  contentModel: { children: "any" },
  defaultClasses: "flex flex-col gap-4 w-full max-w-md",
  // Submitted by the runtime (fetch + inline confirmation) rather than a full
  // page navigation. The markup still posts natively if JS never runs.
  needsRuntime: true,
  // Drops in as a WORKING contact form. The field `name`s match what
  // /api/public/contact reads (name + message required, email/phone optional).
  defaultChildren: [
    { module: "form-label", props: { text: "Name" } },
    { module: "input", props: { type: "text", name: "name", placeholder: "Your name", required: true } },
    { module: "form-label", props: { text: "Email" } },
    { module: "input", props: { type: "email", name: "email", placeholder: "you@example.com" } },
    { module: "form-label", props: { text: "Message" } },
    { module: "textarea", props: { name: "message", placeholder: "How can we help?", rows: 4, required: true } },
    { module: "submit", props: { label: "Send message" } },
  ],
  Component: (p: ModuleRenderProps) =>
    createElement(
      "form",
      {
        className: p.className,
        action: str(p.props.action, DEFAULT_FORM_ACTION) || undefined,
        method: str(p.props.method, "post"),
        "data-bapp-form": "",
        "data-success": str(p.props.successMessage, "Thanks — we'll be in touch."),
        ...rootAttrs(p),
      },
      p.children
    ),
}

// ── fields ────────────────────────────────────────────────────────────────────

const INPUT_TYPES = ["text", "email", "password", "number", "tel", "url", "date", "search"].map((v) => ({
  label: v,
  value: v,
}))

const Input: ModuleDefinition = {
  name: "input",
  category: "forms",
  schema: {
    type: { type: "select", options: INPUT_TYPES },
    name: { type: "plain" },
    placeholder: { type: "plain" },
    required: { type: "boolean" },
  },
  defaults: { type: "text", name: "", placeholder: "Enter text…", required: false },
  contentModel: { children: "none" },
  defaultClasses: INPUT_CLASSES,
  Component: (p: ModuleRenderProps) =>
    createElement("input", {
      className: p.className,
      type: str(p.props.type, "text"),
      name: str(p.props.name) || undefined,
      placeholder: str(p.props.placeholder) || undefined,
      required: bool(p.props.required) || undefined,
      ...rootAttrs(p),
    }),
}

const Textarea: ModuleDefinition = {
  name: "textarea",
  category: "forms",
  schema: {
    name: { type: "plain" },
    placeholder: { type: "plain" },
    rows: { type: "number" },
    required: { type: "boolean" },
  },
  defaults: { name: "", placeholder: "Your message…", rows: 4, required: false },
  contentModel: { children: "none" },
  defaultClasses: INPUT_CLASSES,
  Component: (p: ModuleRenderProps) =>
    createElement("textarea", {
      className: p.className,
      name: str(p.props.name) || undefined,
      placeholder: str(p.props.placeholder) || undefined,
      rows: num(p.props.rows, 4),
      required: bool(p.props.required) || undefined,
      ...rootAttrs(p),
    }),
}

/** Options come from a newline/comma separated string ("Nigeria\nGhana" or "a,b,c"). */
const parseOptions = (raw: unknown): string[] =>
  str(raw)
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)

const SelectField: ModuleDefinition = {
  name: "select-field",
  category: "forms",
  schema: {
    name: { type: "plain" },
    options: { type: "plain", label: "options (one per line)" },
    required: { type: "boolean" },
  },
  defaults: { name: "", options: "Option one\nOption two\nOption three", required: false },
  contentModel: { children: "none" },
  defaultClasses: INPUT_CLASSES,
  Component: (p: ModuleRenderProps) => {
    const opts: ReactNode[] = parseOptions(p.props.options).map((o, i) =>
      createElement("option", { key: i, value: o }, o)
    )
    return createElement(
      "select",
      {
        className: p.className,
        name: str(p.props.name) || undefined,
        required: bool(p.props.required) || undefined,
        ...rootAttrs(p),
      },
      opts
    )
  },
}

/** A checkbox or radio wrapped in its label (one row). */
const makeToggle = (name: "checkbox" | "radio"): ModuleDefinition => ({
  name,
  category: "forms",
  schema: {
    name: { type: "plain" },
    label: { type: "plain" },
    value: { type: "plain" },
    required: { type: "boolean" },
  },
  defaults: { name: "", label: name === "checkbox" ? "I agree" : "Option", value: "", required: false },
  contentModel: { children: "none" },
  defaultClasses: "inline-flex items-center gap-2 text-sm text-base-content",
  inlineTextEdit: { prop: "label" },
  Component: (p: ModuleRenderProps) =>
    createElement(
      "label",
      { className: p.className, ...rootAttrs(p) },
      createElement("input", {
        type: name,
        name: str(p.props.name) || undefined,
        value: str(p.props.value) || undefined,
        required: bool(p.props.required) || undefined,
        className: "size-4 accent-primary",
      }),
      createElement("span", null, str(p.props.label))
    ),
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

const Submit: ModuleDefinition = {
  name: "submit",
  category: "forms",
  schema: { label: { type: "plain" } },
  defaults: { label: "Submit" },
  contentModel: { children: "none" },
  inlineTextEdit: { prop: "label" },
  // Matches the `button` primitive exactly — a form's submit is the same control
  // as any other CTA, and having one be a pill and the other a rounded rectangle
  // is the sort of drift that makes a page look assembled rather than designed.
  defaultClasses:
    "inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-primary-content text-sm font-medium transition-colors hover:bg-primary/90",
  Component: (p: ModuleRenderProps) =>
    createElement("button", { className: p.className, type: "submit", ...rootAttrs(p) }, str(p.props.label)),
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
