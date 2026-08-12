/* Non-blocking bootstrap for VTG performance helpers. */
(function () {
  'use strict';
  function boot() {
    var src = '/frontend/performance-loader.js';
    if (document.querySelector('script[src="' + src + '"]')) return;
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(boot, { timeout: 1500 });
  } else {
    window.setTimeout(boot, 1);
  }
})();
