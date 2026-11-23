/* VTG administrator dashboard — live data.
   Every number and row comes from staff-only Supabase RPCs (vtg_admin_*). The server rejects non-administrators,
   so this script only presents the data. Nothing here moves money, issues an LC or edits buyer, supplier or bank records;
   reviews call the existing review functions and every privileged change is written to the append-only audit trail. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var client = null, overview = null, cache = {};
  var EVENT = { product_review: 'Product review', verification_document_review: 'Verification document review', role_request_review: 'Role request review', admin_note: 'Staff note' };
  var ENTITY = { product: 'Marketplace', verification_document: 'Verification', role_request: 'Role requests', trade: 'Trade operations', finance: 'Finance', general: 'General' };

  function toast(msg) {
    var el = $('adminToast');
    if (!el) { el = document.createElement('div'); el.id = 'adminToast'; el.className = 'adminToast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show'); clearTimeout(window.__vtgAdminToast);
    window.__vtgAdminToast = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }
  function when(v) { try { return v ? new Date(v).toLocaleString() : '—'; } catch (_) { return '—'; } }
  function n(v) { return Number(v || 0); }
  function money(v, c) { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: c || 'USD' }).format(n(v)); } catch (_) { return (c || '') + ' ' + n(v).toLocaleString(); } }
  function pill(text, cls) { return '<span class="status ' + (cls || '') + '">' + esc(text) + '</span>'; }
  function empty(cols, msg) { return '<tr><td colspan="' + cols + '" class="emptyHint">' + esc(msg) + '</td></tr>'; }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function csv(rows) {
    return rows.map(function (r) { return r.map(function (c) { var s = String(c == null ? '' : c); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  }
  async function rpc(name, args) {
    var r = await client.rpc(name, args || {});
    if (r.error) { var e = new Error(r.error.code === '42501' ? 'This page is for VTG administrator accounts only.' : (r.error.message || 'Request failed')); e.code = r.error.code; throw e; }
    return r.data;
  }
  function fail(el, err, cols) {
    var msg = err && err.message ? err.message : 'Could not load this section.';
    if (el) el.innerHTML = cols ? empty(cols, msg) : '<div class="emptyHint">' + esc(msg) + '</div>';
  }

  /* ---------- review dialog (notes + rejections) ---------- */
  var dlg = { onConfirm: null };
  function openDialog(opts) {
    $('adminDialogTitle').textContent = opts.title; $('adminDialogDescription').textContent = opts.description || '';
    $('adminDialogLabel').textContent = opts.label || 'Note'; $('adminDialogNote').value = ''; $('adminDialogNote').required = !!opts.required;
    $('adminDialogConfirm').textContent = opts.confirm || 'Save'; $('adminDialogError').textContent = ''; dlg.onConfirm = opts.onConfirm; dlg.required = !!opts.required;
    var d = $('adminDialog'); d.hidden = false; d.style.display = 'flex'; $('adminDialogNote').focus();
  }
  function closeDialog() { var d = $('adminDialog'); d.hidden = true; d.style.display = 'none'; dlg.onConfirm = null; }
  function wireDialog() {
    $('adminDialogClose').onclick = closeDialog; $('adminDialogCancel').onclick = closeDialog;
    $('adminDialog').addEventListener('click', function (e) { if (e.target === $('adminDialog')) closeDialog(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('adminDialog').hidden) closeDialog(); });
    $('adminDialogConfirm').onclick = async function () {
      var note = $('adminDialogNote').value.trim();
      if (dlg.required && !note) { $('adminDialogError').textContent = 'A note is required.'; return; }
      var b = this; b.disabled = true;
      try { await dlg.onConfirm(note); closeDialog(); } catch (e) { $('adminDialogError').textContent = e.message || 'Could not save.'; } finally { b.disabled = false; }
    };
  }

  /* ---------- overview ---------- */
  function setStat(id, value, sub) { if ($(id)) $(id).textContent = value; if (sub != null && $(id + 'Sub')) $(id + 'Sub').textContent = sub; }
  async function loadOverview() {
    try {
      var o = overview = await rpc('vtg_admin_overview'), q = o.queues || {}, acc = o.accounts || {};
      var accounts = Object.keys(acc).reduce(function (s, k) { return s + n(acc[k]); }, 0);
      var open = n(q.products_pending) + n(q.verification_documents_pending) + n(q.role_requests_pending) + n(q.lc_new) + n(q.trade_documents_pending);
      var closed = ['completed', 'cancelled', 'draft', 'delivered'];
      var progress = Object.keys(o.orders_by_status || {}).reduce(function (s, k) { return closed.indexOf(k) > -1 ? s : s + n(o.orders_by_status[k]); }, 0);
      setStat('ovAccounts', accounts, Object.keys(acc).map(function (k) { return acc[k] + ' ' + k; }).join(' · ') || 'No active accounts');
      setStat('ovOpen', open, n(q.products_pending) + ' products · ' + n(q.verification_documents_pending) + ' verification docs · ' + n(q.role_requests_pending) + ' role requests · ' + n(q.lc_new) + ' new LC');
      setStat('ovProgress', progress, n(o.shipments_active) + ' active shipment(s)');
      setStat('ovExceptions', n(q.exceptions), n(q.high_priority) + ' high priority');
      var w = o.weekly || [], totals = w.map(function (d) { return n(d.orders) + n(d.lc_requests) + n(d.documents) + n(d.shipment_events) + n(d.admin_actions); }), max = Math.max.apply(null, totals.concat([1]));
      $('ovChart').innerHTML = w.length ? w.map(function (d, i) {
        return '<div class="barGroup" title="' + esc(d.date + ': ' + n(d.orders) + ' orders, ' + n(d.lc_requests) + ' LC requests, ' + n(d.documents) + ' documents, ' + n(d.shipment_events) + ' shipment updates, ' + n(d.admin_actions) + ' staff actions') + '"><div class="barStack"><div class="bar" style="height:' + Math.max(4, Math.round(totals[i] / max * 100)) + '%"></div></div><span>' + esc(d.day) + '</span></div>';
      }).join('') : '<div class="emptyHint">No activity yet.</div>';
      $('ovChartNote').textContent = 'Last 7 days: orders, LC requests, documents, shipment updates and staff actions. Updated ' + new Date(o.generated_at).toLocaleTimeString() + '.';
      var rows = o.recent || [];
      $('activityRows').innerHTML = rows.length ? rows.map(function (e) {
        var d = e.details || {}, ref = d.name || d.doc_type || d.reference || (e.entity_id ? String(e.entity_id).slice(0, 8) : '—');
        var state = d.to ? d.to : 'Recorded';
        return '<tr><td><strong>' + esc(EVENT[e.event_type] || e.event_type) + '</strong></td><td>' + esc(ENTITY[e.entity_type] || e.entity_type || '—') + '</td><td>' + esc(ref) + '</td><td>' + pill(state, state === 'rejected' ? 'review' : 'done') + '</td><td>' + esc(when(e.created_at)) + '</td></tr>';
      }).join('') : empty(5, 'No staff actions recorded yet. Reviews and notes will appear here.');
      renderNotifications(q);
      renderWorkforce(o);
    } catch (e) { ['ovAccounts', 'ovOpen', 'ovProgress', 'ovExceptions'].forEach(function (id) { setStat(id, '—'); }); fail($('activityRows'), e, 5); $('ovChart').innerHTML = '<div class="emptyHint">' + esc(e.message) + '</div>'; }
  }
  function renderNotifications(q) {
    var items = [
      [q.verification_documents_pending, 'Verification documents waiting for review', 'verification'],
      [q.products_pending, 'Marketplace products waiting for review', null],
      [q.role_requests_pending, 'Role requests waiting for review', null],
      [q.lc_new, 'New LC requests sent to banks', 'trade'],
      [q.high_priority, 'High-priority trade exceptions', 'trade']
    ].filter(function (i) { return n(i[0]) > 0; });
    var box = $('notificationItems'); if (!box) return;
    box.innerHTML = items.length ? items.map(function (i) { return '<div class="notificationItem"><b>' + n(i[0]) + '</b><span>' + esc(i[1]) + '</span></div>'; }).join('') : '<div class="notificationItem"><b>All clear</b><span>No items are waiting for review.</span></div>';
    var dot = document.querySelector('#notificationBtn .notifDot'); if (dot) dot.style.display = items.length ? '' : 'none';
  }
  function renderWorkforce(o) {
    var w = o.workforce || {};
    setStat('wfMembers', n(w.active_members), 'Active staff assignments');
    setStat('wfInvites', n(w.pending_invitations), 'Invitations not yet accepted');
  }

  /* ---------- trade operations ---------- */
  async function loadTrade() {
    var body = $('tradeRows'); body.innerHTML = empty(7, 'Loading…');
    try {
      var rows = cache.trade = await rpc('vtg_admin_trade_exceptions'), o = overview || {};
      var active = ['confirmed', 'processing', 'in_production', 'shipped', 'in_transit', 'arrived', 'customs'].reduce(function (s, k) { return s + n((o.orders_by_status || {})[k]); }, 0);
      setStat('trOrders', active, 'Confirmed or later, not yet delivered');
      setStat('trShip', n(o.shipments_active), 'Not yet arrived');
      setStat('trExc', rows.length, rows.filter(function (r) { return r.priority === 'High'; }).length + ' high priority');
      setStat('trDocs', n((o.queues || {}).trade_documents_pending), 'Order documents pending review');
      renderTrade();
    } catch (e) { fail(body, e, 7); }
  }
  function renderTrade() {
    var q = ($('tradeSearch').value || '').toLowerCase(), rows = (cache.trade || []).filter(function (r) { return !q || JSON.stringify(r).toLowerCase().indexOf(q) > -1; });
    $('tradeRows').innerHTML = rows.length ? rows.map(function (r, i) {
      return '<tr><td><strong>' + esc(r.reference) + '</strong></td><td>' + esc(r.stage) + '</td><td>' + esc(r.corridor) + '</td><td>' + esc(r.issue) + '</td><td>' + pill(r.priority, r.priority === 'High' ? 'review' : '') + '</td><td>' + esc(r.next_step) + '</td><td><button class="btn" type="button" data-trade-note="' + i + '">Add note</button></td></tr>';
    }).join('') : empty(7, (cache.trade || []).length ? 'No exceptions match this filter.' : 'No exceptions. Orders, LCs, shipments and documents are on track.');
    $('tradeRows').querySelectorAll('[data-trade-note]').forEach(function (b) {
      b.onclick = function () {
        var r = rows[Number(b.getAttribute('data-trade-note'))];
        openDialog({ title: r.reference + ' · ' + r.stage, description: r.issue + '. The note goes to the audit trail with your name and the time. It does not change the record.', label: 'Staff note', required: true, confirm: 'Save note',
          onConfirm: async function (note) { await rpc('vtg_admin_record_note', { p_reference: r.reference, p_kind: 'trade', p_note: note, p_entity_id: r.entity_id }); toast('Note saved to the audit trail.'); loadOverview(); } });
      };
    });
  }

  /* ---------- verification ---------- */
  async function loadSupplierVerificationRequests() {
    var body = $('supplierVerificationRows');
    if (!body) return;
    body.innerHTML = empty(6, 'Loading supplier verification requests…');
    try {
      var q = await client.from('vtg_supplier_verification_requests')
        .select('id,supplier_id,requested_level,applicant_note,status,submitted_at,decision_summary')
        .in('status', ['submitted','under_review'])
        .order('submitted_at', { ascending: true });
      if (q.error) throw q.error;
      var requests = q.data || [];
      $('supplierVerificationCount').textContent = requests.length + ' open request(s)';
      if (!requests.length) {
        body.innerHTML = empty(6, 'No supplier verification level requests are waiting.');
        return;
      }
      var ids = requests.map(function (r) { return r.supplier_id; });
      var pair = await Promise.all([
        client.from('profiles').select('id,full_name,email').in('id', ids),
        client.from('supplier_profiles').select('user_id,company_name,country,verification_level').in('user_id', ids)
      ]);
      if (pair[0].error) throw pair[0].error;
      if (pair[1].error) throw pair[1].error;
      var profiles = Object.fromEntries((pair[0].data || []).map(function (p) { return [p.id,p]; }));
      var companies = Object.fromEntries((pair[1].data || []).map(function (p) { return [p.user_id,p]; }));
      var levels = [
        ['registered_business','Registered Business'],
        ['vtg_verified','VTG Verified'],
        ['production_verified','Production Verified'],
        ['trade_performance_reviewed','Trade Performance Reviewed']
      ];
      var rank = function (level) { return levels.findIndex(function (x) { return x[0] === level; }); };
      body.innerHTML = requests.map(function (r) {
        var p = profiles[r.supplier_id] || {}, c = companies[r.supplier_id] || {};
        var options = levels.filter(function (x) { return rank(x[0]) <= rank(r.requested_level); })
          .map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + '</option>'; }).join('');
        return '<tr><td><strong>' + esc(c.company_name || p.full_name || 'Supplier') + '</strong><span class="muted" style="display:block">' + esc(p.email || '') + '</span><span class="muted">' + esc(c.country || '') + '</span></td>' +
          '<td>' + esc(levels.find(function (x) { return x[0] === r.requested_level; })?.[1] || r.requested_level) + '<div style="margin-top:4px">' + pill(r.status.replace(/_/g,' '), r.status === 'under_review' ? 'review' : 'warn') + '</div></td>' +
          '<td>' + esc(r.applicant_note || '—') + '</td><td>' + esc(when(r.submitted_at)) + '</td>' +
          '<td><select class="control" data-sv-level="' + esc(r.id) + '">' + options + '</select></td>' +
          '<td style="white-space:nowrap"><button class="btn" type="button" data-sv-start="' + esc(r.id) + '">Start review</button> <button class="btn primary" type="button" data-sv-approve="' + esc(r.id) + '">Approve</button> <button class="btn" type="button" data-sv-reject="' + esc(r.id) + '">Reject</button></td></tr>';
      }).join('');
      body.querySelectorAll('[data-sv-start]').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-sv-start');
          openDialog({ title: 'Start supplier verification review', description: 'This moves the request into the review queue. It does not award a verification badge.', label: 'Internal reviewer note (optional)', confirm: 'Start review',
            onConfirm: async function (note) {
              await rpc('vtg_review_supplier_verification', { p_request_id: id, p_decision: 'under_review', p_reviewer_notes: note || null });
              toast('Supplier verification review started.'); refreshAll();
            } });
        };
      });
      body.querySelectorAll('[data-sv-approve]').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-sv-approve'), select = body.querySelector('[data-sv-level="' + id + '"]');
          var selected = select ? select.value : null;
          openDialog({ title: 'Approve supplier verification', description: 'The database will check that all evidence required for the selected level has already been marked verified. A higher level cannot be awarded than the supplier requested.', label: 'Decision summary visible to supplier (optional)', confirm: 'Approve level',
            onConfirm: async function (note) {
              await rpc('vtg_review_supplier_verification', { p_request_id: id, p_decision: 'approved', p_awarded_level: selected, p_decision_summary: note || null });
              toast('Supplier verification level awarded.'); refreshAll();
            } });
        };
      });
      body.querySelectorAll('[data-sv-reject]').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-sv-reject');
          openDialog({ title: 'Reject supplier verification request', description: 'The supplier will see this decision summary and can submit a new request after correcting the evidence.', label: 'Reason / correction summary for supplier', required: true, confirm: 'Reject request',
            onConfirm: async function (note) {
              await rpc('vtg_review_supplier_verification', { p_request_id: id, p_decision: 'rejected', p_decision_summary: note, p_reviewer_notes: note });
              toast('Supplier verification request rejected with a correction summary.'); refreshAll();
            } });
        };
      });
    } catch (e) {
      body.innerHTML = empty(6, e.message || 'Could not load supplier verification requests.');
      $('supplierVerificationCount').textContent = 'Unavailable';
    }
  }

  async function loadVerification() {
    var body = $('verifRows'), roles = $('roleReqRows'); body.innerHTML = empty(7, 'Loading…');
    try {
      var d = cache.verif = await rpc('vtg_admin_verification_queue');
      $('verifCount').textContent = (d.documents || []).length + ' document(s) · ' + (d.role_requests || []).length + ' role request(s)';
      await loadSupplierVerificationRequests();
      body.innerHTML = (d.documents || []).length ? d.documents.map(function (x, i) {
        return '<tr><td><strong>' + esc(x.submitted_by || 'Account') + '</strong><span class="muted" style="display:block">' + esc(x.email || '') + '</span></td><td>' + esc(x.account_role) + '</td><td>' + esc(String(x.doc_type).replace(/_/g, ' ')) + '</td><td>' + esc(x.file_name) + '</td><td>' + esc(when(x.uploaded_at)) + '</td><td>' + pill('Needs review', 'review') + '</td>' +
          '<td style="white-space:nowrap"><button class="btn" type="button" data-v-open="' + i + '">Open file</button> <button class="btn primary" type="button" data-v-ok="' + i + '">Verify</button> <button class="btn" type="button" data-v-no="' + i + '">Reject</button></td></tr>';
      }).join('') : empty(7, 'No verification documents are waiting. New uploads appear here.');
      roles.innerHTML = (d.role_requests || []).length ? d.role_requests.map(function (r) {
        return '<tr><td><strong>' + esc(r.submitted_by || 'Account') + '</strong></td><td>' + esc(r.requested_role) + '</td><td>' + esc(r.organization_name || '—') + '</td><td>' + esc(r.country || '—') + '</td><td>' + esc(when(r.created_at)) + '</td><td><a class="btn" href="/admin-role-requests.html">Review</a></td></tr>';
      }).join('') : empty(6, 'No role requests are waiting.');
      body.querySelectorAll('[data-v-open]').forEach(function (b) { b.onclick = async function () {
        var x = d.documents[Number(b.getAttribute('data-v-open'))], u = await client.storage.from('vtg-verification-documents').createSignedUrl(x.storage_path, 60);
        if (u.error || !u.data) { toast('Could not open this file.'); return; } window.open(u.data.signedUrl, '_blank', 'noopener');
      }; });
      body.querySelectorAll('[data-v-ok]').forEach(function (b) { b.onclick = function () {
        var x = d.documents[Number(b.getAttribute('data-v-ok'))];
        openDialog({ title: 'Verify ' + String(x.doc_type).replace(/_/g, ' '), description: 'You are confirming this document from ' + (x.submitted_by || 'the account') + ' is genuine and complete. When every required document is verified the account becomes verified.', label: 'Note (optional)', confirm: 'Verify document',
          onConfirm: async function (note) { await rpc('vtg_admin_review_verification_document', { p_document_id: x.id, p_status: 'verified', p_notes: note || null }); toast('Document verified and recorded in the audit trail.'); refreshAll(); } });
      }; });
      body.querySelectorAll('[data-v-no]').forEach(function (b) { b.onclick = function () {
        var x = d.documents[Number(b.getAttribute('data-v-no'))];
        openDialog({ title: 'Reject ' + String(x.doc_type).replace(/_/g, ' '), description: 'The applicant sees your note and can upload a corrected document.', label: 'What needs to be corrected', required: true, confirm: 'Reject document',
          onConfirm: async function (note) { await rpc('vtg_admin_review_verification_document', { p_document_id: x.id, p_status: 'rejected', p_notes: note }); toast('Document rejected. The applicant has been told what to fix.'); refreshAll(); } });
      }; });
    } catch (e) { fail(body, e, 7); roles.innerHTML = ''; }
  }

  /* ---------- finance (read-only) ---------- */
  async function loadFinance() {
    var body = $('payRows'); body.innerHTML = empty(6, 'Loading…');
    try {
      var f = cache.fin = await rpc('vtg_admin_finance_overview');
      var records = (f.by_status || []).reduce(function (s, r) { return s + n(r.records); }, 0);
      setStat('fnRecords', records, 'Payment records on VTG');
      setStat('fnFlags', (f.flags || []).length, 'Need a reconciliation check');
      $('fnStatus').innerHTML = (f.by_status || []).length ? f.by_status.map(function (r) { return '<tr><td>' + esc(r.status) + '</td><td>' + esc(r.currency) + '</td><td>' + n(r.records) + '</td><td>' + esc(money(r.total, r.currency)) + '</td></tr>'; }).join('') : empty(4, 'No payment records yet.');
      $('fnFlagRows').innerHTML = (f.flags || []).length ? f.flags.map(function (r) { return '<tr><td><strong>' + esc(r.order_reference) + '</strong></td><td>' + esc(r.issue) + '</td><td>' + esc(money(r.amount, r.currency)) + '</td><td>' + esc(r.age_days) + ' day(s)</td><td>' + pill(r.status, 'review') + '</td></tr>'; }).join('') : empty(5, 'No payment records need attention.');
      body.innerHTML = (f.recent || []).length ? f.recent.map(function (r) { return '<tr><td><strong>' + esc(r.order_reference) + '</strong></td><td>' + esc(r.purpose || '—') + '</td><td>' + esc(money(r.amount, r.currency)) + '</td><td>' + esc(r.provider || '—') + '</td><td>' + pill(r.status) + '</td><td>' + esc(when(r.created_at)) + '</td></tr>'; }).join('') : empty(6, 'No payment records yet.');
    } catch (e) { fail(body, e, 6); }
  }

  /* ---------- reports & audit ---------- */
  async function loadAudit() {
    var body = $('auditRows'); body.innerHTML = empty(5, 'Loading…');
    try {
      var rows = cache.audit = await rpc('vtg_admin_audit_list', { p_limit: 200, p_search: $('auditSearch').value.trim() || null });
      $('auditCount').textContent = rows.length + ' event(s) · server-side, append-only';
      body.innerHTML = rows.length ? rows.map(function (e) {
        var d = e.details || {}, what = [d.name || d.doc_type || d.reference || '', d.from && d.to ? d.from + ' → ' + d.to : '', d.note || d.notes || ''].filter(Boolean).join(' · ');
        return '<tr><td>' + esc(when(e.created_at)) + '</td><td>' + esc(e.actor) + '</td><td>' + esc(EVENT[e.event_type] || e.event_type) + '</td><td>' + esc(ENTITY[e.entity_type] || e.entity_type || '—') + '</td><td>' + esc(what || '—') + '</td></tr>';
      }).join('') : empty(5, 'No audit events match.');
    } catch (e) { fail(body, e, 5); }
  }

  /* ---------- settings (read-only facts) ---------- */
  async function loadSettings() {
    try {
      var s = cache.settings = await rpc('vtg_admin_settings_snapshot');
      setStat('stAdmins', n(s.administrators), 'Active administrator account(s)');
      setStat('stAudit', n(s.audit_events_total), 'Events in the audit trail');
      var kv = function (obj) { var k = Object.keys(obj || {}); return k.length ? k.map(function (x) { return '<tr><td>' + esc(x) + '</td><td>' + n(obj[x]) + '</td></tr>'; }).join('') : empty(2, 'None yet'); };
      $('stProducts').innerHTML = kv(s.products_by_review); $('stVerif').innerHTML = kv(s.verification_by_status);
      $('stRoles').innerHTML = kv(s.role_requests_by_status); $('stInvites').innerHTML = kv(s.invitations_by_status);
      $('stWorkforce').innerHTML = (s.workforce_by_role || []).length ? s.workforce_by_role.map(function (w) { return '<tr><td>' + esc(w.workspace_role) + '</td><td>' + esc(w.status) + '</td><td>' + n(w.members) + '</td></tr>'; }).join('') : empty(3, 'No staff assignments yet.');
      var checks = $('controlChecks');
      if (checks) checks.innerHTML = [
        ['Role separation', 'Customer and staff entry points are separate; every admin function checks the role on the server.', 'Active'],
        ['Audit trail', 'Reviews and notes are recorded server-side and cannot be edited or deleted.', n(s.audit_events_total) + ' event(s)'],
        ['Staff permissions', 'Administrator accounts are managed in the database, not from this page.', n(s.administrators) + ' admin(s)']
      ].map(function (c) { return '<div class="healthRow"><div class="healthText"><b>' + esc(c[0]) + '</b><span>' + esc(c[1]) + '</span></div><span class="pill">' + esc(c[2]) + '</span></div>'; }).join('');
    } catch (e) { setStat('stAdmins', '—'); setStat('stAudit', '—'); }
  }

  function refreshAll() { return Promise.all([loadOverview().then(loadTrade), loadVerification(), loadFinance(), loadAudit(), loadSettings()]); }

  function wire() {
    wireDialog();
    $('tradeSearch').addEventListener('input', renderTrade);
    $('exportTradeExceptions').onclick = function () {
      var rows = cache.trade || []; if (!rows.length) { toast('Nothing to export.'); return; }
      download('vtg-trade-exceptions-' + new Date().toISOString().slice(0, 10) + '.csv', csv([['Reference', 'Stage', 'Corridor', 'Issue', 'Priority', 'Next step']].concat(rows.map(function (r) { return [r.reference, r.stage, r.corridor, r.issue, r.priority, r.next_step]; }))), 'text/csv');
    };
    $('exportFinanceQueues').onclick = function () {
      var f = cache.fin; if (!f) { toast('Nothing to export.'); return; }
      download('vtg-payment-records-' + new Date().toISOString().slice(0, 10) + '.csv', csv([['Order', 'Purpose', 'Amount', 'Currency', 'Provider', 'Status', 'Created']].concat((f.recent || []).map(function (r) { return [r.order_reference, r.purpose, r.amount, r.currency, r.provider, r.status, r.created_at]; }))), 'text/csv');
    };
    $('exportAuditLog').onclick = function () {
      var rows = cache.audit || []; if (!rows.length) { toast('Nothing to export.'); return; }
      download('vtg-audit-' + new Date().toISOString().slice(0, 10) + '.csv', csv([['Time', 'Actor', 'Event', 'Area', 'Details']].concat(rows.map(function (e) { return [e.created_at, e.actor, e.event_type, e.entity_type, JSON.stringify(e.details || {})]; }))), 'text/csv');
    };
    $('exportAdminSettings').onclick = function () { if (!cache.settings) { toast('Nothing to export.'); return; } download('vtg-platform-snapshot.json', JSON.stringify(cache.settings, null, 2)); };
    $('auditSearch').addEventListener('input', function () { clearTimeout(window.__auditT); window.__auditT = setTimeout(loadAudit, 300); });
    $('refreshAudit').onclick = loadAudit; $('refreshOverview').onclick = function () { refreshAll().then(function () { toast('Updated.'); }); };
    $('noteForm').addEventListener('submit', async function (ev) {
      ev.preventDefault(); var f = ev.currentTarget.elements, b = ev.currentTarget.querySelector('button[type=submit]'); b.disabled = true;
      try { await rpc('vtg_admin_record_note', { p_reference: f.reference.value, p_kind: f.kind.value, p_note: f.note.value }); f.note.value = ''; f.reference.value = ''; toast('Note saved to the audit trail.'); loadAudit(); loadOverview(); }
      catch (e) { toast(e.message || 'Could not save the note.'); } finally { b.disabled = false; }
    });
  }

  async function init() {
    var auth; try { auth = await window.VTG_AUTH_READY; } catch (_) {}
    client = (auth && auth.client) || window.VTG_SUPABASE;
    var bad = function (msg) { document.querySelectorAll('.section').forEach(function (s) { s.hidden = true; }); var m = document.querySelector('main.content'); if (m) m.insertAdjacentHTML('afterbegin', '<div class="panel quickCard"><h3>Administrator access</h3><p>' + esc(msg) + '</p><a class="btn primary" href="/admin-signin.html?next=%2Fadmin-dashboard.html">Sign in as administrator</a></div>'); };
    if (!client) { bad('Secure sign-in is unavailable. Refresh and try again.'); return; }
    var s = await client.auth.getSession();
    if (!s.data || !s.data.session) { location.replace('/admin-signin.html?next=' + encodeURIComponent('/admin-dashboard.html')); return; }
    var p = await client.from('profiles').select('role,is_active,full_name').eq('id', s.data.session.user.id).maybeSingle();
    if (p.error || !p.data || p.data.role !== 'admin' || !p.data.is_active) { bad('This workspace is for active VTG administrator accounts.'); return; }
    wire(); refreshAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
