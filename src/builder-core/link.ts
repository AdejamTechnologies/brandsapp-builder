import type { PropSchema } from "./registry"

/**
 * The shared link model for anything that navigates — `link`, `button`, and any
 * future control. Authors pick a TYPE and fill in one field for it; the renderer
 * turns that into a real href. Keeping this in one place means a button and a
 * link block can never drift into supporting different destinations.
 *
 * Types mirror the ones a site actually needs:
 *   url      → an address (internal path or external site)
 *   app      → a page one of this brand's installed apps publishes, picked
 *              from a list rather than typed. /shop exists only when Commerce
 *              is installed, so the list is built per brand from
 *              lib/public-endpoints.ts and an author cannot choose a 404.
 *   entity   → ONE resource: this post, that product, that course. Searched
 *              rather than listed, because a brand may have thousands. The
 *              editor stores the resolved path alongside the resource's kind
 *              and ref; see the `entity` case below for why all three.
 *   page     → another page in this site, by slug
 *   section  → an element on the current page, by its id (in-page anchor)
 *   email    → mailto:, with an optional subject
 *   phone    → tel:
 *   file     → a hosted asset (media library url)
 */
export const LINK_TYPES = ["url", "app", "entity", "page", "section", "email", "phone", "file"] as const
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
    case "app": {
      /**
       * Already a root-relative path when it came from the picker. Stored as
       * the path rather than an app id + page name, so a link keeps working
       * if the catalogue is reorganised, and so the renderer needs to know
       * nothing about apps at all.
       */
      const path = str(props.appPath).trim()
      if (!path) return ""
      return path.startsWith("/") ? path : `/${path}`
    }
    case "entity": {
      /**
       * The STORED path, exactly as the `app` case uses its stored path, and
       * for the same reason: this file is vendored into the builder app, so it
       * cannot import the resource catalogue and must stay app-ignorant.
       *
       * `entityKind` and `entityRef` are stored too, and are deliberately not
       * read here. They are what the Settings panel shows an author ("Blue
       * Suede Shoes", not an opaque id) and what a future broken-link report
       * would need in order to say what a link MEANT. The path is what renders,
       * and it keeps resolving after a rename because the old address is kept
       * (server/db/slug-alias.ts) rather than because this re-derives it.
       */
      const path = str(props.entityPath).trim()
      if (!path) return ""
      return path.startsWith("/") ? path : `/${path}`
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
      { label: "App page", value: "app" },
      { label: "Post, product or item", value: "entity" },
      { label: "Page", value: "page" },
      { label: "Section", value: "section" },
      { label: "Email", value: "email" },
      { label: "Phone", value: "phone" },
      { label: "File", value: "file" },
    ],
  },
  href: { type: "url", label: "URL", showIf: { linkType: ["url"] } },
  /**
   * `plain`, picked by NAME in the editor's settings panel — the same way
   * `pageSlug` and `sectionId` are. The shared ControlType union deliberately
   * does not know about pickers, so the panel special-cases the prop name and
   * falls back to a text box when it has no list to offer.
   */
  appPath: { type: "plain", label: "app page", showIf: { linkType: ["app"] } },
  /**
   * The resource picker writes all four together; `entityRef` is the one the
   * panel attaches the picker to, by NAME, as with `appPath` and `pageSlug`.
   *
   * The other three are stored state rather than fields anyone types into, and
   * `showIf: { linkType: [] }` is how a field says so: the panel keeps a field
   * only when `allowed.includes(current)`, and an empty list matches nothing.
   * They still belong in the schema — that is what gives them defaults and
   * what lets the editor read them back to show which resource is chosen.
   */
  entityRef: { type: "plain", label: "resource", showIf: { linkType: ["entity"] } },
  entityKind: { type: "plain", label: "resource type", showIf: { linkType: [] } },
  entityPath: { type: "plain", label: "resource path", showIf: { linkType: [] } },
  entityLabel: { type: "plain", label: "resource name", showIf: { linkType: [] } },
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
  appPath: "",
  entityRef: "",
  entityKind: "",
  entityPath: "",
  entityLabel: "",
  pageSlug: "",
  sectionId: "",
  email: "",
  subject: "",
  phone: "",
  assetUrl: "",
  newTab: false,
  preload: "default",
}
