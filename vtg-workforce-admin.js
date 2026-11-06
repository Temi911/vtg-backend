(async function(){
  const $=id=>document.getElementById(id);
  const form=$('staffInviteForm'),notice=$('staffAccessNotice');
  const inviteRows=$('staffInvitationRows'),memberRows=$('staffMemberRows');
  const endpoint='/functions/v1/workforce-invitations';
  const roles={
    agent:'Trade Agent',manager:'Management',staff:'Staff & Operations',
    logistics:'Logistics & Clearing',compliance:'Verification & Compliance',
    support:'Customer Support',finance:'Finance & Commissions',
    inspector:'Inspection & Quality',marketing:'Marketing & Catalogue'
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const date=value=>value?new Date(value).toLocaleString():'—';
  let auth,current;
  function message(text,kind){
    if(!notice)return;
    notice.textContent=text;
    notice.dataset.kind=kind||'info';
    notice.style.color=kind==='error'?'#b42318':kind==='success'?'#16794b':'var(--muted)';
  }
  async function api(path,method='GET',body){
    const headers={apikey:auth.publishableKey,Authorization:'Bearer '+current.session.access_token,Accept:'application/json'};
    if(body!==undefined)headers['Content-Type']='application/json';
    const response=await fetch(auth.projectUrl+endpoint+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'The staff access service could not complete this request.');
    return data;
  }
  function renderInvitations(items){
    if(!inviteRows)return;
    if(!items.length){inviteRows.innerHTML='<tr><td colspan="5" class="emptyHint">No invitations have been issued yet.</td></tr>';return;}
    inviteRows.innerHTML=items.map(item=>{
      const actions=item.status==='pending'
        ? '<button class="btn" type="button" data-invite-action="resend" data-id="'+esc(item.id)+'">Resend</button> <button class="btn" type="button" data-invite-action="revoke" data-id="'+esc(item.id)+'">Revoke</button>'
        : '—';
      return '<tr><td>'+esc(item.email)+'</td><td>'+esc(roles[item.workspace_role]||item.workspace_role)+'</td><td>'+esc(item.status)+'</td><td>'+esc(date(item.expires_at))+'</td><td>'+actions+'</td></tr>';
    }).join('');
  }
  function renderMembers(items){
    if(!memberRows)return;
    if(!items.length){memberRows.innerHTML='<tr><td colspan="6" class="emptyHint">No staff invitations have been accepted yet.</td></tr>';return;}
    memberRows.innerHTML=items.map(item=>{
      const profile=item.profile||{},status=item.status;
      let actions='';
      if(status==='active')actions='<button class="btn" type="button" data-member-action="suspend" data-user="'+esc(item.user_id)+'" data-role="'+esc(item.workspace_role)+'">Suspend</button>';
      else if(status==='suspended'||status==='removed')actions='<button class="btn" type="button" data-member-action="activate" data-user="'+esc(item.user_id)+'" data-role="'+esc(item.workspace_role)+'">Reactivate</button>';
      if(status!=='removed')actions+=' <button class="btn" type="button" data-member-action="remove" data-user="'+esc(item.user_id)+'" data-role="'+esc(item.workspace_role)+'">Remove</button>';
      return '<tr><td>'+esc(profile.full_name||'—')+'</td><td>'+esc(profile.email||'—')+'</td><td>'+esc(roles[item.workspace_role]||item.workspace_role)+'</td><td>'+esc(status)+'</td><td>'+esc(profile.is_active===false?'Inactive':'Active')+'</td><td>'+actions+'</td></tr>';
    }).join('');
  }
  async function load(){
    message('Loading invitations and staff access…');
    const [invites,members]=await Promise.all([api(''),api('/members')]);
    renderInvitations(invites.invitations||[]);
    renderMembers(members.members||[]);
    message('Staff invitations and workspace access are connected to Supabase.','success');
  }
  try{
    auth=await window.VTG_AUTH_READY;
    current=await auth.getCurrent();
    if(!current||current.user.role!=='admin'||current.user.accountEnvironment!=='staff'){
      location.replace('/admin-signin.html');return;
    }
    await load();
  }catch(error){
    message(error.message||'Could not verify administrator access.','error');
    if(!current)setTimeout(()=>location.replace('/admin-signin.html'),500);
    return;
  }
  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const submit=form.querySelector('button[type="submit"]');
    if(submit)submit.disabled=true;
    const values=new FormData(form);
    try{
      const result=await api('','POST',{
        email:values.get('email'),
        full_name:values.get('full_name'),
        workspace_role:values.get('workspace_role')
      });
      form.reset();
      if(result.assignment_added)message('Workspace assigned to the existing VTG staff identity.','success');
      else if(result.email_sent)message('Invitation email sent. The invitee can accept it and set their password.','success');
      else message(result.email_note||'Invitation saved, but the email was not sent. Check SMTP and resend.','error');
      await load();
    }catch(error){message(error.message,'error');}
    finally{if(submit)submit.disabled=false;}
  });
  document.addEventListener('click',async event=>{
    const inviteButton=event.target.closest('[data-invite-action]');
    const memberButton=event.target.closest('[data-member-action]');
    if(inviteButton){
      const action=inviteButton.dataset.inviteAction,id=inviteButton.dataset.id;
      inviteButton.disabled=true;
      try{
        if(action==='revoke'){await api('/'+encodeURIComponent(id),'PATCH',{});message('Invitation revoked.','success');}
        else{await api('/resend/'+encodeURIComponent(id),'POST',{});message('Invitation email resent.','success');}
        await load();
      }catch(error){message(error.message,'error');inviteButton.disabled=false;}
      return;
    }
    if(memberButton){
      const action=memberButton.dataset.memberAction,user=memberButton.dataset.user,role=memberButton.dataset.role;
      const status=action==='activate'?'active':action==='suspend'?'suspended':'removed';
      if(action==='remove'&&!confirm('Remove this staff workspace assignment?'))return;
      memberButton.disabled=true;
      try{
        await api('/members/'+encodeURIComponent(user)+'/'+encodeURIComponent(role),'PATCH',{status});
        message('Staff access updated.','success');
        await load();
      }catch(error){message(error.message,'error');memberButton.disabled=false;}
    }
  });
})();

// Private administrator account-support inbox.
(async function(){
  const $=id=>document.getElementById(id);
  const rows=$('accountSupportRows'),notice=$('accountSupportNotice'),refresh=$('refreshAccountSupport');
  if(!rows||!notice)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const date=value=>value?new Date(value).toLocaleString():'—';
  let auth,current;
  function message(value,error){notice.textContent=value;notice.style.color=error?'#b42318':'var(--muted)';}
  async function request(method='GET',body){
    const headers={apikey:auth.publishableKey,Authorization:'Bearer '+current.session.access_token,Accept:'application/json'};
    if(body!==undefined)headers['Content-Type']='application/json';
    const response=await fetch('/api/admin/account-support',{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'The account support inbox could not be loaded.');
    return data;
  }
  function render(items){
    if(!items.length){rows.innerHTML='<tr><td colspan="7" class="emptyHint">No account support requests have been received.</td></tr>';return;}
    rows.innerHTML=items.map(item=>'<tr>'+
      '<td>'+esc(date(item.created_at))+'</td>'+
      '<td>'+esc(item.account_role)+'</td>'+
      '<td>'+esc(item.contact_email)+'</td>'+
      '<td>'+esc(item.issue)+'</td>'+
      '<td style="min-width:220px;white-space:normal">'+esc(item.description)+'</td>'+
      '<td><span class="status '+(item.status==='resolved'||item.status==='closed'?'done':item.status==='in_review'?'review':'')+'">'+esc(item.status)+'</span></td>'+
      '<td><div style="display:flex;gap:6px;align-items:center"><select aria-label="Support request status" data-support-status="'+esc(item.id)+'" style="max-width:125px;padding:7px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink)">'+
      ['open','in_review','resolved','closed'].map(status=>'<option value="'+status+'" '+(item.status===status?'selected':'')+'>'+status.replace('_',' ')+'</option>').join('')+
      '</select><button class="btn" type="button" data-support-save="'+esc(item.id)+'">Save</button></div></td></tr>').join('');
  }
  async function load(){
    message('Loading secure account support requests…');
    const data=await request();
    render(data.requests||[]);
    message((data.requests||[]).length+' support request(s) loaded from Supabase.');
  }
  try{
    auth=await window.VTG_AUTH_READY;
    current=await auth.getCurrent();
    if(!current||current.user.role!=='admin'||current.user.accountEnvironment!=='staff'){
      message('Administrator access is required to view this inbox.',true);return;
    }
    await load();
  }catch(error){message(error.message||'Could not load account support requests.',true);}
  refresh?.addEventListener('click',async()=>{refresh.disabled=true;try{await load();}catch(error){message(error.message,true);}finally{refresh.disabled=false;}});
  rows.addEventListener('click',async event=>{
    const button=event.target.closest('[data-support-save]');
    if(!button)return;
    const id=button.dataset.supportSave,select=rows.querySelector('[data-support-status="'+CSS.escape(id)+'"]');
    if(!select)return;
    button.disabled=true;
    try{await request('PATCH',{id,status:select.value});message('Support request status updated.');await load();}
    catch(error){message(error.message,true);}
    finally{button.disabled=false;}
  });
})();