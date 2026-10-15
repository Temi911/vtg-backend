/* VTG browser auth session refresh. Kept separate from navigation and installed before page code. */
(function () {
  'use strict';

  if (window.__vtgAuthSessionInstalled || typeof window.fetch !== 'function') return;
  window.__vtgAuthSessionInstalled = true;

  var nativeFetch = window.fetch.bind(window);
  var refreshInFlight = null;
  var AUTH_KEY = 'vtg-auth';
  var ACCESS_KEY = 'vtg_access_token';
  var REFRESH_LOCK = 'vtg-auth-refresh-v1';

  function isBranchPreviewHost() {
    var host = String(window.location.hostname || '').toLowerCase();
    return host.endsWith('.vercel.app') && host !== 'vtg-staging.vercel.app';
  }

  function readState() {
    try {
      var auth = JSON.parse(window.localStorage.getItem(AUTH_KEY) || '{}');
      if (!auth || typeof auth !== 'object' || Array.isArray(auth)) auth = {};
      return {
        auth: auth,
        accessToken: window.localStorage.getItem(ACCESS_KEY) || auth.accessToken || '',
        refreshToken: typeof auth.refreshToken === 'string' ? auth.refreshToken : ''
      };
    } catch (_) {
      return { auth: {}, accessToken: '', refreshToken: '' };
    }
  }

  function decodeClaims(token) {
    try {
      var part = String(token || '').split('.')[1];
      if (!part || typeof window.atob !== 'function') return null;
      var base64 = part.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      var raw = window.atob(base64);
      var decoded = decodeURIComponent(Array.prototype.map.call(raw, function (char) {
        return '%' + char.charCodeAt(0).toString(16).padStart(2, '0');
      }).join(''));
      var claims = JSON.parse(decoded);
      return claims && typeof claims === 'object' ? claims : null;
    } catch (_) {
      return null;
    }
  }

  function sameSession(firstToken, secondToken) {
    var first = decodeClaims(firstToken);
    var second = decodeClaims(secondToken);
    if (!first || !second) return false;
    if (first.sid || second.sid) {
      return Boolean(first.sid && second.sid && String(first.sid) === String(second.sid));
    }
    // Demo JWTs are stateless and intentionally do not carry a persisted session ID.
    return Boolean(first.id && second.id && String(first.id) === String(second.id));
  }

  function clearTokensIfCurrent(refreshToken) {
    var latest = readState();
    if (latest.refreshToken !== refreshToken) return;
    try {
      window.localStorage.removeItem(AUTH_KEY);
      window.localStorage.removeItem(ACCESS_KEY);
    } catch (_) {}
  }

  function saveTokens(accessToken, refreshToken) {
    var state = readState();
    var updated = Object.assign({}, state.auth, {
      accessToken: accessToken,
      refreshToken: refreshToken
    });
    try {
      window.localStorage.setItem(ACCESS_KEY, accessToken);
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
      return true;
    } catch (_) {
      try {
        window.localStorage.removeItem(AUTH_KEY);
        window.localStorage.removeItem(ACCESS_KEY);
      } catch (_) {}
      return false;
    }
  }

  function refreshAccessToken(staleAccessToken) {
    var refreshOnce = async function () {
      var state = readState();
      if (state.accessToken && state.accessToken !== staleAccessToken) {
        return sameSession(staleAccessToken, state.accessToken) ? state.accessToken : null;
      }
      if (!state.refreshToken) return null;

      var submittedRefreshToken = state.refreshToken;
      var response;
      try {
        response = await nativeFetch(new Request('/api/auth/refresh', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ refreshToken: submittedRefreshToken })
        }));
      } catch (_) {
        return null;
      }

      if (response.status === 401) {
        var latest = readState();
        if (latest.refreshToken === submittedRefreshToken &&
            (!latest.accessToken || latest.accessToken === staleAccessToken || sameSession(staleAccessToken, latest.accessToken))) {
          clearTokensIfCurrent(submittedRefreshToken);
        }
        return null;
      }
      if (!response.ok) return null;

      var data;
      try { data = await response.json(); } catch (_) { return null; }
      if (!data || typeof data.accessToken !== 'string' || !data.accessToken ||
          typeof data.refreshToken !== 'string' || !data.refreshToken) return null;

      var current = readState();
      if (current.refreshToken !== submittedRefreshToken) {
        return current.accessToken && sameSession(staleAccessToken, current.accessToken)
          ? current.accessToken
          : null;
      }
      if (current.accessToken && current.accessToken !== staleAccessToken &&
          !sameSession(staleAccessToken, current.accessToken)) return null;
      if (!saveTokens(data.accessToken, data.refreshToken)) return null;
      return data.accessToken;
    };

    var locks = window.navigator && window.navigator.locks;
    if (locks && typeof locks.request === 'function') {
      return locks.request(REFRESH_LOCK, refreshOnce).catch(function () { return null; });
    }
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = refreshOnce();
    return refreshInFlight.finally(function () { refreshInFlight = null; });
  }

  window.fetch = async function (input, init) {
    var url;
    try {
      var inputUrl = input && typeof input === 'object' && typeof input.url === 'string'
        ? input.url
        : String(input);
      url = new URL(inputUrl, window.location.href);
    } catch (_) {
      return nativeFetch(input, init);
    }

    if (url.origin === window.location.origin && url.pathname.startsWith('/api/') && isBranchPreviewHost()) {
      if (typeof Response === 'function') {
        return new Response(JSON.stringify({
          error: {
            code: 'BRANCH_PREVIEW_API_DISABLED',
            message: 'API calls are disabled in Vercel branch previews because this deployment targets the production backend.'
          }
        }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error('API calls are disabled in Vercel branch previews.');
    }

    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/') ||
        /^\/api\/auth\/(?:login|refresh|logout)(?:\/|$)/.test(url.pathname)) {
      return nativeFetch(input, init);
    }

    var request;
    try { request = new Request(input, init); } catch (_) { return nativeFetch(input, init); }
    var authorization = request.headers.get('Authorization') || '';
    var match = /^\s*Bearer\s+(\S+)\s*$/i.exec(authorization);
    if (!match) return nativeFetch(input, init);

    var staleAccessToken = match[1];
    var response = await nativeFetch(request.clone());
    if (response.status !== 401) return response;

    var nextAccessToken = await refreshAccessToken(staleAccessToken);
    if (!nextAccessToken || nextAccessToken === staleAccessToken) return response;

    var retryHeaders = new Headers(request.headers);
    retryHeaders.set('Authorization', 'Bearer ' + nextAccessToken);
    return nativeFetch(new Request(request, { headers: retryHeaders }));
  };
})();