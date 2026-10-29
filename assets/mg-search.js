/* mg-search.js: one search box for all of Manideep's sites (button in the shared top bar, "/" or Ctrl/Cmd+K).
   Single source: manideepgrandhi.github.io/assets/. Copied inline into offline apps by scripts/sync-mg-shared.py.
   Index: https://manideepgrandhi.github.io/search-index.json, built by scripts/build-search-index.py from the published pages only.
   Nothing you type leaves the browser: the index is fetched once (then kept in the Cache API for offline use) and searched locally.
   Also gives headings without an id a stable "s-<slug>" id so results can link straight to a section. */
(function(){
if(window.MGSearch)return;
var d=document,h=d.documentElement;
var ORIGIN=/^(manideepgrandhi\.github\.io|localhost|127\.0\.0\.1)$/.test(location.hostname)?"":"https://manideepgrandhi.github.io";
var URL_IDX=ORIGIN+"/search-index.json",CACHE="mg-search-v1",GO="mg-search-go",LASTQ="mg-search-q";
var MAC=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||"");
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k);if(v===null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,v)}catch(e){}}

/* ---------- heading ids (same rule as slug() in build-search-index.py) ---------- */
function slug(t){t=String(t).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60).replace(/-+$/,"");return "s-"+(t||"section")}
function ids(){var hs=d.querySelectorAll("h1:not([id]),h2:not([id]),h3:not([id]),h4:not([id])");
 for(var i=0;i<hs.length;i++){var e=hs[i];if(e.closest("#mg-bar,#mg-foot,#mg-search"))continue;var b=slug(e.textContent),id=b,n=2;while(d.getElementById(id))id=b+"-"+n++;e.id=id}}
function target(){var x=location.hash.slice(1);if(!x)return null;try{x=decodeURIComponent(x)}catch(e){}return x}
function reveal(tries){var id=target();if(!id)return;var el=d.getElementById(id),fromSearch=ss(GO)===id;
 if(el&&!fromSearch&&!tries)return; /* a normal anchor the browser already handled: leave it alone */
 if(!el){ids();el=d.getElementById(id)}
 if(!el){tries=(tries||0)+1;if(tries<5)setTimeout(function(){reveal(tries)},[0,150,400,1000,2500][tries]);else ss(GO,null);return}
 ss(GO,null);var bar=d.getElementById("mg-bar"),off=16,sticky=d.querySelector("header.top,#hdr");
 if(sticky&&getComputedStyle(sticky).position==="sticky")off+=sticky.offsetHeight;
 var y=el.getBoundingClientRect().top+(window.scrollY||pageYOffset)-off;window.scrollTo(0,Math.max(0,y));
 var box=el.closest("article,.card")||el;box.classList.remove("mg-s-hit");void box.offsetWidth;box.classList.add("mg-s-hit");setTimeout(function(){box.classList.remove("mg-s-hit")},2200);}
function onReady(){ids();setTimeout(function(){reveal(0)},0)}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",onReady);else onReady();
window.addEventListener("hashchange",function(){setTimeout(function(){reveal(0)},0)});

/* ---------- index: fetch, keep a copy in the Cache API, fall back to it offline ---------- */
var IDX=null,pending=null;
function cacheGet(){try{return caches.open(CACHE).then(function(c){return c.match(URL_IDX)}).then(function(r){return r?r.json():null}).catch(function(){return null})}catch(e){return Promise.resolve(null)}}
function cachePut(res){try{caches.open(CACHE).then(function(c){return c.put(URL_IDX,res)}).catch(function(){})}catch(e){}}
function load(){if(IDX)return Promise.resolve(IDX);if(pending)return pending;
 pending=fetch(URL_IDX,{cache:"no-cache"}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);cachePut(r.clone());return r.json()})
  .catch(function(err){return cacheGet().then(function(j){if(!j)throw err;return j})})
  .then(function(j){IDX=prep(j);pending=null;return IDX},function(e){pending=null;throw e});
 return pending}
function warm(){/* fetch once per device so search also works offline later */
 try{if(!window.caches||!window.fetch)return;caches.open(CACHE).then(function(c){return c.match(URL_IDX)}).then(function(r){if(!r)return fetch(URL_IDX).then(function(x){if(x.ok)cachePut(x)})}).catch(function(){})}catch(e){}}

/* ---------- tokenizer + matcher (prefix, typo-tolerant) ---------- */
var WRE;try{WRE=new RegExp("[\\p{L}\\p{N}_$]+","gu")}catch(e){WRE=/[a-z0-9_$\u00c0-\uffff]+/g}
function toks(s,parts){var m=String(s).toLowerCase().match(WRE)||[],o=[];for(var i=0;i<m.length;i++){var w=m[i];o.push(w);
 if(parts&&w.indexOf("_")>=0){var p=w.split("_");for(var j=0;j<p.length;j++)if(p[j])o.push(p[j])}}return o}
function prep(j){var X={sites:j.sites,pages:j.pages,e:j.e,voc:{},keys:null};
 function add(t,i,w){var r=X.voc[t];if(!r)r=X.voc[t]={};if(!(r[i]>=w))r[i]=w}
 for(var i=0;i<j.e.length;i++){var e=j.e[i],pg=j.pages[e[0]],f=[[pg[2]+" "+e[2],3],[e[3],1.4],[e[4],1]];
  for(var k=0;k<3;k++){var t=toks(f[k][0],1);for(var n=0;n<t.length;n++)add(t[n],i,f[k][1])}}
 X.keys=Object.keys(X.voc);return X}
function dist(a,b,max){/* Damerau-Levenshtein (optimal string alignment) with early exit */
 var la=a.length,lb=b.length;if(Math.abs(la-lb)>max)return max+1;var p2=null,p=[],c,i,j;for(j=0;j<=lb;j++)p[j]=j;
 for(i=1;i<=la;i++){c=[i];var lo=i;for(j=1;j<=lb;j++){var cost=a[i-1]===b[j-1]?0:1,v=Math.min(p[j]+1,c[j-1]+1,p[j-1]+cost);
  if(p2&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,p2[j-2]+1);c[j]=v;if(v<lo)lo=v}
  if(lo>max)return max+1;p2=p;p=c}return p[lb]}
function termHits(X,q){/* -> {entry: score}, plus the vocabulary words it matched (for highlighting) */
 var out={},words=[],max=q.length>=8?2:1;
 for(var k=0;k<X.keys.length;k++){var w=X.keys[k],s=0;
  if(w===q)s=3;else if(q.length>=2&&w.indexOf(q)===0)s=2.2-Math.min(.8,(w.length-q.length)*.05);
  else if(q.length>=4&&Math.abs(w.length-q.length)<=max&&dist(q,w,max)<=max)s=1.5;
  else if(q.length>=5&&w.length>q.length&&dist(q,w.slice(0,q.length),1)<=1)s=1.1;
  if(!s)continue;words.push(w);var r=X.voc[w];for(var i in r){var v=s*r[i];if(!(out[i]>=v))out[i]=v}}
 return{s:out,w:words}}
function search(X,q){var qt=toks(q);if(!qt.length)return{r:[],w:[]};var seen={},terms=[];qt.forEach(function(t){if(!seen[t]){seen[t]=1;terms.push(t)}});
 var hits=terms.slice(0,8).map(function(t){return termHits(X,t)}),words=[];hits.forEach(function(x){words=words.concat(x.w)});
 var tot={},cnt={};hits.forEach(function(x){for(var i in x.s){tot[i]=(tot[i]||0)+x.s[i];cnt[i]=(cnt[i]||0)+1}});
 var need=hits.length,ids=Object.keys(tot).filter(function(i){return cnt[i]===need});
 if(!ids.length&&need>1)ids=Object.keys(tot).filter(function(i){return cnt[i]>=Math.ceil(need/2)});
 var ql=q.toLowerCase().trim();
 var r=ids.map(function(i){var e=X.e[i],pg=X.pages[e[0]],s=tot[i]+(cnt[i]<need?-2:0);var hd=(pg[2]+" "+e[2]).toLowerCase();
  if(ql.length>2&&hd.indexOf(ql)>=0)s+=3;if(!e[1])s+=.3;return{i:+i,s:s}});
 r.sort(function(a,b){return b.s-a.s||a.i-b.i});
 var uniq={},out=[];for(var n=0;n<r.length&&out.length<80;n++){var e=X.e[r[n].i],k=e[0]+"#"+e[1];if(uniq[k])continue;uniq[k]=1;out.push(r[n])}
 words.sort(function(a,b){return b.length-a.length});return{r:out,w:words.slice(0,40)}}
function hl(text,words,len){text=String(text||"");if(!text)return"";var low=text.toLowerCase(),at=-1;
 for(var i=0;i<words.length&&at<0;i++){var p=low.indexOf(words[i]);if(p>=0)at=p}
 var st=0;if(len&&text.length>len){st=at>40?at-40:0;if(st){var sp=text.indexOf(" ",st);if(sp>0&&sp<at)st=sp+1}}
 var cut=len?text.slice(st,st+len):text,pre=st>0?"…":"",post=len&&st+len<text.length?"…":"";
 if(!words.length)return pre+esc(cut)+post;
 var re=new RegExp("("+words.map(function(w){return w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}).join("|")+")","gi");
 return pre+cut.split(re).map(function(s,k){return k%2?"<mark>"+esc(s)+"</mark>":esc(s)}).join("")+post}

/* ---------- UI ---------- */
var ov,inp,list,stat,items=[],act=-1,isOpen=false,lastFocus=null,timer;
var ICON='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>';
var KEY=MAC?"⌘K":"Ctrl+K",EX=["deadlock","pg_dump","tempdb","vacuum","blocking","sticky"];
function build(){if(ov)return;ov=d.createElement("div");ov.id="mg-search";ov.className="mg-s-ov";ov.hidden=true;
 ov.innerHTML='<div class="mg-s-dlg" role="dialog" aria-modal="true" aria-label="Search all sites">'+
 '<div class="mg-s-top">'+ICON+'<input id="mg-s-q" type="search" placeholder="Search all my sites…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" role="combobox" aria-expanded="true" aria-controls="mg-s-list" aria-autocomplete="list">'+
 '<button type="button" class="mg-s-x" aria-label="Close search">Esc</button></div>'+
 '<div class="mg-s-list" id="mg-s-list" role="listbox" aria-label="Results"></div>'+
 '<div class="mg-s-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span><span class="mg-s-stat" aria-live="polite"></span></div></div>';
 d.body.appendChild(ov);inp=ov.querySelector("input");list=ov.querySelector(".mg-s-list");stat=ov.querySelector(".mg-s-stat");
 ov.addEventListener("mousedown",function(e){if(e.target===ov)close()});
 ov.querySelector(".mg-s-x").addEventListener("click",close);
 inp.addEventListener("input",function(){clearTimeout(timer);timer=setTimeout(run,60)});
 inp.addEventListener("keydown",key);ov.addEventListener("keydown",function(e){if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close()}else if(e.key==="Tab"){e.preventDefault();inp.focus()}});
 list.addEventListener("click",function(e){var a=e.target.closest("a[data-i]");if(a&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();go(+a.dataset.i)}
  var x=e.target.closest("button[data-q]");if(x){inp.value=x.dataset.q;run();inp.focus()}});
 list.addEventListener("mousemove",function(e){var a=e.target.closest("a[data-i]");if(a&&+a.dataset.i!==act)setAct(+a.dataset.i,false)});}
function key(e){if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(!items.length)return;var n=act+(e.key==="ArrowDown"?1:-1);setAct((n+items.length)%items.length,true)}
 else if(e.key==="Enter"){e.preventDefault();if(act>=0)go(act,e.ctrlKey||e.metaKey)}
 else if(e.key==="Home"&&items.length&&!inp.value){setAct(0,true)}}
function setAct(i,scroll){act=i;var as=list.querySelectorAll("a[data-i]");for(var k=0;k<as.length;k++){var on=k===i;as[k].classList.toggle("mg-s-on",on);as[k].setAttribute("aria-selected",on)}
 var a=as[i];if(a){inp.setAttribute("aria-activedescendant",a.id);if(scroll)a.scrollIntoView({block:"nearest"})}}
function href(it){var X=IDX,e=X.e[it.i],pg=X.pages[e[0]];return ORIGIN+pg[1]+(e[1]?"#"+e[1].replace(/ /g,"%20"):"")}
function go(i,newTab){var it=items[i];if(!it)return;var url=href(it),e=IDX.e[it.i],pg=IDX.pages[e[0]];ss(LASTQ,inp.value);
 if(newTab){window.open(url,"_blank","noopener");return}
 if(e[1])ss(GO,e[1]);
 var here=location.pathname.replace(/index\.html$/,""),there=pg[1].replace(/index\.html$/,"");
 if(!ORIGIN&&here===there){close();if(location.hash==="#"+e[1]||!e[1]){if(e[1])reveal(1);else window.scrollTo(0,0)}else location.hash=e[1];return}
 location.href=url}
function empty(msg){var sites=IDX?IDX.sites.map(function(s){return esc(s[0])}).join(" · "):"";
 list.innerHTML='<div class="mg-s-empty">'+(msg||"Type to search "+(sites?"<b>"+sites+"</b>":"all my sites")+".")+
 '<div class="mg-s-ex">Try '+EX.map(function(x){return '<button type="button" data-q="'+x+'">'+x+"</button>"}).join("")+"</div></div>";items=[];act=-1;inp.removeAttribute("aria-activedescendant")}
function run(){var q=inp.value;if(!IDX){return}
 if(!q.trim()){empty();stat.textContent=IDX.e.length+" sections indexed";return}
 var t0=Date.now(),res=search(IDX,q),X=IDX;
 if(!res.r.length){empty('No matches for “'+esc(q.trim())+'”. Check the spelling or try fewer words.');stat.textContent="0 results";return}
 var g={},order=[];res.r.forEach(function(r){var s=X.pages[X.e[r.i][0]][0];if(!g[s]){g[s]=[];order.push(s)}if(g[s].length<8)g[s].push(r)});
 items=[];var html="";order.forEach(function(s){html+='<div class="mg-s-grp" role="group" aria-label="'+esc(X.sites[s][0])+'"><div class="mg-s-site">'+esc(X.sites[s][0])+"</div>";
  g[s].forEach(function(r){var e=X.e[r.i],pg=X.pages[e[0]],n=items.length;items.push(r);var head=e[2]&&e[2]!==pg[2]?e[2]:"";
   var sn=e[3]&&res.w.some(function(w){return e[3].toLowerCase().indexOf(w)>=0})?hl(e[3],res.w,150):e[4]&&res.w.some(function(w){return e[4].toLowerCase().indexOf(w)>=0})?'<code>'+hl(e[4],res.w,120)+"</code>":hl(e[3]||"",res.w,150);
   html+='<a id="mg-s-r'+n+'" role="option" aria-selected="false" data-i="'+n+'" href="'+esc(href(r))+'"><span class="mg-s-t">'+hl(pg[2],res.w)+(head?' <span class="mg-s-h">› '+hl(head,res.w)+"</span>":"")+"</span>"+(sn?'<span class="mg-s-sn">'+sn+"</span>":"")+"</a>"});
  html+="</div>"});
 list.innerHTML=html;list.scrollTop=0;setAct(0,false);stat.textContent=res.r.length+(res.r.length>=80?"+":"")+" result"+(res.r.length===1?"":"s")+" · "+(Date.now()-t0)+" ms"}
function open(){build();if(isOpen)return;isOpen=true;lastFocus=d.activeElement;ov.hidden=false;h.classList.add("mg-s-lock");
 var b=d.getElementById("mg-search-btn");if(b)b.setAttribute("aria-expanded","true");
 if(!inp.value){var l=ss(LASTQ);if(l)inp.value=l}inp.focus();inp.select();
 if(IDX){run();return}
 list.innerHTML='<div class="mg-s-empty">Loading the search index…</div>';stat.textContent="";
 load().then(function(){if(isOpen)run()},function(){if(!isOpen)return;
  list.innerHTML='<div class="mg-s-empty mg-s-err">Couldn’t load the search index'+(navigator.onLine===false?" (you’re offline and it hasn’t been saved on this device yet)":"")+'.<div class="mg-s-ex"><button type="button" class="mg-s-retry">Try again</button></div></div>';
  var rb=list.querySelector(".mg-s-retry");rb.addEventListener("click",function(){isOpen=false;ov.hidden=true;open()})})}
function close(){if(!isOpen)return;isOpen=false;ov.hidden=true;h.classList.remove("mg-s-lock");var b=d.getElementById("mg-search-btn");if(b)b.setAttribute("aria-expanded","false");
 if(inp.value)ss(LASTQ,inp.value);if(lastFocus&&lastFocus.focus)try{lastFocus.focus({preventScroll:true})}catch(e){}}
function typing(t){return t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable)}
/* window (not document) listener: page shortcuts on document run first; if a page already uses "/" (pg-commands, Sticky Pad) it keeps it */
window.addEventListener("keydown",function(e){var k=e.key;
 if((e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&(k==="k"||k==="K")){e.preventDefault();isOpen?close():open();return}
 if(k==="/"&&!isOpen&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.defaultPrevented&&!typing(e.target)){e.preventDefault();open()}});

function button(){if(d.getElementById("mg-search-btn"))return true;var t=d.getElementById("mg-theme");if(!t)return false;
 var b=d.createElement("button");b.type="button";b.className="mg-btn mg-sbtn";b.id="mg-search-btn";b.innerHTML=ICON;
 b.title="Search all sites (/ or "+KEY+")";b.setAttribute("aria-label","Search all sites");b.setAttribute("aria-haspopup","dialog");b.setAttribute("aria-expanded","false");
 b.addEventListener("click",open);b.addEventListener("pointerenter",function(){load().catch(function(){})},{once:true});t.parentNode.insertBefore(b,t);return true}
if(!button())d.addEventListener("DOMContentLoaded",button);
window.addEventListener("load",function(){(window.requestIdleCallback||function(f){setTimeout(f,2500)})(warm)});
window.MGSearch={open:open,close:close,load:load,search:function(q){return load().then(function(X){var r=search(X,q);return r.r.map(function(x){var e=X.e[x.i],pg=X.pages[e[0]];return{site:X.sites[pg[0]][0],page:pg[2],heading:e[2],url:href(x),score:x.s}})})},slug:slug};
})();
