(function(){
'use strict';
const $=id=>document.getElementById(id);
const fields=['displayName','displayEmail','displayPhone','displayCountry','displayCity','buyerType','companyName','registrationNo','businessAddress','businessState'];
let client=null,userId=null;
function status(message,error){const el=$('buyerProfileStatus');if(el){el.textContent=message;el.dataset.state=error?'error':'success';}}
function fill(id,value){const el=$(id);if(el)el.value=value??'';}
function clean(id,max){return String($(id)?.value||'').trim().slice(0,max);}
function syncSidebar(name,email){const n=name||'Buyer';if($('profileName'))$('profileName').textContent=n;if($('profileEmail'))$('profileEmail').textContent=email||'Buyer account';if($('avatar'))$('avatar').textContent=n.charAt(0).toUpperCase();}
async function load(){
 const auth=await window.VTG_AUTH_READY;
 client=auth?.client;
 if(!client)throw new Error('Secure sign-in is unavailable. Refresh and try again.');
 const {data:sessionData,error:sessionError}=await client.auth.getSession();
 if(sessionError)throw sessionError;
 const user=sessionData?.session?.user;
 if(!user){status('Sign in to view and update your buyer profile.',true);return;}
 userId=user.id;
 const [profileResult,buyerResult]=await Promise.all([
  client.from('profiles').select('id,email,full_name,phone,role,is_active,country,city,preferred_language').eq('id',userId).single(),
  client.from('buyer_profiles').select('buyer_type,company_name,registration_no,address,state,kyc_status').eq('user_id',userId).maybeSingle()
 ]);
 if(profileResult.error)throw profileResult.error;
 if(buyerResult.error)throw buyerResult.error;
 const p=profileResult.data,b=buyerResult.data||{};
 if(p.role!=='buyer'||!p.is_active)throw new Error('An active buyer account is required to manage this profile.');
 fill('displayName',p.full_name);
 fill('displayEmail',p.email||user.email);
 fill('displayPhone',p.phone);
 fill('displayCountry',p.country);
 fill('displayCity',p.city);
 fill('buyerType',b.buyer_type||'business');
 fill('companyName',b.company_name);
 fill('registrationNo',b.registration_no);
 fill('businessAddress',b.address);
 fill('businessState',b.state);
 syncSidebar(p.full_name,p.email||user.email);
 status('Profile loaded from your VTG account.');
}
async function save(){
 if(!client||!userId)throw new Error('Sign in before saving your profile.');
 const button=$('saveProfile');if(button){button.disabled=true;button.textContent='Saving…';}
 try{
  const {data:sessionData,error:sessionError}=await client.auth.getSession();
  if(sessionError)throw sessionError;
  if(sessionData?.session?.user?.id!==userId)throw new Error('Your session changed. Refresh the page and try again.');
  const {data:current,error:currentError}=await client.from('profiles').select('role,is_active').eq('id',userId).single();
  if(currentError)throw currentError;
  if(current.role!=='buyer'||!current.is_active)throw new Error('Only an active buyer account can update this profile.');
  const profileUpdate={
   full_name:clean('displayName',180),
   phone:clean('displayPhone',40)||null,
   country:clean('displayCountry',100)||null,
   city:clean('displayCity',100)||null
  };
  if(!profileUpdate.full_name)throw new Error('Please enter your display name.');
  const {error:profileError}=await client.from('profiles').update(profileUpdate).eq('id',userId);
  if(profileError)throw profileError;
  const buyerUpdate={
   user_id:userId,
   buyer_type:$('buyerType')?.value||'business',
   company_name:clean('companyName',240)||null,
   registration_no:clean('registrationNo',120)||null,
   address:clean('businessAddress',500)||null,
   state:clean('businessState',100)||null
  };
  const {error:buyerError}=await client.from('buyer_profiles').upsert(buyerUpdate,{onConflict:'user_id'});
  if(buyerError)throw buyerError;
  syncSidebar(profileUpdate.full_name,clean('displayEmail',240));
  status('Your buyer profile has been saved to Supabase.');
 }finally{if(button){button.disabled=false;button.textContent='Save profile';}}
}
function init(){
 if(!$('saveProfile'))return;
 $('saveProfile').addEventListener('click',()=>save().catch(e=>status(e?.message||'Could not save your profile.',true)));
 Promise.resolve(window.VTG_AUTH_READY).then(auth=>{
  if(auth?.client?.auth?.onAuthStateChange)auth.client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')load().catch(e=>status(e?.message||'Could not load your profile.',true));});
 }).catch(()=>{});
 load().catch(e=>status(e?.message||'Could not load your buyer profile.',true));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();