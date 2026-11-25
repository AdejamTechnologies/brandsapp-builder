/**
 * Motion presets, multi-state interactions and page transitions (new file,
 * 24 Nov 2026) — the three things a Framer-built page does that ours could
 * not, closed in one place.
 *
 * ── Presets ─────────────────────────────────────────────────────────────────
 * Named behaviours a designer (or an AI) picks by NAME rather than building
 * from parts: `anim.preset: "magnetic"`. Each is either pure CSS (float, glow)
 * or a few lines of runtime fed by CSS variables, so the compositor does the
 * drawing. `anim.intensity` scales every one of them (1 = as designed).
 *
 * ── Interactions ────────────────────────────────────────────────────────────
 * Framer's "variants", in our terms. A node declares named STATES as classes —
 *   states: { open: "rotate-45 bg-primary" }
 * — and any node declares what switches them —
 *   on: [{ trigger: "tap", state: "open", targets: ["menu"] }]
 * The renderer turns each state's classes into `data-[bapp-state~=open]:…`
 * utilities, so a state is ordinary CSS and the transition between states is
 * a CSS transition. The runtime only flips one attribute. Children can follow
 * their parent's state with `group` + `group-data-[bapp-state~=open]:…`.
 *
 * The triggers ship as a JSON block, not as script, so a page's interactions
 * pass the preview link's hash-pinned CSP like any other data.
 *
 * ── Page transitions ────────────────────────────────────────────────────────
 * Builder pages are real page loads, already cross-faded by the browser's
 * cross-document view transitions (src/globals.css). `meta.pageTransition`
 * picks the style of that move, and `anim.morph` names an element so the SAME
 * element on the next page is morphed into place — a hero photo flying into the
 * product page. Browsers without view transitions load pages as before.
 *
 * Everything here stands down for `prefers-reduced-motion`.
 */

export const MOTION_PRESETS = [
  "magnetic",
  "tilt",
  "spotlight",
  "marquee",
  "count-up",
  "scramble",
  "float",
  "glow",
] as const
export type MotionPreset = (typeof MOTION_PRESETS)[number]

/** One line each — read by the editor and by the AI vocabulary. */
export const MOTION_PRESET_HELP: Record<MotionPreset, string> = {
  magnetic: "leans toward the cursor when it comes near — buttons, icons",
  tilt: "3D tilt toward the cursor with a light glare — cards, product shots",
  spotlight: "a soft light follows the cursor across the element — dark cards, bands",
  marquee: "children scroll sideways forever, pausing on hover — logos, reviews, a slogan",
  "count-up": "numbers in the text count up from zero when scrolled to — real figures only",
  scramble: "text decodes from random characters when scrolled to — short headlines",
  float: "a slow weightless bob — badges, decorative shapes, a hero object",
  glow: "an animated gradient edge in the theme's colours — one key card or button",
}

export const PAGE_TRANSITIONS = ["fade", "slide-up", "slide-left", "zoom", "wipe", "none"] as const
export type PageTransition = (typeof PAGE_TRANSITIONS)[number]

export const INTERACTION_TRIGGERS = ["tap", "hover", "inview", "load"] as const
export type InteractionTrigger = (typeof INTERACTION_TRIGGERS)[number]

export interface Interaction {
  trigger: InteractionTrigger
  /** The state switched on the targets. */
  state: string
  /** Node ids whose state changes; the node itself when omitted. */
  targets?: string[]
  /**
   * toggle (tap's default): on, then off. set: on. clear: off.
   * hover and inview turn the state off again on leave unless `once`.
   */
  mode?: "toggle" | "set" | "clear"
  /** inview/hover: keep the state after the pointer or the viewport leaves. */
  once?: boolean
}

/** A state name as a CSS-safe token. */
export function safeStateName(name: string): string | null {
  return /^[a-z][a-z0-9-]{0,23}$/.test(name) ? name : null
}

/** `rotate-45 md:bg-primary` → `data-[bapp-state~=open]:rotate-45 data-[bapp-state~=open]:md:bg-primary`. */
export function stateClasses(states: Record<string, string> | undefined): string[] {
  const out: string[] = []
  for (const [name, classes] of Object.entries(states ?? {})) {
    if (!safeStateName(name)) continue
    for (const c of classes.split(/\s+/)) if (c) out.push(`data-[bapp-state~=${name}]:${c}`)
  }
  return out
}

/** A morph name as a valid `view-transition-name`. */
export function morphName(name: string): string | null {
  const n = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)
  return n ? `bapp-${n}` : null
}

/** Shared CSS for presets and interactions — once per page that uses either. */
export const MOTION_CSS =
  // Interactions: states move, they do not jump. An author's own `transition`
  // class wins (it is more specific in intent and comes later in the cascade).
  ".bapp-stateful{transition-property:transform,opacity,background-color,color,border-color,box-shadow,filter,width,height,max-height,clip-path;transition-duration:.45s;transition-timing-function:cubic-bezier(.16,1,.3,1)}" +
  "[data-bapp-tap]{cursor:pointer}" +
  // magnetic + tilt: the runtime writes the variables; these rules ease them.
  // The INDIVIDUAL `translate` and `rotate` properties (25 Nov 2026), not
  // `transform`: they compose with it, so a magnetic button keeps its own
  // hover:-translate-y-1 and a tilted card keeps a state's scale-105 — with
  // `transform` the preset silently replaced whichever the author had set.
  // Tilt's perspective is put on the PARENT by the runtime for the same reason.
  ".bapp-fx-magnetic{translate:calc(var(--bapp-mx,0)*1px) calc(var(--bapp-my,0)*1px);transition:translate .35s cubic-bezier(.16,1,.3,1),transform .3s;will-change:translate}" +
  ".bapp-fx-tilt{rotate:var(--bapp-rx,0) var(--bapp-ry,1) 0 calc(var(--bapp-ra,0)*1deg);transition:rotate .25s ease-out,transform .3s;transform-style:preserve-3d;position:relative}" +
  ".bapp-fx-tilt::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(circle at var(--bapp-gx,50%) var(--bapp-gy,50%),rgba(255,255,255,calc(.22*var(--bapp-fx-on,0))),transparent 55%);transition:opacity .25s}" +
  ".bapp-fx-spotlight{position:relative;isolation:isolate;overflow:hidden}" +
  ".bapp-fx-spotlight::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:var(--bapp-fx-on,0);transition:opacity .3s;background:radial-gradient(calc(260px*var(--bapp-fx-i,1)) circle at var(--bapp-gx,50%) var(--bapp-gy,50%),hsl(var(--p,215 28% 50%)/.28),transparent 70%)}" +
  // marquee: the runtime wraps the children in a track and duplicates them once.
  ".bapp-fx-marquee{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}" +
  ".bapp-marquee-track{display:flex;width:max-content;gap:inherit;animation:bapp-marquee var(--bapp-mq-d,30s) linear infinite}" +
  ".bapp-fx-marquee:hover .bapp-marquee-track{animation-play-state:paused}" +
  "@keyframes bapp-marquee{to{transform:translateX(-50%)}}" +
  ".bapp-fx-float{animation:bapp-float calc(6s / var(--bapp-fx-i,1)) ease-in-out infinite}" +
  "@keyframes bapp-float{50%{transform:translateY(calc(-10px*var(--bapp-fx-i,1)))}}" +
  ".bapp-fx-glow{position:relative}" +
  ".bapp-fx-glow::before{content:'';position:absolute;inset:calc(-2px*var(--bapp-fx-i,1));padding:calc(2px*var(--bapp-fx-i,1));border-radius:inherit;pointer-events:none;background:linear-gradient(90deg,hsl(var(--p,215 28% 50%)),hsl(var(--s,280 60% 60%)),hsl(var(--a,170 60% 50%)),hsl(var(--p,215 28% 50%)));background-size:300% 100%;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:bapp-glow 5s linear infinite}" +
  "@keyframes bapp-glow{to{background-position:300% 0}}" +
  "@media (prefers-reduced-motion:reduce){.bapp-fx-float,.bapp-fx-glow::before,.bapp-marquee-track{animation:none!important}.bapp-fx-magnetic{translate:none!important}.bapp-fx-tilt{rotate:none!important}.bapp-stateful{transition-duration:.01s!important}}"

/** Per-node CSS: intensity and morph name. */
export function nodeMotionCss(sel: string, anim: { intensity?: number; morph?: string } | undefined): string {
  if (!anim) return ""
  const parts: string[] = []
  if (typeof anim.intensity === "number") parts.push(`--bapp-fx-i:${Math.max(0.2, Math.min(3, anim.intensity))}`)
  const morph = anim.morph ? morphName(anim.morph) : null
  if (morph) parts.push(`view-transition-name:${morph}`)
  return parts.length ? `${sel}{${parts.join(";")}}` : ""
}

/**
 * The move between pages, for the page being ARRIVED at — in a cross-document
 * view transition the new document draws both snapshots, so its CSS decides.
 */
export function pageTransitionCss(t: PageTransition | undefined): string {
  if (!t) return ""
  const base = "@view-transition{navigation:auto}"
  if (t === "none") return "@view-transition{navigation:none}"
  if (t === "fade") return base
  const ease = "cubic-bezier(.16,1,.3,1)"
  const map: Record<Exclude<PageTransition, "none" | "fade">, [string, string]> = {
    "slide-up": ["to{opacity:0;transform:translateY(-4%)}", "from{opacity:0;transform:translateY(8%)}"],
    "slide-left": ["to{opacity:0;transform:translateX(-6%)}", "from{transform:translateX(100%)}"],
    zoom: ["to{opacity:0;transform:scale(.94)}", "from{opacity:0;transform:scale(1.06)}"],
    wipe: ["to{opacity:.6}", "from{clip-path:inset(100% 0 0 0)}"],
  }
  const [out, inn] = map[t]
  return (
    base +
    `@keyframes bapp-pt-out{${out}}@keyframes bapp-pt-in{${inn}}` +
    `::view-transition-old(root){animation:bapp-pt-out .45s ${ease} both}` +
    `::view-transition-new(root){animation:bapp-pt-in .55s ${ease} both}` +
    "@media (prefers-reduced-motion:reduce){::view-transition-old(root),::view-transition-new(root){animation:none!important}}"
  )
}

/**
 * The runtime for presets and interactions. Separate from BUILDER_RUNTIME so a
 * page that uses neither does not carry it (see page-scripts.ts). No backticks
 * inside — this is a template literal.
 */
export const MOTION_RUNTIME = `(function(){
  var DOC=document;
  function reduced(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches }catch(e){ return false } }
  function coarse(){ try{ return window.matchMedia('(pointer: coarse)').matches }catch(e){ return false } }
  function num(el,name,d){ var v=parseFloat(getComputedStyle(el).getPropertyValue(name)); return isNaN(v)?d:v }
  function seen(el,cb,thr){
    if(!('IntersectionObserver' in window)){ cb(); return }
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ io.disconnect(); cb() } }) },{threshold:thr||0.35});
    io.observe(el);
  }

  /* ── presets ── */
  function pointerFx(el,kind){
    if(coarse()||reduced())return;
    var i=num(el,'--bapp-fx-i',1);
    el.addEventListener('pointermove',function(e){
      var r=el.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
      el.style.setProperty('--bapp-gx',(x*100).toFixed(1)+'%'); el.style.setProperty('--bapp-gy',(y*100).toFixed(1)+'%');
      el.style.setProperty('--bapp-fx-on','1');
      if(kind==='magnetic'){ el.style.setProperty('--bapp-mx',((x-.5)*r.width*.3*i).toFixed(1)); el.style.setProperty('--bapp-my',((y-.5)*r.height*.3*i).toFixed(1)) }
      /* One axis-angle rotation toward the pointer — what rotateX(..) rotateY(..) did, as a single rotate. */
      if(kind==='tilt'){ var dx=x-.5, dy=y-.5, mag=Math.sqrt(dx*dx+dy*dy); if(mag>0.001){ el.style.setProperty('--bapp-rx',(-dy/mag).toFixed(3)); el.style.setProperty('--bapp-ry',(dx/mag).toFixed(3)); el.style.setProperty('--bapp-ra',(mag*22*i).toFixed(2)) } }
    });
    /* Perspective on the parent, so the element's own transform is left alone. */
    if(kind==='tilt'&&el.parentElement&&getComputedStyle(el.parentElement).perspective==='none')el.parentElement.style.perspective='900px';
    el.addEventListener('pointerleave',function(){
      ['--bapp-mx','--bapp-my','--bapp-ra'].forEach(function(p){ el.style.setProperty(p,'0') });
      el.style.setProperty('--bapp-fx-on','0');
    });
  }
  function marquee(el){
    if(el.querySelector(':scope > .bapp-marquee-track'))return;
    var track=DOC.createElement('div'); track.className='bapp-marquee-track';
    while(el.firstChild)track.appendChild(el.firstChild);
    el.appendChild(track);
    /* One copy more, hidden from assistive tech, so the loop has no seam. */
    [].slice.call(track.children).forEach(function(c){ var k=c.cloneNode(true); k.setAttribute('aria-hidden','true'); track.appendChild(k) });
    var i=num(el,'--bapp-fx-i',1);
    el.style.setProperty('--bapp-mq-d',Math.max(6,(track.scrollWidth/2)/(60*i)).toFixed(1)+'s');
  }
  /* Count the numbers ALREADY in the text — never a figure the page did not state. */
  function countUp(el){
    var walker=DOC.createTreeWalker(el,NodeFilter.SHOW_TEXT,null), nodes=[], n;
    while((n=walker.nextNode())){ if(/[0-9]/.test(n.nodeValue))nodes.push(n) }
    if(!nodes.length||reduced())return;
    var jobs=nodes.map(function(t){ var orig=t.nodeValue; return { t:t, orig:orig, parts:orig.split(/([0-9][0-9,]*(?:[.][0-9]+)?)/) } });
    /* The real figures stay on the page until the count STARTS: a page whose
       observer never fires (a background tab, an old browser) shows the true
       numbers, never a row of zeros. */
    seen(el,function(){
      var dur=1400/num(el,'--bapp-fx-i',1), t0=performance.now();
      function frame(now){
        var p=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-p,3);
        jobs.forEach(function(j){
          j.t.nodeValue=j.parts.map(function(part,k){
            if(!(k%2))return part;
            var target=parseFloat(part.replace(/,/g,'')), dec=(part.split('.')[1]||'').length;
            var v=(target*e).toFixed(dec);
            if(part.indexOf(',')>-1){ var s=v.split('.'); s[0]=s[0].replace(/[0-9](?=([0-9]{3})+$)/g,'$&,'); v=s.join('.') }
            return v;
          }).join('');
        });
        if(p<1)requestAnimationFrame(frame); else jobs.forEach(function(j){ j.t.nodeValue=j.orig });
      }
      requestAnimationFrame(frame);
    });
  }
  function scramble(el){
    if(reduced())return;
    var text=el.textContent||'', chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    if(!text.trim()||text.length>120)return;
    el.setAttribute('aria-label',text);
    seen(el,function(){
      var frame=0, total=Math.round(28/num(el,'--bapp-fx-i',1));
      (function tick(){
        frame++;
        var out='';
        for(var k=0;k<text.length;k++){ var c=text[k]; out+= (c===' '||k<(frame/total)*text.length) ? c : chars[Math.floor(Math.random()*chars.length)] }
        el.textContent=out;
        if(frame<total)setTimeout(tick,30); else el.textContent=text;
      })();
    });
  }
  function presets(d){
    d.querySelectorAll('.bapp-fx').forEach(function(el){
      if(el.__bappFx)return; el.__bappFx=1;
      if(el.classList.contains('bapp-fx-magnetic'))pointerFx(el,'magnetic');
      if(el.classList.contains('bapp-fx-tilt'))pointerFx(el,'tilt');
      if(el.classList.contains('bapp-fx-spotlight'))pointerFx(el,'spotlight');
      if(el.classList.contains('bapp-fx-marquee'))marquee(el);
      if(el.classList.contains('bapp-fx-count-up'))countUp(el);
      if(el.classList.contains('bapp-fx-scramble'))scramble(el);
    });
  }

  /* ── interactions ── */
  function has(el,s){ return (' '+(el.getAttribute('data-bapp-state')||'')+' ').indexOf(' '+s+' ')>-1 }
  function setState(el,s,on){
    var list=(el.getAttribute('data-bapp-state')||'').split(' ').filter(Boolean).filter(function(x){ return x!==s });
    if(on)list.push(s);
    if(list.length)el.setAttribute('data-bapp-state',list.join(' ')); else el.removeAttribute('data-bapp-state');
  }
  function interactions(d){
    d.querySelectorAll('script[data-bapp-interactions]').forEach(function(tag){
      if(tag.__bappInt)return; tag.__bappInt=1;
      var map; try{ map=JSON.parse(tag.textContent||'{}') }catch(e){ return }
      var root=tag.parentNode||DOC;
      Object.keys(map).forEach(function(id){
        root.querySelectorAll('.n-'+id).forEach(function(el){
          (map[id]||[]).forEach(function(it){
            var targets=function(){
              if(!it.targets||!it.targets.length)return [el];
              var out=[]; it.targets.forEach(function(t){ root.querySelectorAll('.n-'+t).forEach(function(x){ out.push(x) }) }); return out;
            };
            var apply=function(mode){
              targets().forEach(function(t){
                var on = mode==='toggle' ? !has(t,it.state) : mode!=='clear';
                setState(t,it.state,on);
              });
              if(it.trigger==='tap'){ var first=targets()[0]; if(first)el.setAttribute('aria-expanded',has(first,it.state)?'true':'false') }
            };
            var trig=it.trigger;
            /* A hover on a touch screen is a tap. */
            if(trig==='hover'&&coarse())trig='tap';
            if(trig==='tap'){
              el.setAttribute('data-bapp-tap','');
              var native=/^(A|BUTTON|SUMMARY|INPUT|SELECT|TEXTAREA|LABEL)$/.test(el.tagName);
              if(!native){ el.setAttribute('role','button'); if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','0') }
              el.addEventListener('click',function(){ apply(it.mode||'toggle') });
              if(!native)el.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); apply(it.mode||'toggle') } });
            } else if(trig==='hover'){
              el.addEventListener('pointerenter',function(){ apply(it.mode==='clear'?'clear':'set') });
              if(!it.once)el.addEventListener('pointerleave',function(){ apply(it.mode==='clear'?'set':'clear') });
              el.addEventListener('focusin',function(){ apply(it.mode==='clear'?'clear':'set') });
              if(!it.once)el.addEventListener('focusout',function(){ apply(it.mode==='clear'?'set':'clear') });
            } else if(trig==='inview'){
              if(!('IntersectionObserver' in window)){ apply('set'); return }
              var io=new IntersectionObserver(function(es){ es.forEach(function(e){
                if(e.isIntersecting){ apply(it.mode==='clear'?'clear':'set'); if(it.once)io.disconnect() }
                else if(!it.once){ apply(it.mode==='clear'?'set':'clear') }
              }) },{threshold:0.35});
              io.observe(el);
            } else if(trig==='load'){
              requestAnimationFrame(function(){ requestAnimationFrame(function(){ apply(it.mode==='clear'?'clear':'set') }) });
            }
          });
        });
      });
    });
  }

  function init(scope){ var d=scope||DOC; presets(d); interactions(d) }
  if(DOC.readyState!=='loading')init(); else DOC.addEventListener('DOMContentLoaded',function(){ init() });
  window.__bappMotion=init;
})();`
