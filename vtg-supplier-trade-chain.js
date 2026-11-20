/* VTG supplier: live shipments and order documents.
   Shipments -> rpc vtg_supplier_save_shipment (writes public.shipments + shipment_events; buyer and assigned bank are notified).
   Order documents -> private storage (vtg-trade-documents/<your id>/<order id>/...) + rpc vtg_supplier_add_order_document.
   Nothing here moves money or issues anything. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var BUCKET = 'vtg-trade-documents', MAX = 10 * 1024 * 1024, TYPES = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  var SHIP_ORDER_OK = ['confirmed', 'processing', 'in_production', 'shipped', 'in_transit', 'arrived', 'customs', 'delivered'];
  var STATUSES = [['booked', 'Booked'], ['departed', 'Departed'], ['in_transit', 'In transit'], ['arrived', 'Arrived at port'], ['customs', 'In customs'], ['delivered', 'Delivered']];
  var DOC_TYPES = ['Commercial invoice', 'Packing list', 'Bill of lading', 'Certificate of origin', 'Inspection certificate', 'Insurance certificate', 'Other'];
  var ctx = null, orders = [];

  async function context() {
    if (ctx) return ctx;
    var auth; try { auth = await window.VTG_AUTH_READY; } catch (_) { auth = { client: window.VTG_SUPABASE }; }
    var client = (auth && auth.client) || window.VTG_SUPABASE;
    if (!client) throw new Error('VTG secure sign-in service is unavailable. Refresh and try again.');
    var s = await client.auth.getSession(); if (s.error) throw s.error;
    if (!s.data.session) throw new Error('Sign in with your supplier account to use live shipments and documents.');
    var p = await client.from('profiles').select('role,is_active').eq('id', s.data.session.user.id).maybeSingle();
    if (p.error) throw p.error;
    if (!p.data || p.data.role !== 'supplier' || !p.data.is_active) throw new Error('An active supplier account is required.');
    ctx = { client: client, userId: s.data.session.user.id }; return ctx;
  }
  function panel(pageId, id, title, pill, bodyHtml) {
    var page = $(pageId); if (!page || $(id)) return null;
    var s = document.createElement('section'); s.className = 'panel'; s.id = id; s.style.marginBottom = '14px';
    s.innerHTML = '<div class="panel-head"><h2>' + esc(title) + '</h2><span class="pill">' + esc(pill) + '</span></div><div class="panel-body">' + bodyHtml + '</div>';
    var head = page.querySelector('.page-head'); if (head) head.after(s); else page.prepend(s);
    return s;
  }
  function say(el, msg, bad) { if (!el) return; el.textContent = msg || ''; el.hidden = !msg; el.className = 'notice' + (bad ? ' error' : ''); }
  function when(v) { try { return v ? new Date(v).toLocaleString() : ''; } catch (_) { return ''; } }
  async function loadOrders() {
    var c = await context();
    var r = await c.client.from('trade_orders').select('id,reference,status,origin_port,destination_port,created_at').eq('supplier_id', c.userId).order('created_at', { ascending: false }).limit(100);
    if (r.error) throw r.error;
    orders = r.data || []; return orders;
  }
  function orderOptions(onlyShippable) {
    var list = onlyShippable ? orders.filter(function (o) { return SHIP_ORDER_OK.indexOf(String(o.status)) > -1; }) : orders;
    return '<option value="">Select an order</option>' + list.map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.reference || 'Order') + ' · ' + esc(String(o.status || '').replace(/_/g, ' ')) + '</option>'; }).join('');
  }

  /* ---------- shipments ---------- */
  async function mountShipments() {
    var legacyBtn = $('newShipmentBtn'); if (legacyBtn) legacyBtn.style.display = 'none';
    var host = panel('page-logistics', 'liveShipments', 'Live shipments', 'Visible to buyer and bank',
      '<p class="subtext" style="margin:0 0 10px">Record a shipment on a confirmed order. The buyer and the bank assigned to that order see it straight away. Live vessel positions are not part of this form.</p>' +
      '<form id="liveShipForm"><div class="field-grid">' +
      '<div class="field"><label for="lsOrder">Order *</label><select id="lsOrder" name="order" required><option value="">Loading…</option></select></div>' +
      '<div class="field"><label for="lsStatus">Status *</label><select id="lsStatus" name="status">' + STATUSES.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="lsCarrier">Carrier</label><input id="lsCarrier" name="carrier" maxlength="120"></div>' +
      '<div class="field"><label for="lsTrack">Tracking / BL number</label><input id="lsTrack" name="tracking" maxlength="120"></div>' +
      '<div class="field"><label for="lsContainer">Container number</label><input id="lsContainer" name="container" maxlength="60"></div>' +
      '<div class="field"><label for="lsLoc">Current location</label><input id="lsLoc" name="location" maxlength="160"></div>' +
      '<div class="field"><label for="lsEta">Estimated arrival</label><input id="lsEta" name="eta" type="date"></div>' +
      '<div class="field"><label for="lsNote">Note for the buyer and bank</label><input id="lsNote" name="note" maxlength="400"></div>' +
      '</div><p class="notice" id="lsNotice" role="status" aria-live="polite" hidden></p><button class="btn primary" type="submit">Save shipment</button></form>' +
      '<div id="liveShipList" class="record-list" style="margin-top:14px"><div class="empty">Loading shipments…</div></div>');
    if (!host) return;
    var form = $('liveShipForm'), note = $('lsNotice'), editing = null;
    try { await loadOrders(); $('lsOrder').innerHTML = orderOptions(true); } catch (e) { $('lsOrder').innerHTML = '<option value="">Unavailable</option>'; say(note, e.message, true); }
    async function list() {
      var box = $('liveShipList');
      try {
        var c = await context(); var ids = orders.map(function (o) { return o.id; });
        if (!ids.length) { box.innerHTML = '<div class="empty">No orders yet. Shipments can be recorded once an order is confirmed.</div>'; return; }
        var r = await c.client.from('shipments').select('id,order_id,carrier,tracking_number,container_number,current_location,estimated_arrival,progress_percent,status,created_at').in('order_id', ids).order('created_at', { ascending: false }).limit(100);
        if (r.error) throw r.error;
        var byOrder = {}; orders.forEach(function (o) { byOrder[o.id] = o; });
        box.innerHTML = (r.data || []).length ? r.data.map(function (s) {
          var o = byOrder[s.order_id] || {};
          return '<article class="record"><div><strong>' + esc(o.reference || 'Order') + ' · ' + esc(String(s.status || '').replace(/_/g, ' ')) + '</strong><small>' + esc([s.carrier, s.tracking_number, s.container_number].filter(Boolean).join(' · ') || 'No carrier details yet') + '</small>' +
            '<small>' + esc(s.current_location || '') + (s.estimated_arrival ? ' · ETA ' + esc(when(s.estimated_arrival).split(',')[0]) : '') + ' · ' + Number(s.progress_percent || 0) + '%</small></div>' +
            '<button class="btn" type="button" data-ship-edit="' + esc(s.id) + '" data-order="' + esc(s.order_id) + '">Update status</button></article>';
        }).join('') : '<div class="empty">No shipments recorded yet.</div>';
        box.querySelectorAll('[data-ship-edit]').forEach(function (b) {
          b.onclick = function () { editing = b.getAttribute('data-ship-edit'); $('lsOrder').value = b.getAttribute('data-order'); $('lsOrder').disabled = true; say(note, 'Updating an existing shipment. Choose the new status and save.'); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
        });
      } catch (e) { box.innerHTML = '<div class="empty">Could not load shipments: ' + esc(e.message || 'unavailable') + '</div>'; }
    }
    form.addEventListener('submit', async function (ev) {
      ev.preventDefault(); var f = form.elements, btn = form.querySelector('button[type=submit]');
      if (!f.order.value) { say(note, 'Choose an order.', true); return; }
      btn.disabled = true; say(note, 'Saving…');
      try {
        var c = await context();
        var r = await c.client.rpc('vtg_supplier_save_shipment', {
          p_order_id: f.order.value, p_shipment_id: editing, p_carrier: f.carrier.value || null, p_tracking_number: f.tracking.value || null,
          p_container_number: f.container.value || null, p_current_location: f.location.value || null,
          p_estimated_arrival: f.eta.value ? new Date(f.eta.value + 'T12:00:00Z').toISOString() : null, p_status: f.status.value, p_note: f.note.value || null
        });
        if (r.error) throw r.error;
        say(note, 'Saved. The buyer and the assigned bank can now see this shipment.');
        form.reset(); editing = null; $('lsOrder').disabled = false; await loadOrders(); $('lsOrder').innerHTML = orderOptions(true); await list();
      } catch (e) { say(note, e.message || 'Could not save the shipment.', true); } finally { btn.disabled = false; }
    });
    list();
  }

  /* ---------- order documents ---------- */
  async function mountDocuments() {
    var host = panel('page-documents', 'liveOrderDocs', 'Send documents to an order', 'Buyer and bank can open',
      '<p class="subtext" style="margin:0 0 10px">Files go to a private folder. Only you, the buyer on the order and the bank assigned to it can open them. Do not upload passports, bank credentials or payment-card details.</p>' +
      '<form id="liveDocForm"><div class="field-grid">' +
      '<div class="field"><label for="odOrder">Order *</label><select id="odOrder" required><option value="">Loading…</option></select></div>' +
      '<div class="field"><label for="odType">Document type *</label><select id="odType">' + DOC_TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="odFile">File (PDF, JPEG, PNG or WEBP, up to 10 MB) *</label><input id="odFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required></div>' +
      '</div><p class="notice" id="odNotice" role="status" aria-live="polite" hidden></p><button class="btn primary" type="submit">Send document</button></form>' +
      '<div id="liveOrderDocList" class="record-list" style="margin-top:14px"><div class="empty">Loading documents…</div></div>');
    if (!host) return;
    var note = $('odNotice');
    try { if (!orders.length) await loadOrders(); $('odOrder').innerHTML = orderOptions(false); } catch (e) { $('odOrder').innerHTML = '<option value="">Unavailable</option>'; say(note, e.message, true); }
    async function list() {
      var box = $('liveOrderDocList');
      try {
        var c = await context(); var ids = orders.map(function (o) { return o.id; });
        if (!ids.length) { box.innerHTML = '<div class="empty">No orders yet.</div>'; return; }
        var r = await c.client.from('trade_documents').select('id,order_id,document_type,file_name,status,review_notes,storage_path,created_at,owner_id').in('order_id', ids).order('created_at', { ascending: false }).limit(100);
        if (r.error) throw r.error;
        var byOrder = {}; orders.forEach(function (o) { byOrder[o.id] = o; });
        box.innerHTML = (r.data || []).length ? r.data.map(function (d) {
          return '<article class="record"><div><strong>' + esc(d.document_type) + ' · ' + esc((byOrder[d.order_id] || {}).reference || 'Order') + '</strong><small>' + esc(d.file_name) + ' · ' + esc(when(d.created_at)) + ' · ' + esc(d.owner_id === c.userId ? 'sent by you' : 'from buyer') + ' · ' + esc(d.status || 'pending') + '</small></div>' +
            '<button class="btn" type="button" data-doc-open="' + esc(d.storage_path) + '">Open</button></article>';
        }).join('') : '<div class="empty">No order documents yet.</div>';
        box.querySelectorAll('[data-doc-open]').forEach(function (b) {
          b.onclick = async function () {
            var u = await c.client.storage.from(BUCKET).createSignedUrl(b.getAttribute('data-doc-open'), 60);
            if (u.error || !u.data) { say(note, 'Could not open this file.', true); return; }
            window.open(u.data.signedUrl, '_blank', 'noopener');
          };
        });
      } catch (e) { box.innerHTML = '<div class="empty">Could not load documents: ' + esc(e.message || 'unavailable') + '</div>'; }
    }
    $('liveDocForm').addEventListener('submit', async function (ev) {
      ev.preventDefault(); var file = $('odFile').files[0], orderId = $('odOrder').value, btn = ev.currentTarget.querySelector('button[type=submit]');
      if (!orderId) { say(note, 'Choose an order.', true); return; }
      if (!file || !TYPES[file.type]) { say(note, 'Only PDF, JPEG, PNG or WEBP files are accepted.', true); return; }
      if (file.size > MAX) { say(note, 'Files must be 10 MB or smaller.', true); return; }
      btn.disabled = true; say(note, 'Uploading…');
      try {
        var c = await context();
        var slug = file.name.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'document';
        var path = c.userId + '/' + orderId + '/' + Date.now() + '-' + slug + '.' + TYPES[file.type];
        var up = await c.client.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw up.error;
        var r = await c.client.rpc('vtg_supplier_add_order_document', { p_order_id: orderId, p_document_type: $('odType').value, p_storage_path: path, p_file_name: file.name, p_mime_type: file.type, p_file_size_bytes: file.size });
        if (r.error) { await c.client.storage.from(BUCKET).remove([path]); throw r.error; }
        say(note, 'Sent. The buyer and the assigned bank can open it.'); $('odFile').value = ''; await list();
      } catch (e) { say(note, e.message || 'Could not send the document.', true); } finally { btn.disabled = false; }
    });
    list();
  }

  function run() { mountShipments().catch(function () {}); mountDocuments().catch(function () {}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
