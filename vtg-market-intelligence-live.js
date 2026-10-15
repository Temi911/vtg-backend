(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'Timestamp unavailable':d.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});};
const freshness=v=>{const t=Date.parse(v||'');if(!Number.isFinite(t))return 'Age unknown';const age=Date.now()-t;if(age<0)return 'Future-dated';if(age<6*60*60*1000)return 'Under 6 hours';if(age<24*60*60*1000)return 'Under 24 hours';if(age<7*24*60*60*1000)return 'Under 7 days';return 'Older than 7 days';};
const safeUrl=v=>{try{const u=new URL(String(v||''),location.origin);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch(_){return '';}};
const icons={ 'Nigeria customs':'shield-check','Africa–China trade':'globe-2','Shipping & ports':'ship','FX & landed cost':'wallet','South Korea trade':'building-2','Products & sourcing':'package','Trade & logistics':'newspaper' };
function insertSection(){
 if(document.getElementById('vtgLiveTradeNews'))return;
 const anchor=document.querySelector('.overview')?.closest('section')||document.querySelector('.overview')?.parentElement;
 const section=document.createElement('section');section.id='vtgLiveTradeNews';section.className='section alt';
 section.innerHTML=`<div class="wrap"><div class="sectionHead"><div><div class="eyebrow">VTG news service</div><h2>Trade news & updates</h2></div><p>Trade-relevant headlines appear here when the VTG news service is connected and has completed a successful sync. Publication age is shown where available; verify the original report before acting.</p></div><div id="vtgNewsStatus" class="tag" role="status"><i data-lucide="refresh-cw"></i> Connecting to news feed…</div><div id="vtgLiveNewsGrid" class="overview" style="margin-top:16px"></div><p style="font-size:9px;line-height:1.7;color:var(--muted);margin-top:16px">Publication time and source are provided by the feed and may be incomplete. VTG does not independently certify every headline. External sources do not imply endorsement or partnership.</p></div>`;
 if(anchor&&anchor.parentElement)anchor.insertAdjacentElement('afterend',section);else document.body.appendChild(section);
 if(window.lucide)window.lucide.createIcons();
}
function render(items,lastSync){
 const grid=document.getElementById('vtgLiveNewsGrid'),status=document.getElementById('vtgNewsStatus');if(!grid||!status)return;
 if(!items.length){status.innerHTML='<i data-lucide="clock-3"></i> '+(lastSync&&lastSync.at?'Last sync '+esc(date(lastSync.at)):'Feed is warming up');grid.innerHTML='<article class="metric"><h3>No current stories available</h3><p style="color:var(--muted);font-size:11px;line-height:1.8">The feed has no items to show right now. No placeholder headlines are presented as live news.</p></article>';if(window.lucide)window.lucide.createIcons();return;}
 status.innerHTML='<i data-lucide="check-circle-2"></i> '+items.length+' headlines · '+(lastSync&&lastSync.at?'last sync '+esc(date(lastSync.at)):'sync time unavailable');grid.innerHTML=items.map(item=>{
 const icon=icons[item.topic]||'newspaper',published=item.published||item.discovered,dt=date(published),age=freshness(published),url=safeUrl(item.url);
 const source=esc(item.source||item.domain||'Source not provided');
 const action=url?'<a class="btn" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Read original <i data-lucide="arrow-up-right"></i></a>':'<span class="sourceNote">Source link unavailable</span>';
 return '<article class="metric" style="display:flex;flex-direction:column;gap:10px;min-height:270px"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><span class="tag"><i data-lucide="'+icon+'"></i> '+esc(item.topic||'Trade & logistics')+'</span><span class="tag">'+esc(age)+'</span></div><h3 style="font-size:14px;line-height:1.5;margin:3px 0">'+esc(item.title)+'</h3><p style="color:var(--muted);font-size:10px;line-height:1.8;margin:0">'+esc(item.summary||'Open the original report to verify the facts and assess the trade impact.')+'</p><div style="display:grid;gap:5px;margin-top:auto;padding-top:10px;border-top:1px solid var(--line)"><span style="font-size:9px;color:var(--muted)">Source: '+source+'</span><span style="font-size:9px;color:var(--muted)">Published/discovered: '+esc(dt)+'</span><span style="font-size:9px;color:var(--muted)">Age is calculated from the feed timestamp; not a verification of accuracy.</span></div><div style="display:flex;align-items:center;justify-content:flex-end;gap:10px">'+action+'</div></article>';
 }).join('');
 if(window.lucide)window.lucide.createIcons();
}
async function load(){
 insertSection();
 const status=document.getElementById('vtgNewsStatus');
 try{const response=await fetch('/api/market-intelligence/news?limit=12',{headers:{Accept:'application/json'},cache:'no-store'});if(!response.ok)throw new Error('News endpoint returned '+response.status);const data=await response.json();render(Array.isArray(data.items)?data.items:[],data.lastSync||null);}
 catch(e){if(status)status.textContent='News feed temporarily unavailable';const grid=document.getElementById('vtgLiveNewsGrid');if(grid)grid.innerHTML='<article class="metric"><h3>Trade news connection unavailable</h3><p style="color:var(--muted);font-size:11px;line-height:1.8">Please check back later. The page will not present sample headlines as current reporting.</p></article>';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();