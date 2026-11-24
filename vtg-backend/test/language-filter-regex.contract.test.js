const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const dir=path.join(__dirname,'..','..','supabase','migrations');
test('the latest language-filter migration uses single-backslash regex escapes',()=>{
  const files=fs.readdirSync(dir).filter(f=>fs.readFileSync(path.join(dir,f),'utf8').includes('create or replace function private.vtg_message_content_violation')).sort();
  const sql=fs.readFileSync(path.join(dir,files[files.length-1]),'utf8');
  assert.doesNotMatch(sql,/\\\\w|\\\\1/,'doubled backslashes make word-stem patterns unmatchable');
  for(const w of ['fuck\\w*','shit\\w*','kill\\w*','porn\\w*','nigg'])assert.ok(sql.includes(w),w);
  assert.match(sql,/foreach n in array/);
});
