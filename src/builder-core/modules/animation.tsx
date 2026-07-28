/**
 * Third-party ANIMATION embeds — lottie, spline, rive. These are the only three
 * modules in builder-core that pull in vendor JavaScript. Every other module in
 * this package renders plain HTML/CSS off the shared vanilla runtime
 * (BUILDER_RUNTIME, see runtime.ts) — a page that never uses lottie/spline/rive
 * ships NOT ONE EXTRA BYTE of player code. That's a deliberate trade-off we're
 * making explicit here rather than burying in a diff:
 *
 *   - lottie-web@5.13.0   ~200-400KB minified (~70-100KB gzipped over the wire).
 *     Renders Adobe-After-Effects-exported JSON via SVG or Canvas.
 *   - @splinetool/viewer@1.9.82   the HEAVIEST of the three — a full 3D engine
 *     (three.js + physics). The `<spline-viewer>` custom element itself lazily
 *     code-splits further chunks depending on what the scene uses; budget for
 *     multiple MB total if a page actually uses it. Never preload this speculatively.
 *   - @rive-app/canvas@2.39.0   ~444KB JS + a ~2MB .wasm the runtime fetches
 *     itself on init (not from our CDN pin — Rive's own loader resolves it
 *     relative to rive.js). The wasm download only happens once a `rive`
 *     element actually initialises.
 *
 * Because these are heavy, NONE of them may load speculatively:
 *   1. The SSR/editor markup (this file's Components) is 100% player-free — a
 *      themed placeholder box that states what the block is, and (empty state)
 *      that a file is still needed. It has to paint something on its own, with
 *      zero JS, because that's exactly what the primitives smoke test asserts.
 *   2. `ANIMATION_LOADER` (below) is a small dependency-free vanilla-JS string,
 *      written the same way BUILDER_RUNTIME is (a plain IIFE — no backticks
 *      inside it; one snuck into a string like this once before and silently
 *      truncated the whole runtime). It finds which KINDS of element
 *      (`[data-bapp-lottie]` / `[data-bapp-spline]` / `[data-bapp-rive]`) are
 *      actually present, watches each with an IntersectionObserver so a block
 *      below the fold never loads its vendor script until it's nearly in view,
 *      injects that one vendor's script tag (never more than once per vendor),
 *      and only THEN initialises the specific element from its `data-*` props.
 *      `prefers-reduced-motion` is honoured by forcing autoplay off client-side
 *      — SSR has no way to know the visitor's OS preference, so the authored
 *      `autoplay` prop is only ever a suggestion the loader can veto.
 *
 * This file does not wire `ANIMATION_LOADER` into any page — injecting the
 * script tag (mirroring how the host injects BUILDER_RUNTIME off `usesRuntime`)
 * is the host's job, same as registering these modules in the registry.
 *
 * Every value that reaches a DOM attribute or a script/URL is sanitised twice:
 * once server-side (each `src`/`url` prop is declared `type: "url"`, so the
 * renderer already ran it through `escapeByControl` → `isSafeUrl` before this
 * Component ever sees it — see registry.ts), and a second time defensively
 * here and again client-side in `ANIMATION_LOADER` (`safeUrl`), since a
 * marketplace-authored fragment could in principle reach the DOM by some path
 * that skipped the schema-driven escaper.
 */

import { createElement } from "react"

import { rootAttrs } from "../advanced"
import { isSafeUrl } from "../escape"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const num = (v: unknown, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}
const bool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1"

/** Validate a select-style prop against its own option list; falls back rather than emitting garbage into a data-* attribute. */
function pick(v: unknown, options: string[], d: string): string {
  const s = str(v, d)
  return options.includes(s) ? s : d
}

const PLACEHOLDER_CLASSES =
  "pointer-events-none select-none px-4 text-center text-sm text-base-content/60"

// ── lottie ────────────────────────────────────────────────────────────────────

const RENDERER_OPTIONS = [
  { label: "SVG", value: "svg" },
  { label: "Canvas", value: "canvas" },
]

const Lottie: ModuleDefinition = {
  name: "lottie",
  category: "media",
  schema: {
    src: { type: "url", label: "file (.json or .lottie)" },
    autoplay: { type: "boolean" },
    loop: { type: "boolean" },
    reverse: { type: "boolean", label: "play in reverse" },
    useBuiltInDuration: { type: "boolean", label: "use built-in duration" },
    duration: {
      type: "number",
      label: "duration (seconds)",
      showIf: { useBuiltInDuration: ["false"] },
    },
    renderer: { type: "select", options: RENDERER_OPTIONS, segmented: true },
  },
  defaults: {
    src: "",
    autoplay: true,
    loop: true,
    reverse: false,
    useBuiltInDuration: true,
    duration: 3,
    renderer: "svg",
  },
  contentModel: { children: "none" },
  needsRuntime: true,
  // Sized + tinted like every other empty media slot in this package (youtube,
  // background-video, map) so the block holds its shape and stays selectable
  // before a file is set, instead of collapsing to zero height.
  defaultClasses:
    "relative w-full min-h-[220px] overflow-hidden rounded-2xl bg-base-200 flex items-center justify-center p-6",
  Component: (p: ModuleRenderProps) => {
    const src = isSafeUrl(str(p.props.src))
    const autoplay = bool(p.props.autoplay)
    const loop = bool(p.props.loop)
    const reverse = bool(p.props.reverse)
    const useBuiltIn = bool(p.props.useBuiltInDuration)
    const duration = Math.max(num(p.props.duration, 3), 0.1)
    const renderer = pick(p.props.renderer, ["svg", "canvas"], "svg")

    const attrs: Record<string, unknown> = {
      "data-bapp-lottie": "",
      "data-autoplay": autoplay ? "1" : "0",
      "data-loop": loop ? "1" : "0",
      "data-reverse": reverse ? "1" : "0",
      "data-renderer": renderer,
    }
    if (src) attrs["data-src"] = src
    if (!useBuiltIn) attrs["data-duration"] = String(duration)

    return createElement(
      "div",
      { className: p.className, ...attrs, ...rootAttrs(p) },
      createElement(
        "span",
        { className: PLACEHOLDER_CLASSES, "data-bapp-lottie-fallback": "" },
        src ? "Lottie animation" : "Lottie animation — add a .json/.lottie file in Settings."
      )
    )
  },
}

// ── spline ────────────────────────────────────────────────────────────────────

const Spline: ModuleDefinition = {
  name: "spline",
  category: "media",
  schema: {
    url: { type: "url", label: "scene URL (.splinecode)" },
  },
  defaults: { url: "" },
  contentModel: { children: "none" },
  needsRuntime: true,
  // Taller than lottie's default box — 3D scenes read as cramped in a short slot.
  defaultClasses:
    "relative w-full min-h-[360px] overflow-hidden rounded-2xl bg-base-200 flex items-center justify-center p-6",
  Component: (p: ModuleRenderProps) => {
    const url = isSafeUrl(str(p.props.url))
    const attrs: Record<string, unknown> = { "data-bapp-spline": "" }
    if (url) attrs["data-src"] = url

    return createElement(
      "div",
      { className: p.className, ...attrs, ...rootAttrs(p) },
      createElement(
        "span",
        { className: PLACEHOLDER_CLASSES, "data-bapp-spline-fallback": "" },
        url ? "3D scene (Spline)" : "Spline scene — paste a .splinecode URL in Settings."
      )
    )
  },
}

// ── rive ──────────────────────────────────────────────────────────────────────

const FIT_OPTIONS = [
  { label: "Contain", value: "contain" },
  { label: "Cover", value: "cover" },
  { label: "Fill", value: "fill" },
  { label: "Fit width", value: "fit-width" },
  { label: "Fit height", value: "fit-height" },
  { label: "None", value: "none" },
]
const FIT_VALUES = FIT_OPTIONS.map((o) => o.value)

const ALIGN_OPTIONS = [
  { label: "Center", value: "center" },
  { label: "Top left", value: "top-left" },
  { label: "Top center", value: "top-center" },
  { label: "Top right", value: "top-right" },
  { label: "Center left", value: "center-left" },
  { label: "Center right", value: "center-right" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Bottom center", value: "bottom-center" },
  { label: "Bottom right", value: "bottom-right" },
]
const ALIGN_VALUES = ALIGN_OPTIONS.map((o) => o.value)

const Rive: ModuleDefinition = {
  name: "rive",
  category: "media",
  schema: {
    src: { type: "url", label: "file (.riv)" },
    artboard: { type: "plain" },
    stateMachine: { type: "plain", label: "state machine" },
    fit: { type: "select", options: FIT_OPTIONS },
    align: { type: "select", options: ALIGN_OPTIONS },
    autoplay: { type: "boolean" },
  },
  defaults: {
    src: "",
    artboard: "",
    stateMachine: "",
    fit: "contain",
    align: "center",
    autoplay: true,
  },
  contentModel: { children: "none" },
  needsRuntime: true,
  defaultClasses:
    "relative w-full min-h-[220px] overflow-hidden rounded-2xl bg-base-200 flex items-center justify-center p-6",
  Component: (p: ModuleRenderProps) => {
    const src = isSafeUrl(str(p.props.src))
    const artboard = str(p.props.artboard).trim()
    const stateMachine = str(p.props.stateMachine).trim()
    const fit = pick(p.props.fit, FIT_VALUES, "contain")
    const align = pick(p.props.align, ALIGN_VALUES, "center")
    const autoplay = bool(p.props.autoplay)

    const attrs: Record<string, unknown> = {
      "data-bapp-rive": "",
      "data-fit": fit,
      "data-align": align,
      "data-autoplay": autoplay ? "1" : "0",
    }
    if (src) attrs["data-src"] = src
    if (artboard) attrs["data-artboard"] = artboard
    if (stateMachine) attrs["data-state-machine"] = stateMachine

    return createElement(
      "div",
      { className: p.className, ...attrs, ...rootAttrs(p) },
      // The vendor draws straight into this canvas — kept in the tree (but
      // hidden) even with no src yet, so the loader has a stable node to find
      // once a file IS set, without needing a re-render.
      createElement("canvas", {
        "data-bapp-rive-canvas": "",
        className: "h-full w-full",
        style: { display: src ? undefined : "none" },
        "aria-hidden": true,
      }),
      createElement(
        "span",
        {
          className: PLACEHOLDER_CLASSES,
          "data-bapp-rive-fallback": "",
          style: src ? { display: "none" } : undefined,
        },
        "Rive animation — add a .riv file in Settings."
      )
    )
  },
}

export const ANIMATION_MODULES: ModuleDefinition[] = [Lottie, Spline, Rive]

// ── loader (client-side, vanilla JS, string constant) ──────────────────────────

/**
 * Pinned vendor CDN builds (unpkg). Never "@latest" — a silent upstream bump is
 * exactly the kind of thing that should show up in a diff, not appear on tenant
 * pages unreviewed.
 *   lottie-web        5.13.0  → build/player/lottie.min.js
 *   @splinetool/viewer 1.9.82 → build/spline-viewer.js   (loaded as a module;
 *                                registers the <spline-viewer> custom element)
 *   @rive-app/canvas   2.39.0 → rive.js                  (UMD global `rive`;
 *                                fetches its own .wasm lazily on first Rive())
 *
 * Mirrors BUILDER_RUNTIME's own house style: one dependency-free IIFE string,
 * no backticks anywhere inside it (a stray one would terminate the outer
 * template literal this is written in and truncate the script).
 */
export const ANIMATION_LOADER = `(function(){
  var DOC=document;
  function reduced(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches }catch(e){ return false } }

  var LOTTIE_SRC='https://unpkg.com/lottie-web@5.13.0/build/player/lottie.min.js';
  var SPLINE_SRC='https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';
  var RIVE_SRC='https://unpkg.com/@rive-app/canvas@2.39.0/rive.js';

  /* One in-flight load per vendor src, ever — 'loading[src]' is either an
     array of not-yet-run callbacks, or true once the tag has fired (load OR
     error, so a network failure can't wedge every element of that kind). */
  var loading={};
  function loadScript(src,asModule,onDone){
    if(loading[src]===true){ onDone(); return }
    if(loading[src]){ loading[src].push(onDone); return }
    loading[src]=[onDone];
    var s=DOC.createElement('script');
    s.src=src; s.async=true;
    if(asModule) s.type='module';
    function settle(){ var cbs=loading[src]; loading[src]=true; if(cbs&&cbs.forEach) cbs.forEach(function(cb){ cb() }) }
    s.onload=settle; s.onerror=settle;
    (DOC.head||DOC.documentElement).appendChild(s);
  }

  /* Defence in depth — the server-side renderer already ran every src/url
     through the schema's "url" escaper before it ever reached a data-*
     attribute, but this is the boundary where a string becomes a script/src,
     so it gets checked again, independently, right here. */
  function safeUrl(v){
    var s=(v==null?'':String(v)).trim();
    if(!s) return '';
    var low=s.toLowerCase();
    if(low.indexOf('javascript:')===0) return '';
    if(low.indexOf('data:')===0) return '';
    if(low.indexOf('vbscript:')===0) return '';
    return s;
  }

  function initLottie(el){
    var src=safeUrl(el.getAttribute('data-src'));
    if(!src||el.__bappAnim) return; el.__bappAnim=1;
    loadScript(LOTTIE_SRC,false,function(){
      if(!window.lottie||!window.lottie.loadAnimation) return;
      var fb=el.querySelector('[data-bapp-lottie-fallback]'); if(fb) fb.style.display='none';
      var renderer=el.getAttribute('data-renderer')==='canvas'?'canvas':'svg';
      var loop=el.getAttribute('data-loop')==='1';
      var autoplay=el.getAttribute('data-autoplay')==='1' && !reduced();
      var anim=window.lottie.loadAnimation({ container:el, renderer:renderer, loop:loop, autoplay:autoplay, path:src });
      if(el.getAttribute('data-reverse')==='1') anim.setDirection(-1);
      var durationAttr=el.getAttribute('data-duration');
      if(durationAttr){
        var wantSeconds=parseFloat(durationAttr);
        anim.addEventListener('DOMLoaded',function(){
          if(wantSeconds>0 && anim.totalFrames && anim.frameRate){
            var naturalSeconds=anim.totalFrames/anim.frameRate;
            if(naturalSeconds>0) anim.setSpeed(naturalSeconds/wantSeconds);
          }
        });
      }
    });
  }

  function initSpline(el){
    var src=safeUrl(el.getAttribute('data-src'));
    if(!src||el.__bappAnim) return; el.__bappAnim=1;
    loadScript(SPLINE_SRC,true,function poll(){
      if(!(window.customElements&&window.customElements.get('spline-viewer'))){ setTimeout(poll,50); return }
      var fb=el.querySelector('[data-bapp-spline-fallback]'); if(fb) fb.style.display='none';
      var viewer=DOC.createElement('spline-viewer');
      viewer.setAttribute('url',src);
      viewer.style.width='100%'; viewer.style.height='100%';
      el.appendChild(viewer);
    });
  }

  var RIVE_FIT={ contain:'Contain', cover:'Cover', fill:'Fill', 'fit-width':'FitWidth', 'fit-height':'FitHeight', none:'None' };
  var RIVE_ALIGN={ center:'Center', 'top-left':'TopLeft', 'top-center':'TopCenter', 'top-right':'TopRight', 'center-left':'CenterLeft', 'center-right':'CenterRight', 'bottom-left':'BottomLeft', 'bottom-center':'BottomCenter', 'bottom-right':'BottomRight' };

  function initRive(el){
    var src=safeUrl(el.getAttribute('data-src'));
    var canvas=el.querySelector('[data-bapp-rive-canvas]');
    if(!src||!canvas||el.__bappAnim) return; el.__bappAnim=1;
    loadScript(RIVE_SRC,false,function(){
      if(!window.rive||!window.rive.Rive) return;
      var fb=el.querySelector('[data-bapp-rive-fallback]'); if(fb) fb.style.display='none';
      canvas.style.display='block';
      var fitKey=RIVE_FIT[el.getAttribute('data-fit')]||'Contain';
      var alignKey=RIVE_ALIGN[el.getAttribute('data-align')]||'Center';
      var artboard=el.getAttribute('data-artboard')||undefined;
      var sm=el.getAttribute('data-state-machine');
      var autoplay=el.getAttribute('data-autoplay')==='1' && !reduced();
      var r=new window.rive.Rive({
        src:src, canvas:canvas, autoplay:autoplay,
        artboard:artboard,
        stateMachines: sm?[sm]:undefined,
        layout:new window.rive.Layout({ fit:window.rive.Fit[fitKey], alignment:window.rive.Alignment[alignKey] }),
        onLoad:function(){ if(r.resizeDrawingSurfaceToCanvas) r.resizeDrawingSurfaceToCanvas() }
      });
      window.addEventListener('resize',function(){ if(r.resizeDrawingSurfaceToCanvas) r.resizeDrawingSurfaceToCanvas() });
    });
  }

  /* Below-the-fold blocks never pull vendor JS until they're nearly in view.
     No IntersectionObserver support → fall back to initialising immediately
     (still lazy in the sense that a page with none of these elements never
     runs any of this code at all). */
  function observe(root,selector,run){
    var els=[].slice.call(root.querySelectorAll(selector));
    if(!els.length) return;
    if(!('IntersectionObserver' in window)){ els.forEach(run); return }
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ run(en.target); io.unobserve(en.target) } });
    },{ rootMargin:'200px 0px', threshold:0.01 });
    els.forEach(function(e){ io.observe(e) });
  }

  function init(scope){
    var root=scope||DOC;
    observe(root,'[data-bapp-lottie]',initLottie);
    observe(root,'[data-bapp-spline]',initSpline);
    observe(root,'[data-bapp-rive]',initRive);
  }
  if(DOC.readyState!=='loading')init();
  else DOC.addEventListener('DOMContentLoaded',function(){ init() });
  window.__bappAnimRuntime=init;
})();`
