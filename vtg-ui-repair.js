(() => {
  const FALLBACKS = {
    hero: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=85&w=1200&auto=format&fit=crop',
    logistics: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=85&w=1200&auto=format&fit=crop',
    business: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=85&w=1200&auto=format&fit=crop'
  };

  function loadIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ attrs: { 'stroke-width': 1.9 } });
      return;
    }
    if (!document.querySelector('script[data-vtg-lucide-repair]')) {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/lucide@0.468.0/dist/umd/lucide.js';
      s.defer = true;
      s.dataset.vtgLucideRepair = '1';
      s.onload = () => window.lucide?.createIcons?.({ attrs: { 'stroke-width': 1.9 } });
      document.head.appendChild(s);
    }
  }

  function repairImages() {
    document.querySelectorAll('.tradeCard img').forEach((img, i) => {
      if (img.dataset.vtgRepair) return;
      img.dataset.vtgRepair = '1';
      img.addEventListener('error', () => {
        const fallback = i === 0 ? FALLBACKS.hero : i === 1 ? FALLBACKS.logistics : FALLBACKS.business;
        if (img.src !== fallback) {
          img.src = fallback;
        } else {
          img.style.display = 'none';
          img.parentElement.style.background = 'linear-gradient(135deg,#123b57 0%,#0e969f 100%)';
        }
      });
      if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event('error'));
    });

    document.querySelectorAll('.newsItem img,.newsLarge img,.mini img,.productHero img').forEach(img => {
      if (img.dataset.vtgRepair) return;
      img.dataset.vtgRepair = '1';
      img.addEventListener('error', () => {
        if (!img.dataset.vtgFallback) {
          img.dataset.vtgFallback = '1';
          img.src = FALLBACKS.logistics;
        } else {
          img.style.display = 'none';
        }
      });
      if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event('error'));
    });
  }

  function repairButtons() {
    const bindOnce = (id, fn) => {
      const el = document.getElementById(id);
      if (el && !el.dataset.vtgRepairClick) {
        el.dataset.vtgRepairClick = '1';
        el.addEventListener('click', fn, { capture: false });
      }
    };

    bindOnce('mapBtn', () => {
      setTimeout(() => {
        try {
          if (typeof window.VTGInitMap === 'function') window.VTGInitMap();
        } catch (e) { console.warn('VTG map repair', e); }
      }, 180);
    });

    bindOnce('newsBtn', () => {
      const d = document.getElementById('newsDrawer');
      if (d) d.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    bindOnce('aiLaunch', () => document.getElementById('aiPanel')?.classList.add('open'));
    bindOnce('aiClose', () => document.getElementById('aiPanel')?.classList.remove('open'));

    document.querySelectorAll('[data-close]').forEach(el => {
      if (el.dataset.vtgRepairClick) return;
      el.dataset.vtgRepairClick = '1';
      el.addEventListener('click', () => {
        const target = document.getElementById(el.dataset.close);
        if (target) target.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  function run() {
    loadIcons();
    repairImages();
    repairButtons();
    setTimeout(() => { loadIcons(); repairImages(); repairButtons(); }, 700);
    setTimeout(() => { loadIcons(); repairImages(); repairButtons(); }, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
