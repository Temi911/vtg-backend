const PAYSTACK_API='https://api.paystack.co';

function configured(){return Boolean(process.env.PAYSTACK_SECRET_KEY);}
function requireConfig(){if(!configured())throw new Error('PAYSTACK_SECRET_KEY is not configured');}

async function request(path,options={}){
  requireConfig();
  const r=await fetch(PAYSTACK_API+path,{...options,headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY,'Content-Type':'application/json',...(options.headers||{})}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.status===false) throw new Error(data.message||'Paystack request failed');
  return data;
}

async function initialize({email,amountNgn,reference,callbackUrl,metadata}){
  return request('/transaction/initialize',{method:'POST',body:JSON.stringify({
    email,
    amount:String(Math.round(amountNgn*100)),
    currency:'NGN',
    reference,
    callback_url:callbackUrl,
    metadata:JSON.stringify(metadata||{})
  })});
}

async function verify(reference){return request('/transaction/verify/'+encodeURIComponent(reference));}

module.exports={configured,initialize,verify};
