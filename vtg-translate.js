(() => {
  const LANGS = 'en,zh-CN,ko,fr,pt,es';
  const LABELS = { en: 'English', 'zh-CN': '中文', ko: '한국어', fr: 'Français', pt: 'Português', es: 'Español' };

  function injectGoogleWidget() {
    if (document.getElementById('google_translate_element')) return;
    const style = document.createElement('style');
    style.textContent = `
    #vtgLangWrap{position:relative}
    #vtgLangBtn{width:40px;height:40px;border:1px solid var(--line);background:#fff;border-radius:11px;color:var(--navy);display:grid;place-items:center;font-size:10px;font-weight:800}
    #vtgLangBtn:hover{border-color:#b8cbd3;color:var(--teal)}
    #vtgLangMenu{position:absolute;top:48px;right:0;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 15px 40px rgba(7,31,48,.18);padding:6px;display:none;z-index:200;min-width:140px}
    #vtgLangMenu.open{display:block}
    #vtgLangMenu button{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 10px;border-radius:8px;font-size:11px;color:var(--ink)}
    #vtgLangMenu button:hover{background:var(--soft);color:var(--teal)}
    #google_translate_element{position:fixed;top:-999px;left:-999px}
    .goog-te-banner-frame{display:none!important}
    body{top:0!important}
    `;
    document.head.appendChild(style);

    const hidden = document.createElement('div');
    hidden.id = 'google_translate_element';
    document.body.appendChild(hidden);

    window.googleTranslateElementInit = () => {
      new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: LANGS, autoDisplay: false }, 'google_translate_element');
    };
    const s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(s);
  }

  function setLanguage(code) {
    // Google's widget works by setting a cookie and reloading the driving select box.
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = code;
      select.dispatchEvent(new Event('change'));
    } else {
      // Widget not ready yet — set the cookie directly and reload.
      document.cookie = `googtrans=/en/${code}; path=/`;
      window.location.reload();
    }
  }

  function injectButton() {
    const tools = document.querySelector('.navtools');
    const joinBtn = document.getElementById('joinBtn');
    if (!tools || !joinBtn || document.getElementById('vtgLangBtn')) return;

    const wrap = document.createElement('div');
    wrap.id = 'vtgLangWrap';
    wrap.innerHTML = `
      <button id="vtgLangBtn" title="Change language" aria-label="Change language">EN</button>
      <div id="vtgLangMenu">${Object.entries(LABELS).map(([code, label]) => `<button data-lang="${code}">${label}</button>`).join('')}</div>
    `;
    tools.insertBefore(wrap, joinBtn);

    document.getElementById('vtgLangBtn').onclick = () => document.getElementById('vtgLangMenu').classList.toggle('open');
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) document.getElementById('vtgLangMenu').classList.remove('open') });
    wrap.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => {
      setLanguage(b.dataset.lang);
      document.getElementById('vtgLangBtn').textContent = b.dataset.lang === 'en' ? 'EN' : b.dataset.lang.toUpperCase().slice(0, 2);
      document.getElementById('vtgLangMenu').classList.remove('open');
    });
  }

  function init() {
    injectGoogleWidget();
    injectButton();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
