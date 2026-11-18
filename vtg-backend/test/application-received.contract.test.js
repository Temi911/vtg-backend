const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');
const rd=f=>fs.readFileSync(path.join(root,f),'utf8');
test('pending applicants are held on the application-received page, not the dashboard',()=>{
  assert.match(rd('signin.html'),/pendingBusinessVerification\s*\?\s*'\/application-received\.html\?role='/);
  const v=rd('verification.html');
  assert.ok(v.indexOf("/application-received.html?role=")<v.indexOf("location.replace('/supplier-dashboard.html#page-profile')"),'pending check must come before the dashboard redirect');
  assert.match(rd('supplier-dashboard.html'),/pendingBusinessVerification\)\{location\.replace\('\/application-received\.html\?role=supplier'\)/);
  assert.match(rd('bank-trade-os.html'),/pendingBusinessVerification\)\{location\.replace\('\/application-received\.html\?role=bank'\)/);
});
test('sign-up receipts explain verification, the email, and offer Back to home',()=>{
  for(const f of ['supplier-signup.html','bank-signup.html']){
    const h=rd(f);
    assert.match(h,/Back to home/);
    assert.match(h,/APPLICATION RECEIPT EMAIL SENT/);
    assert.match(h,/RECEIPT EMAIL NOT CONFIRMED/);
    assert.match(h,/If approved, your /);
    assert.match(h,/separate company-document verification process/);
    assert.match(h,/vtgReceiptContinue'\)\.onclick=\(\)=>\{location\.href='\/';\}/,f);
    assert.doesNotMatch(h,/onclick=\(\)=>\{location\.href='\/bank-trade-os\.html';\}/,f);
  }
});
test('application-received page shows the steps, a home button, and sends approved users to their dashboard',()=>{
  const h=rd('application-received.html');
  assert.match(h,/Back to home/);
  assert.match(h,/Check your email/);
  assert.match(h,/Approval email, then your dashboard opens/);
  assert.match(h,/supplier:'\/supplier-dashboard\.html'/);
});
