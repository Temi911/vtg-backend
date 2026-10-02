(() => {
  const token = localStorage.getItem('vtg_access_token');
  const api = '/api';
  const state = { dashboard:null, users:[], applicants:[] };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  async function get(path) {
    const r = await fetch(api + path, { headers:{ Authorization:'Bearer ' + token } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error?.message || j.message || 'Request failed');
    return j;
  }

  async function reviewDocument(id, status) {
    let notes = '';
    if (status === 'rejected') {
      notes = prompt('Enter the reason for rejecting this document:') || '';
      if (!notes.trim()) return;
    }
    const r = await fetch(api + '/verification/documents/' + encodeURIComponent(id) + '/review', {
      method:'PATCH',
      headers:{'Content-Type':'application/json', Authorization:'Bearer ' + token},
      body:JSON.stringify({status, notes})
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error?.message || j.message || 'Review failed');
    await load();
  }

  async function openDocument(id) {
    const r = await fetch(api + '/verification/documents/' + encodeURIComponent(id) + '/download', {
      headers:{ Authorization:'Bearer ' + token }
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.error?.message || j.message || 'Unable to open document');
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  const roleLabel = role => ({supplier:'Supplier',bank:'Bank',agent:'Agent',buyer:'Buyer',admin:'Admin'}[role] || role);
  const statusBadge = s => '<span class="badge badge-' + esc(String(s||'').replace(/_/g,'-')) + '">' + esc(String(s||'pending').replace(/_/g,' ')) + '</span>';

  function renderVerification() {
    const root = document.getElementById('verification-workspace');
    if (!state.applicants.length) {
      root.innerHTML = '<div class="empty">No pending verification documents right now.</div>';
      return;
    }
    root.innerHTML = state.applicants.map(a => {
      const logo = a.logoUrl ? '<img class="org-logo" src="' + esc(a.logoUrl) + '" alt="">'
        : '<div class="org-logo placeholder">VTG</div>';
      return '<article class="applicant">' +
        '<div class="applicant-top">' + logo +
          '<div class="applicant-main"><div class="eyebrow-sm">' + esc(roleLabel(a.role)) + '</div>' +
          '<h3>' + esc(a.organisationName || a.fullName || 'Applicant') + '</h3>' +
          '<div class="muted">' + esc(a.fullName) + ' · ' + esc(a.email) + '</div></div>' +
          '<div>' + statusBadge(a.verificationStatus) + '</div>' +
        '</div>' +
        '<div class="docs">' + a.documents.map(d =>
          '<div class="doc"><div class="doc-info"><b>' + esc(d.docType.replace(/_/g,' ')) + '</b><span>' + esc(d.fileName) + '</span></div>' +
          '<div class="doc-actions"><button data-open="' + esc(d.id) + '">View</button><button class="verify" data-review="verified" data-id="' + esc(d.id) + '">Verify</button><button class="reject" data-review="rejected" data-id="' + esc(d.id) + '">Reject</button></div></div>'
        ).join('') + '</div></article>';
    }).join('');

    root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openDocument(b.dataset.open).catch(showError));
    root.querySelectorAll('[data-review]').forEach(b => b.onclick = () => reviewDocument(b.dataset.id,b.dataset.review).catch(showError));
  }

  function renderUsers() {
    const q = (document.getElementById('user-search')?.value || '').trim().toLowerCase();
    const role = document.getElementById('user-role')?.value || '';
    const verification = document.getElementById('user-verification')?.value || '';
    const rows = state.users.filter(u =>
      (!q || [u.full_name,u.email,u.role].some(v => String(v||'').toLowerCase().includes(q))) &&
      (!role || u.role === role) &&
      (!verification || (u.business_verification_status || 'not_required') === verification)
    );
    const root = document.getElementById('users-list');
    root.innerHTML = rows.length ? rows.map(u =>
      '<div class="user-row"><div><b>' + esc(u.full_name) + '</b><span>' + esc(u.email) + '</span></div>' +
      '<span>' + esc(roleLabel(u.role)) + '</span>' +
      statusBadge(u.business_verification_status || 'not_required') +
      '<span class="date">' + new Date(u.created_at).toLocaleDateString() + '</span></div>'
    ).join('') : '<div class="empty">No accounts match the current filters.</div>';
    document.getElementById('user-count').textContent = rows.length + ' shown';
  }

  function renderDashboard() {
    const d = state.dashboard;
    const total = d.users.reduce((n,x) => n + Number(x.count||0),0);
    const count = (a,s) => Number((a||[]).find(x => x.status === s)?.count || 0);
    const openOrders = ['pending','confirmed','lc_issued','shipped','in_transit','arrived','customs']
      .reduce((n,s) => n + count(d.orders,s),0);
    const lcsAction = count(d.lcs,'requested') + count(d.lcs,'docs_presented');
    document.getElementById('kpis').innerHTML =
      [['Total users',total],['Pending verification',d.verification.pending],['Open orders',openOrders],['LCs awaiting action',lcsAction]]
      .map(x => '<div class="card"><div class="k">' + x[0] + '</div><div class="v">' + x[1] + '</div></div>').join('');

    const trade = [
      ['Orders',d.orders.reduce((n,x)=>n+Number(x.count||0),0)],
      ['Letters of credit',d.lcs.reduce((n,x)=>n+Number(x.count||0),0)],
      ['Payments',d.payments.reduce((n,x)=>n+Number(x.count||0),0)],
      ['Shipments',d.shipments.reduce((n,x)=>n+Number(x.count||0),0)]
    ];
    document.getElementById('trade-summary').innerHTML = trade.map(x =>
      '<div class="row"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>').join('');
  }

  function showError(e) {
    const box = document.getElementById('admin-error');
    box.textContent = e.message || 'Something went wrong';
    box.hidden = false;
  }

  async function load() {
    if (!token) throw new Error('Please sign in as an administrator.');
    const [dashboard, users, queue] = await Promise.all([
      get('/admin/dashboard'),
      get('/admin/users'),
      get('/verification/review-queue')
    ]);
    state.dashboard = dashboard;
    state.users = users.users || [];
    state.applicants = queue.applicants || [];
    renderDashboard();
    renderVerification();
    renderUsers();
    document.getElementById('pending-count').textContent =
      (queue.documents || []).length + ' document' + ((queue.documents || []).length === 1 ? '' : 's') + ' pending';
    document.getElementById('admin-error').hidden = true;
  }

  window.VTGAdminOS = { load, renderUsers };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('refresh').onclick = () => load().catch(showError);
    ['user-search','user-role','user-verification'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderUsers);
      document.getElementById(id).addEventListener('change', renderUsers);
    });
    load().catch(showError);
  });
})();