import { useState } from "react"

import type { Comment, Doc } from "@brandsapp/builder-core"
import { addComment, addReply, deleteComment, toggleCommentResolved } from "../lib/doc-ops"
import { Button } from "./ui/button"
import { Dialog } from "./ui/dialog"
import { Textarea } from "./ui/textarea"
import { cn } from "../lib/utils"

/** A reviewer name, remembered locally so replies are attributed per person. */
function authorName(): string {
  try {
    let a = localStorage.getItem("bapp-author")
    if (!a) {
      a = window.prompt("Your name (shown on comments)", "") || "You"
      localStorage.setItem("bapp-author", a)
    }
    return a
  } catch {
    return "You"
  }
}

interface CommentsDialogProps {
  doc: Doc
  selectedId: string | null
  onChange: (d: Doc) => void
  onClose: () => void
  onJump: (nodeId: string) => void
}

export function CommentsDialog({ doc, selectedId, onChange, onClose, onJump }: CommentsDialogProps) {
  const [draft, setDraft] = useState("")
  const [reply, setReply] = useState<Record<string, string>>({})
  const comments = doc.comments ?? []
  const open = comments.filter((c) => !c.resolved)
  const resolved = comments.filter((c) => c.resolved)

  const label = (nodeId?: string) =>
    nodeId ? doc.nodes[nodeId]?.label ?? doc.nodes[nodeId]?.module ?? "(deleted layer)" : "General"

  const post = () => {
    const b = draft.trim()
    if (!b) return
    onChange(addComment(doc, selectedId ?? undefined, b, authorName()).doc)
    setDraft("")
  }
  const postReply = (id: string) => {
    const b = (reply[id] ?? "").trim()
    if (!b) return
    onChange(addReply(doc, id, b, authorName()))
    setReply((r) => ({ ...r, [id]: "" }))
  }

  const Thread = (c: Comment) => (
    <div key={c.id} className={cn("rounded-lg border border-border p-3", c.resolved && "opacity-60")}>
      <div className="mb-2 flex items-center gap-2">
        <button
          className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
          title="Select the commented layer"
          onClick={() => c.nodeId && onJump(c.nodeId)}
        >
          {label(c.nodeId)}
        </button>
        <div className="flex-1" />
        <button className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => onChange(toggleCommentResolved(doc, c.id))}>
          {c.resolved ? "Reopen" : "Resolve"}
        </button>
        <button className="text-[11px] text-muted-foreground hover:text-red-600" onClick={() => onChange(deleteComment(doc, c.id))}>
          Delete
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {c.messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-medium text-foreground">{m.author}</span>{" "}
            <span className="text-foreground/80">{m.body}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:border-ring"
          placeholder="Reply…"
          value={reply[c.id] ?? ""}
          onChange={(e) => setReply((r) => ({ ...r, [c.id]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") postReply(c.id)
          }}
        />
        <Button variant="outline" size="sm" onClick={() => postReply(c.id)}>
          Reply
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open onClose={onClose} title="Comments">
      <div className="mb-3 flex flex-col gap-2">
        <Textarea
          className="h-20 text-sm"
          placeholder={selectedId ? `Comment on “${label(selectedId)}”…` : "Add a general comment…"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={post} disabled={!draft.trim()}>
            {selectedId ? "Comment on selection" : "Add comment"}
          </Button>
        </div>
      </div>

      <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
        {open.length === 0 && resolved.length === 0 && (
          <div className="px-1 py-4 text-xs text-muted-foreground">
            No comments yet. Select a layer and leave one — collaborators see it live.
          </div>
        )}
        {open.map(Thread)}
        {resolved.length > 0 && (
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Resolved</div>
        )}
        {resolved.map(Thread)}
      </div>
    </Dialog>
  )
}
