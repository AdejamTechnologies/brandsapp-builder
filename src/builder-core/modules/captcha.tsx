/**
 * CAPTCHA module — the "are you a person" block for built pages.
 *
 * ── What changed, and why ────────────────────────────────────────────────────
 * This used to render Google reCAPTCHA v2 from a site key the page author typed
 * into the inspector. Three things were wrong with that:
 *
 *   - It asked a brand owner to go and open an account with a captcha vendor
 *     before their contact form could resist spam.
 *   - It loaded a Google script that sets third-party cookies and reaches
 *     Google's servers before a visitor has consented to anything.
 *   - Nothing verified the token. The module's own header said so: a checkbox
 *     alone stops NOTHING, and the siteverify call "is NOT implemented here".
 *     So every page carrying this block paid the privacy cost of a captcha and
 *     received none of the protection.
 *
 * All three are gone. The challenge is platform-provided: the page carries only
 * a PUBLIC site key (injected as a meta tag by the tenant, never authored), and
 * the token it produces is judged by the platform on submit — see
 * lib/bot-protection.ts on the tenant side and lib/bot-check.ts on the platform.
 *
 * ── Why the block is usually unnecessary ─────────────────────────────────────
 * The loader below attaches a challenge to EVERY form on the page by itself, so
 * a contact form is protected whether or not anyone dropped this block into it.
 * The module remains for authors who want the widget somewhere specific rather
 * than appended to the form.
 *
 * The module name is still `recaptcha` — it is a node type stored in every
 * document that already uses one, and renaming it would orphan those nodes.
 */

import { createElement } from "react"

import { rootAttrs } from "../advanced"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))

/** Validate a select-style prop against its own option list; falls back rather than emitting garbage into a data-* attribute. */
function pick(v: unknown, options: readonly string[], d: string): string {
  const s = str(v, d)
  return options.includes(s) ? s : d
}

const THEME_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
]
const THEME_VALUES = THEME_OPTIONS.map((o) => o.value)

const SIZE_OPTIONS = [
  { label: "Flexible", value: "flexible" },
  { label: "Normal", value: "normal" },
  { label: "Compact", value: "compact" },
]
const SIZE_VALUES = SIZE_OPTIONS.map((o) => o.value)

/** Where the loader (and the widget) find the public key. */
export const CHALLENGE_KEY_META = "bapp-challenge-key"

// Same sized-and-tinted "empty slot" treatment as youtube/map/lottie/spline/rive
// in embeds.tsx/animation.tsx — a dashed border here specifically (rather than
// a solid one) to read as "configuration needed" rather than "content".
const PLACEHOLDER_CLASSES =
  "flex min-h-[78px] w-full items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-200 px-4 text-center text-sm text-base-content/60"

const Recaptcha: ModuleDefinition = {
  name: "recaptcha",
  category: "forms",
  schema: {
    theme: { type: "select", options: THEME_OPTIONS, segmented: true },
    size: { type: "select", options: SIZE_OPTIONS, segmented: true },
  },
  defaults: { theme: "auto", size: "flexible" },
  contentModel: { children: "none" },
  needsRuntime: true,
  defaultClasses: "w-full flex justify-start",
  Component: (p: ModuleRenderProps) => {
    const theme = pick(p.props.theme, THEME_VALUES, "auto")
    const size = pick(p.props.size, SIZE_VALUES, "flexible")
    // Only ever set on a legacy node authored before the key moved to the
    // platform. Read so those pages keep rendering; never offered again.
    const legacyKey = str(p.props.siteKey).trim()

    // In the EDITOR there is no meta tag and no live challenge, so the block
    // has to say what it is rather than render an empty gap the author cannot
    // explain.
    if (p.isEditor) {
      return createElement(
        "div",
        { className: `${p.className} ${PLACEHOLDER_CLASSES}`, ...rootAttrs(p) },
        "Spam check — shown to visitors on the published page."
      )
    }

    return createElement("div", {
      className: p.className,
      "data-bapp-challenge": "",
      "data-theme": theme,
      "data-size": size,
      ...(legacyKey ? { "data-sitekey": legacyKey } : {}),
      ...rootAttrs(p),
    })
  },
}

export const CAPTCHA_MODULES: ModuleDefinition[] = [Recaptcha]

// ── loader (client-side, vanilla JS, string constant) ──────────────────────────

/**
 * Attaches a challenge to every form on the page, and to any explicit challenge
 * block, then lets the widget do the rest: it writes a hidden
 * `cf-turnstile-response` input into the form it sits in, which both the
 * runtime's JSON post and the no-JS urlencoded post carry to the server without
 * either of them knowing it exists.
 *
 * Does nothing at all when the page has no key meta — a page on a deployment
 * with no challenge configured loads no third-party script.
 *
 * The script src is a fixed literal, never built from a prop or node data, so
 * there is nothing here for a marketplace-authored fragment to hijack.
 */
export const CHALLENGE_LOADER = `(function(){
  var DOC=document;
  var SRC='https://challenges.cloudflare.com/turnstile/v0/api.js';
  var injected=false;

  function key(){
    var m=DOC.querySelector('meta[name="${CHALLENGE_KEY_META}"]');
    var k=m&&m.getAttribute('content');
    return k&&k.trim()?k.trim():null;
  }

  function inject(){
    if(injected) return; injected=true;
    var s=DOC.createElement('script');
    s.src=SRC; s.async=true; s.defer=true;
    (DOC.head||DOC.documentElement).appendChild(s);
  }

  function widget(k,theme,size){
    var d=DOC.createElement('div');
    d.className='cf-turnstile';
    d.setAttribute('data-sitekey',k);
    d.setAttribute('data-theme',theme||'auto');
    d.setAttribute('data-size',size||'flexible');
    return d;
  }

  function init(scope){
    var k=key(); if(!k) return;
    var root=scope||DOC;
    var used=false;

    /* An explicit block, where the author put one. */
    var blocks=[].slice.call(root.querySelectorAll('[data-bapp-challenge]'));
    for(var i=0;i<blocks.length;i++){
      var b=blocks[i];
      if(b.__bappChallenge) continue; b.__bappChallenge=1;
      b.appendChild(widget(b.getAttribute('data-sitekey')||k,b.getAttribute('data-theme'),b.getAttribute('data-size')));
      used=true;
    }

    /* Every form, whether or not anyone thought to add a block. A form that
       already contains a block is left alone — one challenge per form. */
    var forms=[].slice.call(root.querySelectorAll('form[data-bapp-form]'));
    for(var j=0;j<forms.length;j++){
      var f=forms[j];
      if(f.__bappChallenge) continue; f.__bappChallenge=1;
      if(f.querySelector('[data-bapp-challenge]')||f.querySelector('.cf-turnstile')) continue;
      var slot=DOC.createElement('div');
      slot.style.cssText='margin:8px 0';
      slot.appendChild(widget(k,'auto','flexible'));
      var btn=f.querySelector('[type=submit]');
      if(btn&&btn.parentNode===f) f.insertBefore(slot,btn); else f.appendChild(slot);
      used=true;
    }

    if(used) inject();
  }

  if(DOC.readyState!=='loading') init();
  else DOC.addEventListener('DOMContentLoaded',function(){ init() });
  window.__bappChallengeRuntime=init;
})();`
