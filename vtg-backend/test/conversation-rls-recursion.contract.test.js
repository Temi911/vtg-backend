const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20261123194000_vtg_conversation_rls_recursion_fix.sql'),
  'utf8'
);

test('conversation read policy no longer queries participant rows through RLS', () => {
  assert.match(migration, /drop policy if exists "conversation participants read" on public\.conversations/i);
  assert.match(migration, /create or replace function private\.vtg_is_conversation_member/i);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
  assert.match(migration, /from public\.conversation_participants cp/i);
  assert.match(migration, /revoke all on function private\.vtg_is_conversation_member\(uuid\) from public, anon/i);
  assert.match(migration, /grant execute on function private\.vtg_is_conversation_member\(uuid\) to authenticated/i);
});

test('conversation visibility preserves creator, active admin and participant access', () => {
  assert.match(migration, /created_by = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /private\.vtg_is_admin\(\)/i);
  assert.match(migration, /private\.vtg_is_conversation_member\(id\)/i);
  assert.doesNotMatch(migration, /create policy "conversation participants read"/i);
});
