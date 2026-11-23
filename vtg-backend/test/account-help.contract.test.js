const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'account-help.html'),'utf8');
test('account help loads the Supabase auth bootstrap before waiting for it',()=>{
  const loader=html.indexOf('<script src="/vtg-supabase-auth.js?');
  const inline=html.indexOf('(async function(){');
  assert.notEqual(loader,-1,'Supabase auth bootstrap must be included');
  assert.ok(loader<inline,'auth bootstrap must execute before account-help logic');
  assert.match(html,/auth=await window\.VTG_AUTH_READY/);
  assert.match(html,/if\(!auth \|\| !auth\.client\) throw new Error/);
});
test('account help retains role-specific recovery and support actions',()=>{
  for(const role of ['buyer','supplier','bank','admin']) assert.ok(html.includes(role+':{'));
  for(const mode of ['forgot','code','trouble','contact','reset']) assert.ok(html.includes(mode+':{'));
  assert.match(html,/client\.auth\.resetPasswordForEmail/);
  assert.match(html,/client\.auth\.resend/);
  assert.match(html,/client\.functions\.invoke\('vtg-account-support'/);
  assert.match(html,/role==='admin'&&next!=='contact'/,'admin recovery remains restricted to contact');
});

test('account support Edge Function permits Supabase client preflight headers',()=>{
  const fn=fs.readFileSync(path.join(root,'supabase','functions','vtg-account-support','index.ts'),'utf8');
  assert.match(fn, /Access-Control-Allow-Headers[^\\n]*x-client-info/);
  assert.match(fn, /req\.method === "OPTIONS"/);
});
