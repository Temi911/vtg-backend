(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'Recently discovered':d.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});};
const icons={ 'Nigeria customs':'shield-check','Africa–China trade':'globe-2','Shipping & ports':'ship','FX & landed cost':'wallet','South Korea trade':'building-2','Products & sourcing':'package','Trade & logistics':'newspaper' };
function insertSection(){
 if(document.getElementById('vtgLiveTradeNews'))return;
 const anchor=document.querySelector('.overview')?.closest('section')||document.querySelector('.overview')?.parentElement;
 const section=document.createElement('section');section.id='vtgLiveTradeNews';section.className='section alt';
 section.innerHTML=`<div class="wrap"><div class="sectionHead"><div><div class="eyebrow">VTG news service</div><h2>Trade news & updates</h2></div><p>Trade-relevant headlines appear here when the VTG news service is connected and has completed a successful sync. Open the original report to verify details before making trade decisions.</p></div><div id="vtgNewsStatus" class="tag" role="status"><i data-lucide="refresh-cw"></i> Connecting to news feed…</div><div id="vtgLiveNewsGrid" class="overview" style="margin-top:16px"></div><p style="font-size:9px;line-height:1.7;color:var(--muted);margin-top:16px">Headlines and source links belong to their publishers. VTG adds trade-focused context; external sources do not imply endorsement or partnership. Some items may be held for editorial review.</p></div>`;
 if(anchor&&anchor.parentElement)anchor.insertAdjacentElement('afterend',section);else document.body.appendChild(section);
 if(window.lucide)window.lucide.createIcons();
}
function render(items,lastSync){
 const grid=document.getElementById('vtgLiveNewsGrid'),status=document.getElementById('vtgNewsStatus');if(!grid||!status)return;
 if(!items.length){status.innerHTML='<i data-lucide="clock-3"></i> '+(lastSync&&lastSync.at?'Last sync '+esc(date(lastSync.at)):'Feed is warming up');grid.innerHTML='<article class="metric"><h3>New stories are being screened</h3><p style="color:var(--muted);font-size:11px;line-height:1.8">The hourly collector will display relevant reports here after it completes its first successful sync. No placeholder headlines are shown as live news.</p></article>';if(window.lucide)window.lucide.createIcons();return;}
 status.innerHTML='<i data-lucide="check-circle-2"></i> '+items.length+' headlines · '+(lastSync&&lastSync.at?'last sync '+esc(date(lastSync.at)):'sync time unavailable');grid.innerHTML=items.map(item=>{
 const icon=icons[item.topic]||'newspaper';const dt=date(item.published||item.discovered);
 return '<article class="metric" style="display:flex;flex-direction:column;gap:10px;min-height:250px"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span class="tag"><i data-lucide="'+icon+'"></i> '+esc(item.topic||'Trade & logistics')+'</span><span style="font-size:8px;color:var(--muted)">'+esc(dt)+'</span></div><h3 style="font-size:14px;line-height:1.5;margin:3px 0">'+esc(item.title)+'</h3><p style="color:var(--muted);font-size:10px;line-height:1.8;margin:0">'+esc(item.summary||'Open the original report to verify the facts and assess the trade impact.')+'</p><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:10px;border-top:1px solid var(--line)"><span style="font-size:9px;color:var(--muted)">'+esc(item.source||item.domain||'External source')+'</span><a class="btn" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">Read original <i data-lucide="arrow-up-right"></i></a></div></article>';
 }).join('');
 if(window.lucide)window.lucide.createIcons();
}
async function load(){
 insertSection();
 const status=document.getElementById('vtgNewsStatus');
 try{const response=await fetch('/api/market-intelligence/news?limit=12',{headers:{Accept:'application/json'},cache:'no-store'});if(!response.ok)throw new Error('News endpoint returned '+response.status);const data=await response.json();render(data.items||[],data.lastSync||null);}
 catch(e){if(status)status.textContent='News feed temporarily unavailable';const grid=document.getElementById('vtgLiveNewsGrid');if(grid)grid.innerHTML='<article class="metric"><h3>Trade news connection unavailable</h3><p style="color:var(--muted);font-size:11px;line-height:1.8">Please check back shortly. The page will not present sample headlines as current reporting.</p></article>';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
