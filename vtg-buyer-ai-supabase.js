(function(){
'use strict';
const $=id=>document.getElementById(id);
const preview=new URLSearchParams(location.search).get('preview')==='1';
let busy=false;
function show(message,error=false){const out=$('answer');if(!out)return;out.textContent=message;out.style.whiteSpace='pre-wrap';out.style.borderColor=error?'var(--red)':'';out.style.color=error?'var(--red)':'';}
function setBusy(value){const button=$('aiForm')?.querySelector('button[type="submit"]');if(!button)return;button.disabled=value;button.textContent=value?'Preparing checklist…':'Build checklist';}
async function submit(event){
 event.preventDefault();event.stopImmediatePropagation();
 if(busy)return;
 const question=$('question')?.value?.trim()||'';
 if(!question){show('Enter a trade question before building your checklist.',true);return;}
 if(question.length>6000){show('Please keep your question under 6,000 characters.',true);return;}
 if(preview){show('Preview mode: sign in with an active VTG buyer account to use the live assistant. Your question has not been sent.');return;}
 busy=true;setBusy(true);show('VTG AI is preparing your trade checklist…');
 try{
  const auth=await window.VTG_AUTH_READY;
  if(!auth?.client)throw new Error('Secure VTG sign-in is not ready. Refresh and try again.');
  const {data:sessionData,error:sessionError}=await auth.client.auth.getSession();
  if(sessionError)throw sessionError;
  if(!sessionData.session)throw new Error('Sign in to an active buyer account to use VTG AI.');
  const {data:profile,error:profileError}=await auth.client.from('profiles').select('role,is_active').eq('id',sessionData.session.user.id).single();
  if(profileError)throw profileError;
  if(profile?.role!=='buyer'||profile?.is_active!==true)throw new Error('An active VTG buyer account is required.');
  const {data,error}=await auth.client.functions.invoke('vtg-ai-assistant',{body:{message:question}});
  if(error){
   const detail=data?.error?.message||error.message||'The assistant could not complete this request.';
   throw new Error(detail);
  }
  if(data?.error)throw new Error(data.error.message||'VTG AI could not complete this request.');
  if(typeof data?.reply!=='string'||!data.reply.trim())throw new Error('VTG AI returned an empty response. Please try again.');
  show(data.reply.trim()+'\n\nVTG AI guidance only — confirm critical requirements with your bank, licensed advisers and relevant official authorities.');
 }catch(error){
  show(error?.message||'VTG AI is temporarily unavailable. Please try again.',true);
 }finally{busy=false;setBusy(false);}
}
const form=$('aiForm');
if(form)form.addEventListener('submit',submit,true);
window.VTGBuyerAI={submit};
if(preview)show('Preview mode — sign in with an active VTG buyer account to use the connected assistant. Your questions are not sent from preview mode.');
})();