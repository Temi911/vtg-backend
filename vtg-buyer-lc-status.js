/* VTG buyer: status and history of LC requests sent to a bank, with the next step the buyer can take.
   Read-only: the bank records review outcomes; nothing here issues an LC or moves money. */
(function () {
  'use strict';
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var LABEL = { requested: 'Sent to bank', under_review: 'Under review', documents_requested: 'Documents requested', declined: 'Declined' };
  var NEXT = {
    requested: 'Waiting for the bank to open your request.',
    under_review: 'The bank is reviewing your request. No action needed.',
    documents_requested: 'The bank needs more documents. Upload them in Documents, then message the bank.',
    declined: 'The bank declined this request. Review the note, adjust the draft and send it to another verified bank.'
  };
  function when(v) { try { return new Date(v).toLocaleString(); } catch (_) { return ''; } }
  async function run() {
    var page = document.getElementById('page-letter-credit'); if (!page || document.getElementById('liveLcStatus')) return;
    var auth; try { auth = await window.VTG_AUTH_READY; } catch (_) { return; }
    var c = auth && auth.client; if (!c) return;
    var s = await c.auth.getSession(); if (!s.data || !s.data.session) return;
    var sec = document.createElement('section'); sec.className = 'panel'; sec.id = 'liveLcStatus'; sec.style.marginTop = '14px';
    sec.innerHTML = '<div class="panelHead"><div><span class="eyebrow">BANK RESPONSE</span><h2 style="margin:7px 0 0">LC requests sent to banks</h2></div><button class="btn" id="refreshLcStatus" type="button">Refresh</button></div><div class="panelBody"><div id="liveLcStatusBody" class="recordList"><div class="empty">Loading…</div></div><p class="small muted">A review outcome is not an issued letter of credit. Issuance and funding stay with the bank.</p></div>';
    page.appendChild(sec);
    async function load() {
      var box = document.getElementById('liveLcStatusBody');
      try {
        var r = await c.from('letters_of_credit').select('id,reference,amount,currency,status,expiry_date,created_at,updated_at,order_id').eq('buyer_id', s.data.session.user.id).order('created_at', { ascending: false }).limit(50);
        if (r.error) throw r.error;
        var rows = r.data || [];
        if (!rows.length) { box.innerHTML = '<div class="empty">You have not sent an LC request to a bank yet. Save a draft above, then send it to a verified bank.</div>'; return; }
        var ev = await c.from('vtg_bank_lc_review_events').select('lc_id,status,note,created_at').in('lc_id', rows.map(function (x) { return x.id; })).order('created_at', { ascending: false });
        var byLc = {}; (ev.data || []).forEach(function (e) { (byLc[e.lc_id] = byLc[e.lc_id] || []).push(e); });
        box.innerHTML = rows.map(function (x) {
          var hist = byLc[x.id] || [], last = hist[0];
          return '<article class="record"><div><strong>' + esc(x.reference || 'LC request') + ' · ' + esc((x.currency || '') + ' ' + Number(x.amount || 0).toLocaleString()) + '</strong>' +
            '<small>' + esc(NEXT[x.status] || '') + '</small>' +
            (last && last.note ? '<p class="subtext"><strong>Bank note:</strong> ' + esc(last.note) + '</p>' : '') +
            (hist.length ? '<details><summary class="small muted">History (' + hist.length + ')</summary>' + hist.map(function (h) { return '<small>' + esc(when(h.created_at)) + ' · ' + esc(LABEL[h.status] || h.status) + (h.note ? ' · ' + esc(h.note) : '') + '</small>'; }).join('<br>') + '</details>' : '') +
            '</div><span class="chip">' + esc((LABEL[x.status] || x.status || '').toUpperCase()) + '</span></article>';
        }).join('');
      } catch (e) { box.innerHTML = '<div class="empty">Bank responses are unavailable right now.</div>'; }
    }
    document.getElementById('refreshLcStatus').onclick = load; load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
