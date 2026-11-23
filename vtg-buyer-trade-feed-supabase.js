(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=value=>typeof window.esc==='function'?window.esc(value):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client=null,userId=null,busy=false,feedChannel=null,following=new Set();
  async function session(){
    let auth=null;
    try{
      if(window.VTG_AUTH_READY)auth=await window.VTG_AUTH_READY;
      else if(window.VTGAuth)auth=window.VTGAuth;
    }catch(error){throw new Error('The VTG sign-in service did not initialise: '+(error?.message||'unknown initialisation error'));}
    const supabase=auth?.client||window.VTG_SUPABASE;
    if(!supabase?.auth)throw new Error('The VTG account service is unavailable. Refresh the page and sign in again.');
    const {data,error}=await supabase.auth.getSession();
    if(error)throw new Error('Could not verify your VTG session: '+error.message);
    if(!data.session)throw new Error('No active VTG session was found. Please sign in again.');
    const {data:profile,error:profileError}=await supabase.from('profiles').select('role,is_active').eq('id',data.session.user.id).maybeSingle();
    if(profileError)throw new Error('Your account profile could not be checked: '+profileError.message);
    if(!profile)throw new Error('Your VTG account profile is not set up yet. Contact VTG support before publishing.');
    if(profile.role!=='buyer'||profile.is_active!==true)throw new Error('An active buyer account is required to access the buyer trade feed.');
    client=supabase;userId=data.session.user.id;
    return data.session;
  }
  function status(message){const n=$('liveTradeFeedNotice');if(n)n.textContent=message;}
  function empty(message,retry){
    const box=$('liveTradeFeedRows');if(!box)return;
    box.innerHTML='<div class="empty">'+esc(message)+(retry?' <button class="btn" type="button" id="retrySupabaseTradeFeed">Try again</button>':'')+'</div>';
    $('retrySupabaseTradeFeed')?.addEventListener('click',load);
  }
  async function load(){
    const box=$('liveTradeFeedRows');if(!box)return;
    if(busy)return;busy=true;box.innerHTML='<div class="empty">Loading live trade posts…</div>';
    try{
      await session();
      const {data:allPosts,error}=await client.from('vtg_trade_posts').select('id,author_id,body,post_type,external_url,country_code,region,created_at').order('created_at',{ascending:false}).limit(40);
      if(error)throw new Error('Trade posts query failed: '+error.message);
      const regionFilter=$('liveTradeFeedRegionFilter')?.value||'all';
      const posts=(allPosts||[]).filter(p=>regionFilter==='all'||p.region===regionFilter);
      if(!posts.length){empty(regionFilter==='all'?'No account-linked trade posts yet. Publish a useful update above to start the conversation.':'No trade posts are available in this region yet.');return;}
      const ids=posts.map(p=>p.id),authors=[...new Set(posts.map(p=>p.author_id))];
      const [reactionResult,commentResult,mediaResult,profileResult,followResult]=await Promise.all([
        client.from('vtg_trade_post_reactions').select('post_id,user_id').in('post_id',ids),
        client.from('vtg_trade_post_comments').select('id,post_id,author_id,body,created_at').in('post_id',ids).order('created_at',{ascending:true}),
        client.from('vtg_trade_post_media').select('post_id,media_type,public_url,thumbnail_url,sort_order').in('post_id',ids).order('sort_order'),
        client.from('profiles').select('id,full_name,role,country').in('id',authors),
        client.from('vtg_user_follows').select('following_id').eq('follower_id',userId)
      ]);
      if(reactionResult.error)throw new Error('Trade reactions could not be loaded: '+reactionResult.error.message);
      if(commentResult.error)throw new Error('Trade comments could not be loaded: '+commentResult.error.message);
      if(mediaResult.error)throw new Error('Trade post photos could not be loaded: '+mediaResult.error.message);
      if(profileResult.error)throw new Error('Trade member labels could not be loaded: '+profileResult.error.message);
      if(followResult.error)throw new Error('Your follow list could not be loaded: '+followResult.error.message);
      const reactions=reactionResult.data||[],comments=commentResult.data||[],media=mediaResult.data||[],profiles=new Map((profileResult.data||[]).map(p=>[p.id,p]));
      following=new Set((followResult.data||[]).map(x=>x.following_id));
      const mediaByPost=new Map();media.forEach(m=>{const rows=mediaByPost.get(m.post_id)||[];rows.push(m);mediaByPost.set(m.post_id,rows);});
      const counts=(rows,key)=>rows.reduce((m,row)=>(m[row[key]]=(m[row[key]]||0)+1,m),{});
      const likes=counts(reactions,'post_id'),commentCounts=counts(comments,'post_id');
      box.innerHTML=posts.map(p=>{
        const mine=p.author_id===userId,liked=reactions.some(r=>r.post_id===p.id&&r.user_id===userId);
        const postComments=comments.filter(c=>c.post_id===p.id);
        const author=profiles.get(p.author_id)||{},postMedia=mediaByPost.get(p.id)||[],regionTag=p.region?'<span class="chip">'+esc(p.region)+'</span>':'';
        const mediaHtml=postMedia.length?'<div class="feedMedia" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:12px 0">'+postMedia.map(m=>m.media_type==='image'?'<a href="'+esc(m.public_url)+'" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="'+esc(m.thumbnail_url||m.public_url)+'" alt="Trade post photo" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px"></a>':'<a href="'+esc(m.public_url)+'" target="_blank" rel="noopener noreferrer">Open video</a>').join('')+'</div>':'';
        const followButton=!mine?'<button type="button" data-sb-follow="'+esc(p.author_id)+'">'+(following.has(p.author_id)?'Following':'Follow')+'</button>':'';
        return '<article class="feedPost" data-supabase-post="'+esc(p.id)+'"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><strong>'+esc(author.full_name||'VTG member')+'</strong><span class="chip">'+esc(String(p.post_type||'update').toUpperCase())+' · '+esc(p.region||author.country||p.country_code||'Trade network')+' · '+esc(p.created_at?new Date(p.created_at).toLocaleString():'Date unavailable')+'</span></div><p>'+esc(p.body)+'</p>'+mediaHtml+(p.external_url?'<p><a href="'+esc(p.external_url)+'" target="_blank" rel="noopener noreferrer">Open linked resource</a></p>':'')+'<div class="feedActions"><button type="button" data-sb-like="'+esc(p.id)+'">'+(liked?'♥':'♡')+' Like · '+(likes[p.id]||0)+'</button><button type="button" data-sb-comments="'+esc(p.id)+'">Comments · '+(commentCounts[p.id]||0)+'</button>'+followButton+'</div><div id="sbComments-'+esc(p.id)+'" class="hidden" style="margin-top:10px"><div class="notice">'+(postComments.length?postComments.map(c=>'<div style="padding:6px 0;border-bottom:1px solid var(--line)"><strong>'+(c.author_id===userId?'You':'VTG member')+'</strong><p>'+esc(c.body)+'</p><small>'+esc(c.created_at?new Date(c.created_at).toLocaleString():'')+'</small></div>').join(''):'No comments yet. Start the conversation.')+'</div><form data-sb-comment-form="'+esc(p.id)+'" class="chatForm"><input name="comment" maxlength="2000" placeholder="Write a comment…" required><button class="btn primary" type="submit">Send</button></form></div></article>';
      }).join('');
    }catch(error){empty('Could not load live trade posts: '+(error.message||'Supabase request failed'),true);}
    finally{busy=false;}
  }
  async function publish(event){
    event.preventDefault();
    const form=event.currentTarget,field=$('liveTradePostText'),button=$('publishLiveTradePost'),body=field?.value.trim(),files=Array.from($('liveTradePostFiles')?.files||[]).slice(0,4),region=$('liveTradePostRegion')?.value||'Africa';
    if(!body&&!files.length)return;
    for(const [fileIndex,file] of files.entries()){if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>20*1024*1024){status('Use JPEG, PNG, WebP or GIF photos up to 20 MB each.');return;}}
    button.disabled=true;status('Publishing your update securely…');
    try{
      await session();
      const {data:postResult,error}=await client.rpc('vtg_create_trade_post',{p_body:body||'Shared photos',p_post_type:'update',p_region:region,p_external_url:null,p_country_code:null});
      if(error)throw new Error('The trade update was not published: '+error.message);
      if(!postResult?.ok){status((postResult?.message||'Your post was blocked by VTG content rules')+' Warning '+Number(postResult?.warning_count||1)+' in the last 30 days.');return;}
      const postId=postResult.post_id;
      for(const file of files){const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').slice(0,8)||'jpg',storagePath=userId+'/'+postId+'/'+crypto.randomUUID()+'.'+ext;
        const {error:uploadError}=await client.storage.from('vtg-trade-feed-media').upload(storagePath,file,{contentType:file.type,upsert:false});if(uploadError)throw new Error('The post was saved, but a photo upload failed: '+uploadError.message);
        const {data:{publicUrl}}=client.storage.from('vtg-trade-feed-media').getPublicUrl(storagePath);
        const {error:mediaError}=await client.from('vtg_trade_post_media').insert({post_id:postId,media_type:'image',storage_path:storagePath,public_url:publicUrl,sort_order:fileIndex});if(mediaError)throw new Error('The post was saved, but photo details could not be attached: '+mediaError.message);
      }
      field.value='';if($('liveTradePostFiles'))$('liveTradePostFiles').value='';status(files.length?'Trade update and photos published to your account network.':'Trade update published to your signed-in account network.');await load();
    }catch(error){status('Unable to publish update: '+(error.message||'Supabase request failed'));}
    finally{button.disabled=false;}
  }
  async function click(event){
    const button=event.target.closest('button');if(!button)return;
    try{
      if(button.dataset.sbLike){
        await session();const postId=button.dataset.sbLike;
        const {data:existing,error:findError}=await client.from('vtg_trade_post_reactions').select('id').eq('post_id',postId).eq('user_id',userId).maybeSingle();
        if(findError)throw findError;
        if(existing){const {error}=await client.from('vtg_trade_post_reactions').delete().eq('id',existing.id);if(error)throw error;}
        else{const {error}=await client.from('vtg_trade_post_reactions').insert({post_id:postId,user_id:userId,reaction:'like'});if(error)throw error;}
        await load();return;
      }
      if(button.dataset.sbFollow){
        const target=button.dataset.sbFollow;if(target===userId)return;
        if(following.has(target)){const {error}=await client.from('vtg_user_follows').delete().eq('follower_id',userId).eq('following_id',target);if(error)throw error;}
        else{const {error}=await client.from('vtg_user_follows').insert({follower_id:userId,following_id:target});if(error)throw error;}
        await load();return;
      }
      if(button.dataset.sbComments){
        const slot=$('sbComments-'+button.dataset.sbComments);if(slot)slot.classList.toggle('hidden');
      }
    }catch(error){status('Trade feed action failed: '+(error.message||'Please try again'));}
  }
  async function comment(event){
    const form=event.target.closest('form[data-sb-comment-form]');if(!form)return;
    event.preventDefault();const input=form.elements.comment,body=input.value.trim();if(!body)return;
    const submit=form.querySelector('button[type=submit]');submit.disabled=true;
    try{
      await session();
      const {data:commentResult,error}=await client.rpc('vtg_create_trade_post_comment',{p_post_id:form.dataset.sbCommentForm,p_body:body});
      if(error)throw new Error('Your comment could not be saved: '+error.message);
      if(!commentResult?.ok){status((commentResult?.message||'Your comment was blocked by VTG content rules')+' Warning '+Number(commentResult?.warning_count||1)+' in the last 30 days.');return;}
      status('Comment added.');await load();
      const slot=$('sbComments-'+form.dataset.sbCommentForm);if(slot)slot.classList.remove('hidden');
    }catch(error){status('Unable to add comment: '+(error.message||'Please try again'));}
    finally{submit.disabled=false;}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('refreshLiveTradeFeed')?.addEventListener('click',load);
    $('liveTradePostForm')?.addEventListener('submit',publish);
    $('liveTradeFeedRows')?.addEventListener('click',click);
    $('liveTradeFeedRows')?.addEventListener('submit',comment);
    $('liveTradeFeedRegionFilter')?.addEventListener('change',load);
    load().then(()=>{
      if(!client||feedChannel)return;
      feedChannel=client.channel('vtg-buyer-trade-feed')
        .on('postgres_changes',{event:'*',schema:'public',table:'vtg_trade_posts'},()=>load())
        .on('postgres_changes',{event:'*',schema:'public',table:'vtg_trade_post_reactions'},()=>load())
        .on('postgres_changes',{event:'*',schema:'public',table:'vtg_trade_post_comments'},()=>load())
        .on('postgres_changes',{event:'*',schema:'public',table:'vtg_trade_post_media'},()=>load())
        .subscribe();
    });
  },{once:true});
  window.VTGBuyerTradeFeed={load};
})();