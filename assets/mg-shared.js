/* mg-shared.js: shared header bar, footer and theme toggle for all of Manideep's sites.
   Single source: manideepgrandhi.github.io/assets/. Copied inline into offline apps by scripts/sync-mg-shared.py.
   Page config on <html>: data-mg-site="Title", data-mg-here="/path/", data-mg-local="Label|#hash,Label|#hash". */
(function(){
if(window.MG)return;
var h=document.documentElement,ds=h.dataset,K="mg-theme";
var NAV=[["Home","/"],["Projects","/projects/"],["Tools","/tools/"],["pg-commands","/pg-commands/"],["DB Cheat Sheet","/db-cheatsheet/"],["Paisa Diary","/paisa-diary/"],["Travel","/travel/"],["Blog","/blog/"]];
var ORIGIN=/^(manideepgrandhi\.github\.io|localhost|127\.0\.0\.1)$/.test(location.hostname)?"":"https://manideepgrandhi.github.io";
var ICON={auto:"◐",light:"☀",dark:"☾"},NEXT={auto:"light",light:"dark",dark:"auto"};
var mq=window.matchMedia?matchMedia("(prefers-color-scheme: dark)"):null;
function pref(){var p;try{p=localStorage.getItem(K)}catch(e){}return p==="light"||p==="dark"?p:"auto";}
function resolve(p){return p==="dark"||(p==="auto"&&mq&&mq.matches)?"dark":"light";}
function apply(p,save){if(save){try{localStorage.setItem(K,p)}catch(e){}}var t=resolve(p);h.setAttribute("data-theme",t);h.setAttribute("data-theme-pref",p);
 var b=document.getElementById("mg-theme");if(b){b.textContent=ICON[p];b.title="Theme: "+p+" (click to change)";b.setAttribute("aria-label","Theme: "+p+". Change theme");}
 try{window.dispatchEvent(new CustomEvent("mg-theme",{detail:{pref:p,theme:t}}))}catch(e){}}
window.MG={pref:pref,theme:function(){return h.getAttribute("data-theme")},set:function(p){apply(p,true)},cycle:function(){apply(NEXT[pref()],true)}};
if(mq&&mq.addEventListener)mq.addEventListener("change",function(){if(pref()==="auto")apply("auto")});
window.addEventListener("storage",function(e){if(e.key===K)apply(pref())});
var here=ds.mgHere||location.pathname;
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function link(n,u,cls){var cur=u==="/"?here==="/"||here==="/index.html":here.indexOf(u)===0;return '<a class="'+(cls||"")+'" href="'+ORIGIN+u+'"'+(cur?' aria-current="page"':"")+">"+esc(n)+"</a>";}
var local=(ds.mgLocal||"").split(",").filter(Boolean).map(function(x){var a=x.split("|");return '<a class="mg-local" href="'+esc(a[1])+'">'+esc(a[0])+"</a>"}).join("");
var site=ds.mgSite||"";
var bar='<div class="mg-bar" id="mg-bar" role="navigation" aria-label="Manideep Grandhi sites"><div class="mg-in">'+
 '<a class="mg-brand" href="'+ORIGIN+'/"><span class="mg-mark" aria-hidden="true">MG</span><span class="mg-name">Manideep Grandhi</span></a>'+
 (site?'<span class="mg-site">'+esc(site)+"</span>":"")+
 '<div class="mg-nav" id="mg-nav">'+(local?'<span class="mg-locals">'+local+"</span>":"")+NAV.map(function(n){return link(n[0],n[1])}).join("")+"</div>"+
 '<button type="button" class="mg-btn" id="mg-theme"></button>'+
 '<button type="button" class="mg-btn mg-menu" id="mg-menu" aria-expanded="false" aria-controls="mg-nav" aria-label="Sites menu">☰</button>'+
 "</div></div>";
var s=document.currentScript;
if(s&&s.parentNode)s.insertAdjacentHTML("afterend",bar);else document.body.insertAdjacentHTML("afterbegin",bar);
apply(pref());
document.getElementById("mg-theme").addEventListener("click",function(){window.MG.cycle()});
var mb=document.getElementById("mg-menu"),nav=document.getElementById("mg-nav");
mb.addEventListener("click",function(){var o=nav.classList.toggle("mg-open");mb.setAttribute("aria-expanded",o);mb.textContent=o?"✕":"☰";});
nav.addEventListener("click",function(e){if(e.target.closest("a")&&nav.classList.contains("mg-open"))mb.click();});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&nav.classList.contains("mg-open"))mb.click();});
function foot(){if(document.getElementById("mg-foot")||ds.mgNofoot!==undefined)return;var f=document.createElement("div");f.className="mg-foot";f.id="mg-foot";f.setAttribute("role","contentinfo");
 f.innerHTML='<div class="mg-in"><span>© '+new Date().getFullYear()+' Manideep Grandhi</span><span class="mg-flinks">'+NAV.map(function(n){return link(n[0],n[1])}).join("")+'<a href="https://github.com/manideepgrandhi" rel="noopener">GitHub</a></span></div>';
 var anchor=document.getElementById("mg-foot-slot");if(anchor)anchor.replaceWith(f);else document.body.appendChild(f);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",foot);else foot();
})();
