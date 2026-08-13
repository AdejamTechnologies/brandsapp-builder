/**
 * builder-core — the design-as-data engine for BrandsApp.
 *
 * Single source of truth for the AST schema, the module-registry contract, the
 * renderer, and the base primitives. Imported by the tenant Worker (renderer),
 * and — as it grows — by the central editor (Polaris) and the marketplace.
 * See docs/builder-foundation-spec.md.
 */

export * from "./schema"
export * from "./fonts"
export * from "./registry"
export * from "./link"
export * from "./advanced"
export * from "./binding"
export * from "./escape"
export * from "./style"
export * from "./migrate"
export * from "./fragment"
export * from "./render"
export * from "./anim"
export * from "./runtime"
export * from "./unocss"
export * from "./import-html"
export * from "./authoring"
export * from "./navbar-variants"
export * from "./dropdown-variants"
export * from "./component-variants"
export * from "./generate"
export * from "./compose"
export * from "./moods"
export * from "./choreography"
export * from "./icons"
export {
  ALL_BUTTON_TOKENS,
  ANIMATION_LOADER,
  ATMOSPHERE_KEYFRAMES,
  buttonClasses,
  createDefaultRegistry,
  LIGHTBOX_RUNTIME,
  PRIMITIVES,
  CHALLENGE_LOADER,
  CHALLENGE_KEY_META,
  SCENE_LOADER,
  SHADER_LOADER,
} from "./modules"
