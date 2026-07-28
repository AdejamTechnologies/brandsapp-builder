/**
 * Webflow's "Lightbox Link" — a clickable THUMBNAIL on the page that opens the
 * full-size media (image or video) in a reusable modal overlay. Like the rest
 * of this package, the SSR/editor markup (this file's Component) is entirely
 * player-free: a plain `<a>` wrapping an `<img>`, carrying `data-*` hooks for
 * the runtime to pick up. Zero JS, it still paints a themed placeholder when
 * no thumbnail is set (same convention as lottie/spline/rive in animation.tsx)
 * and — because the anchor's `href` points at the full media — still degrades
 * to "open the full image/video in this tab" if `LIGHTBOX_RUNTIME` never runs.
 *
 * `LIGHTBOX_RUNTIME` (below) is a small dependency-free vanilla-JS IIFE string,
 * written the same way BUILDER_RUNTIME/ANIMATION_LOADER are — NO backticks
 * anywhere inside it, since a stray one would terminate the outer template
 * literal and silently truncate the script (this bit us once already; see
 * animation.tsx's header for the same warning). It:
 *
 *   - Delegates a single click listener on `document` for `[data-bapp-lightbox]`
 *     rather than binding one handler per element, and lazily builds exactly
 *     ONE overlay the first time anything is opened — never one per thumbnail.
 *   - Groups items sharing a `data-group` value into a gallery navigable with
 *     on-screen Prev/Next buttons AND Left/Right arrow keys; the buttons hide
 *     entirely for a lone (ungrouped, or group-of-one) item.
 *   - Is a real accessible dialog: `role="dialog"` + `aria-modal="true"`, focus
 *     moves onto the close button when it opens, Tab/Shift+Tab are trapped to
 *     the dialog's own controls, Escape closes it, and focus is restored to
 *     the exact thumbnail that opened it.
 *   - Locks body scroll while open (including compensating the freed
 *     scrollbar's width with extra `padding-right`, so the page doesn't
 *     visibly reflow/jump when the scrollbar disappears) and restores both
 *     `overflow` and `padding-right` verbatim on close.
 *   - Is themed off the document's own daisyUI vars (`--b1`, `--b3`, `--bc`,
 *     `--p`) with literal fallbacks — never a hardcoded slate — and injects
 *     its stylesheet once.
 *   - Honours `prefers-reduced-motion` by skipping the open/close transition
 *     entirely rather than just shortening it.
 *   - Is idempotent: the whole IIFE is a no-op the second time it runs (a
 *     `window.__bappLightboxInit` guard at the very top), so nothing ever
 *     double-binds the document-level click/keydown listeners.
 *
 * This file does not wire `LIGHTBOX_RUNTIME` into any page — injecting the
 * script tag off `needsRuntime` is the host's job, same as registering this
 * module in the registry.
 */

import { createElement } from "react"

import { rootAttrs } from "../advanced"
import { safeMediaUrl } from "../escape"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))

/** Validate a select-style prop against its own option list; falls back rather than emitting garbage into a data-* attribute. */
function pick(v: unknown, options: string[], d: string): string {
  const s = str(v, d)
  return options.includes(s) ? s : d
}

const MEDIA_TYPE_OPTIONS = [
  { label: "Image", value: "image" },
  { label: "Video", value: "video" },
]
const MEDIA_TYPE_VALUES = MEDIA_TYPE_OPTIONS.map((o) => o.value)

const PLACEHOLDER_CLASSES =
  "pointer-events-none select-none px-4 text-center text-sm text-base-content/60"

const Lightbox: ModuleDefinition = {
  name: "lightbox",
  category: "media",
  schema: {
    thumbnailUrl: { type: "media", label: "thumbnail" },
    mediaType: { type: "select", label: "media type", options: MEDIA_TYPE_OPTIONS, segmented: true },
    mediaUrl: { type: "media", label: "full-size image or video URL" },
    caption: { type: "plain" },
    group: { type: "plain", label: "gallery group" },
    alt: { type: "plain", label: "alt text" },
  },
  defaults: {
    thumbnailUrl: "",
    mediaType: "image",
    mediaUrl: "",
    caption: "",
    group: "",
    alt: "",
  },
  contentModel: { children: "none" },
  needsRuntime: true,
  // Sized + tinted like every other empty media slot in this package (lottie,
  // spline, background-video, …) so the block holds its shape and stays
  // selectable before a thumbnail is set, instead of collapsing to zero height.
  defaultClasses:
    "relative inline-flex w-full max-w-sm min-h-40 items-center justify-center overflow-hidden rounded-2xl bg-base-200 cursor-zoom-in",
  Component: (p: ModuleRenderProps) => {
    // Props are already sanitized by control type before they reach here (see
    // escape.ts escapeByControl) — these are a defensive second pass, the same
    // belt-and-braces posture animation.tsx takes for its own "media"/"url" props.
    const thumbnailUrl = safeMediaUrl(str(p.props.thumbnailUrl))
    const mediaType = pick(p.props.mediaType, MEDIA_TYPE_VALUES, "image")
    // A video/image URL still degrades gracefully to the thumbnail itself if the
    // author only ever set one media prop — the anchor's href always lands
    // somewhere useful even before LIGHTBOX_RUNTIME has run.
    const fullMedia = safeMediaUrl(str(p.props.mediaUrl)) || thumbnailUrl
    const caption = str(p.props.caption)
    const group = str(p.props.group)
    // The accessible name for the link comes from alt (or caption as a
    // fallback); if neither is set, a generic aria-label keeps the link from
    // announcing as unlabeled rather than silently degrading a11y.
    const label = str(p.props.alt) || caption

    const attrs: Record<string, unknown> = {
      "data-bapp-lightbox": "",
      "data-type": mediaType,
    }
    if (fullMedia) attrs["data-media"] = fullMedia
    if (caption) attrs["data-caption"] = caption
    if (group) attrs["data-group"] = group

    return createElement(
      "a",
      {
        className: p.className,
        href: fullMedia || "#",
        "aria-haspopup": "dialog",
        ...(label ? {} : { "aria-label": mediaType === "video" ? "Play video" : "View image" }),
        ...attrs,
        ...rootAttrs(p),
      },
      thumbnailUrl
        ? createElement("img", {
            src: thumbnailUrl,
            alt: label,
            className: "absolute inset-0 h-full w-full object-cover",
            loading: "lazy",
          })
        : createElement(
            "span",
            { className: PLACEHOLDER_CLASSES, "data-bapp-lightbox-fallback": "" },
            "Lightbox — add a thumbnail image in Settings."
          )
    )
  },
}

export const LIGHTBOX_MODULES: ModuleDefinition[] = [Lightbox]

// ── runtime (client-side, vanilla JS, string constant) ─────────────────────────

export const LIGHTBOX_RUNTIME = `(function(){
  if(window.__bappLightboxInit)return;
  window.__bappLightboxInit=1;

  var DOC=document, WIN=window;
  function reduced(){ try{ return WIN.matchMedia('(prefers-reduced-motion: reduce)').matches }catch(e){ return false } }

  /* Defence in depth — the server-side renderer already ran data-media through
     the schema's "media" escaper (safeMediaUrl) before it ever reached this
     attribute, but this is the boundary where the string becomes an img/video
     src, so it gets checked again, independently, right here. data:image is
     the one data: form allowed through; everything else (javascript:, plain
     data:, vbscript:) is refused. */
  function safeUrl(v){
    var s=(v==null?'':String(v)).trim();
    if(!s)return '';
    var low=s.toLowerCase();
    if(low.indexOf('javascript:')===0)return '';
    if(low.indexOf('vbscript:')===0)return '';
    if(low.indexOf('data:')===0 && low.indexOf('data:image/')!==0)return '';
    return s;
  }

  /* One stylesheet, themed from the document's own daisyUI vars (with
     fallbacks) — same convention as BUILDER_RUNTIME's injectCss. */
  function injectCss(){
    if(DOC.getElementById('bapp-lightbox-css'))return;
    var base='hsl(var(--b1, 0 0% 100%))', line='hsl(var(--b3, 180 2% 90%))', ink='hsl(var(--bc, 215 28% 17%))', accent='hsl(var(--p, 215 28% 17%))';
    var css=''
      +'.bapp-lb-backdrop{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.78)}'
      +'.bapp-lb-backdrop.bapp-lb-open{display:flex}'
      +'.bapp-lb-backdrop.bapp-lb-anim{opacity:0;transition:opacity .18s ease}'
      +'.bapp-lb-backdrop.bapp-lb-anim.bapp-lb-in{opacity:1}'
      +'.bapp-lb-dialog{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;max-width:min(92vw,1100px);max-height:92vh;background:'+base+';color:'+ink+';border:1px solid '+line+';border-radius:16px;padding:44px 20px 20px;box-shadow:0 20px 60px rgba(0,0,0,.35)}'
      +'.bapp-lb-dialog.bapp-lb-anim{transform:scale(.96);transition:transform .18s ease}'
      +'.bapp-lb-dialog.bapp-lb-anim.bapp-lb-in{transform:scale(1)}'
      +'.bapp-lb-media{display:flex;align-items:center;justify-content:center;width:100%;max-height:72vh}'
      +'.bapp-lb-media img,.bapp-lb-media video{display:block;max-width:100%;max-height:72vh;border-radius:10px}'
      +'.bapp-lb-caption{margin:0;max-width:70ch;text-align:center;font-size:14px;opacity:.75}'
      +'.bapp-lb-caption:empty{display:none}'
      +'.bapp-lb-btn{position:absolute;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:9999px;background:'+line+';color:'+ink+';cursor:pointer;width:36px;height:36px;font-size:18px;line-height:1;padding:0}'
      +'.bapp-lb-btn:hover{background:'+accent+';color:'+base+'}'
      +'.bapp-lb-btn:focus-visible{outline:2px solid '+accent+';outline-offset:2px}'
      +'.bapp-lb-close{top:8px;right:8px}'
      +'.bapp-lb-prev{left:8px;top:50%;transform:translateY(-50%)}'
      +'.bapp-lb-next{right:8px;top:50%;transform:translateY(-50%)}'
      +'@media (prefers-reduced-motion: reduce){.bapp-lb-backdrop,.bapp-lb-dialog{transition:none!important}}';
    var s=DOC.createElement('style'); s.id='bapp-lightbox-css'; s.textContent=css;
    (DOC.head||DOC.documentElement).appendChild(s);
  }

  var overlay=null, dialog=null, mediaBox=null, captionEl=null, closeBtn=null, prevBtn=null, nextBtn=null;
  var items=[], idx=0, isOpen=false, lastFocused=null;
  var savedOverflow='', savedPaddingRight='';

  /* Built once, lazily, on the first open — never one overlay per thumbnail. */
  function buildOverlay(){
    if(overlay)return;
    injectCss();

    overlay=DOC.createElement('div');
    overlay.className='bapp-lb-backdrop';
    overlay.setAttribute('data-bapp-lightbox-overlay','');
    /* Clicking the backdrop itself (not the dialog card) closes, same as a
       typical modal — clicks inside the card are stopped from bubbling there. */
    overlay.addEventListener('mousedown',function(e){ if(e.target===overlay)close() });

    dialog=DOC.createElement('div');
    dialog.className='bapp-lb-dialog';
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.tabIndex=-1;

    closeBtn=DOC.createElement('button');
    closeBtn.type='button'; closeBtn.className='bapp-lb-btn bapp-lb-close';
    closeBtn.setAttribute('aria-label','Close');
    closeBtn.innerHTML='&#10005;';
    closeBtn.addEventListener('click',function(){ close() });

    prevBtn=DOC.createElement('button');
    prevBtn.type='button'; prevBtn.className='bapp-lb-btn bapp-lb-prev';
    prevBtn.setAttribute('aria-label','Previous item');
    prevBtn.innerHTML='&#8249;';
    prevBtn.addEventListener('click',function(){ step(-1) });

    nextBtn=DOC.createElement('button');
    nextBtn.type='button'; nextBtn.className='bapp-lb-btn bapp-lb-next';
    nextBtn.setAttribute('aria-label','Next item');
    nextBtn.innerHTML='&#8250;';
    nextBtn.addEventListener('click',function(){ step(1) });

    mediaBox=DOC.createElement('div');
    mediaBox.className='bapp-lb-media';

    captionEl=DOC.createElement('p');
    captionEl.className='bapp-lb-caption';

    dialog.appendChild(closeBtn);
    dialog.appendChild(prevBtn);
    dialog.appendChild(mediaBox);
    dialog.appendChild(captionEl);
    dialog.appendChild(nextBtn);
    overlay.appendChild(dialog);
    (DOC.body||DOC.documentElement).appendChild(overlay);
  }

  /* Elements sharing a data-group form one gallery. No selector string is ever
     built from the (author-controlled) group value — it's compared in plain
     JS instead, so there's no CSS-selector-injection surface to worry about. */
  function collectGroup(el){
    var group=el.getAttribute('data-group')||'';
    if(!group)return [el];
    var all=[].slice.call(DOC.querySelectorAll('[data-bapp-lightbox]'));
    return all.filter(function(n){ return (n.getAttribute('data-group')||'')===group });
  }

  function renderItem(){
    var el=items[idx];
    if(!el)return;
    var media=safeUrl(el.getAttribute('data-media')||'');
    var type=el.getAttribute('data-type')==='video'?'video':'image';
    var caption=el.getAttribute('data-caption')||'';

    mediaBox.innerHTML='';
    if(media){
      if(type==='video'){
        var v=DOC.createElement('video');
        v.src=media; v.controls=true; v.setAttribute('playsinline','');
        mediaBox.appendChild(v);
      } else {
        var img=DOC.createElement('img');
        img.src=media; img.alt=caption;
        mediaBox.appendChild(img);
      }
    }
    captionEl.textContent=caption;
    dialog.setAttribute('aria-label',caption||(type==='video'?'Video viewer':'Image viewer'));

    var multi=items.length>1;
    prevBtn.style.display=multi?'':'none';
    nextBtn.style.display=multi?'':'none';
  }

  function step(dir){
    if(items.length<2)return;
    idx=(idx+dir+items.length)%items.length;
    renderItem();
  }

  /* Body-scroll lock while open, restored verbatim on close. The scrollbar
     compensation matters: hiding the scrollbar with overflow:hidden shrinks
     the viewport width, which reflows/shifts everything behind the overlay
     unless the freed width is added back as padding-right. */
  function lockScroll(){
    var body=DOC.body;
    savedOverflow=body.style.overflow;
    savedPaddingRight=body.style.paddingRight;
    var scrollbarWidth=WIN.innerWidth-DOC.documentElement.clientWidth;
    body.style.overflow='hidden';
    if(scrollbarWidth>0){
      var current=parseFloat(WIN.getComputedStyle(body).paddingRight)||0;
      body.style.paddingRight=(current+scrollbarWidth)+'px';
    }
  }
  function unlockScroll(){
    var body=DOC.body;
    body.style.overflow=savedOverflow;
    body.style.paddingRight=savedPaddingRight;
  }

  function focusable(){
    var nodes=[].slice.call(dialog.querySelectorAll('button,[href],input,select,textarea,[tabindex]'));
    return nodes.filter(function(n){ return n.offsetParent!==null && !n.disabled });
  }

  function onKeydown(e){
    if(!isOpen)return;
    if(e.key==='Escape'){ e.preventDefault(); close(); return }
    if(e.key==='ArrowRight'){ e.preventDefault(); step(1); return }
    if(e.key==='ArrowLeft'){ e.preventDefault(); step(-1); return }
    if(e.key==='Tab'){
      var f=focusable();
      if(!f.length)return;
      var first=f[0], last=f[f.length-1];
      if(e.shiftKey){
        if(DOC.activeElement===first||!dialog.contains(DOC.activeElement)){ e.preventDefault(); last.focus() }
      } else {
        if(DOC.activeElement===last||!dialog.contains(DOC.activeElement)){ e.preventDefault(); first.focus() }
      }
    }
  }

  function open(el){
    buildOverlay();
    items=collectGroup(el);
    idx=items.indexOf(el); if(idx<0)idx=0;
    lastFocused=el;
    renderItem();
    lockScroll();
    isOpen=true;

    overlay.classList.add('bapp-lb-open');
    if(!reduced()){
      overlay.classList.add('bapp-lb-anim');
      dialog.classList.add('bapp-lb-anim');
      /* force layout so the opacity/scale transition has a start value */
      void overlay.offsetHeight;
      WIN.requestAnimationFrame(function(){
        overlay.classList.add('bapp-lb-in');
        dialog.classList.add('bapp-lb-in');
      });
    }
    /* Focus moves INTO the dialog — the close button is the most useful and
       most discoverable first stop for both keyboard and screen-reader users. */
    closeBtn.focus();
  }

  function close(){
    if(!isOpen)return;
    isOpen=false;
    overlay.classList.remove('bapp-lb-open','bapp-lb-in','bapp-lb-anim');
    dialog.classList.remove('bapp-lb-in','bapp-lb-anim');
    mediaBox.innerHTML='';
    unlockScroll();
    if(lastFocused&&lastFocused.focus)lastFocused.focus();
    lastFocused=null;
  }

  function onClick(e){
    var el=e.target&&e.target.closest?e.target.closest('[data-bapp-lightbox]'):null;
    if(!el)return;
    e.preventDefault();
    open(el);
  }

  DOC.addEventListener('click',onClick);
  DOC.addEventListener('keydown',onKeydown);
})();`
