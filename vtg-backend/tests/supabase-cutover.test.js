'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const readRoot = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

test('account support inbox is private and only the server function can write requests', () => {
  const migration = readRoot('supabase/migrations/20261106110000_vtg_account_support_inbox.sql');
  const fn = readRoot('supabase/functions/vtg-account-support/index.ts');
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON public\.vtg_account_support_requests FROM anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON public\.vtg_account_support_requests TO service_role/i);
  assert.match(fn, /auth\.getUser/); // no account token is required for account-help; do not add an accidental auth gate
  assert.match(fn, /vtg_account_support_requests/);
  assert.match(fn, /password|verification code/i);
  assert.match(fn, /Too many requests/);
});

test('account help uses Supabase Auth for password recovery and signup verification', () => {
  const page = readRoot('account-help.html');
  assert.match(page, /resetPasswordForEmail/);
  assert.match(page, /auth\.updateUser/);
  assert.match(page, /auth\.resend/);
  assert.match(page, /functions\.invoke\('vtg-account-support'/);
  assert.doesNotMatch(page, /fetch\('\/api\/auth\/(forgot-password|reset-password|send-verification-code|account-support)/);
});

test('inspection staff APIs are routed to the authenticated Supabase workflow', () => {
  const config = JSON.parse(readRoot('vercel.json'));
  const agent = config.rewrites.find(x => x.source === '/api/agent/:path*');
  const queue = config.rewrites.find(x => x.source === '/api/inspections/requests/agent');
  assert.match(agent.destination, /supabase\.co\/functions\/v1\/vtg-inspection-workflow\/agent/);
  assert.match(queue.destination, /supabase\.co\/functions\/v1\/vtg-inspection-workflow\/requests\/agent/);
  const page = readRoot('agent-dashboard.html');
  assert.match(page, /uploadToSignedUrl/);
  assert.match(page, /vtg-inspection-workflow/);
  assert.doesNotMatch(page, /fetch\('\/api\/inspections\/requests\/'\+id\+'\/evidence'/);
});

test('inspection workflow scopes inspector queue and evidence to assigned workforce members', () => {
  const fn = readRoot('supabase/functions/vtg-inspection-workflow/index.ts');
  assert.match(fn, /profile\.account_environment===\"staff\"/);
  assert.match(fn, /workspace_role===\"agent\"/);
  assert.match(fn, /\.eq\("inspector_id",user\.id\)/);
  assert.match(fn, /Active inspector workspace membership required/);
  assert.match(fn, /evidence-upload/);
  assert.match(fn, /Uploaded evidence object was not found/);
});

test('notifications and shipment-event compatibility routes use authenticated Supabase functions', () => {
  const config = JSON.parse(readRoot('vercel.json'));
  const notifications = config.rewrites.find(x => x.source === '/api/notifications/:path*');
  const shipmentEvents = config.rewrites.find(x => x.source === '/api/shipment-events/:shipmentId');
  assert.match(notifications.destination, /functions\/v1\/vtg-notifications\/:path\*$/);
  assert.match(shipmentEvents.destination, /functions\/v1\/vtg-trade-operations\/shipments\/:shipmentId\/events$/);
  const notificationFn = readRoot('supabase/functions/vtg-notifications/index.ts');
  assert.match(notificationFn, /auth\.getUser/);
  assert.match(notificationFn, /eq\("user_id", user\.id\)/);
  assert.match(notificationFn, /pathMatch/);
});

test('inspection buyer lifecycle and Paystack routes are routed to Supabase Edge Functions', () => {
  const config = JSON.parse(readRoot('vercel.json'));
  const expected = new Map([
    ['/api/inspections/requests/:id/payment/initialize', 'vtg-inspection-payments/:id?action=initialize'],
    ['/api/inspections/payment/verify', 'vtg-inspection-payments?action=verify'],
    ['/api/webhooks/paystack', 'vtg-inspection-payments/webhook'],
    ['/api/inspections/admin/pricing', 'vtg-inspection-workflow/admin/pricing'],
    ['/api/inspections/requests', 'vtg-inspection-workflow/requests'],
    ['/api/inspections/quote', 'vtg-inspection-workflow/quote'],
    ['/api/inspections/mine', 'vtg-inspection-workflow/mine'],
    ['/api/inspections/pricing', 'vtg-inspection-workflow/pricing'],
  ]);
  for (const [source, destinationPart] of expected) {
    const route = config.rewrites.find(x => x.source === source);
    assert.ok(route, 'missing rewrite: ' + source);
    assert.ok(route.destination.includes(destinationPart), 'incorrect Supabase destination: ' + source);
  }
});

test('no API rewrite sends VTG traffic to Railway', () => {
  const config = JSON.parse(readRoot('vercel.json'));
  for (const route of config.rewrites.filter(x => x.source.startsWith('/api/'))) {
    assert.ok(route.destination.includes('lxrurbdzphqvkjprlfuv.supabase.co/functions/v1/'));
    assert.doesNotMatch(route.destination, /railway\.app/i);
  }
  const fallback = config.rewrites.find(x => x.source === '/api/:path*');
  assert.equal(fallback.destination, 'https://lxrurbdzphqvkjprlfuv.supabase.co/functions/v1/vtg-api/api/:path*');
});


test('Trade Feed routes and handlers use Supabase only', () => {
  const config = JSON.parse(readRoot('vercel.json'));
  const feed = config.rewrites.find(x => x.source === '/api/marketplace/:path*');
  const media = config.rewrites.find(x => x.source === '/api/media/feed/:postId');
  assert.ok(feed.destination.includes('functions/v1/vtg-marketplace/:path*'));
  assert.ok(media.destination.includes('functions/v1/vtg-marketplace/media/feed/:postId'));
  const fn = readRoot('supabase/functions/vtg-marketplace/index.ts');
  for (const fragment of ['path==="feed"', 'path==="feed/account"', 'path==="users/following"', 'const commentsMatch=path.match', 'const reactionMatch=path.match', 'const followMatch=path.match', 'const mediaMatch=path.match']) {
    assert.ok(fn.includes(fragment), 'missing Trade Feed handler: ' + fragment);
  }
  for (const table of ['vtg_trade_posts', 'vtg_trade_post_comments', 'vtg_trade_post_reactions', 'vtg_user_follows', 'vtg_trade_post_media']) assert.ok(fn.includes(table));
  assert.ok(fn.includes('from("profiles").select("id,full_name,role,country")'));
  assert.doesNotMatch(fn, /service_role|SUPABASE_SERVICE_ROLE_KEY/);
});

test('Trade Feed policies enforce public-only reads and role-gated publishing', () => {
  const publicReads = readRoot('supabase/migrations/20261118092633_harden_vtg_trade_feed_public_reads.sql');
  const roles = readRoot('supabase/migrations/20261118092545_harden_vtg_trade_feed_post_roles.sql');
  const constraints = readRoot('supabase/migrations/20261118092753_align_vtg_trade_post_constraints.sql');
  const cleanup = readRoot('supabase/migrations/20261118092840_scope_public_trade_profiles_and_remove_duplicate_index.sql');
  const profileRls = readRoot('supabase/migrations/20261118092959_trade_feed_profile_labels_rls_and_index_hardening.sql');
  const tradeScope = readRoot('supabase/migrations/20261118093130_harden_trade_feed_trade_environment_and_rls_initplan.sql');
  assert.ok(publicReads.includes('drop policy if exists "Signed-in members can read trade posts"'));
  assert.ok(roles.includes("post_type in ('advert','product') and p.role in ('supplier','admin')"));
  assert.ok(constraints.includes('<= 5000'));
  assert.ok(cleanup.includes('drop index if exists public.vtg_trade_post_comments_post_idx;'));
  assert.ok(profileRls.includes('grant select (id,full_name,role,country) on public.profiles to anon,authenticated;'));
  assert.ok(profileRls.includes('Public can read active Trade Feed author labels'));
  assert.ok(tradeScope.includes("account_environment='trade'"));
  assert.ok(tradeScope.includes('select auth.uid()'));
});


test('Trade Feed news routes are public Supabase reads, not Railway fallbacks', () => {
  const config = JSON.parse(readRoot('vercel.json'));
  for (const source of ['/api/market-intelligence/news', '/api/integrations/news']) {
    const route = config.rewrites.find(x => x.source === source);
    assert.ok(route, 'missing public news route: ' + source);
    assert.ok(route.destination.includes('functions/v1/vtg-market-intelligence/news'));
  }
  const fn = readRoot('supabase/functions/vtg-market-intelligence/index.ts');
  assert.ok(fn.includes('req.method==="GET" && routePath==="news"'));
  assert.ok(fn.includes('loadNews()'));
  assert.doesNotMatch(fn, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});
