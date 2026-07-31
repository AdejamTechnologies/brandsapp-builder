/**
 * Mood, expressed as TOKENS rather than as markup.
 *
 * This is the piece both engines share: `generate` runs a fixed section plan and
 * `compose` arranges bands from content, but neither of them branches on mood —
 * they hand it to the theme. That is why one arrangement renders six ways, and
 * why adding a mood costs a row in this table rather than a template.
 */

import type { ThemeScale } from "./schema"

/**
 * Motion is part of a mood, not a separate decision. `brutalist` is deliberately
 * still — a look built on flat colour and hard edges is undermined by drifting
 * imagery — while `luxe` and `technical` carry the full choreography, and the
 * quiet ones sit at "subtle" so a storefront is alive without being a showreel.
 */
export const MOODS = ["luxe", "technical", "organic", "playful", "brutalist", "calm"] as const
export type Mood = (typeof MOODS)[number]

export interface MoodSpec {
  scale: ThemeScale
  fonts: { display: string; body: string }
  colors: Record<string, string>
  /** Dark grounds want their atmosphere; light ones mostly do not. */
  atmosphere: boolean
  /** Section padding step, in Tailwind units, before the density multiplier. */
  rhythm: number
}

export const MOODS_SPEC: Record<Mood, MoodSpec> = {
  luxe: {
    scale: { density: 1.5, radius: 0.25, typeScale: 1.3, motion: 0.8, choreography: "cinematic", smoothScroll: true },
    fonts: { display: "Fraunces", body: "Inter" },
    colors: { primary: "#8a6a3c", secondary: "#3f4a3c", neutral: "#241d16", "base-100": "#fbf9f6", "base-200": "#f2ece3", "base-300": "#e0d5c4", "base-content": "#241d16" },
    atmosphere: false,
    rhythm: 24,
  },
  technical: {
    scale: { density: 0.85, radius: 0.5, typeScale: 1, motion: 1, choreography: "cinematic", smoothScroll: true },
    fonts: { display: "Sora", body: "Inter" },
    colors: { primary: "#5b6cff", secondary: "#00c2a8", neutral: "#0d1220", "base-100": "#0b0f1a", "base-200": "#131a2b", "base-300": "#1f293f", "base-content": "#e8ecf6" },
    atmosphere: true,
    rhythm: 20,
  },
  organic: {
    scale: { density: 1.25, radius: 1.6, typeScale: 1.1, motion: 0.9, choreography: "subtle", smoothScroll: false },
    fonts: { display: "Plus Jakarta Sans", body: "Inter" },
    colors: { primary: "#4f6f52", secondary: "#c98f4b", neutral: "#26301f", "base-100": "#fcfaf5", "base-200": "#eef1e6", "base-300": "#dde3cf", "base-content": "#26301f" },
    atmosphere: false,
    rhythm: 22,
  },
  playful: {
    scale: { density: 1, radius: 2, typeScale: 1.15, motion: 1.3, choreography: "cinematic", smoothScroll: false },
    fonts: { display: "Poppins", body: "Inter" },
    colors: { primary: "#ff5a3c", secondary: "#2b6cff", neutral: "#1b1330", "base-100": "#ffffff", "base-200": "#fff2ee", "base-300": "#ffd9cf", "base-content": "#1b1330" },
    atmosphere: false,
    rhythm: 20,
  },
  brutalist: {
    scale: { density: 0.6, radius: 0, typeScale: 1.25, motion: 0, choreography: "none", smoothScroll: false },
    fonts: { display: "Sora", body: "Inter" },
    colors: { primary: "#111111", secondary: "#f2f200", neutral: "#000000", "base-100": "#f2f200", "base-200": "#ffffff", "base-300": "#111111", "base-content": "#0a0a0a" },
    atmosphere: false,
    rhythm: 16,
  },
  calm: {
    scale: { density: 1.35, radius: 1.2, typeScale: 1.05, motion: 0.5, choreography: "subtle", smoothScroll: true },
    fonts: { display: "Manrope", body: "Inter" },
    colors: { primary: "#5b7c99", secondary: "#8fa6b2", neutral: "#1f2a33", "base-100": "#fbfcfd", "base-200": "#eef3f6", "base-300": "#dde6ec", "base-content": "#1f2a33" },
    atmosphere: false,
    rhythm: 24,
  },
}
