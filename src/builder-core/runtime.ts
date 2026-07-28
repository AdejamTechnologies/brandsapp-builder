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
      +'@media (prefers-reduced-motion: reduce){.bapp-acc-panel,.bapp-chev{transition:none!important}}';
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

  /* ── Scroll reveal ────────────────────────────────────────────────────── */
  function initReveal(d){
    var els=[].slice.call(d.querySelectorAll('.bapp-reveal'));
    if(!els.length)return;
    if(reduced()||!('IntersectionObserver' in window)){ els.forEach(function(e){ e.classList.add('bapp-in') }); return }
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('bapp-in'); io.unobserve(en.target) } });
    },{threshold:.12,rootMargin:'0px 0px -8% 0px'});
    els.forEach(function(e){ if(e.__bapp)return; e.__bapp=1; io.observe(e) });
  }

  function init(scope){
    var d=scope||DOC;
    injectCss();
    d.querySelectorAll('[data-bapp-tabs]').forEach(function(el){ if(el.__bapp)return; el.__bapp=1; initTabs(el) });
    d.querySelectorAll('[data-bapp-accordion]').forEach(function(el){ if(el.__bapp)return; el.__bapp=1; initAccordion(el) });
    d.querySelectorAll('[data-bapp-dropdown]').forEach(function(el){ if(el.__bapp)return; el.__bapp=1; initDropdown(el) });
    d.querySelectorAll('[data-bapp-form]').forEach(function(el){ if(el.__bapp)return; el.__bapp=1; initForm(el) });
    initReveal(d);
  }
  if(DOC.readyState!=='loading')init();
  else DOC.addEventListener('DOMContentLoaded',function(){ init() });
  window.__bappRuntime=init;
})();`
