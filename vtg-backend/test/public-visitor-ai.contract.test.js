const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {TOOLS}=require(path.join(root,'api/ai/_public-tools.js'));
const handler=require(path.join(root,'api/ai/public-tool.js'));

const call=(body,ip='9.9.9.9',method='POST')=>{
  let status=200,out;const res={setHeader(){},status(s){status=s;return res;},json(o){out=o;return res;}};
  handler({method,body,headers:{'x-forwarded-for':ip},socket:{}},res);return {status,out};
};

test('visitor tools compute correctly and reject bad input',()=>{
  const r=TOOLS.landed_cost({goods_subtotal:'10000',shipping:'800',insurance:'50',duty_percent:'20'});
  assert.equal(r.lines.at(-1)[1],12850);
  assert.ok(TOOLS.landed_cost({}).error);
  assert.ok(TOOLS.landed_cost({goods_subtotal:'-5'}).error);
  assert.match(TOOLS.incoterm({code:'FOB'}).title,/FOB/);
  assert.match(TOOLS.import_checklist({country:'Ghana'}).title,/Ghana/);
  assert.match(JSON.stringify(TOOLS.import_checklist({country:'Ghana'})),/customs agent/i);
});

test('public tool endpoint allowlists tools, rejects non-POST and prototype names',()=>{
  assert.equal(call({},'1.1.1.1','GET').status,405);
  assert.equal(call({tool:'constructor'},'1.1.1.2').status,400);
  assert.equal(call({tool:'toString'},'1.1.1.3').status,400);
  assert.equal(call({tool:'get_trade_status'},'1.1.1.4').status,400);
});

test('visitor gets a limited number of uses, then a sign-up invitation',()=>{
  const ip='2.2.2.2';let last;
  for(let i=0;i<handler.__test.LIMIT;i++){last=call({tool:'incoterm',args:{code:'CIF'}},ip);assert.equal(last.status,200);assert.equal(last.out.cta.href,'/signup.html');}
  assert.equal(last.out.uses_left,0);
  const over=call({tool:'incoterm',args:{code:'CIF'}},ip);
  assert.equal(over.status,429);assert.equal(over.out.error.code,'FREE_LIMIT_REACHED');assert.equal(over.out.cta.href,'/signup.html');
});

test('public tools and endpoint touch no account data',()=>{
  for(const f of ['api/ai/_public-tools.js','api/ai/public-tool.js']){
    const s=read(f);
    assert.doesNotMatch(s,/supabase|service_role|SERVICE_ROLE|process\.env/i,f);
  }
});

test('landing page loads the visitor AI and both bubbles follow the page theme',()=>{
  assert.match(read('frontend-v3.html'),/vtg-public-ai\.js\?v=/);
  const js=read('vtg-public-ai.js');
  assert.match(js,/var\(--white/);assert.match(js,/var\(--ink/);assert.match(js,/var\(--teal/);
  assert.match(js,/#vtgAiPublicLaunch/);assert.match(js,/\.vtgIntelTools \.vtgIntelTool/);
  assert.match(js,/\/api\/ai\/public-chat/);assert.match(js,/\/api\/ai\/public-tool/);
  assert.doesNotMatch(js,/innerHTML/);
  assert.doesNotMatch(read('vtg-interaction-recovery.js'),/#151316/);
});
