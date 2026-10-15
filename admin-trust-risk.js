(() => {
  'use strict';
  const api = '/api';
  const token = localStorage.getItem('vtg_access_token');
  const $ = (id) => document.getElementById(id);
  const state = { users: [], flags: [] };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  async function request(path, options = {}) {
    const headers = { Authorization: 'Bearer ' + (token || ''), Accept: 'application/json', ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const response = await fetch(api + path, { ...options, headers, cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error?.message || body.message || 'Request failed (' + response.status + ')');
    return body;
  }
  function showMessage(message, isError = false) {
    const el = $('trust-risk-message');
    el.textContent = message;
    el.dataset.kind = isError ? 'error' : 'success';
    el.hidden = !message;
  }
  function renderUsers() {
    const select = $('trust-risk-subject');
    const current = select.value;
    select.innerHTML = '<option value="">Choose an account…</option>' + state.users.map(user =>
      '<option value="' + esc(user.id) + '">' + esc(user.full_name || 'Unnamed account') + ' — ' + esc(user.email) + ' (' + esc(user.role) + ')</option>'
    ).join('');
    if (state.users.some(user => user.id === current)) select.value = current;
  }
  function renderFlags() {
    const root = $('trust-risk-list');
    const flags = state.flags;
    if (!flags.length) {
      root.innerHTML = '<div class="empty">No trust-risk flags match these filters.</div>';
      return;
    }
    root.innerHTML = flags.map(flag => {
      const terminal = ['resolved','dismissed'].includes(flag.status);
      const severity = String(flag.severity || 'low').toLowerCase();
      return '<article class="trust-risk-item">' +
        '<div class="trust-risk-top"><div><div class="eyebrow"> ' + esc(severity.toUpperCase()) + ' · ' + esc(flag.status) + '</div>' +
        '<h3>' + esc(flag.category) + '</h3><div class="muted">' + esc(flag.subject_name || flag.subject_user_id) + ' · ' + esc(flag.subject_email || '') + ' · ' + esc(flag.subject_role || '') + '</div></div>' +
        '<span class="trust-risk-severity ' + esc(severity) + '">' + esc(severity) + '</span></div>' +
        '<p>' + esc(flag.rationale) + '</p>' +
        '<div class="muted">Source: ' + esc(flag.source_type) + (flag.source_reference ? ' · ' + esc(flag.source_reference) : '') + '</div>' +
        '<div class="muted">Raised by ' + esc(flag.creator_name || 'Admin') + ' · ' + esc(new Date(flag.created_at).toLocaleString()) + '</div>' +
        (terminal ? '<div class="trust-risk-resolution"><strong>' + esc(flag.status) + '</strong>: ' + esc(flag.resolution_notes || 'No resolution note') + '<div class="muted">Resolved by ' + esc(flag.resolver_name || 'Admin') + ' · ' + esc(flag.resolved_at ? new Date(flag.resolved_at).toLocaleString() : '') + '</div></div>' :
          '<div class="trust-risk-actions"><button type="button" data-flag-action="reviewing" data-id="' + esc(flag.id) + '">Mark reviewing</button><button type="button" data-flag-action="resolved" data-id="' + esc(flag.id) + '">Resolve</button><button type="button" data-flag-action="dismissed" data-id="' + esc(flag.id) + '">Dismiss</button></div>') +
        '</article>';
    }).join('');
    root.querySelectorAll('[data-flag-action]').forEach(button => {
      button.addEventListener('click', () => updateFlag(button.dataset.id, button.dataset.flagAction));
    });
  }
  async function loadFlags() {
    const params = new URLSearchParams();
    if ($('trust-risk-status').value) params.set('status', $('trust-risk-status').value);
    if ($('trust-risk-severity-filter').value) params.set('severity', $('trust-risk-severity-filter').value);
    const data = await request('/admin/trust-risk-flags' + (params.size ? '?' + params.toString() : ''));
    state.flags = data.flags || [];
    renderFlags();
  }
  async function updateFlag(id, status) {
    let resolutionNotes;
    if (status === 'resolved' || status === 'dismissed') {
      resolutionNotes = window.prompt('Enter the resolution rationale (at least five characters):') || '';
      if (resolutionNotes.trim().length < 5) {
        showMessage('Please provide a resolution note of at least five characters.', true);
        return;
      }
    }
    try {
      await request('/admin/trust-risk-flags/' + encodeURIComponent(id), {
        method: 'PATCH', body: JSON.stringify({ status, resolutionNotes })
      });
      showMessage('Risk flag updated. The decision and actor were recorded.');
      await loadFlags();
    } catch (error) { showMessage(error.message, true); }
  }
  async function createFlag(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      subjectUserId: $('trust-risk-subject').value,
      category: $('trust-risk-category').value.trim(),
      severity: $('trust-risk-severity').value,
      sourceType: $('trust-risk-source').value,
      sourceReference: $('trust-risk-source-reference').value.trim() || undefined,
      rationale: $('trust-risk-rationale').value.trim()
    };
    if (!payload.subjectUserId) { showMessage('Choose the account this flag relates to.', true); return; }
    if (payload.rationale.length < 10) { showMessage('Rationale must be at least 10 characters.', true); return; }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await request('/admin/trust-risk-flags', { method: 'POST', body: JSON.stringify(payload) });
      form.reset();
      showMessage('Trust-risk flag recorded with source and rationale. This is an internal review record, not a legal determination.');
      await loadFlags();
    } catch (error) { showMessage(error.message, true); }
    finally { button.disabled = false; }
  }
  async function init() {
    const root = $('trust-risk-list');
    if (!token) { root.textContent = 'Sign in as an administrator to manage trust-risk flags.'; return; }
    try {
      const data = await request('/admin/users');
      state.users = data.users || [];
      renderUsers();
      await loadFlags();
    } catch (error) {
      root.textContent = error.message || 'Trust-risk service unavailable.';
      showMessage(error.message || 'Trust-risk service unavailable.', true);
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('trust-risk-form')?.addEventListener('submit', createFlag);
    $('trust-risk-refresh')?.addEventListener('click', () => loadFlags().catch(error => showMessage(error.message, true)));
    ['trust-risk-status','trust-risk-severity-filter'].forEach(id => $(id)?.addEventListener('change', () => loadFlags().catch(error => showMessage(error.message, true))));
    init();
  });
})();