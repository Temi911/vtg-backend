/* VTG performance helpers. Loaded separately so non-critical features can be deferred. */
(function () {
  'use strict';
  window.VTGPerformance = window.VTGPerformance || {};

  window.VTGPerformance.loadScript = function (src, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        if (existing.dataset.loaded === 'true') resolve();
        return;
      }
      var script = document.createElement('script');
      script.src = src;
      script.async = options.async !== false;
      if (options.defer) script.defer = true;
      script.onload = function () { script.dataset.loaded = 'true'; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  window.VTGPerformance.loadStylesheet = function (href) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('link[href="' + href + '"]')) return resolve();
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  };

  window.VTGPerformance.lazyImages = function () {
    if (!('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var img = entry.target;
        if (img.dataset.src) img.src = img.dataset.src;
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        obs.unobserve(img);
      });
    }, { rootMargin: '300px 0px' });
    document.querySelectorAll('img[data-src],img[data-srcset]').forEach(function (img) { observer.observe(img); });
  };
})();
