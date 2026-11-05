(function(){
'use strict';
const $=id=>document.getElementById(id);
const money=(value,currency)=>new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD',maximumFractionDigits:0}).format(value);
function set(id,value){const el=$(id);if(el)el.textContent=value}
function renderActivity(orders,requests){
 const root=$('activity');if(!root)return;
 const entries=[...(orders||[]).map(row=>({title:'Order · '+String(row.status||'Recorded').replace(/_/g,' '),detail:'Order record',date:row.created_at})),...(requests||[]).map(row=>({title:'Sourcing request · '+String(row.product||'Request'),detail:'Request status: '+String(row.status||'submitted').replace(/_/g,' '),date:row.created_at}))].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,5);
 root.replaceChildren();
 if(!entries.length){const item=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p');title.textContent='No account activity yet';detail.textContent='Your real sourcing requests and orders will appear here when recorded.';item.append(title,detail);root.append(item);return;}
 entries.forEach(entry=>{const item=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p');title.textContent=entry.title;const date=entry.date?new Date(entry.date).toLocaleString():'Date not recorded';detail.textContent=entry.detail+' · '+date;item.append(title,detail);root.append(item);});
}
function showError(error){
 ['buyerMetricTransactions','buyerMetricValue','buyerMetricCompleted','statRfqs','statCart','statFeed','statVerify'].forEach(id=>set(id,'—'));
 set('buyerMetricTransactionsNote','Account data unavailable');
 set('buyerMetricValueNote','Could not verify order value');
 set('buyerMetricCompletedNote','Could not verify order status');
 set('buyerOverviewAnalyticsTitle','Account activity could not be loaded');
 set('buyerOverviewAnalyticsText',error||'Refresh the dashboard and try again.');
}
async function load(){
 const authReady=await window.VTG_AUTH_READY;
 if(!authReady?.client)throw new Error('Secure buyer sign-in is not ready. Please refresh the page.');
 const client=authReady.client;
 const {data:sessionData,error:sessionError}=await client.auth.getSession();
 if(sessionError)throw sessionError;
 const user=sessionData?.session?.user;
 if(!user)throw new Error('Sign in to view your account-linked overview.');
 const {data:profile,error:profileError}=await client.from('profiles').select('role,is_active').eq('id',user.id).single();
 if(profileError)throw profileError;
 if(profile?.role!=='buyer'||!profile?.is_active)throw new Error('An active buyer account is required to view this overview.');
 const [ordersResult,requestsResult,rfqResult,cartResult,suppliersResult,documentsResult]=await Promise.all([
  client.from('trade_orders').select('id,quantity,unit_price,currency,status,created_at').eq('buyer_id',user.id).order('created_at',{ascending:false}).limit(500),
  client.from('buyer_trade_requests').select('id,product,status,created_at',{count:'exact'}).eq('buyer_id',user.id).order('created_at',{ascending:false}).limit(100),
  client.from('buyer_rfq_drafts').select('id',{count:'exact',head:true}).eq('buyer_id',user.id),
  client.from('buyer_cart_states').select('items').eq('buyer_id',user.id).maybeSingle(),
  client.from('buyer_saved_suppliers').select('id',{count:'exact',head:true}).eq('buyer_id',user.id),
  client.from('trade_documents').select('id',{count:'exact',head:true}).eq('owner_id',user.id)
 ]);
 for(const result of [ordersResult,requestsResult,rfqResult,cartResult,suppliersResult,documentsResult])if(result.error)throw result.error;
 const orders=ordersResult.data||[];
 const requestRows=requestsResult.data||[];\n const requestCount=requestsResult.count||requestRows.length;
 const total=requestCount+orders.length;
 const completed=orders.filter(o=>['completed','delivered','closed'].includes(String(o.status||'').toLowerCase())).length;
 const currencyTotals={};
 orders.forEach(o=>{const currency=String(o.currency||'USD').toUpperCase();currencyTotals[currency]=(currencyTotals[currency]||0)+(Number(o.quantity)||0)*(Number(o.unit_price)||0)});
 const currencies=Object.keys(currencyTotals);
 let tradeValue='—',valueNote='No recorded orders yet';
 if(currencies.length===1){tradeValue=money(currencyTotals[currencies[0]],currencies[0]);valueNote='Recorded order value · '+currencies[0]}
 else if(currencies.length>1){tradeValue='Multiple';valueNote=currencies.map(currency=>currency+' '+currencyTotals[currency].toLocaleString('en-US',{maximumFractionDigits:0})).join(' · ')}
 const cartItems=cartResult.data?.items;
 const cartLines=Array.isArray(cartItems)?cartItems.length:(cartItems&&typeof cartItems==='object'?Object.keys(cartItems).length:0);
 set('buyerMetricTransactions',String(total));set('buyerMetricTransactionsNote',requestCount+' sourcing requests · '+orders.length+' orders');
 set('buyerMetricValue',tradeValue);set('buyerMetricValueNote',valueNote);
 set('buyerMetricCompleted',String(completed));set('buyerMetricCompletedNote','Of '+orders.length+' recorded orders');
 set('statRfqs',String(rfqResult.count||0));set('statCart',String(cartLines));
 set('statFeed',String(suppliersResult.count||0));set('statVerify',String(documentsResult.count||0));\n renderActivity(orders,requestRows);
 if(total===0){set('buyerOverviewAnalyticsTitle','No recorded transactions yet');set('buyerOverviewAnalyticsText','Your buyer account is connected. Once you submit a sourcing request or confirm an order, verified activity will appear here automatically.');}
 else{set('buyerOverviewAnalyticsTitle','Your account activity is up to date');set('buyerOverviewAnalyticsText',total+' recorded transaction record(s): '+requestCount+' sourcing request(s) and '+orders.length+' order(s). Values are based only on records returned for your signed-in account.');}
}
function init(){
 if(!$('buyerOverviewMetrics'))return;
 load().catch(e=>showError(e?.message||'Could not load your buyer activity.'));
 Promise.resolve(window.VTG_AUTH_READY).then(auth=>{if(auth?.client?.auth?.onAuthStateChange)auth.client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')load().catch(e=>showError(e?.message||'Could not refresh buyer activity.'));});}).catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();