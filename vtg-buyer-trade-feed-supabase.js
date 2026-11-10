(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=value=>typeof window.esc==='function'?window.esc(value):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client=null,userId=null,busy=false,feedChannel=null;
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
      const {data:posts,error}=await client.from('vtg_trade_posts').select('id,author_id,body,post_type,created_at').order('created_at',{ascending:false}).limit(30);
      if(error)throw new Error('Trade posts query failed: '+error.message);
      if(!posts?.length){empty('No account-linked trade posts yet. Publish a useful update above to start the conversation.');return;}
      const ids=posts.map(p=>p.id);
      const [reactionResult,commentResult]=await Promise.all([
        client.from('vtg_trade_post_reactions').select('post_id,user_id').in('post_id',ids),
        client.from('vtg_trade_post_comments').select('id,post_id,author_id,body,created_at').in('post_id',ids).order('created_at',{ascending:true})
      ]);
      if(reactionResult.error)throw new Error('Trade reactions could not be loaded: '+reactionResult.error.message);
      if(commentResult.error)throw new Error('Trade comments could not be loaded: '+commentResult.error.message);
      const reactions=reactionResult.data||[],comments=commentResult.data||[];
      const counts=(rows,key)=>rows.reduce((m,row)=>(m[row[key]]=(m[row[key]]||0)+1,m),{});
      const likes=counts(reactions,'post_id'),commentCounts=counts(comments,'post_id');
      box.innerHTML=posts.map(p=>{
        const mine=p.author_id===userId,liked=reactions.some(r=>r.post_id===p.id&&r.user_id===userId);
        const postComments=comments.filter(c=>c.post_id===p.id);
        return '<article class="feedPost" data-supabase-post="'+esc(p.id)+'"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><strong>'+(mine?'You':'VTG member')+'</strong><span class="chip">'+esc(String(p.post_type||'update').toUpperCase())+' · '+esc(p.created_at?new Date(p.created_at).toLocaleString():'Date unavailable')+'</span></div><p>'+esc(p.body)+'</p><div class="feedActions"><button type="button" data-sb-like="'+esc(p.id)+'">'+(liked?'♥':'♡')+' Like · '+(likes[p.id]||0)+'</button><button type="button" data-sb-comments="'+esc(p.id)+'">Comments · '+(commentCounts[p.id]||0)+'</button></div><div id="sbComments-'+esc(p.id)+'" class="hidden" style="margin-top:10px"><div class="notice">'+(postComments.length?postComments.map(c=>'<div style="padding:6px 0;border-bottom:1px solid var(--line)"><strong>'+(c.author_id===userId?'You':'VTG member')+'</strong><p>'+esc(c.body)+'</p><small>'+esc(c.created_at?new Date(c.created_at).toLocaleString():'')+'</small></div>').join(''):'No comments yet. Start the conversation.')+'</div><form data-sb-comment-form="'+esc(p.id)+'" class="chatForm"><input name="comment" maxlength="2000" placeholder="Write a comment…" required><button class="btn primary" type="submit">Send</button></form></div></article>';
      }).join('');
    }catch(error){empty('Could not load live trade posts: '+(error.message||'Supabase request failed'),true);}
    finally{busy=false;}
  }
  async function publish(event){
    event.preventDefault();
    const form=event.currentTarget,field=$('liveTradePostText'),button=$('publishLiveTradePost'),body=field?.value.trim();
    if(!body)return;
    button.disabled=true;status('Publishing your update securely…');
    try{
      await session();
      const {error}=await client.from('vtg_trade_posts').insert({author_id:userId,body,post_type:'update'});
      if(error)throw new Error('The trade update was not published: '+error.message);
      field.value='';status('Trade update published to your signed-in account network.');await load();
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
      const {error}=await client.from('vtg_trade_post_comments').insert({post_id:form.dataset.sbCommentForm,author_id:userId,body});
      if(error)throw new Error('Your comment could not be saved: '+error.message);
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
    load().then(()=>{
      if(!client||feedChannel)return;
      feedChannel=client.channel('vtg-buyer-trade-feed')
        .on('postgres_changes',{event:'*',schema:'public',table:'vtg_trade_posts'},()=>load())
        .on('postgres_changes',{event:'*',schema:'public',table:'vtg_trade_post_reactions'},()=>load())
        .on('postgres_changes',{event:'*',schema:'public',table:'vtg_trade_post_comments'},()=>load())
        .subscribe();
    });
  },{once:true});
  window.VTGBuyerTradeFeed={load};
})();