import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
}

/** A lightweight modal shell (backdrop + panel), Esc + click-outside to close. */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-2xl border border-line bg-panel p-5 shadow-[0_24px_60px_-20px_rgba(11,18,32,0.5)]",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            <button className="text-subtle hover:text-ink" onClick={onClose} aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>
}
