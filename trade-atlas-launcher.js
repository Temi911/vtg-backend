(() => {
  const ensureDrawer = () => {
    let drawer = document.getElementById('mapDrawer');
    if (drawer) return drawer;
    drawer = document.createElement('div');
    drawer.id = 'mapDrawer';
    drawer.className = 'drawer';
    document.body.appendChild(drawer);
    return drawer;
  };

  const open = () => {
    const drawer = ensureDrawer();
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (window.VTGInitMap) return window.VTGInitMap();
    if (document.querySelector('script[data-vtg-map-enhancer]')) return;
    const s = document.createElement('script');
    s.src = '/map-enhancer.js?v=atlas2';
    s.dataset.vtgMapEnhancer = '1';
    s.onload = () => window.VTGInitMap && window.VTGInitMap();
    document.head.appendChild(s);
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-open-trade-atlas]').forEach(btn => btn.addEventListener('click', open));
  });
})();