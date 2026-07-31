/**
 * A real 3D layer — perspective, depth and a camera the scroll drives.
 *
 * Written as raw WebGL rather than against three.js, which is the obvious
 * alternative. The reason is the audience: these pages are read on mid-range
 * Android over metered data, and three.js is 150KB+ before a single triangle is
 * drawn. Everything here is dependency-free, ships as a gated loader that only
 * arrives when a page actually contains a scene, and costs nothing at all on a
 * page that does not.
 *
 * Three presets, because a scene the tenant has to author in Blender is a scene
 * no tenant will ever have:
 *
 *   orb    a raymarched sphere with noise displacement and a fresnel rim — the
 *          camera orbits it as the page scrolls.
 *   grid   an infinite plane in real perspective, running to a fogged horizon.
 *   field  several thousand points in 3D, with the camera dollying through them.
 *
 * All three read their colour from the document theme, both respect
 * `prefers-reduced-motion`, and none of them start on a device the tier check
 * says cannot afford it — the CSS gradient underneath is the fallback, so a
 * cheap phone gets a still image rather than a dropped frame rate.
 */

import { createElement, type CSSProperties } from "react"

import { ADVANCED_DEFAULTS, ADVANCED_SCHEMA, rootAttrs } from "../advanced"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d)

const LAYER: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }

const TONE_OPTIONS = [
  { label: "Primary", value: "p" },
  { label: "Secondary", value: "s" },
  { label: "Accent", value: "a" },
  { label: "Neutral", value: "n" },
]
const toneVar = (t: string) => `hsl(var(--${t === "s" ? "s" : t === "a" ? "a" : t === "n" ? "n" : "p"}, 250 84% 60%))`

const PRESETS = [
  { label: "Orb", value: "orb" },
  { label: "Grid", value: "grid" },
  { label: "Field", value: "field" },
]

export const Scene: ModuleDefinition = {
  name: "scene",
  category: "media",
  schema: {
    preset: { type: "select", label: "scene", options: PRESETS },
    tone: { type: "select", label: "colour", options: TONE_OPTIONS },
    intensity: { type: "number", label: "intensity (0–100)" },
    speed: { type: "number", label: "speed (1–100)" },
    ...ADVANCED_SCHEMA,
  },
  defaults: { preset: "orb", tone: "p", intensity: 70, speed: 30, ...ADVANCED_DEFAULTS },
  contentModel: { children: "none" },
  Component: (p: ModuleRenderProps) => {
    const tone = str(p.props.tone, "p")
    const preset = str(p.props.preset, "orb")
    const a = Math.max(0, Math.min(100, num(p.props.intensity, 70))) / 100
    // The gradient IS the fallback, not decoration under the canvas: on a device
    // that cannot run the scene this is the whole effect, so it has to stand up
    // on its own.
    const fallback: CSSProperties = {
      ...LAYER,
      opacity: a,
      background:
        preset === "grid"
          ? `linear-gradient(180deg, transparent 45%, ${toneVar(tone)}22 100%)`
          : `radial-gradient(60% 60% at 50% 45%, ${toneVar(tone)}33 0%, transparent 70%)`,
    }
    return createElement("div", {
      ...rootAttrs(p),
      "data-bapp-scene": preset,
      "data-tone": tone,
      "data-intensity": String(Math.round(a * 100)),
      "data-speed": String(Math.round(Math.max(1, Math.min(100, num(p.props.speed, 30))))),
      "aria-hidden": "true",
      className: p.className,
      style: { ...fallback },
    })
  },
}

/**
 * The loader. Hosts inject it ONLY when the rendered HTML contains a scene, the
 * same contract the shader and animation loaders use.
 *
 * Everything is one full-screen triangle or one point buffer, one program, and a
 * single rAF that stops when the element leaves the viewport — a scene that keeps
 * drawing off-screen is the usual reason these things flatten a battery.
 */
export const SCENE_LOADER = `(function(){
  var DOC=document;
  function reduced(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches }catch(e){ return false } }
  function tier(){
    if(window.__bappTier)return window.__bappTier;
    var t='high';
    try{
      var nav=navigator||{}, mem=nav.deviceMemory||4, cores=nav.hardwareConcurrency||4;
      var save=nav.connection&&(nav.connection.saveData||/2g/.test(nav.connection.effectiveType||''));
      if(reduced()||save||mem<4||cores<4)t='low';
    }catch(e){}
    window.__bappTier=t;
    return t;
  }
  function rgbOf(el){
    var probe=DOC.createElement('span');
    probe.style.cssText='position:absolute;opacity:0;pointer-events:none';
    probe.style.color='hsl(var(--' + (el.getAttribute('data-tone')||'p') + ', 250 84% 60%))';
    el.appendChild(probe);
    var c=getComputedStyle(probe).color; probe.remove();
    var m=c.match(/[\\d.]+/g)||['120','90','255'];
    return [parseFloat(m[0])/255, parseFloat(m[1])/255, parseFloat(m[2])/255];
  }
  function compile(gl,type,src){
    var s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;
  }
  function program(gl,vsrc,fsrc){
    var vs=compile(gl,gl.VERTEX_SHADER,vsrc), fs=compile(gl,gl.FRAGMENT_SHADER,fsrc);
    if(!vs||!fs)return null;
    var pr=gl.createProgram(); gl.attachShader(pr,vs); gl.attachShader(pr,fs); gl.linkProgram(pr);
    return gl.getProgramParameter(pr,gl.LINK_STATUS)?pr:null;
  }

  /* ── raymarched presets (orb, grid) ─────────────────────────────────────── */
  var RAY_VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var RAY_FS=[
    'precision highp float;',
    'uniform vec2 r;uniform float t;uniform float sp;uniform vec2 mo;uniform vec3 c;uniform float a;uniform float mode;',
    'float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
    'float noise(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.-2.*f);',
    ' float n=mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),',
    '  mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);',
    ' return n;}',
    'float fbm(vec3 p){float v=0.,m=.5;for(int i=0;i<4;i++){v+=m*noise(p);p*=2.02;m*=.5;}return v;}',
    /* signed distance: a sphere whose surface is pushed about by noise */
    'float sdOrb(vec3 p){return length(p)-1.0-0.18*fbm(p*1.6+vec3(0.,0.,t*.25));}',
    'float sdPlane(vec3 p){return p.y+1.1;}',
    'float map(vec3 p){return mode<.5?sdOrb(p):sdPlane(p);}',
    'vec3 normalAt(vec3 p){vec2 e=vec2(.0015,0.);',
    ' return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}',
    /* A real grid on the plane, thinned by DISTANCE rather than by fwidth():
       derivatives are an extension, and a shader that merely contains fwidth
       fails to compile where it is missing — including on the orb branch that
       never calls this. Distance is available here and does the same job. */
    'float gridMask(vec3 p,float dist){vec2 g=abs(fract(p.xz*.5+vec2(0.,t*.06))-.5);',
    ' float d=min(g.x,g.y);float w=.006+dist*.0035;return 1.-smoothstep(0.,w*6.,d);}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;',
    ' float ang=t*.12*sp+mo.x*.6;',
    ' vec3 ro=mode<.5?vec3(sin(ang)*3.2,0.6+mo.y*.5,cos(ang)*3.2):vec3(0.,0.35,-t*.9*sp);',
    ' vec3 ta=mode<.5?vec3(0.):ro+vec3(0.,-.1,-1.);',
    ' vec3 f=normalize(ta-ro),rr=normalize(cross(vec3(0.,1.,0.),f)),u=cross(f,rr);',
    ' vec3 rd=normalize(uv.x*rr+uv.y*u+1.5*f);',
    ' float d=0.,hit=0.;vec3 pos=ro;',
    ' for(int i=0;i<64;i++){pos=ro+rd*d;float s=map(pos);if(s<.002){hit=1.;break;}d+=s*.9;if(d>28.)break;}',
    ' vec3 col=vec3(0.);float alpha=0.;',
    ' if(hit>.5){',
    '  vec3 n=normalAt(pos);',
    '  vec3 l=normalize(vec3(.6,.8,-.4));',
    '  float dif=max(dot(n,l),0.);',
    '  float fres=pow(1.-max(dot(n,-rd),0.),2.5);',
    '  if(mode<.5){col=c*(.25+.75*dif)+vec3(1.)*fres*.55;alpha=(.55+.45*fres);}',
    '  else{float g=gridMask(pos,d);float fog=exp(-d*.09);col=c*g*1.6;alpha=g*fog;}',
    ' }',
    ' gl_FragColor=vec4(col,alpha*a);',
    '}'
  ].join('\\n');

  /* ── points preset (field) ──────────────────────────────────────────────── */
  var PT_VS=[
    'precision highp float;',
    'attribute vec3 pos;uniform float t;uniform float sp;uniform vec2 mo;uniform vec2 r;uniform float z;',
    'varying float vd;',
    'void main(){',
    ' vec3 p=pos;',
    /* wrap the field around the camera so it never runs out */
    ' p.z=mod(p.z+t*.25*sp+z*6.,12.)-6.;',
    ' p.x+=sin(t*.3+p.z)*.06+mo.x*.4;',
    ' p.y+=cos(t*.24+p.z)*.06-mo.y*.4;',
    ' float d=-p.z+7.;',
    ' vd=clamp(1.-d/13.,0.,1.);',
    /* a real perspective divide — this is what makes it depth and not a starfield sprite */
    ' vec2 proj=p.xy*(2.2/max(d,.05));',
    ' gl_Position=vec4(proj.x*(r.y/r.x),proj.y,0.,1.);',
    ' gl_PointSize=max(1.5,vd*7.*(r.y/700.));',
    '}'
  ].join('\\n');
  var PT_FS=[
    'precision mediump float;uniform vec3 c;uniform float a;varying float vd;',
    'void main(){vec2 d=gl_PointCoord-vec2(.5);float m=1.-smoothstep(.2,.5,length(d));',
    ' gl_FragColor=vec4(c+vec3(vd*.45),m*vd*a*1.4);}'
  ].join('\\n');

  function start(el){
    if(el.__bappScene)return; el.__bappScene=1;
    if(reduced())return;              /* the CSS fallback IS the scene */
    if(tier()==='low')return;
    var mode=el.getAttribute('data-bapp-scene')||'orb';
    var alpha=(parseFloat(el.getAttribute('data-intensity'))||70)/100;
    var speed=(parseFloat(el.getAttribute('data-speed'))||30)/30;
    var cv=DOC.createElement('canvas');
    cv.setAttribute('aria-hidden','true');
    cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
    var gl=null;
    try{ gl=cv.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'low-power'}) }catch(e){}
    if(!gl)return;
    var isPoints=mode==='field';
    var src=isPoints?[PT_VS,PT_FS]:[RAY_VS,RAY_FS];
    var pr=program(gl,src[0],src[1]);
    if(!pr)return;   /* the CSS fallback stays */
    el.appendChild(cv);
    gl.useProgram(pr);
    var buf=gl.createBuffer();
    var count=0, attr;
    if(isPoints){
      var N=1400, arr=new Float32Array(N*3);
      for(var i=0;i<N;i++){
        arr[i*3]=(Math.random()*2-1)*2.4;
        arr[i*3+1]=(Math.random()*2-1)*1.6;
        arr[i*3+2]=Math.random()*12-6;
      }
      count=N;
      gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);
      attr=gl.getAttribLocation(pr,'pos');
      gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr,3,gl.FLOAT,false,0,0);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      attr=gl.getAttribLocation(pr,'p');
      gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
      count=3;
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    var uR=gl.getUniformLocation(pr,'r'),uT=gl.getUniformLocation(pr,'t'),uC=gl.getUniformLocation(pr,'c'),
        uA=gl.getUniformLocation(pr,'a'),uM=gl.getUniformLocation(pr,'mo'),uSp=gl.getUniformLocation(pr,'sp'),
        uMode=gl.getUniformLocation(pr,'mode'),uZ=gl.getUniformLocation(pr,'z');
    var col=rgbOf(el), t0=Date.now(), running=true, dpr=Math.min(window.devicePixelRatio||1, tier()==='high'?2:1);
    function size(){
      var w=Math.max(1,Math.round(el.clientWidth*dpr)), h=Math.max(1,Math.round(el.clientHeight*dpr));
      if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; gl.viewport(0,0,w,h) }
    }
    try{
      var io=new IntersectionObserver(function(en){ running=en[0].isIntersecting },{threshold:0});
      io.observe(el);
    }catch(e){}
    window.addEventListener('resize',size,{passive:true});
    function draw(){
      if(running){
        size();
        var cs=getComputedStyle(el);
        var q=parseFloat(cs.getPropertyValue('--bapp-q'));
        if(isNaN(q))q=parseFloat(cs.getPropertyValue('--bapp-p'));
        if(isNaN(q)){
          var rect=el.getBoundingClientRect(), vh=window.innerHeight||1;
          q=(vh-rect.top)/(vh+rect.height);
        }
        q=q<0?0:q>1?1:q;
        var root=DOC.documentElement;
        var mx=parseFloat(getComputedStyle(root).getPropertyValue('--bapp-mx'))||0;
        var my=parseFloat(getComputedStyle(root).getPropertyValue('--bapp-my'))||0;
        var time=(Date.now()-t0)/1000;
        gl.uniform2f(uR,cv.width,cv.height);
        /* Scroll is part of the clock: the camera advances as the page does. */
        gl.uniform1f(uT,time+q*6.);
        gl.uniform1f(uSp,speed);
        gl.uniform2f(uM,mx,my);
        gl.uniform3f(uC,col[0],col[1],col[2]);
        gl.uniform1f(uA,alpha);
        if(uMode)gl.uniform1f(uMode,mode==='grid'?1.:0.);
        if(uZ)gl.uniform1f(uZ,q);
        gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(isPoints?gl.POINTS:gl.TRIANGLES,0,count);
      }
      requestAnimationFrame(draw);
    }
    size(); draw();
  }
  function init(scope){
    (scope||DOC).querySelectorAll('[data-bapp-scene]').forEach(start);
  }
  if(DOC.readyState!=='loading')init();
  else DOC.addEventListener('DOMContentLoaded',function(){ init() });
  window.__bappScene=init;
})();`
