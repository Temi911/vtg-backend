const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read('supabase/migrations/20261114200000_vtg_google_signup_profile.sql');

test('Google profile RPC cannot grant roles and only accepts whitelisted fields',()=>{
 assert.match(sql,/security definer/);assert.match(sql,/set search_path = ''/);
 assert.match(sql,/revoke all on function public\.vtg_complete_google_profile\(jsonb\) from public, anon/);
 assert.match(sql,/grant execute on function public\.vtg_complete_google_profile\(jsonb\) to authenticated/);
 assert.doesNotMatch(sql,/update public\.profiles set[^;]*\brole\s*=/i,'must never write profiles.role');
 assert.match(sql,/want not in \('buyer','supplier','bank'\)/);
 assert.match(sql,/account_environment is distinct from 'trade'/);
 assert.match(sql,/insert into public\.role_requests/);
});
test('Google sign-in uses the already allow-listed callback URL and no secrets',()=>{
 const auth=read('vtg-supabase-auth.js');
 assert.match(auth,/redirectTo: location\.origin \+ '\/auth-callback\.html'/);
 assert.match(auth,/provider: 'google'/);
 assert.doesNotMatch(auth+read('vtg-google-auth.js')+read('complete-profile.html'),/service_role|client_secret/i);
});
test('older databases without the onboarding column cannot break sign-in',()=>{
 const auth=read('vtg-supabase-auth.js');
 assert.doesNotMatch(auth.match(/\.select\('id,email,full_name[^']*'\)/)[0],/onboarding_completed_at/);
 assert.match(auth,/if \(error\) return false;/);
});
test('the three sign-up pages offer Google; the sign-in page does not',()=>{
 const si=read('signin.html');assert.doesNotMatch(si,/data-vtg-google|vtg-google-auth/);
 for(const f of ['buyer-signup.html','supplier-signup.html','bank-signup.html']){
  const h=read(f);assert.match(h,/data-vtg-google/,f);assert.match(h,/vtg-google-auth\.js/,f);}
});
test('the callback page is a white logo loader, not the old black page',()=>{
 const h=read('auth-callback.html');
 assert.doesNotMatch(h,/#17191b|#202326/);assert.match(h,/vtg-loader\.css/);assert.match(h,/vtg-v-ring/);
 assert.match(h,/exchangeCodeForSession/);assert.match(h,/!existing&&code/);
});
test('every page loads the loader so Loading placeholders become the V',()=>{
 const missing=fs.readdirSync(root).filter(f=>f.endsWith('.html')).filter(f=>{const h=read(f);return h.includes('</head>')&&!h.includes('vtg-loader.js');});
 assert.deepEqual(missing,[]);
});
test('loader honours reduced motion',()=>{assert.match(read('vtg-loader.css'),/prefers-reduced-motion:reduce/);});
