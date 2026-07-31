/**
 * Entrance animations for output nodes. A node's `anim` (effect + trigger) compiles
 * to a per-node CSS rule referencing a small shared keyframe set. `trigger: "load"`
 * plays on page load; `trigger: "scroll"` starts hidden and the runtime reveals it
 * with IntersectionObserver. Honors `prefers-reduced-motion`. SSR/marketplace-safe.
 */

import { ATMOSPHERE_KEYFRAMES } from "./modules/atmosphere"
import { classForNode } from "./style"

export interface NodeScrollMotion {
  parallax?: number
  zoom?: number
  rotate?: number
  fade?: boolean
  stagger?: number
  pin?: number
  /**
   * What the motion is measured against.
   *
   * "viewport" (the default) is the element's own pass across the screen. "pin"
   * is the progress through a PINNED ancestor's hold — which is the only thing
   * that works inside one, because a pinned section does not move, so its
   * children's viewport progress is frozen while the reader scrolls.
   */
  driver?: "viewport" | "pin"
}

export interface NodeAnim {
  effect: string
  trigger?: "load" | "scroll"
  duration?: number
  delay?: number
  scroll?: NodeScrollMotion
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
  "@media (prefers-reduced-motion:reduce){.bapp-anim{animation:none!important;opacity:1!important;transform:none!important}}" +
  ATMOSPHERE_KEYFRAMES

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)))

/** Per-node animation CSS. `.n-<id>` (load) or `.n-<id>.bapp-in` (scroll reveal). */
export function animCss(id: string, anim: NodeAnim): string {
  const eff = (ANIM_EFFECTS as readonly string[]).includes(anim.effect) ? anim.effect : "fade"
  const dur = clamp(anim.duration ?? 600, 50, 5000)
  const delay = clamp(anim.delay ?? 0, 0, 8000)
  const a = `bapp-${eff} ${dur}ms cubic-bezier(.16,1,.3,1) ${delay}ms both`
  const sel = `.${classForNode(id)}`
  const entrance =
    anim.trigger === "scroll" ? `${sel}{opacity:0}${sel}.bapp-in{animation:${a}}` : `${sel}{animation:${a}}`
  return entrance + scrollCss(id, anim.scroll)
}

/**
 * Scroll-linked motion, expressed in CSS against a progress variable the runtime
 * writes (`--bapp-p`, 0→1 across the element's pass through the viewport).
 *
 * The runtime deliberately sets ONLY that number — every transform is computed by
 * the compositor from this rule. Driving `transform` from JS per frame is what
 * makes scroll effects janky; writing one custom property and letting CSS do the
 * arithmetic keeps it off the main thread.
 *
 * Travel is multiplied by `--bapp-motion` (the theme's motion scale, default 1),
 * so a calm theme damps every scroll effect on the page at once and a motion of 0
 * removes them entirely.
 */
export function scrollCss(id: string, s?: NodeScrollMotion): string {
  if (!s) return ""
  const parts: string[] = []
  const m = "var(--bapp-motion,1)"
  // --bapp-q is published by the pinned ancestor and inherits down to here.
  const p = s.driver === "pin" ? "var(--bapp-q,0)" : "var(--bapp-p,0)"

  if (s.parallax) parts.push(`translate3d(0,calc(${p} * ${clampF(s.parallax, -400, 400)}px * ${m}),0)`)
  if (s.zoom) parts.push(`scale(calc(1 + ${p} * ${clampF(s.zoom, -0.5, 0.5)} * ${m}))`)
  if (s.rotate) parts.push(`rotate(calc(${p} * ${clampF(s.rotate, -45, 45)}deg * ${m}))`)

  const sel = `.${classForNode(id)}`
  const decls: string[] = []
  // The step travels as a custom property rather than an attribute: per-node CSS
  // is a path the renderer already has, and adding an attribute would mean
  // threading one through every module's root.
  if (s.stagger) decls.push(`--bapp-stagger:${clampF(s.stagger, 0, 400)}`)
  // How many extra viewport heights the section holds for; the runtime reads it
  // to size the spacer that actually consumes the scroll.
  if (s.pin) decls.push(`--bapp-hold:${clampF(s.pin, 0, 4)}`)
  if (parts.length) decls.push(`transform:${parts.join(" ")}`, "will-change:transform")
  // Fades over the first half of the pass, then holds — a linear fade never
  // reaches full opacity while the element is still on screen.
  if (s.fade) decls.push(`opacity:clamp(0,calc(${p} * 2),1)`)
  if (!decls.length) return ""
  return `${sel}{${decls.join(";")}}`
}

const clampF = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n * 1000) / 1000))
