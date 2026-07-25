/**
 * The shared page runtime — a tiny dependency-free vanilla-JS script (the Preline
 * model) that powers interactive OUTPUT primitives via `data-*` hooks. The renderer
 * sets `usesRuntime` when a page contains a runtime-driven module; the host (tenant
 * SSR) injects this once. Self-contained: it styles what it generates inline, so it
 * needs no external CSS. It is idempotent and safe to include on any page.
 *
 * Supported: `[data-bapp-tabs]` — reads its direct `[data-bapp-tab-panel]` children
 * (each with `data-title`), builds a tab bar, and toggles panels.
 */
export const BUILDER_RUNTIME = `(function(){
  function initTabs(root){
    var panels=[].slice.call(root.querySelectorAll(':scope > [data-bapp-tab-panel]'));
    if(!panels.length)return;
    var bar=document.createElement('div');
    bar.setAttribute('data-bapp-tab-bar','');
    bar.style.cssText='display:flex;gap:2px;flex-wrap:wrap;border-bottom:1px solid #e2e8f0;margin-bottom:16px';
    function select(idx){
      panels.forEach(function(p,i){
        p.style.display=i===idx?'':'none';
        var b=p.__b;
        b.style.color=i===idx?'#0f172a':'#64748b';
        b.style.borderBottomColor=i===idx?'#0f172a':'transparent';
      });
    }
    panels.forEach(function(panel,i){
      var btn=document.createElement('button');
      btn.type='button';
      btn.textContent=panel.getAttribute('data-title')||('Tab '+(i+1));
      btn.style.cssText='padding:8px 14px;border:0;background:transparent;cursor:pointer;font:inherit;font-size:14px;font-weight:500;color:#64748b;border-bottom:2px solid transparent;margin-bottom:-1px';
      btn.addEventListener('click',function(){select(i)});
      panel.__b=btn;
      bar.appendChild(btn);
    });
    root.insertBefore(bar,panels[0]);
    select(0);
  }
  function init(scope){
    (scope||document).querySelectorAll('[data-bapp-tabs]').forEach(function(el){
      if(el.__bapp)return;el.__bapp=1;initTabs(el);
    });
  }
  if(document.readyState!=='loading')init();
  else document.addEventListener('DOMContentLoaded',function(){init()});
  window.__bappRuntime=init;
})();`
