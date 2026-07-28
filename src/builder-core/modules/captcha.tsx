/**
 * CAPTCHA module — Google reCAPTCHA v2 ("I'm not a robot" checkbox), the same
 * widget Webflow ships as its native captcha block. Trade-offs worth stating
 * plainly rather than burying in a diff:
 *
 *   - This loads a THIRD-PARTY script (Google's `recaptcha/api.js`), and only
 *     on pages that actually use this module — `RECAPTCHA_LOADER` (below) is a
 *     small dependency-free vanilla-JS string the host injects the same way it
 *     injects BUILDER_RUNTIME/ANIMATION_LOADER, gated on `needsRuntime`. A page
 *     with no recaptcha module on it loads none of this.
 *   - Google's script (and the widget it renders) is a genuine privacy
 *     consideration for EU visitors — it sets third-party cookies and reaches
 *     Google's servers before a visitor has made any choice. Treat this module
 *     like any other third-party embed for consent-banner purposes.
 *   - A client-side checkbox alone stops NOTHING — reCAPTCHA v2 is only
 *     meaningful when the token it produces is verified server-side against a
 *     matching SECRET key (Google's `siteverify` endpoint). That verification
 *     is NOT implemented here; this module only renders the widget. Wiring
 *     the secret-key check into whatever handles the form submission is a
 *     separate, required piece of work before this actually blocks bots.
 *
 * Same shape as the other vendor-JS modules in this package (see
 * animation.tsx): the SSR/editor Component is 100% player-free — a themed
 * placeholder when there's no site key yet (Webflow does the same — a
 * silently-broken captcha is worse than an obviously-unconfigured one), and
 * the real `.g-recaptcha` container once a site key is set. The loader is a
 * plain IIFE string with NO backticks inside it — one snuck into a string
 * like this before and silently truncated the whole runtime.
 */

import { createElement } from "react"

import { rootAttrs } from "../advanced"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))

/** Validate a select-style prop against its own option list; falls back rather than emitting garbage into a data-* attribute. */
function pick(v: unknown, options: string[], d: string): string {
  const s = str(v, d)
  return options.includes(s) ? s : d
}

const THEME_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
]
const THEME_VALUES = THEME_OPTIONS.map((o) => o.value)

const SIZE_OPTIONS = [
  { label: "Normal", value: "normal" },
  { label: "Compact", value: "compact" },
]
const SIZE_VALUES = SIZE_OPTIONS.map((o) => o.value)

// Same sized-and-tinted "empty slot" treatment as youtube/map/lottie/spline/rive
// in embeds.tsx/animation.tsx — a dashed border here specifically (rather than
// a solid one) to read as "configuration needed" rather than "content".
const PLACEHOLDER_CLASSES =
  "flex min-h-[78px] w-full items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-200 px-4 text-center text-sm text-base-content/60"

const Recaptcha: ModuleDefinition = {
  name: "recaptcha",
  category: "forms",
  schema: {
    siteKey: { type: "plain", label: "site key" },
    theme: { type: "select", options: THEME_OPTIONS, segmented: true },
    size: { type: "select", options: SIZE_OPTIONS, segmented: true },
  },
  defaults: { siteKey: "", theme: "light", size: "normal" },
  contentModel: { children: "none" },
  needsRuntime: true,
  defaultClasses: "w-full flex justify-start",
  Component: (p: ModuleRenderProps) => {
    const siteKey = str(p.props.siteKey).trim()
    const theme = pick(p.props.theme, THEME_VALUES, "light")
    const size = pick(p.props.size, SIZE_VALUES, "normal")

    if (!siteKey) {
      return createElement(
        "div",
        { className: `${p.className} ${PLACEHOLDER_CLASSES}`, ...rootAttrs(p) },
        "reCAPTCHA — add a site key in Settings before this will work."
      )
    }

    return createElement(
      "div",
      {
        className: p.className,
        "data-bapp-recaptcha": "",
        "data-sitekey": siteKey,
        ...rootAttrs(p),
      },
      createElement("div", {
        className: "g-recaptcha",
        "data-sitekey": siteKey,
        "data-theme": theme,
        "data-size": size,
      })
    )
  },
}

export const CAPTCHA_MODULES: ModuleDefinition[] = [Recaptcha]

// ── loader (client-side, vanilla JS, string constant) ──────────────────────────

/**
 * Google's script src is a fixed literal — never built from any prop, node
 * data, or other interpolated string — so there is nothing here for a
 * marketplace-authored fragment to hijack the way a `src`/`url` prop could.
 * The only thing this loader reads off the DOM is whether a
 * `[data-bapp-recaptcha]` element with a real `data-sitekey` exists at all;
 * it does nothing (injects nothing) otherwise.
 */
export const RECAPTCHA_LOADER = `(function(){
  var DOC=document;
  var SRC='https://www.google.com/recaptcha/api.js';
  var injected=false;

  function inject(){
    if(injected) return; injected=true;
    var s=DOC.createElement('script');
    s.src=SRC; s.async=true; s.defer=true;
    (DOC.head||DOC.documentElement).appendChild(s);
  }

  function hasKey(el){
    var k=el.getAttribute('data-sitekey');
    return !!(k && k.trim());
  }

  function init(scope){
    var root=scope||DOC;
    var els=[].slice.call(root.querySelectorAll('[data-bapp-recaptcha]'));
    for(var i=0;i<els.length;i++){
      if(hasKey(els[i])){ inject(); return }
    }
  }

  if(DOC.readyState!=='loading') init();
  else DOC.addEventListener('DOMContentLoaded',function(){ init() });
  window.__bappRecaptchaRuntime=init;
})();`
