(function(){
'use strict';
const $=id=>document.getElementById(id);
const money=(value,currency)=>new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD',maximumFractionDigits:0}).format(value);
function set(id,value){const el=$(id);if(el)el.textContent=value}
function showError(error){
 set('buyerMetricTransactions','—');set('buyerMetricTransactionsNote','Account data unavailable');
 set('buyerMetricValue','—');set('buyerMetricValueNote','Could not verify order value');
 set('buyerMetricCompleted','—');set('buyerMetricCompletedNote','Could not verify order status');
 set('buyerOverviewAnalyticsTitle','Account activity could not be loaded');
 set('buyerOverviewAnalyticsText',error||'Refresh the dashboard and try again.');
}
async function load(){
 const authReady=await window.VTG_AUTH_READY;
 if(!authReady?.client){showError('Secure buyer sign-in is not ready. Please refresh the page.');return}
 const client=authReady.client;
 const {data:sessionData,error:sessionError}=await client.auth.getSession();
 if(sessionError)throw sessionError;
 const user=sessionData?.session?.user;
 if(!user){showError('Sign in to view your account-linked transaction overview.');return}
 const {data:profile,error:profileError}=await client.from('profiles').select('role,is_active').eq('id',user.id).single();
 if(profileError)throw profileError;
 if(profile?.role!=='buyer'||!profile?.is_active)throw new Error('An active buyer account is required to view this overview.');
 const [ordersResult,requestsResult]=await Promise.all([
  client.from('trade_orders').select('id,quantity,unit_price,currency,status,created_at').eq('buyer_id',user.id).order('created_at',{ascending:false}).limit(500),
  client.from('buyer_trade_requests').select('id,status,created_at',{count:'exact',head:true}).eq('buyer_id',user.id)
 ]);
 if(ordersResult.error)throw ordersResult.error;
 if(requestsResult.error)throw requestsResult.error;
 const orders=ordersResult.data||[];
 const total=(requestsResult.count||0)+orders.length;
 const completed=orders.filter(o=>['completed','delivered','closed'].includes(String(o.status||'').toLowerCase())).length;
 const currencyTotals={};
 orders.forEach(o=>{const c=String(o.currency||'USD').toUpperCase();currencyTotals[c]=(currencyTotals[c]||0)+(Number(o.quantity)||0)*(Number(o.unit_price)||0)});
 const currencies=Object.keys(currencyTotals);
 let tradeValue='—',valueNote='No recorded orders yet';
 if(currencies.length===1){tradeValue=money(currencyTotals[currencies[0]],currencies[0]);valueNote='Recorded order value · '+currencies[0]}
 else if(currencies.length>1){tradeValue='Multiple';valueNote=currencies.map(c=>c+' '+currencyTotals[c].toLocaleString('en-US',{maximumFractionDigits:0})).join(' · ')}
 set('buyerMetricTransactions',String(total));
 set('buyerMetricTransactionsNote',(requestsResult.count||0)+' sourcing requests · '+orders.length+' orders');
 set('buyerMetricValue',tradeValue);set('buyerMetricValueNote',valueNote);
 set('buyerMetricCompleted',String(completed));set('buyerMetricCompletedNote','Of '+orders.length+' recorded orders');
 if(total===0){
  set('buyerOverviewAnalyticsTitle','No recorded transactions yet');
  set('buyerOverviewAnalyticsText','Your buyer account is connected. Once you submit a sourcing request or confirm an order, verified activity will appear here automatically.');
 }else{
  set('buyerOverviewAnalyticsTitle','Your account activity is up to date');
  set('buyerOverviewAnalyticsText',total+' recorded transaction record(s): '+(requestsResult.count||0)+' sourcing request(s) and '+orders.length+' order(s). Values are based only on records returned for your signed-in account.');
 }
}
function init(){
 if(!$('buyerOverviewMetrics'))return;
 load().catch(e=>showError(e?.message||'Could not load your buyer activity.'));
 const auth=window.VTG_AUTH_READY;
 Promise.resolve(auth).then(x=>{if(x?.client?.auth?.onAuthStateChange)x.client.auth.onAuthStateChange(()=>load().catch(e=>showError(e?.message||'Could not refresh buyer activity.')))}).catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();