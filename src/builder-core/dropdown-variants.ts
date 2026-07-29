/**
 * Dropdown variants — the starter arrangements offered from the Dropdown
 * element's preset chip. Same contract as the navbar catalog: a variant is a
 * `DefaultChild` subtree plus the classes for the root, and applying one plants
 * ordinary editable nodes. Nothing here is a renderer special case.
 *
 * Every variant sets `mode: "custom"`, because a prop-driven trigger cannot be an
 * avatar or a bare icon. That leaves the SIMPLE dropdown — what stored docs
 * already contain — untouched and unmigrated.
 *
 * PROVENANCE, as with the navbar set: the catalog covers the union of the three
 * sources, none of the markup is copied.
 *   • Preline — not ingested (dual MIT + Fair Use non-compete). Its 22 examples
 *     are layout ideas, which aren't protectable; the markup is ours.
 *   • shadcn/ui — MIT, but React components over Radix/Base UI. We render plain
 *     HTML from an AST in a Worker, so the patterns are reimplemented on our own
 *     `data-bapp-dropdown` runtime.
 *   • ShadcnSpace — half its dropdowns are paid, and its licence is WrapPixel's
 *     rather than the components' own, so only the shapes are reproduced.
 *
 * NOT COVERED, deliberately: Preline's transition variants (scale, slide-up,
 * inner-translate) and its auto-close modes. Those are runtime BEHAVIOUR, not
 * structure — a variant that plants markup cannot express them, and faking them
 * as separate entries would imply settings that don't exist. The runtime already
 * animates one way and closes on outside-click.
 */

import { iconSvg } from "./icons"
import { MENU_ITEM } from "./modules/interactive"
import type { DefaultChild } from "./registry"

export interface DropdownVariant {
  id: string
  label: string
  group: "Trigger" | "Content" | "Placement"
  hint: string
  /** Replaces the dropdown root's own `defaultClasses`. */
  classes: string
  /** Merged into the node when applied. Every entry gets `mode: "custom"`. */
  props?: Record<string, unknown>
  children: DefaultChild[]
}

// ── shared pieces ────────────────────────────────────────────────────────────

const ROOT = "relative inline-block"

const PANEL =
  "absolute top-[calc(100%+6px)] left-0 z-50 min-w-56 rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-lg"

const TRIGGER =
  "inline-flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-3.5 py-2 text-sm font-medium text-base-content cursor-pointer"

const G = (id: string) => iconSvg(id) ?? ""

const icon = (id: string, classes = "inline-block w-4 h-4 shrink-0 text-base-content/60"): DefaultChild => ({
  module: "icon",
  props: { svg: G(id) },
  classes,
})

const span = (text: string, classes = ""): DefaultChild => ({
  module: "text",
  props: { tag: "span", text },
  ...(classes ? { classes } : {}),
})

/** A menu row. Children rather than a text prop, so an icon can lead it. */
const item = (text: string, iconId?: string, classes = MENU_ITEM): DefaultChild => ({
  module: "link",
  props: { text: "", href: "#" },
  classes,
  children: [...(iconId ? [icon(iconId)] : []), span(text, "flex-1")],
})

/** A row with a keyboard hint pushed to the right. */
const itemWithShortcut = (text: string, iconId: string, keys: string): DefaultChild => ({
  module: "link",
  props: { text: "", href: "#" },
  classes: MENU_ITEM,
  children: [
    icon(iconId),
    span(text, "flex-1"),
    span(keys, "text-xs tracking-widest text-base-content/40"),
  ],
})

const separator = (): DefaultChild => ({ module: "divider", classes: "my-1.5 h-px w-full bg-base-300 border-0" })

const sectionTitle = (text: string): DefaultChild => ({
  module: "text",
  props: { tag: "div", text },
  classes: "px-2.5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-base-content/45",
})

const trigger = (children: DefaultChild[], classes = TRIGGER): DefaultChild => ({
  module: "dropdown-trigger",
  classes,
  children,
})

const menu = (children: DefaultChild[], classes = PANEL): DefaultChild => ({
  module: "dropdown-menu",
  classes,
  children,
})

/** Text trigger with the chevron every dropdown needs to read as one. */
const textTrigger = (label = "Menu"): DefaultChild =>
  trigger([span(label), icon("arrow-down-s", "inline-block w-4 h-4 shrink-0 text-base-content/50")])

const avatar = (size = "size-7"): DefaultChild => ({
  module: "image",
  props: { src: "https://i.pravatar.cc/80?img=12", alt: "" },
  classes: `${size} rounded-full object-cover shrink-0`,
})

/** A checkbox/radio row: the control, then the label. */
const controlItem = (text: string, kind: "checkbox" | "radio", checked = false): DefaultChild => ({
  module: "box",
  classes: "flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-base-200",
  children: [
    {
      module: kind,
      // `startChecked`, not `checked` — the module names it that way because the
      // prop seeds the initial state rather than controlling it.
      props: {
        label: "",
        name: kind === "radio" ? "choice" : text.toLowerCase().replace(/\s+/g, "-"),
        startChecked: checked,
      },
      classes: "shrink-0",
    },
    span(text, "text-sm text-base-content"),
  ],
})

// ── the catalog ──────────────────────────────────────────────────────────────

const CATALOG: DropdownVariant[] = [
  // ── Trigger ───────────────────────────────────────────────────────────────
  {
    id: "button",
    label: "Button",
    group: "Trigger",
    hint: "Bordered button with a chevron.",
    classes: ROOT,
    children: [
      textTrigger(),
      menu([item("Overview"), item("Settings"), item("Support")]),
    ],
  },
  {
    id: "icon-only",
    label: "Icon only",
    group: "Trigger",
    hint: "Compact square button holding just a glyph.",
    classes: ROOT,
    children: [
      trigger(
        [icon("more2", "inline-block w-4 h-4 text-base-content/70")],
        "inline-flex size-9 items-center justify-center rounded-lg border border-base-300 bg-base-100 text-base-content cursor-pointer hover:bg-base-200"
      ),
      menu([item("Edit", "edit"), item("Share", "share"), separator(), item("Delete", "delete-bin")]),
    ],
  },
  {
    id: "avatar",
    label: "Avatar",
    group: "Trigger",
    hint: "Avatar and name, for an account menu.",
    classes: ROOT,
    children: [
      trigger(
        [avatar(), span("Ada Obi", "text-sm font-medium"), icon("arrow-down-s", "inline-block w-4 h-4 text-base-content/50")],
        "inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 py-1 pl-1 pr-3 text-base-content cursor-pointer hover:bg-base-200"
      ),
      menu([item("Profile", "user3"), item("Settings", "settings3"), separator(), item("Sign out", "logout-box")]),
    ],
  },

  // ── Content ───────────────────────────────────────────────────────────────
  {
    id: "plain",
    label: "Plain items",
    group: "Content",
    hint: "Text rows and nothing else.",
    classes: ROOT,
    children: [textTrigger(), menu([item("Overview"), item("Analytics"), item("Reports"), item("Settings")])],
  },
  {
    id: "icons",
    label: "With icons",
    group: "Content",
    hint: "A leading glyph on every row.",
    classes: ROOT,
    children: [
      textTrigger(),
      menu([
        item("Dashboard", "home5"),
        item("Analytics", "line-chart"),
        item("Team", "group"),
        item("Settings", "settings3"),
      ]),
    ],
  },
  {
    id: "dividers",
    label: "With dividers",
    group: "Content",
    hint: "Related actions split into groups.",
    classes: ROOT,
    children: [
      textTrigger(),
      menu([
        item("New file", "add"),
        item("Open", "folder3"),
        separator(),
        item("Download", "download"),
        item("Print", "printer"),
        separator(),
        item("Delete", "delete-bin"),
      ]),
    ],
  },
  {
    id: "sections",
    label: "Section titles",
    group: "Content",
    hint: "Small caps labels over each group.",
    classes: ROOT,
    children: [
      textTrigger(),
      menu([
        sectionTitle("Workspace"),
        item("Projects", "briefcase"),
        item("Members", "group"),
        sectionTitle("Account"),
        item("Profile", "user3"),
        item("Billing", "bank-card"),
      ]),
    ],
  },
  {
    id: "header",
    label: "With header",
    group: "Content",
    hint: "Signed-in identity above the actions.",
    classes: ROOT,
    children: [
      textTrigger("Account"),
      menu([
        {
          module: "box",
          classes: "flex items-center gap-2.5 border-b border-base-300 px-2.5 pb-2.5 pt-1.5 mb-1",
          children: [
            avatar("size-9"),
            {
              module: "stack",
              props: { direction: "column" },
              classes: "flex flex-col min-w-0",
              children: [
                span("Ada Obi", "text-sm font-medium text-base-content truncate"),
                span("ada@brand.com", "text-xs text-base-content/55 truncate"),
              ],
            },
          ],
        },
        item("Profile", "user3"),
        item("Settings", "settings3"),
        separator(),
        item("Sign out", "logout-box"),
      ]),
    ],
  },
  {
    id: "shortcuts",
    label: "With shortcuts",
    group: "Content",
    hint: "Keyboard hints aligned to the right.",
    classes: ROOT,
    children: [
      textTrigger(),
      menu([
        itemWithShortcut("New file", "add", "⌘N"),
        itemWithShortcut("Search", "search", "⌘K"),
        itemWithShortcut("Settings", "settings3", "⌘,"),
        separator(),
        itemWithShortcut("Sign out", "logout-box", "⇧⌘Q"),
      ]),
    ],
  },
  {
    id: "checkboxes",
    label: "Checkbox items",
    group: "Content",
    hint: "Several options can be on at once.",
    classes: ROOT,
    children: [
      textTrigger("Columns"),
      menu([
        sectionTitle("Show columns"),
        controlItem("Status", "checkbox", true),
        controlItem("Customer", "checkbox", true),
        controlItem("Amount", "checkbox"),
        controlItem("Created", "checkbox"),
      ]),
    ],
  },
  {
    id: "radios",
    label: "Radio items",
    group: "Content",
    hint: "One choice out of the group.",
    classes: ROOT,
    children: [
      textTrigger("Sort"),
      menu([
        sectionTitle("Sort by"),
        controlItem("Newest", "radio", true),
        controlItem("Oldest", "radio"),
        controlItem("Price: low to high", "radio"),
        controlItem("Price: high to low", "radio"),
      ]),
    ],
  },
  {
    id: "destructive",
    label: "Destructive action",
    group: "Content",
    hint: "The irreversible row set apart in red.",
    classes: ROOT,
    children: [
      textTrigger(),
      menu([
        item("Edit", "edit"),
        item("Duplicate", "clipboard"),
        separator(),
        {
          module: "link",
          props: { text: "", href: "#" },
          classes: "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-error no-underline hover:bg-error/10",
          children: [icon("delete-bin", "inline-block w-4 h-4 shrink-0"), span("Delete", "flex-1")],
        },
      ]),
    ],
  },
  {
    id: "submenu",
    label: "Sub-menu",
    group: "Content",
    hint: "A row that opens a second menu beside it.",
    classes: ROOT,
    children: [
      textTrigger(),
      menu([
        item("Profile", "user3"),
        {
          module: "dropdown",
          props: { mode: "custom", openOnHover: true, closeDelay: 200 },
          classes: "relative block",
          children: [
            trigger(
              [icon("share"), span("Share", "flex-1"), icon("arrow-right-s", "inline-block w-4 h-4 text-base-content/40")],
              `${MENU_ITEM} w-full border-0 bg-transparent`
            ),
            menu(
              [item("Copy link", "external-link"), item("Email", "mail"), item("Message", "chat3")],
              "absolute left-full top-0 z-50 ml-1 min-w-48 rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-lg"
            ),
          ],
        },
        separator(),
        item("Sign out", "logout-box"),
      ]),
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    group: "Content",
    hint: "Read rows: avatar, message, timestamp.",
    classes: ROOT,
    children: [
      trigger(
        [icon("notification3", "inline-block w-4 h-4 text-base-content/70")],
        "inline-flex size-9 items-center justify-center rounded-lg border border-base-300 bg-base-100 cursor-pointer hover:bg-base-200"
      ),
      menu(
        [
          {
            module: "box",
            classes: "flex items-center justify-between border-b border-base-300 px-2.5 pb-2 pt-1",
            children: [
              span("Notifications", "text-sm font-semibold text-base-content"),
              span("3 new", "text-xs text-base-content/50"),
            ],
          },
          notification("Ada commented on your draft", "2 min ago"),
          notification("Invoice #1042 was paid", "1 hour ago"),
          notification("Tunde joined the workspace", "Yesterday"),
          separator(),
          item("View all", "arrow-right"),
        ],
        `${PANEL} w-80 min-w-0`
      ),
    ],
  },
  {
    id: "switcher",
    label: "Team switcher",
    group: "Content",
    hint: "Pick a workspace, or add one.",
    classes: ROOT,
    children: [
      trigger(
        [avatar("size-6"), span("Brand HQ", "text-sm font-medium"), icon("arrow-down-s", "inline-block w-4 h-4 text-base-content/50")],
        TRIGGER
      ),
      menu([
        sectionTitle("Workspaces"),
        teamRow("Brand HQ", true),
        teamRow("Studio Lagos"),
        teamRow("Side projects"),
        separator(),
        item("Add workspace", "add"),
      ]),
    ],
  },

  // ── Placement ─────────────────────────────────────────────────────────────
  {
    id: "below-start",
    label: "Below, left",
    group: "Placement",
    hint: "Default: under the trigger, left edges aligned.",
    classes: ROOT,
    children: [textTrigger(), menu([item("Overview"), item("Settings"), item("Support")])],
  },
  {
    id: "below-end",
    label: "Below, right",
    group: "Placement",
    hint: "Under the trigger, right edges aligned.",
    classes: ROOT,
    children: [
      textTrigger(),
      menu(
        [item("Overview"), item("Settings"), item("Support")],
        "absolute top-[calc(100%+6px)] right-0 z-50 min-w-56 rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-lg"
      ),
    ],
  },
  {
    id: "above",
    label: "Above",
    group: "Placement",
    hint: "Opens upward — for a trigger near the page foot.",
    classes: ROOT,
    children: [
      textTrigger(),
      menu(
        [item("Overview"), item("Settings"), item("Support")],
        "absolute bottom-[calc(100%+6px)] left-0 z-50 min-w-56 rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-lg"
      ),
    ],
  },
  {
    id: "side",
    label: "To the side",
    group: "Placement",
    hint: "Opens to the right of the trigger.",
    classes: ROOT,
    children: [
      textTrigger(),
      menu(
        [item("Overview"), item("Settings"), item("Support")],
        "absolute left-[calc(100%+6px)] top-0 z-50 min-w-56 rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-lg"
      ),
    ],
  },
]

/**
 * Applied centrally rather than repeated on 19 entries: every variant supplies its
 * own trigger and menu, which only the custom structure renders. An entry may still
 * set its own props — they win.
 */
export const DROPDOWN_VARIANTS: DropdownVariant[] = CATALOG.map((v) => ({
  ...v,
  props: { mode: "custom", ...(v.props ?? {}) },
}))

function notification(text: string, when: string): DefaultChild {
  return {
    module: "link",
    props: { text: "", href: "#" },
    classes: "flex items-start gap-2.5 rounded-md px-2.5 py-2 no-underline hover:bg-base-200",
    children: [
      avatar("size-7 mt-0.5"),
      {
        module: "stack",
        props: { direction: "column" },
        classes: "flex flex-col min-w-0 flex-1",
        children: [
          span(text, "text-sm leading-snug text-base-content"),
          span(when, "text-xs text-base-content/45"),
        ],
      },
    ],
  }
}

function teamRow(name: string, current = false): DefaultChild {
  return {
    module: "link",
    props: { text: "", href: "#" },
    classes: MENU_ITEM,
    children: [
      avatar("size-6"),
      span(name, "flex-1"),
      ...(current ? [icon("check", "inline-block w-4 h-4 shrink-0 text-primary")] : []),
    ],
  }
}

export const DROPDOWN_VARIANT_GROUPS = ["Trigger", "Content", "Placement"] as const

export function dropdownVariant(id: string): DropdownVariant | undefined {
  return DROPDOWN_VARIANTS.find((v) => v.id === id)
}
