const express=require('express');
const crypto=require('crypto');
const nodemailer=require('nodemailer');

const router=express.Router();

const PATHWAY_META={
  'Trade & Commercial':{type:'Commercial partnership',team:'TRADE_PARTNERSHIP_EMAIL'},
  'Logistics & Shipping':{type:'Service / network partnership',team:'LOGISTICS_PARTNERSHIP_EMAIL'},
  'Finance & Payments':{type:'Financial / payment relationship',team:'FINANCE_PARTNERSHIP_EMAIL'},
  'Supply & Manufacturing':{type:'Supplier / manufacturing relationship',team:'SUPPLY_PARTNERSHIP_EMAIL'},
  'Technology':{type:'Technology integration',team:'TECHNOLOGY_PARTNERSHIP_EMAIL'},
  'Strategic & Institutional':{type:'Institutional / strategic collaboration',team:'STRATEGIC_PARTNERSHIP_EMAIL'}
};

function recipientFor(pathway){
  const meta=PATHWAY_META[pathway];
  return (meta&&process.env[meta.team])||process.env.PARTNERSHIP_TEAM_EMAIL||process.env.CONTACT_TEAM_EMAIL||process.env.SMTP_USER||process.env.SMTP_FROM;
}
function transporter(){
  if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),secure:String(process.env.SMTP_SECURE||'true')==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
}

router.post('/',async(req,res)=>{
  try{
    const b=req.body||{};
    const required=['organization','contact','email','country','countryCode','phoneNumber','pathway','offer','need'];
    const missing=required.filter(k=>!String(b[k]||'').trim());
    if(missing.length)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Please complete all required partnership fields.',fields:missing}});
    const meta=PATHWAY_META[b.pathway];
    if(!meta)return res.status(400).json({error:{code:'INVALID_PATHWAY',message:'Select a valid VTG partnership pathway.'}});
    const ref='VTG-P'+crypto.randomBytes(4).toString('hex').toUpperCase();
    const to=recipientFor(b.pathway);
    const from=process.env.SMTP_FROM||process.env.SMTP_USER;
    if(!to||!from)return res.status(503).json({error:{code:'EMAIL_NOT_CONFIGURED',message:'VTG partnership email delivery is not configured yet.'}});
    const phone=(b.countryCode+' '+b.phoneNumber).trim();
    const subject='VTG Partnership Proposal | '+b.pathway+' | '+ref;
    const text=[
      'VTG PARTNERSHIP PROPOSAL','Reference: '+ref,'',
      'Organization / company: '+b.organization,'Contact person: '+b.contact,'Work email: '+b.email,'Phone: '+phone,'Country / market: '+b.country,
      'Partnership pathway: '+b.pathway,'Partnership type: '+meta.type,'Markets supported: '+(b.markets||''),'',
      'What the organization can offer VTG:',b.offer,'',
      'What they want VTG to provide / help build:',b.need,'',
      'Additional context:',b.message||''
    ].join('\n');
    const t=transporter();
    if(!t)return res.status(503).json({error:{code:'EMAIL_NOT_CONFIGURED',message:'VTG SMTP delivery is not configured yet.'}});
    await t.sendMail({from,to,replyTo:b.email,subject,text});
    res.status(201).json({ok:true,reference:ref,pathway:b.pathway,partnershipType:meta.type,message:'Your partnership proposal has been submitted to VTG.'});
  }catch(err){
    console.error('VTG partnership submission failed:',err);
    res.status(500).json({error:{code:'DELIVERY_FAILED',message:'We could not deliver the partnership proposal right now. Please try again.'}});
  }
});
module.exports=router;
