const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('supplier catalogue insert has visible feedback and writes to the live Supabase products table', () => {
  const html = read('supplier-dashboard.html');
  const script = read('vtg-supplier-products-supabase.js');
  assert.match(html, /id="liveProductForm"/);
  assert.match(html, /id="liveProductFormNotice"/);
  assert.match(script, /db\.from\('products'\)\.insert\(payload\)\.select\('id'\)\.single\(\)/);
  assert.match(script, /function say\(message\)/);
  assert.match(script, /liveProductFormNotice/);
  assert.match(script, /catch\(error\)\{say\(error\.message/);
});

test('authenticated supplier inserts can resolve the private admin helper used by the review guard', () => {
  const migration = read('supabase/migrations/20261123185410_grant_authenticated_private_schema_usage.sql');
  assert.match(migration, /grant usage on schema private to authenticated/i);
  assert.doesNotMatch(migration, /grant usage on schema private to anon/i);
  assert.doesNotMatch(migration, /grant execute on all functions/i);
});

test('server-side workforce and inspection privileges are limited to service_role', () => {
  const migration = read('supabase/migrations/20261123185517_restore_edge_function_service_role_table_privileges.sql');
  for (const table of [
    'vtg_workforce_members',
    'vtg_workforce_invitations',
    'vtg_inspection_pricing',
    'vtg_inspection_requests',
  ]) {
    assert.match(migration, new RegExp('grant select, insert, update on public\\.' + table + ' to service_role', 'i'));
  }
  assert.match(migration, /grant select on public\.trade_orders to service_role/i);
  assert.match(migration, /grant update on public\.profiles to service_role/i);
  assert.match(migration, /grant insert on public\.audit_events to service_role/i);
  assert.doesNotMatch(migration, /to anon|to authenticated/i);
});

test('only an active call participant can leave or end a call', () => {
  const migration = read('supabase/migrations/20261123192102_restrict_call_leave_to_active_participants.sql');
  assert.match(migration, /from public\.vtg_call_participants[\s\S]*?call_id = p_call_id[\s\S]*?user_id = me[\s\S]*?left_at is null/i);
  assert.match(migration, /Only an active call participant can leave this call/);
  assert.match(migration, /using errcode = '42501'/i);
});

test('public marketplace visibility does not require public access to profile or Trade Feed tables', () => {
  const profilePolicy = read('supabase/migrations/20261123192339_fix_public_profile_policy_dependency_for_marketplace.sql');
  const marketplacePolicy = read('supabase/migrations/20261123192420_isolate_public_marketplace_supplier_visibility.sql');
  assert.match(profilePolicy, /private\.vtg_profile_has_public_trade_post/);
  assert.match(profilePolicy, /t\.is_published = true/);
  assert.match(marketplacePolicy, /private\.vtg_public_verified_supplier\(supplier_id\)/);
  assert.match(marketplacePolicy, /to anon[\s\S]*?using/i);
  assert.doesNotMatch(marketplacePolicy, /grant select on public\.(profiles|vtg_trade_posts) to anon/i);
  assert.match(marketplacePolicy, /create policy "public verified supplier profiles read"/i);
  assert.match(marketplacePolicy, /create policy "authenticated supplier profiles owner admin or verified"/i);
});

test('supplier and marketplace copy accurately distinguishes submitted products from approved listings', () => {
  const html = read('supplier-dashboard.html');
  const script = read('vtg-supplier-products-supabase.js');
  const marketplace = read('marketplace.html');
  assert.match(html, /VTG approves each product and completes supplier verification/);
  assert.match(script, /buyers see only products approved by VTG and backed by a verified supplier/);
  assert.match(marketplace, /VTG supplier catalogue · listings published after review/);
  assert.doesNotMatch(marketplace, /Thousands of products from verified suppliers/);
});
