(function(){
var root=document.body.dataset.root||'';
var dark=document.documentElement.dataset.theme==='dark';
function setHl(){document.getElementById('hl-light').disabled=dark;document.getElementById('hl-dark').disabled=!dark}setHl();
document.getElementById('theme').onclick=function(){dark=!dark;document.documentElement.dataset.theme=dark?'dark':'';localStorage.theme=dark?'dark':'light';setHl()};
if(window.hljs){document.querySelectorAll('pre code').forEach(function(el){try{hljs.highlightElement(el)}catch(e){}})}
document.querySelectorAll('.copy').forEach(function(b){b.onclick=function(){var t=b.parentNode.querySelector('code').innerText;
(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).catch(function(){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}).finally(function(){b.textContent='Copied!';setTimeout(function(){b.textContent='Copy'},1500)})}});
var q=document.getElementById('q');if(!q)return;var box=document.getElementById('results'),idx=null;
function esc(s){return s.replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
q.addEventListener('input',function(){var v=q.value.trim().toLowerCase();if(!v){box.style.display='none';return}
var go=function(){var terms=v.split(/\s+/);var r=idx.filter(function(p){var h=(p.t+' '+p.l.join(' ')).toLowerCase();return terms.every(function(t){return h.indexOf(t)>=0})}).slice(0,25);
box.innerHTML=r.length?r.map(function(p){return '<a href="'+root+p.u+'">'+(p.s?'★ ':'')+esc(p.t)+'<small>'+p.d+(p.l.length?' · '+esc(p.l.join(', ')):'')+'</small></a>'}).join(''):'<a>No matches</a>';box.style.display='block'};
if(idx)go();else fetch(root+'assets/search.json').then(function(r){return r.json()}).then(function(j){idx=j;go()})});
document.addEventListener('click',function(e){if(!box.contains(e.target)&&e.target!==q)box.style.display='none'});
})();
