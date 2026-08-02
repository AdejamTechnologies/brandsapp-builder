/**
 * The shared page runtime — a tiny dependency-free vanilla-JS script (the Preline
 * model) that powers interactive OUTPUT primitives via `data-*` hooks. The renderer
 * sets `usesRuntime` when a page contains a runtime-driven module; the host (tenant
 * SSR) injects this once. It is idempotent and safe to include on any page.
 *
 * Design rules this file holds to:
 *
 * 1. PROGRESSIVE ENHANCEMENT. Markup must be usable before this script runs (and if
 *    it never does). Accordions are authored as native `<details>`/`<summary>`, which
 *    already open and close with zero JS; the runtime only *upgrades* them — height
 *    animation, an exclusive "one open at a time" mode, and a rotating chevron.
 * 2. THEMED, NOT HARDCODED. Everything it draws is styled from the document's own
 *    daisyUI theme variables (`--b3`, `--bc`, `--p`) with literal fallbacks, so a
 *    tenant's palette flows through instead of a baked-in slate. Styles live in one
 *    injected stylesheet of real classes, not scattered inline styles.
 * 3. ACCESSIBLE BY DEFAULT. Generated controls carry the right roles and state
 *    (`role=tab`/`tabpanel`, `aria-expanded`, `aria-controls`), full keyboard support
 *    (arrows/Home/End on tabs, Escape on dropdowns, focus returned to the trigger),
 *    and honour `prefers-reduced-motion`.
 *
 * Hooks it activates:
 *   [data-bapp-tabs]      > [data-bapp-tab-panel][data-title]   — builds the tab bar
 *   [data-bapp-accordion]                                       — enhances <details>,
 *       or explicit [data-bapp-accordion-item] > [-trigger] + [-panel] for imported
 *       markup that isn't <details> (both forms supported)
 *   [data-bapp-dropdown]  > [-trigger] + [-menu]
 *   [data-bapp-navbar]    > [-nav-toggle] + [-nav-menu]         — mobile collapse
 *   .bapp-reveal                                                — scroll reveal
 */
export const BUILDER_RUNTIME = `(function(){
  var DOC=document, uid=0;
  function nextId(){ uid++; return 'bapp-'+uid }
  function reduced(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches }catch(e){ return false } }

  /* One stylesheet, themed from the document's own daisyUI vars (with fallbacks). */
  function injectCss(){
    if(DOC.getElementById('bapp-runtime-css'))return;
    var line='hsl(var(--b3, 180 2% 90%))', ink='hsl(var(--bc, 215 28% 17%))', accent='hsl(var(--p, 215 28% 17%))';
    var css=''
      +'.bapp-tabbar{display:flex;gap:2px;flex-wrap:wrap;border-bottom:1px solid '+line+';margin-bottom:16px}'
      +'.bapp-tab{padding:8px 14px;border:0;background:transparent;cursor:pointer;font:inherit;font-size:14px;font-weight:500;color:'+ink+';opacity:.62;border-bottom:2px solid transparent;margin-bottom:-1px;transition:opacity .15s ease,border-color .15s ease}'
      +'.bapp-tab:hover{opacity:.9}'
      +'.bapp-tab[aria-selected="true"]{opacity:1;border-bottom-color:'+accent+'}'
      +'.bapp-tab:focus-visible,.bapp-acc-trigger:focus-visible{outline:2px solid '+accent+';outline-offset:2px;border-radius:6px}'
      +'.bapp-acc-panel{overflow:hidden}'
      +'.bapp-chev{display:inline-block;margin-left:auto;flex:none;width:.6em;height:.6em;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .2s ease;opacity:.55}'
      +'[open] > summary .bapp-chev,.bapp-acc-trigger[aria-expanded="true"] .bapp-chev{transform:rotate(-135deg)}'
      +'summary.bapp-sum{display:flex;align-items:center;gap:.5em;cursor:pointer;list-style:none}'
      +'summary.bapp-sum::-webkit-details-marker{display:none}'
      +'.bapp-acc-trigger{display:flex;align-items:center;gap:.5em;width:100%;text-align:left;font:inherit;font-weight:600;background:transparent;border:0;cursor:pointer;padding:12px 0;color:inherit}'
      +'.bapp-bgv-btn{position:absolute;right:12px;bottom:12px;z-index:2;width:36px;height:36px;border:0;border-radius:999px;cursor:pointer;font-size:13px;line-height:1;background:hsl(var(--b1, 0 0% 100%)/.85);color:'+ink+';box-shadow:0 2px 10px rgba(0,0,0,.18)}'
      +'.bapp-bgv-btn:focus-visible{outline:2px solid '+accent+';outline-offset:2px}'
      /* NO display declaration here, on purpose (and NO backticks in this file --
         they terminate the template literal). This stylesheet is appended to the
         head at runtime, so it lands AFTER the utility CSS: a display rule would
         outrank the toggle's own md:hidden and leave a hamburger sitting on the
         desktop bar. Layout and visibility belong to the authored utility classes,
         which the editor canvas also generates; this only covers imported markup
         that arrived without them. */
      +'.bapp-navtoggle{flex-direction:column;justify-content:center;gap:5px;width:40px;height:40px;padding:0 9px;border:0;background:transparent;cursor:pointer;color:inherit}'
      +'.bapp-navtoggle span{display:block;width:100%;height:2px;border-radius:2px;background:currentColor;transition:transform .2s ease,opacity .2s ease}'
      +'.bapp-navtoggle[aria-expanded="true"] span:nth-child(1){transform:translateY(7px) rotate(45deg)}'
      +'.bapp-navtoggle[aria-expanded="true"] span:nth-child(2){opacity:0}'
      +'.bapp-navtoggle[aria-expanded="true"] span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}'
      +'.bapp-navtoggle:focus-visible{outline:2px solid '+accent+';outline-offset:2px;border-radius:6px}'
      /* (No backticks anywhere in this file -- they end the template literal.) */
      +'@media (prefers-reduced-motion: reduce){.bapp-acc-panel,.bapp-chev,.bapp-navtoggle span{transition:none!important}}';
    var s=DOC.createElement('style'); s.id='bapp-runtime-css'; s.textContent=css;
    (DOC.head||DOC.documentElement).appendChild(s);
  }

  /* ── height animation shared by both accordion forms ─────────────────────── */
  function animateOpen(panel,done){
    if(reduced()){ panel.style.height=''; if(done)done(); return }
    panel.style.height='0px';
    /* force layout so the transition has a start value */
    void panel.offsetHeight;
    panel.style.transition='height .24s ease';
    panel.style.height=panel.scrollHeight+'px';
    var end=function(){ panel.removeEventListener('transitionend',end); panel.style.transition=''; panel.style.height=''; if(done)done() };
    panel.addEventListener('transitionend',end);
  }
  function animateClose(panel,done){
    if(reduced()){ if(done)done(); return }
    panel.style.height=panel.scrollHeight+'px';
    void panel.offsetHeight;
    panel.style.transition='height .2s ease';
    panel.style.height='0px';
    var end=function(){ panel.removeEventListener('transitionend',end); panel.style.transition=''; panel.style.height=''; if(done)done() };
    panel.addEventListener('transitionend',end);
  }

  /* ── Accordion ────────────────────────────────────────────────────────────
     Form A: native <details> (authored primitive) — already works without JS.
     Form B: [data-bapp-accordion-trigger] + [-panel] (imported markup).
     A "data-multi" attribute on the container allows several open at once.    */
  function initAccordion(root){
    var multi=root.hasAttribute('data-multi');
    var items=[].slice.call(root.querySelectorAll(':scope > details'));

    /* Form A — enhance native details */
    items.forEach(function(d){
      var sum=d.querySelector(':scope > summary'); if(!sum)return;
      var panel=sum.nextElementSibling; if(!panel)return;
      sum.classList.add('bapp-sum');
      panel.classList.add('bapp-acc-panel');
      if(!sum.querySelector('.bapp-chev')){ var c=DOC.createElement('span'); c.className='bapp-chev'; c.setAttribute('aria-hidden','true'); sum.appendChild(c) }
      sum.addEventListener('click',function(e){
        e.preventDefault();
        if(d.open){
          animateClose(panel,function(){ d.open=false });
        } else {
          if(!multi) items.forEach(function(o){
            if(o!==d&&o.open){ var op=o.querySelector(':scope > summary'); op=op&&op.nextElementSibling; if(op)animateClose(op,function(){o.open=false}); else o.open=false }
          });
          d.open=true; animateOpen(panel);
        }
      });
    });

    /* Form B — explicit trigger/panel pairs */
    var pairs=[].slice.call(root.querySelectorAll('[data-bapp-accordion-trigger]'));
    pairs.forEach(function(trigger){
      var item=trigger.closest('[data-bapp-accordion-item]')||trigger.parentElement;
      var panel=item&&item.querySelector('[data-bapp-accordion-panel]');
      if(!panel)return;
      var pid=panel.id||nextId(); panel.id=pid;
      var tid=trigger.id||nextId(); trigger.id=tid;
      trigger.classList.add('bapp-acc-trigger');
      panel.classList.add('bapp-acc-panel');
      panel.setAttribute('role','region');
      panel.setAttribute('aria-labelledby',tid);
      trigger.setAttribute('aria-controls',pid);
      if(trigger.tagName!=='BUTTON')trigger.setAttribute('role','button');
      if(!trigger.hasAttribute('tabindex')&&trigger.tagName!=='BUTTON')trigger.setAttribute('tabindex','0');
      if(!trigger.querySelector('.bapp-chev')){ var c2=DOC.createElement('span'); c2.className='bapp-chev'; c2.setAttribute('aria-hidden','true'); trigger.appendChild(c2) }
      var open=trigger.getAttribute('aria-expanded')==='true';
      function set(o,animate){
        open=o; trigger.setAttribute('aria-expanded',o?'true':'false');
        if(o){ panel.hidden=false; if(animate)animateOpen(panel) }
        else if(animate){ animateClose(panel,function(){ panel.hidden=true }) }
        else panel.hidden=true;
      }
      set(open,false);
      function toggle(){
        if(!open&&!multi) pairs.forEach(function(t){ if(t!==trigger&&t.__bappSet)t.__bappSet(false,true) });
        set(!open,true);
      }
      trigger.__bappSet=set;
      trigger.addEventListener('click',function(e){ e.preventDefault(); toggle() });
      trigger.addEventListener('keydown',function(e){ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); toggle() } });
    });
  }

  /* ── Tabs ─────────────────────────────────────────────────────────────────
     Builds a real tablist from the panels' data-title, with roving tabindex
     and arrow/Home/End keys.                                                */
  function initTabs(root){
    var panels=[].slice.call(root.querySelectorAll(':scope > [data-bapp-tab-panel]'));
    if(!panels.length)return;
    var bar=DOC.createElement('div');
    bar.className='bapp-tabbar'; bar.setAttribute('role','tablist'); bar.setAttribute('data-bapp-tab-bar','');
    var tabs=[];
    function select(idx,focus){
      panels.forEach(function(p,i){
        var on=i===idx, t=tabs[i];
        p.hidden=!on;
        t.setAttribute('aria-selected',on?'true':'false');
        t.tabIndex=on?0:-1;
        if(on&&!reduced()){ p.style.opacity='0'; p.style.transition='opacity .2s ease'; requestAnimationFrame(function(){ p.style.opacity='1' }) }
      });
      if(focus&&tabs[idx])tabs[idx].focus();
    }
    panels.forEach(function(panel,i){
      var pid=panel.id||nextId(); panel.id=pid;
      var btn=DOC.createElement('button');
      var tid=nextId(); btn.id=tid;
      btn.type='button'; btn.className='bapp-tab'; btn.setAttribute('role','tab');
      btn.setAttribute('aria-controls',pid);
      btn.textContent=panel.getAttribute('data-title')||('Tab '+(i+1));
      btn.addEventListener('click',function(){ select(i) });
      btn.addEventListener('keydown',function(e){
        var k=e.key, n=null;
        if(k==='ArrowRight')n=(i+1)%panels.length;
        else if(k==='ArrowLeft')n=(i-1+panels.length)%panels.length;
        else if(k==='Home')n=0;
        else if(k==='End')n=panels.length-1;
        if(n!==null){ e.preventDefault(); select(n,true) }
      });
      panel.setAttribute('role','tabpanel');
      panel.setAttribute('aria-labelledby',tid);
      tabs.push(btn); bar.appendChild(btn);
    });
    root.insertBefore(bar,panels[0]);
    select(0);
  }

  /* ── Dropdown ─────────────────────────────────────────────────────────── */
  function initDropdown(root){
    var trigger=root.querySelector(':scope > [data-bapp-dropdown-trigger]');
    var menu=root.querySelector(':scope > [data-bapp-dropdown-menu]');
    if(!trigger||!menu)return;
    var mid=menu.id||nextId(); menu.id=mid;
    trigger.setAttribute('aria-haspopup','menu');
    trigger.setAttribute('aria-controls',mid);
    trigger.setAttribute('aria-expanded','false');
    menu.style.display='none'; menu.style.opacity='0'; menu.style.transform='translateY(-6px)';
    if(!reduced())menu.style.transition='opacity .15s ease,transform .15s ease';
    var open=false,t;
    function set(o){
      open=o; clearTimeout(t);
      trigger.setAttribute('aria-expanded',o?'true':'false');
      if(o){ menu.style.display='block'; requestAnimationFrame(function(){ menu.style.opacity='1'; menu.style.transform='none' }) }
      else { menu.style.opacity='0'; menu.style.transform='translateY(-6px)'; t=setTimeout(function(){ menu.style.display='none' }, reduced()?0:160) }
    }
    trigger.addEventListener('click',function(e){ e.stopPropagation(); set(!open) });
    DOC.addEventListener('click',function(e){ if(open&&!root.contains(e.target))set(false) });

    /* Hover opening is opt-in and POINTER-only: on a touch screen there is no
       hover, and binding it there would make the first tap open-then-close. */
    if(root.hasAttribute('data-hover')&&window.matchMedia('(hover: hover)').matches){
      var delay=parseInt(root.getAttribute('data-close-delay')||'0',10)||0, leaveT;
      root.addEventListener('mouseenter',function(){ clearTimeout(leaveT); set(true) });
      root.addEventListener('mouseleave',function(){
        clearTimeout(leaveT);
        /* The delay exists so a diagonal mouse path from trigger to menu does
           not close it mid-travel. */
        leaveT=setTimeout(function(){ set(false) }, delay);
      });
    }
    root.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&open){ e.stopPropagation(); set(false); trigger.focus() }
    });
  }

  /* ── Form submit ──────────────────────────────────────────────────────────
     Posts the fields as JSON and swaps in a confirmation, instead of navigating
     away to a bare JSON response. Without JS the form still posts natively (the
     endpoint accepts urlencoded too), so this is enhancement, not a dependency. */
  function initForm(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(form.__busy)return;
      var action=form.getAttribute('action')||'/api/public/contact';
      var btn=form.querySelector('[type=submit]');
      var label=btn?btn.textContent:'';
      var waiting=(btn&&btn.getAttribute('data-wait'))||'Please wait\u2026';
      var data={};
      new FormData(form).forEach(function(v,k){ data[k]=typeof v==='string'?v:''; });

      /* The author can design real success/error blocks; if they haven't, fall
         back to a plain note so feedback is never silently missing. */
      var okBox=form.querySelector('[data-bapp-form-success]');
      var errBox=form.querySelector('[data-bapp-form-error]');
      var note=form.querySelector('[data-bapp-form-note]');
      if(!okBox&&!errBox&&!note){
        note=DOC.createElement('p');
        note.setAttribute('data-bapp-form-note','');
        note.style.cssText='margin:0;font-size:14px';
        form.appendChild(note);
      }
      function hide(el){ if(el)el.style.display='none' }
      function show(el,text){ if(!el)return; if(text)el.textContent=text; el.style.display='' }
      hide(okBox); hide(errBox); if(note)note.textContent='';

      form.__busy=1; if(btn){ btn.disabled=true; btn.textContent=waiting }
      fetch(action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)})
        .then(function(r){ return r.json().catch(function(){ return {} }).then(function(j){ return {ok:r.ok,j:j} }) })
        .then(function(res){
          if(res.ok){
            show(okBox);
            if(note){ note.style.color='hsl(var(--bc, 215 28% 17%))'; note.textContent=form.getAttribute('data-success')||'Thanks \u2014 we will be in touch.' }
            form.reset();
            /* Redirect AFTER the success state is on screen, so a fast network
               doesn't make the confirmation flash past unread. */
            var to=form.getAttribute('data-redirect');
            if(to){ setTimeout(function(){ window.location.assign(to) }, 600) }
          } else {
            var msg=(res.j&&res.j.error)||form.getAttribute('data-error')||'Something went wrong. Please try again.';
            show(errBox,errBox&&errBox.getAttribute('data-keep-text')?null:msg);
            if(note){ note.style.color='#dc2626'; note.textContent=msg }
          }
        })
        .catch(function(){
          var msg=form.getAttribute('data-error')||'Network error. Please try again.';
          show(errBox); if(note){ note.style.color='#dc2626'; note.textContent=msg }
        })
        .then(function(){ form.__busy=0; if(btn){ btn.disabled=false; btn.textContent=label } });
    });
  }

  /* ── Background video ─────────────────────────────────────────────────────
     Autoplaying video is a comfort AND a data question: it is muted+playsinline
     in the markup (browsers block anything else), we do not autoplay at all when
     the visitor asks for reduced motion, and the optional button lets anyone
     stop it. */
  function initBgVideo(root){
    var v=root.querySelector('video'); if(!v)return;
    var wantsAuto=root.getAttribute('data-autoplay')!=='false';
    if(reduced()){ wantsAuto=false; try{ v.pause() }catch(e){} }
    if(root.getAttribute('data-controls')==='false')return;

    var btn=DOC.createElement('button');
    btn.type='button';
    btn.className='bapp-bgv-btn';
    function sync(){
      var playing=!v.paused;
      btn.setAttribute('aria-label', playing?'Pause background video':'Play background video');
      btn.textContent = playing ? '\u2016' : '\u25B6';
    }
    btn.addEventListener('click',function(){
      if(v.paused){ v.play().catch(function(){}) } else { v.pause() }
      sync();
    });
    v.addEventListener('play',sync); v.addEventListener('pause',sync);
    if(!wantsAuto){ try{ v.pause() }catch(e){} }
    sync();
    root.appendChild(btn);
  }

  /* ── Navbar collapse ──────────────────────────────────────────────────────
     The mobile menu. The menu is authored with utility classes (hidden md:flex),
     so OPEN has to be an inline display that outranks them — and the runtime must
     CLEAR that inline value once the viewport passes the breakpoint. Skipping the
     clear is the classic bug: a menu opened on a phone keeps display:block, which
     beats md:flex, and the desktop bar renders as a vertical stack.             */
  function initNavbar(root){
    var menu=root.querySelector('[data-bapp-nav-menu]');
    var toggle=root.querySelector('[data-bapp-nav-toggle]');
    if(!menu||!toggle)return;
    /* A navbar nested in another must not steal its parent's controls. */
    if(menu.closest('[data-bapp-navbar]')!==root||toggle.closest('[data-bapp-navbar]')!==root)return;
    var bp=parseInt(root.getAttribute('data-collapse')||'768',10)||768;
    if(!menu.id)menu.id=nextId();
    toggle.setAttribute('aria-controls',menu.id);
    toggle.setAttribute('aria-expanded','false');
    toggle.classList.add('bapp-navtoggle');
    if(!toggle.getAttribute('aria-label'))toggle.setAttribute('aria-label','Toggle navigation menu');
    /* Give an empty toggle its three bars; authored markup is left alone. */
    if(!toggle.children.length){ for(var i=0;i<3;i++)toggle.appendChild(DOC.createElement('span')) }

    var open=false;
    function desktop(){ return window.innerWidth>=bp }
    function setOpen(v){
      if(v===open)return;
      open=v;
      toggle.setAttribute('aria-expanded',v?'true':'false');
      /* The panel declares the display its own classes expect (flex, for the
         authored flex-col sheet). Hardcoding display:block here ran the links
         together on one line; a CLASS cannot be used either, because in the editor
         the utility CSS is a style tag in the BODY and would outrank this
         stylesheet in the head -- the opposite of a published page. An inline
         style is the only thing that wins in both. */
      if(v){ menu.style.display=menu.getAttribute('data-open-display')||'flex'; animateOpen(menu) }
      else animateClose(menu,function(){ menu.style.display='' });
    }
    toggle.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); setOpen(!open) });
    /* Following a link should dismiss the panel — an in-page anchor otherwise
       scrolls behind a menu that is still covering the page. */
    menu.addEventListener('click',function(e){
      var a=e.target&&e.target.closest&&e.target.closest('a[href]');
      if(a&&!desktop())setOpen(false);
    });
    DOC.addEventListener('click',function(e){ if(open&&!desktop()&&!root.contains(e.target))setOpen(false) });
    DOC.addEventListener('keydown',function(e){ if(e.key==='Escape'&&open){ setOpen(false); toggle.focus() } });
    window.addEventListener('resize',function(){
      if(!desktop())return;
      open=false;
      toggle.setAttribute('aria-expanded','false');
      menu.style.display=''; menu.style.height=''; menu.style.transition='';
    });
  }

  /* ── Scroll-linked motion ──────────────────────────────────────────────────
     Writes ONE custom property per element -- bapp-p, 0 to 1 across its pass
     through the viewport -- and lets CSS compute every transform from it (see
     anim.ts scrollCss). Setting transform from JS per frame is what makes these
     effects janky; one number, read by the compositor, is not.
     Reads are batched before any write, so measuring an element cannot be forced
     to flush a style change made to the previous one.                          */
  function initScrollMotion(d){
    var els=[].slice.call(d.querySelectorAll('.bapp-scroll'));
    if(!els.length)return;
    if(reduced()){ els.forEach(function(e){ e.style.setProperty('--bapp-p','0') }); return }
    var ticking=false;
    function frame(){
      ticking=false;
      var vh=window.innerHeight||1, measured=[];
      for(var i=0;i<els.length;i++){
        var r=els[i].getBoundingClientRect();
        /* 0 as the element's top reaches the fold, 1 once it has fully left. */
        var span=vh+r.height;
        var p=span>0?(vh-r.top)/span:0;
        measured.push(p<0?0:p>1?1:p);
      }
      for(var j=0;j<els.length;j++) els[j].style.setProperty('--bapp-p',String(Math.round(measured[j]*1000)/1000));
    }
    function onScroll(){ if(ticking)return; ticking=true; requestAnimationFrame(frame) }
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',onScroll);
    frame();
  }

  /* ── Pin and scrub ─────────────────────────────────────────────────────────
     A section that holds still while its contents advance. The element sticks
     for a multiple of the viewport height, and its INNER progress is published
     as bapp-q (0 to 1 across the held span) so children can be driven by it the
     same way parallax is driven by bapp-p.
     Sticky is done in CSS, not by toggling position from JS: swapping to fixed
     mid-scroll reflows the page under the reader and is the classic cause of
     pinned sections jumping.                                                   */
  function initPin(d){
    /* A horizontal section IS a pin — it just declares itself structurally. */
    var pins=[].slice.call(d.querySelectorAll('.bapp-pin,[data-bapp-horizontal]'));
    if(!pins.length)return;
    pins.forEach(function(el){
      if(el.__bappPin)return; el.__bappPin=1;
      /* A pin is position:sticky, and sticky is DEAD under any ancestor whose
         overflow is not visible. The section then scrolls away while its spacer
         still consumes three viewports, which reads as a page that has fallen
         apart: a screen of nothing, and the contents gone before they revealed.
         It is also the easiest mistake to make, because every atmosphere layer
         on the page wants "relative overflow-hidden" on its parent — so the
         wrapper that makes a scene render is the wrapper that kills the pin
         inside it. Repaired here rather than forbidden upstream, because a
         hand-written page, an imported one and a generated one all reach it.
         overflow:clip keeps the author's clipping and does NOT create a scroll
         container, which is exactly the difference sticky cares about. Values
         of auto and scroll are left alone: those are real scrollers, meant. */
      for(var a=el.parentNode;a&&a.nodeType===1&&a!==DOC.body;a=a.parentNode){
        var oc=getComputedStyle(a);
        if(oc.overflowX==='hidden'||oc.overflowY==='hidden'){
          if(oc.overflowX==='hidden')a.style.overflowX='clip';
          if(oc.overflowY==='hidden')a.style.overflowY='clip';
        }
      }
      var hold=parseFloat(getComputedStyle(el).getPropertyValue('--bapp-hold'))||1;
      /* The spacer is what actually consumes scroll; the sticky child rides it. */
      var spacer=DOC.createElement('div');
      spacer.setAttribute('data-bapp-pin-spacer','');
      spacer.style.height='calc('+(100*(hold+1))+'vh)';
      spacer.style.position='relative';
      var parent=el.parentNode; if(!parent)return;
      parent.insertBefore(spacer,el);
      spacer.appendChild(el);
      el.style.position='sticky';
      el.style.top='0';
      if(!el.style.height)el.style.height='100vh';
      el.style.overflow='hidden';
    });
    var ticking=false;
    function frame(){
      ticking=false;
      var vh=window.innerHeight||1, out=[];
      for(var i=0;i<pins.length;i++){
        var sp=pins[i].parentNode;
        var r=sp.getBoundingClientRect();
        var span=r.height-vh;
        var q=span>0?(-r.top)/span:0;
        out.push(q<0?0:q>1?1:q);
      }
      for(var j=0;j<pins.length;j++) pins[j].style.setProperty('--bapp-q',String(Math.round(out[j]*1000)/1000));
    }
    function onScroll(){ if(ticking)return; ticking=true; requestAnimationFrame(frame) }
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',onScroll);
    frame();
  }

  /* ── Stagger ───────────────────────────────────────────────────────────────
     A container property: each child's entrance is delayed by its index, so a
     grid arrives as a sequence rather than all at once. Applied to the CHILD's
     animation-delay, which composes with whatever entrance it already had.     */
  function initStagger(d){
    [].slice.call(d.querySelectorAll('.bapp-stagger')).forEach(function(root){
      if(root.__bappStagger)return; root.__bappStagger=1;
      var step=parseFloat(getComputedStyle(root).getPropertyValue('--bapp-stagger'))||80;
      if(reduced())return;
      [].slice.call(root.children).forEach(function(child,i){
        child.style.animationDelay=(i*step)+'ms';
        child.style.transitionDelay=(i*step)+'ms';
      });
    });
  }

  /* ── Scroll reveal ─────────────────────────────────────────────────────────
     A twelve-percent threshold gives a reveal that fires when the element is
     properly on screen rather than as its first pixel appears. But a threshold
     is a RATIO, and an element with no height can never reach one: a card whose
     image 404s collapses to zero, never satisfies 0.12, and stays at opacity 0
     forever — so a page that loses its pictures loses its words as well. The
     zero-size escape below is the difference between a degraded page and a
     blank one.                                                                 */
  function initReveal(d){
    var els=[].slice.call(d.querySelectorAll('.bapp-reveal'));
    if(!els.length)return;
    if(reduced()||!('IntersectionObserver' in window)){ els.forEach(function(e){ e.classList.add('bapp-in') }); return }
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(!en.isIntersecting)return;
        var r=en.boundingClientRect;
        if(en.intersectionRatio<0.12 && r.height>=8 && r.width>=8)return;
        en.target.classList.add('bapp-in');
        io.unobserve(en.target);
      });
    },{threshold:[0,0.12],rootMargin:'0px 0px -8% 0px'});
    els.forEach(function(e){ if(e.__bapp)return; e.__bapp=1; io.observe(e) });
  }


  /* ── Device tier ───────────────────────────────────────────────────────────
     Everything expensive asks this first. The audience for these pages is on
     mid-range Android over patchy data as often as not, and a shader or a
     hijacked scroll on a phone that cannot afford it is worse than no effect at
     all — so capability is measured once and published as an attribute that CSS
     and every other routine can read.                                          */
  function tier(){
    if(window.__bappTier)return window.__bappTier;
    var t='high';
    try{
      var nav=navigator||{}, mem=nav.deviceMemory||4, cores=nav.hardwareConcurrency||4;
      var save=nav.connection&&(nav.connection.saveData||/2g/.test(nav.connection.effectiveType||''));
      var coarse=window.matchMedia('(pointer: coarse)').matches;
      if(reduced()||save||mem<4||cores<4)t='low';
      else if(coarse&&mem<6)t='mid';
    }catch(e){}
    window.__bappTier=t;
    try{ DOC.documentElement.setAttribute('data-bapp-tier',t) }catch(e){}
    return t;
  }

  /* ── Split text ────────────────────────────────────────────────────────────
     A heading revealed word by word from behind a mask. The split happens here
     rather than in the renderer on purpose: the published HTML stays a plain
     sentence for anything that reads the page without running scripts, and every
     module that prints a string gets the effect without knowing it exists.
     Words are wrapped, whitespace is preserved as real text so the line still
     wraps and copies correctly, and nested markup is walked rather than flattened. */
  function splitWords(el){
    if(el.__bappSplit)return; el.__bappSplit=1;
    var n=0;
    function walk(parent){
      var kids=[].slice.call(parent.childNodes);
      for(var i=0;i<kids.length;i++){
        var node=kids[i];
        if(node.nodeType===3){
          var parts=(node.nodeValue||'').split(/(\\s+)/);
          if(parts.length===1&&!parts[0].trim())continue;
          var frag=DOC.createDocumentFragment();
          for(var j=0;j<parts.length;j++){
            var part=parts[j];
            if(!part)continue;
            if(!part.trim()){ frag.appendChild(DOC.createTextNode(part)); continue }
            var outer=DOC.createElement('span');
            outer.className='bapp-w';
            outer.style.setProperty('--bapp-i',String(n++));
            var inner=DOC.createElement('span');
            inner.textContent=part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          }
          parent.replaceChild(frag,node);
        } else if(node.nodeType===1&&!node.classList.contains('bapp-w')){
          walk(node);
        }
      }
    }
    walk(el);
  }
  function initSplit(d){
    var els=[].slice.call(d.querySelectorAll('.bapp-split'));
    if(!els.length)return;
    /* Reduced motion keeps the sentence exactly as authored — no spans at all. */
    if(reduced()){ els.forEach(function(e){ e.classList.add('bapp-in') }); return }
    els.forEach(splitWords);
  }

  /* ── Pointer ───────────────────────────────────────────────────────────────
     Two numbers, -1 to 1, published on the document element: how far the pointer
     is from the centre of the viewport. Layers read them in CSS, so following
     the cursor costs one variable write per frame no matter how many elements
     are doing it. Skipped entirely on touch, where there is no cursor to follow. */
  function initPointer(){
    if(window.__bappPointer)return;
    if(reduced()||tier()==='low')return;
    try{ if(window.matchMedia('(pointer: coarse)').matches)return }catch(e){}
    if(!DOC.querySelector('.bapp-pointer'))return;
    window.__bappPointer=1;
    var tx=0,ty=0,cx=0,cy=0,run=false;
    function frame(){
      cx+=(tx-cx)*0.08; cy+=(ty-cy)*0.08;
      var root=DOC.documentElement;
      root.style.setProperty('--bapp-mx',String(Math.round(cx*1000)/1000));
      root.style.setProperty('--bapp-my',String(Math.round(cy*1000)/1000));
      if(Math.abs(tx-cx)>0.001||Math.abs(ty-cy)>0.001)requestAnimationFrame(frame);
      else run=false;
    }
    window.addEventListener('pointermove',function(e){
      tx=(e.clientX/(window.innerWidth||1))*2-1;
      ty=(e.clientY/(window.innerHeight||1))*2-1;
      if(!run){ run=true; requestAnimationFrame(frame) }
    },{passive:true});
  }

  /* ── Smooth scroll ─────────────────────────────────────────────────────────
     Wheel input is coarse and steppy, which a pinned scrub exposes immediately:
     the held image jumps in 100px increments instead of scrubbing. This eases the
     wheel toward a target position.
     It is deliberately narrow. Touch is left alone — it already has inertia, and
     hijacking it is the single most complained-about pattern on sites that do
     this. Keyboard, anchor links and the scrollbar are untouched because only
     wheel events are intercepted, and any of them simply resets the target.     */
  function initSmooth(){
    if(window.__bappSmooth)return;
    if(!DOC.querySelector('[data-bapp-smooth]'))return;
    if(reduced()||tier()==='low')return;
    try{ if(window.matchMedia('(pointer: coarse)').matches)return }catch(e){}
    window.__bappSmooth=1;
    var target=window.scrollY||0, running=false, own=false;
    function max(){ return Math.max(0,(DOC.documentElement.scrollHeight||0)-(window.innerHeight||0)) }
    function frame(){
      var cur=window.scrollY;
      var next=cur+(target-cur)*0.14;
      if(Math.abs(target-next)<0.5){ next=target; running=false } else { requestAnimationFrame(frame) }
      own=true; window.scrollTo(0,next); own=false;
    }
    window.addEventListener('wheel',function(e){
      if(e.ctrlKey)return;
      /* Anything scrollable under the cursor keeps its own scrolling. */
      var el=e.target;
      while(el&&el!==DOC.body&&el!==DOC.documentElement){
        if(el.scrollHeight-el.clientHeight>4){
          var st=getComputedStyle(el).overflowY;
          if(st==='auto'||st==='scroll')return;
        }
        el=el.parentElement;
      }
      e.preventDefault();
      target=Math.max(0,Math.min(max(),target+e.deltaY*(e.deltaMode===1?32:1)));
      if(!running){ running=true; requestAnimationFrame(frame) }
    },{passive:false});
    window.addEventListener('scroll',function(){ if(!running&&!own)target=window.scrollY },{passive:true});
    window.addEventListener('resize',function(){ target=window.scrollY },{passive:true});
  }

  /* ── Scrubbed video ────────────────────────────────────────────────────────
     A video whose playhead is the scroll position. One file instead of the
     several hundred stills an image sequence needs, which on a metered
     connection is the difference between shipping this and not.                */
  function initVideoScrub(d){
    var els=[].slice.call(d.querySelectorAll('[data-bapp-scrub]'));
    if(!els.length)return;
    els.forEach(function(el){
      if(el.__bappScrub)return; el.__bappScrub=1;
      var v=el.tagName==='VIDEO'?el:el.querySelector('video');
      if(!v)return;
      v.pause(); v.muted=true; v.playsInline=true;
      var want=0, ticking=false;
      function apply(){
        ticking=false;
        var dur=v.duration;
        if(!dur||!isFinite(dur))return;
        var t=Math.max(0,Math.min(dur-0.05,want*dur));
        if(Math.abs(v.currentTime-t)>0.02)try{ v.currentTime=t }catch(e){}
      }
      function read(){
        /* Whichever driver the author used: a pinned hold, or its own pass. */
        var cs=getComputedStyle(el);
        var q=parseFloat(cs.getPropertyValue('--bapp-q'));
        if(isNaN(q))q=parseFloat(cs.getPropertyValue('--bapp-p'));
        if(isNaN(q)){
          var r=el.getBoundingClientRect(), vh=window.innerHeight||1;
          q=(vh-r.top)/(vh+r.height);
        }
        want=q<0?0:q>1?1:q;
        if(!ticking){ ticking=true; requestAnimationFrame(apply) }
      }
      window.addEventListener('scroll',read,{passive:true});
      window.addEventListener('resize',read);
      v.addEventListener('loadedmetadata',read);
      read();
    });
  }

  function init(scope){
    var d=scope||DOC;
    injectCss();
    d.querySelectorAll('[data-bapp-tabs]').forEach(function(el){ if(el.__bapp)return; el.__bapp=1; initTabs(el) });
    d.querySelectorAll('[data-bapp-accordion]').forEach(function(el){ if(el.__bapp)return; el.__bapp=1; initAccordion(el) });
    d.querySelectorAll('[data-bapp-dropdown]').forEach(function(el){ if(el.__bapp)return; el.__bapp=1; initDropdown(el) });
    d.querySelectorAll('[data-bapp-form]').forEach(function(el){ if(el.__bapp)return; el.__bapp=1; initForm(el) });
    d.querySelectorAll('[data-bapp-bgvideo]').forEach(function(el){ if(el.__bapp)return; el.__bapp=1; initBgVideo(el) });
    d.querySelectorAll('[data-bapp-navbar]').forEach(function(el){ if(el.__bapp)return; el.__bapp=1; initNavbar(el) });
    tier();
    initSplit(d);
    initReveal(d);
    initScrollMotion(d);
    initPin(d);
    initStagger(d);
    initPointer();
    initSmooth();
    initVideoScrub(d);
  }
  if(DOC.readyState!=='loading')init();
  else DOC.addEventListener('DOMContentLoaded',function(){ init() });
  window.__bappRuntime=init;
})();`
