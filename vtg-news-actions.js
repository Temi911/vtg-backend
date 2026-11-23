(function(){
'use strict';
// Like, comment and follow-source controls for external trade news cards.
// Cards opt in with data-news-url and data-news-source. All writes go through
// database functions that require a signed-in, active VTG account.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(16).padStart(8,'0');}
const articleKey=url=>'a:'+hash(String(url||'').trim().toLowerCase().replace(/[#?].*$/,''))+':'+String(url||'').length;
const sourceKey=name=>'s:'+String(name||'').trim().toLowerCase().replace(/^www\./,'').slice(0,120);
let clientP=null;
function client(){if(!clientP)clientP=Promise.resolve(window.VTG_AUTH_READY).then(a=>a&&a.client).catch(()=>null);return clientP;}
async function signedIn(){const c=await client();if(!c)return null;const {data}=await c.auth.getSession();return data?.session?c:null;}
function notify(card,text){let n=card.querySelector('.vn-note');if(!n){n=document.createElement('div');n.className='vn-note';card.querySelector('.vn-bar')?.after(n);}n.textContent=text;clearTimeout(n._t);n._t=setTimeout(()=>n.remove(),4000);}
function bar(card){
 const url=card.dataset.newsUrl,src=card.dataset.newsSource||'';
 const b=document.createElement('div');b.className='vn-bar';
 b.innerHTML='<button type="button" data-vn="like" aria-pressed="false"><span class="vn-i">♥</span> Like <b data-n="like"></b></button>'
  +'<button type="button" data-vn="comment">💬 Comment <b data-n="comment"></b></button>'
  +'<button type="button" data-vn="follow" aria-pressed="false">＋ Follow <span class="vn-src">'+esc(src.slice(0,28))+'</span> <b data-n="follow"></b></button>';
 const panel=document.createElement('div');panel.className='vn-panel';panel.hidden=true;
 panel.innerHTML='<form class="vn-form"><input maxlength="1000" placeholder="Add a comment" aria-label="Add a comment"><button type="submit">Post</button></form><div class="vn-list"></div>';
 card.append(b,panel);
 b.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-vn]');if(!btn)return;
  const kind=btn.dataset.vn;
  if(kind==='comment'){panel.hidden=!panel.hidden;if(!panel.hidden)loadComments(card);return;}
  const c=await signedIn();if(!c){notify(card,'Sign in to '+(kind==='like'?'like':'follow')+'.');return;}
  const target=kind==='like'?articleKey(url):sourceKey(src);
  const {data,error}=await c.rpc('vtg_news_toggle',{p_target_key:target,p_article_url:url||src,p_type:kind==='like'?'like':'follow_source'});
  if(error){notify(card,error.message||'Could not save.');return;}
  const on=data===true;btn.setAttribute('aria-pressed',String(on));
  const nEl=btn.querySelector('[data-n]');nEl.textContent=String(Math.max(0,(Number(nEl.textContent)||0)+(on?1:-1))||'');
  if(kind==='follow')notify(card,on?'You follow '+src+'.':'You unfollowed '+src+'.');
 });
 panel.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();const input=e.target.querySelector('input'),text=input.value.trim();if(!text)return;
  const c=await signedIn();if(!c){notify(card,'Sign in to comment.');return;}
  const {error}=await c.rpc('vtg_news_comment',{p_target_key:articleKey(url),p_article_url:url||src,p_body:text});
  if(error){notify(card,error.message||'Could not post your comment.');return;}
  input.value='';const n=card.querySelector('[data-n="comment"]');n.textContent=String((Number(n.textContent)||0)+1);loadComments(card);
 });
}
async function loadComments(card){
 const list=card.querySelector('.vn-list');const c=await client();if(!c){list.textContent='Comments are unavailable right now.';return;}
 const {data,error}=await c.rpc('vtg_news_comments',{p_target_key:articleKey(card.dataset.newsUrl)});
 if(error){list.textContent='Sign in to read and join the conversation.';return;}
 list.innerHTML=(data||[]).length?data.map(r=>'<p><strong>'+esc(r.mine?'You':r.author)+'</strong> '+esc(r.body)+'</p>').join(''):'<p class="vn-empty">No comments yet. Be the first.</p>';
}
async function hydrate(cards){
 const c=await signedIn();if(!c)return;
 const keys=cards.map(x=>articleKey(x.dataset.newsUrl)),srcKeys=[...new Set(cards.map(x=>sourceKey(x.dataset.newsSource)))];
 const {data,error}=await c.rpc('vtg_news_summary',{p_keys:keys,p_source_keys:srcKeys});if(error||!data)return;
 const mine=new Set((data.mine||[]).map(m=>m.type+'|'+m.key));
 cards.forEach(card=>{
  const ak=articleKey(card.dataset.newsUrl),sk=sourceKey(card.dataset.newsSource);
  const set=(k,v)=>{const el=card.querySelector('[data-n="'+k+'"]');if(el)el.textContent=v?String(v):'';};
  set('like',data.likes?.[ak]);set('comment',data.comment_counts?.[ak]);set('follow',data.followers?.[sk]);
  card.querySelector('[data-vn="like"]')?.setAttribute('aria-pressed',String(mine.has('like|'+ak)));
  card.querySelector('[data-vn="follow"]')?.setAttribute('aria-pressed',String(mine.has('follow_source|'+sk)));
 });
}
function decorate(root){
 const cards=[...(root||document).querySelectorAll('[data-news-url]:not([data-vn-ready])')];
 cards.forEach(c=>{c.dataset.vnReady='1';bar(c);});
 if(cards.length)hydrate(cards);
}
const css=document.createElement('style');css.textContent='.vn-bar{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-top:8px;border-top:1px solid rgba(120,130,150,.25)}.vn-bar button{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid rgba(120,130,150,.35);border-radius:999px;background:transparent;color:inherit;font:700 11.5px/1.2 inherit;cursor:pointer}.vn-bar button[aria-pressed="true"]{background:#1558D6;border-color:#1558D6;color:#fff}.vn-bar b{font-weight:800}.vn-src{opacity:.75;font-weight:600;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vn-note{margin-top:6px;font-size:11.5px;color:#C98A12;font-weight:700}.vn-panel{margin-top:8px}.vn-form{display:flex;gap:6px}.vn-form input{flex:1;min-width:0;padding:7px 10px;border:1px solid rgba(120,130,150,.4);border-radius:8px;font:inherit;font-size:12px;background:transparent;color:inherit}.vn-form button{padding:7px 14px;border:0;border-radius:8px;background:#FFB81C;color:#2b1d00;font-weight:800;font-size:12px;cursor:pointer}.vn-list p{margin:6px 0 0;font-size:12px;line-height:1.5}.vn-empty{opacity:.7}';
document.head.append(css);
window.VTGNews={decorate,articleKey,sourceKey};
const watch=()=>{decorate(document);new MutationObserver(()=>decorate(document)).observe(document.body,{childList:true,subtree:true});};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',watch):watch();
})();
