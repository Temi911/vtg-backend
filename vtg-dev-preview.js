/* VTG DEV PREVIEW — TEMPORARY, development only. Lives on the dev/preview-access branch; never merge to main.
   Lets the buyer, supplier and bank dashboards open WITHOUT signing in, backed by an in-browser mock of Supabase with
   sample data. Nothing is read from or written to a real database. It only activates on localhost, or on a Vercel
   branch-preview host for the dev-preview branch, and only with ?devpreview=1 (remembered for the tab).
   To restore normal behaviour: delete this file and the <script> line that loads it in the three dashboard pages. */
(function () {
  'use strict';
  var h = location.hostname;
  var hostOk = h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /^vtg-backended-git-dev-pr[a-z0-9-]*-olanrewajutope80-7999s-projects\.vercel\.app$/i.test(h);
  if (!hostOk) return;
  try {
    if (new URLSearchParams(location.search).get('devpreview') === '1') sessionStorage.setItem('vtg-dev-preview', '1');
    if (sessionStorage.getItem('vtg-dev-preview') !== '1') return;
  } catch (e) { return; }

  var path = location.pathname;
  var role = document.documentElement.getAttribute('data-vtg-role') ||
    (/bank-trade-os/.test(path) ? 'bank' : /supplier-dashboard/.test(path) ? 'supplier' : 'buyer');
  var uid = '00000000-0000-4000-8000-0000000000' + (role === 'bank' ? '02' : role === 'supplier' ? '03' : '01');
  var names = { buyer: 'Amaka Obi', supplier: 'Li Wei (Preview)', bank: 'Preview Officer' };
  var user = { id: uid, email: role + '-preview@example.com', user_metadata: { full_name: names[role] }, app_metadata: {}, identities: [] };
  var session = { access_token: 'dev-preview', refresh_token: 'dev-preview', user: user, expires_at: 4102444800 };
  var profile = { id: uid, email: user.email, full_name: names[role], phone: '', role: role, account_environment: 'trade', is_active: true,
    preferred_language: 'en', country: role === 'supplier' ? 'China' : 'Nigeria', city: role === 'supplier' ? 'Shenzhen' : 'Lagos', company_name: 'Preview Co', vtg_user_id: 'VTG-PREVIEW' };

  var iso = function (d) { return new Date(Date.now() + d * 864e5).toISOString(); };
  var day = function (d) { return iso(d).slice(0, 10); };
  /* ---- sample bank workspace (the review action below really changes it in memory) ---- */
  var bank = {
    bank: { bank_name: 'Preview Bank Plc', branch_name: 'Lagos Trade Finance', swift_code: 'PREVNGLA', officer_name: 'Preview Officer', officer_title: 'Trade finance officer', verification_status: 'verified', verified_at: iso(-60), preferred_language: 'en' },
    cases: [
      { id: 'lc-1', reference: 'LC-261118-A1B2C3', amount: 48200, currency: 'USD', status: 'requested', expiry_date: day(45), created_at: iso(-3), updated_at: iso(-3), order_id: 'o-1', order_reference: 'ORD-2041', order_status: 'confirmed', quantity: 120, unit_price: 400, order_currency: 'USD', incoterm: 'FOB', origin_port: 'Nansha', destination_port: 'Tin Can Island', buyer_name: 'Obi Trading Ltd', buyer_country: 'Nigeria', buyer_kyc: 'verified', supplier_name: 'Shenzhen Supply Co.', supplier_country: 'China', supplier_verification: 'verified', beneficiary_name: 'Shenzhen Supply Co.', preferred_lc_type: 'Irrevocable at sight', goods_summary: '5 kW solar inverters, 120 units', latest_shipment_date: day(30), supporting_notes: 'Partial shipment not allowed.' },
      { id: 'lc-2', reference: 'LC-261112-D4E5F6', amount: 15000, currency: 'USD', status: 'documents_requested', expiry_date: day(9), created_at: iso(-8), updated_at: iso(-8), order_id: 'o-2', order_reference: 'ORD-2036', order_status: 'shipped', quantity: 500, unit_price: 30, order_currency: 'USD', incoterm: 'CIF', origin_port: 'Busan', destination_port: 'Apapa', buyer_name: 'Lagos Auto Parts', buyer_country: 'Nigeria', buyer_kyc: 'pending', supplier_name: 'Busan Motors Ltd', supplier_country: 'South Korea', supplier_verification: 'verified', beneficiary_name: 'Busan Motors Ltd', preferred_lc_type: 'Irrevocable', goods_summary: 'Brake pads and filters', latest_shipment_date: day(5), supporting_notes: '' },
      { id: 'lc-3', reference: 'LC-261101-G7H8I9', amount: 92000, currency: 'USD', status: 'under_review', expiry_date: day(80), created_at: iso(-19), updated_at: iso(-4), order_id: 'o-3', order_reference: 'ORD-2019', order_status: 'in_production', quantity: 2, unit_price: 47000, order_currency: 'USD', incoterm: 'FOB', origin_port: 'Qingdao', destination_port: 'Tin Can Island', buyer_name: 'Kano Heavy Equipment', buyer_country: 'Nigeria', buyer_kyc: 'verified', supplier_name: 'HOPTOP Heavy Vehicles', supplier_country: 'China', supplier_verification: 'verified', beneficiary_name: 'HOPTOP Heavy Vehicles', preferred_lc_type: 'Irrevocable', goods_summary: 'Heavy-duty trucks, 2 units', latest_shipment_date: day(60), supporting_notes: 'Buyer will arrange inspection.' }
    ],
    documents: [
      { id: 'd-1', order_id: 'o-1', document_type: 'Proforma invoice', file_name: 'PI-2041.pdf', mime_type: 'application/pdf', file_size_bytes: 182000, status: 'pending', review_notes: null, storage_path: 'preview/PI-2041.pdf', created_at: iso(-2) },
      { id: 'd-2', order_id: 'o-3', document_type: 'Commercial invoice', file_name: 'CI-2019.pdf', mime_type: 'application/pdf', file_size_bytes: 240000, status: 'verified', review_notes: null, storage_path: 'preview/CI-2019.pdf', created_at: iso(-10) }
    ],
    shipments: [
      { id: 's-2', order_id: 'o-2', carrier: 'HMM', tracking_number: 'HMM-77821', container_number: 'HMMU4417783', origin_port: 'Busan', destination_port: 'Apapa', current_location: 'Indian Ocean', estimated_arrival: iso(12), progress_percent: 55, status: 'in_transit', created_at: iso(-14) }
    ],
    shipment_events: [
      { id: 'e-1', shipment_id: 's-2', event_type: 'departed', description: 'Vessel departed Busan', location: 'Busan', event_time: iso(-13) },
      { id: 'e-2', shipment_id: 's-2', event_type: 'transshipment', description: 'Transshipment at Singapore', location: 'Singapore', event_time: iso(-7) }
    ],
    payment_intents: [ { id: 'p-1', order_id: 'o-3', amount: 27600, currency: 'USD', purpose: 'deposit', status: 'pending', provider: 'paystack', created_at: iso(-5) } ],
    review_events: [ { id: 'r-1', lc_id: 'lc-2', status: 'documents_requested', note: 'Please upload the packing list and bill of lading draft.', created_at: iso(-8) },
                     { id: 'r-2', lc_id: 'lc-3', status: 'under_review', note: 'Reviewing deposit terms.', created_at: iso(-4) } ]
  };
  function bankOverview() { return JSON.parse(JSON.stringify(Object.assign({ generated_at: new Date().toISOString(), notice: 'DEV PREVIEW sample data. Nothing is saved to a real database.' }, bank))); }
  function reviewLc(a) {
    var c = bank.cases.filter(function (x) { return x.id === a.p_lc_id; })[0];
    if (!c) return { data: null, error: { message: 'LC request not found', code: 'P0002' } };
    c.status = a.p_status; c.updated_at = new Date().toISOString();
    bank.review_events.unshift({ id: 'r-' + Date.now(), lc_id: c.id, status: a.p_status, note: a.p_note || null, created_at: c.updated_at });
    return { data: null, error: null };
  }
  var rows = { profiles: [profile], supplier_profiles: [{ user_id: uid, company_name: 'Shenzhen Supply Co.', country: 'China', city: 'Shenzhen', verification_status: 'verified' }],
    buyer_profiles: [{ user_id: uid, company_name: 'Obi Trading Ltd', kyc_status: 'verified' }], bank_profiles: [{ user_id: uid, bank_name: 'Preview Bank Plc', verification_status: 'verified' }] };

  function builder(table) {
    var st = { ops: [], filters: {} };
    var res = function () {
      var single = st.ops.indexOf('single') > -1 || st.ops.indexOf('maybeSingle') > -1;
      var data = rows[table] ? rows[table].slice() : [];
      if (st.ops.some(function (o) { return ['insert', 'upsert', 'update'].indexOf(o) > -1; })) data = [{ id: 'preview-' + Date.now() }];
      return { data: single ? (data[0] || null) : data, error: null, count: data.length };
    };
    var p = new Proxy(function () {}, { get: function (_, k) {
      if (k === 'then') return function (a, b) { return Promise.resolve(res()).then(a, b); };
      return function () { st.ops.push(String(k)); return p; };
    } });
    return p;
  }
  var client = {
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: session }, error: null }); },
      getUser: function () { return Promise.resolve({ data: { user: user }, error: null }); },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
      signOut: function () { return Promise.resolve({ error: null }); },
      refreshSession: function () { return Promise.resolve({ data: { session: session }, error: null }); }
    },
    from: builder,
    rpc: function (name, args) {
      if (name === 'vtg_bank_workspace_overview') return Promise.resolve({ data: bankOverview(), error: null });
      if (name === 'vtg_bank_review_lc') return Promise.resolve(reviewLc(args || {}));
      if (name === 'vtg_get_agreement_status') return Promise.resolve({ data: { required: false }, error: null });
      return Promise.resolve({ data: [], error: null });
    },
    functions: { invoke: function () { return Promise.resolve({ data: { items: [], providers: {}, reply: 'Preview mode: the AI assistant is not connected.', answer: 'Preview mode.' }, error: null }); } },
    storage: { from: function () { return { upload: function (p) { return Promise.resolve({ data: { path: p }, error: null }); }, createSignedUrl: function () { return Promise.resolve({ data: { signedUrl: 'about:blank' }, error: null }); }, remove: function () { return Promise.resolve({ data: [], error: null }); } }; } },
    channel: function () { var c = { on: function () { return c; }, subscribe: function () { return c; } }; return c; },
    removeChannel: function () {}, removeAllChannels: function () {}
  };
  var fake = { createClient: function () { return client; } };
  try { Object.defineProperty(window, 'supabase', { configurable: true, get: function () { return fake; }, set: function () {} }); } catch (e) { window.supabase = fake; }
  /* never download the real supabase-js: swap it for an empty script so the auth bootstrap runs against the mock */
  try {
    var d = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    Object.defineProperty(HTMLScriptElement.prototype, 'src', { configurable: true, get: d.get, set: function (v) { d.set.call(this, /supabase-js/.test(String(v)) ? 'data:text/javascript,/*vtg-dev-preview*/' : v); } });
  } catch (e) {}
  try {
    localStorage.setItem('vtg-auth', JSON.stringify({ accessToken: 'dev-preview', user: { id: uid, role: role, accountEnvironment: 'trade', fullName: names[role], email: user.email, agreementRequired: false, pendingBusinessVerification: false } }));
    localStorage.setItem('vtg_access_token', 'dev-preview');
  } catch (e) {}
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('div');
    b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#b45309;color:#fff;font:700 12px/1.4 system-ui,sans-serif;padding:6px 12px;text-align:center;letter-spacing:.04em';
    b.textContent = 'DEV PREVIEW · ' + role.toUpperCase() + ' dashboard · signed in as a fake user · sample data only · nothing is saved';
    document.body.appendChild(b);
  });
  window.VTG_DEV_PREVIEW = true;
})();
