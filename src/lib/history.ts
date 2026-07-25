import { useCallback, useRef, useState } from "react"

import type { Doc } from "@brandsapp/builder-core"

interface HistoryState {
  doc: Doc
  past: Doc[]
  future: Doc[]
}

export interface EditorHistory {
  doc: Doc
  canUndo: boolean
  canRedo: boolean
  /** A user edit: pushes the current doc onto the undo stack, clears redo. */
  apply: (next: Doc) => void
  undo: () => void
  redo: () => void
  /** Replace the doc WITHOUT recording history (initial load, remote sync). */
  reset: (doc: Doc) => void
}

const CAP = 100

/**
 * Undo/redo for the editor doc. `onCommit` fires whenever the doc changes as the
 * result of a local action (apply/undo/redo) — the editor uses it to broadcast to
 * collaborators. `reset` does NOT fire it (it's for inbound load/remote sync, so
 * we don't echo back).
 */
export function useHistory(initial: Doc, onCommit?: (doc: Doc) => void): EditorHistory {
  const [state, setState] = useState<HistoryState>({ doc: initial, past: [], future: [] })
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  const apply = useCallback((next: Doc) => {
    setState((s) => {
      if (next === s.doc) return s
      return { doc: next, past: [...s.past, s.doc].slice(-CAP), future: [] }
    })
    commitRef.current?.(next)
  }, [])

  const undo = useCallback(() => {
    setState((s) => {
      if (!s.past.length) return s
      const prev = s.past[s.past.length - 1]
      commitRef.current?.(prev)
      return { doc: prev, past: s.past.slice(0, -1), future: [s.doc, ...s.future].slice(0, CAP) }
    })
  }, [])

  const redo = useCallback(() => {
    setState((s) => {
      if (!s.future.length) return s
      const next = s.future[0]
      commitRef.current?.(next)
      return { doc: next, past: [...s.past, s.doc].slice(-CAP), future: s.future.slice(1) }
    })
  }, [])

  const reset = useCallback((doc: Doc) => {
    setState({ doc, past: [], future: [] })
  }, [])

  return { doc: state.doc, canUndo: state.past.length > 0, canRedo: state.future.length > 0, apply, undo, redo, reset }
}
