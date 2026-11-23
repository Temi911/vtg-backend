(function () {
  'use strict';
  // Forwards a Supabase password-recovery landing that reached the wrong page (usually the Site URL
  // homepage) to the administrator recovery page. It never grants access: the destination page
  // still has to exchange/verify the link with Supabase and confirm an active administrator.
  try {
    var target = '/admin-password-reset.html';
    if (location.pathname === target) return;
    var hash = location.hash || '';
    var search = location.search || '';
    var implicitRecovery = /(^|[#&])type=recovery(&|$)/.test(hash) && /access_token=/.test(hash);
    var recoveryError = /error_code=otp_expired/.test(hash) && /error=access_denied/.test(hash);
    var pkceReturn = false;
    if (/[?&]code=/.test(search)) {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (/-code-verifier$/.test(key) && /\/PASSWORD_RECOVERY$/.test(localStorage.getItem(key) || '')) { pkceReturn = true; break; }
      }
    }
    if (implicitRecovery || recoveryError || pkceReturn) location.replace(target + search + hash);
  } catch (_) { /* never block the page */ }
})();
