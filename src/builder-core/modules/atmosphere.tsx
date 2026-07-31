/**
 * Art-direction primitives — the decorative layer that separates a page which is
 * merely well-proportioned from one that looks expensive.
 *
 * These exist as MODULES rather than as utility classes because none of them can
 * be expressed by the generator: a light source is a multi-stop radial gradient,
 * grain is an inline SVG turbulence filter, and a mesh is several animated
 * gradients composited together. Authors get them as elements they can select,
 * move and restyle, and every one reads its colour from the document theme so a
 * tenant's palette carries through instead of a baked-in glow.
 *
 * All are DECORATIVE: `aria-hidden`, `pointer-events-none`, and inert with no JS.
 * The aurora upgrades itself to a real shader when the browser can (see
 * SHADER_LOADER in runtime.ts) and stays a CSS mesh when it cannot.
 */

import { createElement, type CSSProperties } from "react"

import { ADVANCED_DEFAULTS, ADVANCED_SCHEMA, rootAttrs } from "../advanced"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))

/**
 * Positioning and inertness are NOT style choices for a decorative layer, so they
 * live in the component rather than in `defaultClasses`. Those classes are seeded
 * at INSERT time by the editor, which means an authored or GENERATED document got
 * none of them — a light source then sat in the flow, took up space and swallowed
 * clicks. Authors can still restyle freely; their classes win the cascade.
 */
const LAYER: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" }
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d)

/** Theme colour roles a decorative layer may draw from. */
const TONE_OPTIONS = [
  { label: "Primary", value: "p" },
  { label: "Secondary", value: "s" },
  { label: "Accent", value: "a" },
  { label: "Neutral", value: "n" },
]
const toneVar = (t: string) => `hsl(var(--${t === "s" ? "s" : t === "a" ? "a" : t === "n" ? "n" : "p"}, 250 84% 60%))`

const POSITIONS: Record<string, string> = {
  center: "50% 50%",
  top: "50% 0%",
  bottom: "50% 100%",
  left: "0% 50%",
  right: "100% 50%",
  "top-left": "0% 0%",
  "top-right": "100% 0%",
}

// ── light ────────────────────────────────────────────────────────────────────

/**
 * A light source. Deliberately a radial gradient rather than a blurred solid: a
 * blurred circle keeps a visible edge and reads as a disc, which is exactly what
 * makes hand-rolled "glow" look cheap. A multi-stop gradient has no edge at all.
 */
const Light: ModuleDefinition = {
  name: "light",
  category: "atmosphere",
  schema: {
    tone: { type: "select", label: "colour", options: TONE_OPTIONS },
    position: {
      type: "select",
      label: "position",
      options: Object.keys(POSITIONS).map((k) => ({ label: k.replace("-", " "), value: k })),
    },
    size: { type: "number", label: "size (%)" },
    intensity: { type: "number", label: "intensity (0–100)" },
    ...ADVANCED_SCHEMA,
  },
  defaults: { tone: "p", position: "top", size: 70, intensity: 45, ...ADVANCED_DEFAULTS },
  contentModel: { children: "none" },
  defaultClasses: "pointer-events-none absolute inset-0",
  Component: (p: ModuleRenderProps) => {
    const at = POSITIONS[str(p.props.position, "top")] ?? POSITIONS.top
    const size = Math.max(10, Math.min(200, num(p.props.size, 70)))
    const a = Math.max(0, Math.min(100, num(p.props.intensity, 45))) / 100
    const c = toneVar(str(p.props.tone, "p"))
    const style: CSSProperties = {
      ...LAYER,
      background: `radial-gradient(${size}% ${size}% at ${at}, color-mix(in oklab, ${c} ${Math.round(a * 100)}%, transparent) 0%, transparent 70%)`,
    }
    return createElement("div", { className: p.className, style, "aria-hidden": true, ...rootAttrs(p) })
  },
}

// ── grain ────────────────────────────────────────────────────────────────────

/** Inline SVG turbulence — no asset request, and it tiles at any size. */
const GRAIN_URI =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.55'/></svg>\")"

const Grain: ModuleDefinition = {
  name: "grain",
  category: "atmosphere",
  schema: { intensity: { type: "number", label: "intensity (0–100)" }, ...ADVANCED_SCHEMA },
  defaults: { intensity: 14, ...ADVANCED_DEFAULTS },
  contentModel: { children: "none" },
  defaultClasses: "pointer-events-none absolute inset-0 mix-blend-overlay",
  Component: (p: ModuleRenderProps) =>
    createElement("div", {
      className: p.className,
      style: {
        ...LAYER,
        mixBlendMode: "overlay",
        backgroundImage: GRAIN_URI,
        opacity: Math.max(0, Math.min(100, num(p.props.intensity, 14))) / 100,
      } as CSSProperties,
      "aria-hidden": true,
      ...rootAttrs(p),
    }),
}

// ── vignette ─────────────────────────────────────────────────────────────────

const Vignette: ModuleDefinition = {
  name: "vignette",
  category: "atmosphere",
  schema: {
    intensity: { type: "number", label: "intensity (0–100)" },
    edge: {
      type: "select",
      label: "edge",
      segmented: true,
      options: [
        { label: "All", value: "all" },
        { label: "Bottom", value: "bottom" },
        { label: "Top", value: "top" },
      ],
    },
    ...ADVANCED_SCHEMA,
  },
  defaults: { intensity: 55, edge: "all", ...ADVANCED_DEFAULTS },
  contentModel: { children: "none" },
  defaultClasses: "pointer-events-none absolute inset-0",
  Component: (p: ModuleRenderProps) => {
    const a = Math.max(0, Math.min(100, num(p.props.intensity, 55))) / 100
    const edge = str(p.props.edge, "all")
    const ink = `rgb(0 0 0 / ${a})`
    const bg =
      edge === "bottom"
        ? `linear-gradient(to bottom, transparent 45%, ${ink} 100%)`
        : edge === "top"
          ? `linear-gradient(to top, transparent 45%, ${ink} 100%)`
          : `radial-gradient(120% 100% at 50% 50%, transparent 45%, ${ink} 100%)`
    return createElement("div", {
      className: p.className,
      style: { ...LAYER, background: bg } as CSSProperties,
      "aria-hidden": true,
      ...rootAttrs(p),
    })
  },
}

// ── aurora ───────────────────────────────────────────────────────────────────

/**
 * A parametric background: several themed gradients drifting against each other.
 *
 * The point is that it is GENERATED from the theme rather than licensed as an
 * asset — every tenant gets a scene in their own palette, and there is nothing to
 * download. The CSS mesh below always renders; where WebGL is available the
 * runtime replaces it with a shader driven by the same colours (SHADER_LOADER),
 * so the fallback is the design rather than a degraded version of it.
 */
const Aurora: ModuleDefinition = {
  name: "aurora",
  category: "atmosphere",
  schema: {
    tone: { type: "select", label: "colour", options: TONE_OPTIONS },
    speed: { type: "number", label: "seconds per cycle" },
    intensity: { type: "number", label: "intensity (0–100)" },
    shader: { type: "boolean", label: "upgrade to shader when supported" },
    ...ADVANCED_SCHEMA,
  },
  defaults: { tone: "p", speed: 24, intensity: 55, shader: true, ...ADVANCED_DEFAULTS },
  contentModel: { children: "none" },
  needsRuntime: true,
  defaultClasses: "pointer-events-none absolute inset-0 overflow-hidden",
  Component: (p: ModuleRenderProps) => {
    const c = toneVar(str(p.props.tone, "p"))
    const a = Math.max(0, Math.min(100, num(p.props.intensity, 55))) / 100
    const secs = Math.max(4, Math.min(120, num(p.props.speed, 24)))
    const mix = (pct: number) => `color-mix(in oklab, ${c} ${Math.round(pct * a * 100)}%, transparent)`
    return createElement("div", {
      className: p.className,
      "data-bapp-aurora": "",
      ...(p.props.shader === false ? {} : { "data-shader": "" }),
      "data-tone": str(p.props.tone, "p"),
      "data-intensity": String(a),
      style: {
        ...LAYER,
        overflow: "hidden",
        backgroundColor: "transparent",
        backgroundImage: [
          `radial-gradient(60% 60% at 20% 25%, ${mix(0.9)} 0%, transparent 60%)`,
          `radial-gradient(50% 50% at 80% 20%, ${mix(0.7)} 0%, transparent 60%)`,
          `radial-gradient(65% 65% at 65% 80%, ${mix(0.55)} 0%, transparent 62%)`,
        ].join(","),
        backgroundSize: "180% 180%, 160% 160%, 200% 200%",
        animation: `bapp-aurora ${secs}s ease-in-out infinite alternate`,
      } as CSSProperties,
      "aria-hidden": true,
      ...rootAttrs(p),
    })
  },
}

/** Keyframes for the mesh; folded into ANIMATION_KEYFRAMES so it ships once. */
export const ATMOSPHERE_KEYFRAMES =
  "@keyframes bapp-aurora{" +
  "0%{background-position:0% 50%,100% 0%,50% 100%}" +
  "50%{background-position:40% 20%,60% 40%,20% 60%}" +
  "100%{background-position:100% 50%,0% 100%,80% 0%}}" +
  "@media (prefers-reduced-motion:reduce){[data-bapp-aurora]{animation:none!important}}"

export const ATMOSPHERE_MODULES: ModuleDefinition[] = [Light, Grain, Vignette, Aurora]

/**
 * Optional WebGL upgrade for `aurora`, injected only when a page contains one
 * (see the host's loader gating). Draws the same colours the CSS mesh uses, so a
 * browser without WebGL keeps the design rather than a degraded version of it.
 *
 * Deliberately dependency-free and tiny: a full-screen triangle and a fragment
 * shader doing layered value-noise. No library, nothing to download, and it reads
 * the tenant's own palette off the element, so one module yields a distinct scene
 * for every theme instead of a licensed asset shared by every site that buys it.
 *
 * NOTE: no backticks anywhere in this string — it is a template literal.
 */
export const SHADER_LOADER = `(function(){
  var DOC=document;
  function reduced(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches }catch(e){ return false } }
  function rgbOf(el){
    /* Resolve the themed colour by letting the browser compute it for us. */
    var probe=DOC.createElement('span');
    probe.style.cssText='position:absolute;opacity:0;pointer-events:none';
    probe.style.color='hsl(var(--' + (el.getAttribute('data-tone')||'p') + ', 250 84% 60%))';
    el.appendChild(probe);
    var c=getComputedStyle(probe).color; probe.remove();
    var m=c.match(/[\\d.]+/g)||['120','90','255'];
    return [parseFloat(m[0])/255, parseFloat(m[1])/255, parseFloat(m[2])/255];
  }
  var VERT='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAG=[
    'precision mediump float;',
    'uniform vec2 r;uniform float t;uniform vec3 c;uniform float a;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    'return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,m=.5;for(int i=0;i<5;i++){v+=m*n(p);p*=2.03;m*=.5;}return v;}',
    'void main(){vec2 uv=gl_FragCoord.xy/r.xy;vec2 q=uv*3.;',
    'float f=fbm(q+vec2(t*.06,t*.04)+fbm(q*1.7-t*.03)*.8);',
    'float g=smoothstep(.25,.95,f);',
    'vec3 col=c*g;',
    'gl_FragColor=vec4(col,g*a);}'
  ].join('');
  function compile(gl,type,src){ var s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null }
  function start(el){
    if(el.__bappShader)return; el.__bappShader=1;
    if(reduced())return;
    var cv=DOC.createElement('canvas');
    cv.setAttribute('aria-hidden','true');
    cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
    var gl=null; try{ gl=cv.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false}) }catch(e){}
    if(!gl)return; /* keep the CSS mesh */
    var vs=compile(gl,gl.VERTEX_SHADER,VERT), fs=compile(gl,gl.FRAGMENT_SHADER,FRAG);
    if(!vs||!fs)return;
    var pr=gl.createProgram(); gl.attachShader(pr,vs); gl.attachShader(pr,fs); gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return;
    var col=rgbOf(el);
    el.appendChild(cv);
    el.style.backgroundImage='none';
    el.setAttribute('data-shader-on','');
    gl.useProgram(pr);
    var buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    var uR=gl.getUniformLocation(pr,'r'), uT=gl.getUniformLocation(pr,'t'),
        uC=gl.getUniformLocation(pr,'c'), uA=gl.getUniformLocation(pr,'a');
    var alpha=parseFloat(el.getAttribute('data-intensity')||'0.55')||0.55;
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    function size(){
      var d=Math.min(window.devicePixelRatio||1,1.5);
      cv.width=Math.max(1,Math.floor(el.clientWidth*d));
      cv.height=Math.max(1,Math.floor(el.clientHeight*d));
      gl.viewport(0,0,cv.width,cv.height);
    }
    size(); window.addEventListener('resize',size);
    var t0=Date.now(), running=true;
    /* Stop drawing while off screen: an animating background nobody can see is
       pure battery cost on a phone. */
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(en){ running=en.some(function(e){return e.isIntersecting}) },{rootMargin:'100px'}).observe(el);
    }
    function draw(){
      if(running){
        gl.uniform2f(uR,cv.width,cv.height);
        gl.uniform1f(uT,(Date.now()-t0)/1000);
        gl.uniform3f(uC,col[0],col[1],col[2]);
        gl.uniform1f(uA,alpha);
        gl.drawArrays(gl.TRIANGLES,0,3);
      }
      requestAnimationFrame(draw);
    }
    draw();
  }
  function init(scope){
    (scope||DOC).querySelectorAll('[data-bapp-aurora][data-shader]').forEach(start);
  }
  if(DOC.readyState!=='loading')init();
  else DOC.addEventListener('DOMContentLoaded',function(){ init() });
  window.__bappShader=init;
})();`
