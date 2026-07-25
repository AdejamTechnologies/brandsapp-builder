/**
 * Entrance animations for output nodes. A node's `anim` (effect + trigger) compiles
 * to a per-node CSS rule referencing a small shared keyframe set. `trigger: "load"`
 * plays on page load; `trigger: "scroll"` starts hidden and the runtime reveals it
 * with IntersectionObserver. Honors `prefers-reduced-motion`. SSR/marketplace-safe.
 */

import { classForNode } from "./style"

export interface NodeAnim {
  effect: string
  trigger?: "load" | "scroll"
  duration?: number
  delay?: number
}

export const ANIM_EFFECTS = ["fade", "fade-up", "fade-down", "fade-left", "fade-right", "zoom"] as const

/** Shared keyframes + reduced-motion opt-out (included once when a page animates). */
export const ANIMATION_KEYFRAMES =
  "@keyframes bapp-fade{from{opacity:0}to{opacity:1}}" +
  "@keyframes bapp-fade-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}" +
  "@keyframes bapp-fade-down{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}" +
  "@keyframes bapp-fade-left{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}" +
  "@keyframes bapp-fade-right{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}" +
  "@keyframes bapp-zoom{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}" +
  "@media (prefers-reduced-motion:reduce){.bapp-anim{animation:none!important;opacity:1!important;transform:none!important}}"

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)))

/** Per-node animation CSS. `.n-<id>` (load) or `.n-<id>.bapp-in` (scroll reveal). */
export function animCss(id: string, anim: NodeAnim): string {
  const eff = (ANIM_EFFECTS as readonly string[]).includes(anim.effect) ? anim.effect : "fade"
  const dur = clamp(anim.duration ?? 600, 50, 5000)
  const delay = clamp(anim.delay ?? 0, 0, 8000)
  const a = `bapp-${eff} ${dur}ms cubic-bezier(.16,1,.3,1) ${delay}ms both`
  const sel = `.${classForNode(id)}`
  return anim.trigger === "scroll" ? `${sel}{opacity:0}${sel}.bapp-in{animation:${a}}` : `${sel}{animation:${a}}`
}
