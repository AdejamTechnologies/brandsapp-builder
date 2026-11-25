import { useState } from "react"
import { INTERACTION_TRIGGERS, pruneInteractions, safeStateName, type Doc, type Interaction, type Node } from "@brandsapp/builder-core"

import { describeNode } from "../lib/describe-node"
import { Select } from "./ui/select"

/**
 * States and interactions — Framer's variants, in the inspector (new file,
 * 24 Nov 2026; engine in builder-core/motion.ts).
 *
 * Two halves, matching the two fields on a node:
 *   States   named looks, each a set of utility classes applied while it is on.
 *            `open: "max-h-[80vh] opacity-100"`. The move between states is a
 *            CSS transition the engine adds.
 *   Triggers what switches a state — a tap, a hover, scrolling into view, the
 *            page loading — on this element or on others.
 *
 * "Preview" flips the state on the canvas element directly, so a designer can
 * see the look without leaving the editor. It is transient: the canvas
 * re-renders from the document and the preview goes away, which is right —
 * the stored page always starts in its base state.
 */

const TRIGGER_LABEL: Record<(typeof INTERACTION_TRIGGERS)[number], string> = {
  tap: "Tap / click",
  hover: "Hover",
  inview: "Scrolls into view",
  load: "Page loads",
}

const input =
  "h-7 w-full rounded-[7px] border border-input bg-white px-2 text-xs outline-none focus-visible:border-ring"

export function InteractionFields({
  doc,
  node,
  onChange,
  onDocChange,
}: {
  doc: Doc
  node: Node
  onChange: (patch: Partial<Node>, coalesceKey?: string) => void
  /** Whole-document change — removing a state prunes triggers on OTHER nodes too (25 Nov 2026). */
  onDocChange: (doc: Doc, coalesceKey?: string) => void
}) {
  const states = node.states ?? {}
  const on = node.on ?? []
  const [newState, setNewState] = useState("")
  const [previewing, setPreviewing] = useState<string | null>(null)

  // Elements that have states — the only useful targets for a trigger.
  const stateful = Object.values(doc.nodes).filter((n) => n.states && Object.keys(n.states).length)
  const label = (n: Node) => (n.id === node.id ? "This element" : describeNode(n).name || n.module)

  const setStates = (next: Record<string, string>, key: string) =>
    onChange({ states: Object.keys(next).length ? next : undefined }, key)
  const setOn = (next: Interaction[], key: string) => onChange({ on: next.length ? next : undefined }, key)

  const preview = (name: string) => {
    const el = document.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`)
    if (!el) return
    if (previewing === name) {
      el.removeAttribute("data-bapp-state")
      setPreviewing(null)
    } else {
      el.setAttribute("data-bapp-state", name)
      setPreviewing(name)
    }
  }

  const addState = () => {
    const name = newState.trim().toLowerCase().replace(/\s+/g, "-")
    if (!safeStateName(name) || states[name] !== undefined) return
    setStates({ ...states, [name]: "" }, `states:${node.id}:add`)
    setNewState("")
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">States</span>

      {Object.entries(states).map(([name, classes]) => (
        <div key={name} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-foreground">
            <span className="font-medium">{name}</span>
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => preview(name)}
                className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              >
                {previewing === name ? "Stop preview" : "Preview"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const { [name]: _gone, ...rest } = states
                  void _gone
                  // One document change: the state goes, and every trigger on
                  // ANY node that switched it goes with it (25 Nov 2026) — only
                  // this node's own triggers used to be cleaned up.
                  const next = {
                    ...doc,
                    nodes: {
                      ...doc.nodes,
                      [node.id]: { ...node, states: Object.keys(rest).length ? rest : undefined },
                    },
                  }
                  onDocChange(pruneInteractions(next).doc, `states:${node.id}:remove`)
                }}
                className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              >
                Remove
              </button>
            </span>
          </div>
          <input
            className={input}
            placeholder="classes while on, e.g. scale-105 bg-primary text-primary-content"
            defaultValue={classes}
            onBlur={(e) => setStates({ ...states, [name]: e.target.value.trim() }, `states:${node.id}:${name}`)}
          />
        </div>
      ))}

      <div className="flex gap-1.5">
        <input
          className={input}
          placeholder="new state, e.g. open"
          value={newState}
          onChange={(e) => setNewState(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addState()}
        />
        <button
          type="button"
          onClick={addState}
          className="h-7 shrink-0 cursor-pointer rounded-[7px] border border-input px-2 text-xs hover:bg-muted"
        >
          Add
        </button>
      </div>
      <p className="text-[10.5px] leading-relaxed text-muted-foreground">
        A child follows this element&apos;s state with <code>group</code> here and{" "}
        <code>group-data-[bapp-state~=open]:…</code> on the child.
      </p>

      <span className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Triggers</span>
      {on.map((it, i) => {
        const target = it.targets?.[0] ? doc.nodes[it.targets[0]] : node
        const targetStates = Object.keys(target?.states ?? {})
        const update = (p: Partial<Interaction>) =>
          setOn(on.map((x, j) => (j === i ? { ...x, ...p } : x)), `on:${node.id}:${i}`)
        return (
          <div key={i} className="flex flex-col gap-1.5 rounded-md border border-border p-2">
            <Select
              value={it.trigger}
              onValueChange={(v) => update({ trigger: v as Interaction["trigger"] })}
              options={INTERACTION_TRIGGERS.map((t) => ({ value: t, label: TRIGGER_LABEL[t] }))}
            />
            <Select
              value={it.targets?.[0] ?? node.id}
              onValueChange={(v) => update({ targets: v === node.id ? undefined : [v] })}
              options={[node, ...stateful.filter((n) => n.id !== node.id)].map((n) => ({ value: n.id, label: label(n) }))}
            />
            <Select
              value={it.state}
              onValueChange={(v) => update({ state: v })}
              options={(targetStates.length ? targetStates : [it.state]).map((s) => ({ value: s, label: `→ ${s}` }))}
            />
            <div className="flex items-center justify-between">
              <Select
                value={it.mode ?? (it.trigger === "tap" ? "toggle" : "set")}
                onValueChange={(v) => update({ mode: v as Interaction["mode"] })}
                options={[
                  { value: "toggle", label: "Turns it on and off" },
                  { value: "set", label: "Turns it on" },
                  { value: "clear", label: "Turns it off" },
                ]}
                className="w-auto flex-1"
              />
              <button
                type="button"
                onClick={() => setOn(on.filter((_, j) => j !== i), `on:${node.id}:remove`)}
                className="ml-2 cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              >
                Remove
              </button>
            </div>
            {it.trigger === "hover" || it.trigger === "inview" ? (
              <label className="flex cursor-pointer items-center justify-between text-xs text-foreground">
                Keep it after leaving
                <input
                  type="checkbox"
                  checked={!!it.once}
                  onChange={(e) => update({ once: e.target.checked || undefined })}
                  className="size-3.5 cursor-pointer accent-primary"
                />
              </label>
            ) : null}
          </div>
        )
      })}
      <button
        type="button"
        disabled={!stateful.length}
        onClick={() => {
          const first = Object.keys(states)[0]
            ? node
            : stateful[0]
          if (!first) return
          const state = Object.keys(first.states ?? {})[0] ?? "on"
          setOn([...on, { trigger: "tap", state, ...(first.id === node.id ? {} : { targets: [first.id] }) }], `on:${node.id}:add`)
        }}
        className="h-7 cursor-pointer rounded-[7px] border border-dashed border-input text-xs text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {stateful.length ? "Add a trigger" : "Give an element a state first"}
      </button>
    </div>
  )
}
