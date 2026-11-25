/**
 * Which runtimes a rendered page needs (new file, 24 Nov 2026).
 *
 * Moved out of lib/builder/tenant-registry.tsx so the brand's live page and
 * the pitch page an agency sends (main-repo's renderDocToFile, which vendors
 * this folder) load the SAME scripts. Before, the pitch file loaded none of
 * them, so every scroll effect, pinned section, text reveal, WebGL scene and
 * Lottie/Rive/Spline embed was dead in exactly the page meant to sell the
 * motion — the first thing a prospect ever saw of it.
 *
 * Each loader ships only on a page that holds its element: real 3D and
 * third-party animation are the most expensive things a page can carry, and a
 * page without them must not pay for them.
 */
import { ANIMATION_LOADER } from "./modules/animation"
import { SHADER_LOADER } from "./modules/atmosphere"
import { CHALLENGE_LOADER } from "./modules/captcha"
import { LIGHTBOX_RUNTIME } from "./modules/lightbox"
import { SCENE_LOADER } from "./modules/scene"
import { MOTION_RUNTIME } from "./motion"
import { BUILDER_RUNTIME } from "./runtime"

export function pageScripts(input: {
  html: string
  usesRuntime: boolean
  /**
   * The form challenge. On for a brand's live page; OFF for a pitch file,
   * which has no key to verify against and whose forms submit nowhere.
   */
  challenge?: boolean
}): string[] {
  const { html } = input
  return [
    input.usesRuntime ? BUILDER_RUNTIME : "",
    /data-bapp-(lottie|spline|rive)/.test(html) ? ANIMATION_LOADER : "",
    input.challenge !== false && (/data-bapp-challenge/.test(html) || /data-bapp-form/.test(html))
      ? CHALLENGE_LOADER
      : "",
    /data-bapp-aurora/.test(html) ? SHADER_LOADER : "",
    /data-bapp-scene/.test(html) ? SCENE_LOADER : "",
    /data-bapp-lightbox/.test(html) ? LIGHTBOX_RUNTIME : "",
    // Presets and interactions (24 Nov 2026, motion.ts).
    /bapp-fx|data-bapp-interactions/.test(html) ? MOTION_RUNTIME : "",
  ].filter(Boolean)
}
