(() => {
  const open = () => {
    const drawer = document.getElementById('mapDrawer');
    if (!drawer) return;
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (window.VTGInitMap) return window.VTGInitMap();
    if (document.querySelector('script[data-vtg-map-enhancer]')) return;
    const s = document.createElement('script');
    s.src = '/map-enhancer.js?v=admin10';
    s.dataset.vtgMapEnhancer = '1';
    s.onload = () => window.VTGInitMap && window.VTGInitMap();
    document.head.appendChild(s);
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('open-admin-atlas')?.addEventListener('click', open);
  });
})();