import type { PropSchema } from "./registry"

/**
 * The shared link model for anything that navigates — `link`, `button`, and any
 * future control. Authors pick a TYPE and fill in one field for it; the renderer
 * turns that into a real href. Keeping this in one place means a button and a
 * link block can never drift into supporting different destinations.
 *
 * Types mirror the ones a site actually needs:
 *   url      → an address (internal path or external site)
 *   page     → another page in this site, by slug
 *   section  → an element on the current page, by its id (in-page anchor)
 *   email    → mailto:, with an optional subject
 *   phone    → tel:
 *   file     → a hosted asset (media library url)
 */
export const LINK_TYPES = ["url", "page", "section", "email", "phone", "file"] as const
export type LinkType = (typeof LINK_TYPES)[number]

const str = (v: unknown, d = "") => (v == null ? d : String(v))

/** Build the href for a node's link props. Empty string when nothing is set. */
export function resolveHref(props: Record<string, unknown>): string {
  const type = str(props.linkType, "url") as LinkType
  switch (type) {
    case "page": {
      const slug = str(props.pageSlug).trim()
      if (!slug) return ""
      // Stored as a slug; emitted as a root-relative path.
      return slug.startsWith("/") ? slug : `/${slug}`
    }
    case "section": {
      const id = str(props.sectionId).trim().replace(/^#/, "")
      return id ? `#${id}` : ""
    }
    case "email": {
      const to = str(props.email).trim()
      if (!to) return ""
      const subject = str(props.subject).trim()
      return `mailto:${to}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`
    }
    case "phone": {
      const n = str(props.phone).trim()
      // tel: tolerates spaces poorly; strip everything a dialler ignores.
      return n ? `tel:${n.replace(/[^\d+]/g, "")}` : ""
    }
    case "file":
      return str(props.assetUrl).trim()
    case "url":
    default:
      return str(props.href).trim()
  }
}

/** `target`/`rel` for a link, given its props. */
export function linkAttrs(props: Record<string, unknown>): {
  target?: string
  rel?: string
  download?: boolean
} {
  const newTab = props.newTab === true || props.newTab === "true"
  const isFile = str(props.linkType, "url") === "file"

  // Two independent sources can each want a `rel` token: opening in a new tab
  // needs the security pair (`noopener noreferrer`), and the author's chosen
  // `preload` strategy can want `prefetch`. Collect whichever apply and join
  // them into ONE rel — emitting a second `rel` attribute would just have the
  // last one win and silently drop the other.
  const relTokens: string[] = []
  if (newTab) relTokens.push("noopener", "noreferrer")
  if (str(props.preload, "default") === "prefetch") relTokens.push("prefetch")

  return {
    ...(newTab ? { target: "_blank" } : {}),
    ...(relTokens.length ? { rel: relTokens.join(" ") } : {}),
    // A hosted asset should save rather than navigate when opened in place.
    ...(isFile && !newTab ? { download: true } : {}),
  }
}

/**
 * The schema fragment every linkable module spreads into its own schema, so the
 * Settings panel shows exactly one destination field for the chosen type.
 */
export const LINK_SCHEMA: PropSchema = {
  linkType: {
    type: "select",
    label: "link type",
    options: [
      { label: "URL", value: "url" },
      { label: "Page", value: "page" },
      { label: "Section", value: "section" },
      { label: "Email", value: "email" },
      { label: "Phone", value: "phone" },
      { label: "File", value: "file" },
    ],
  },
  href: { type: "url", label: "URL", showIf: { linkType: ["url"] } },
  pageSlug: { type: "plain", label: "page", showIf: { linkType: ["page"] } },
  sectionId: { type: "plain", label: "section id", showIf: { linkType: ["section"] } },
  email: { type: "plain", label: "email", showIf: { linkType: ["email"] } },
  subject: { type: "plain", label: "subject", showIf: { linkType: ["email"] } },
  phone: { type: "plain", label: "phone", showIf: { linkType: ["phone"] } },
  assetUrl: { type: "media", label: "file", showIf: { linkType: ["file"] } },
  newTab: { type: "boolean", label: "open in new tab" },
  preload: {
    type: "select",
    label: "preload",
    options: [
      { label: "Default", value: "default" },
      { label: "None", value: "none" },
      { label: "Prefetch", value: "prefetch" },
    ],
  },
}

export const LINK_DEFAULTS = {
  linkType: "url",
  href: "#",
  pageSlug: "",
  sectionId: "",
  email: "",
  subject: "",
  phone: "",
  assetUrl: "",
  newTab: false,
  preload: "default",
}
