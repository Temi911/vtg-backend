/* VTG shared language controller for the buyer, supplier and bank dashboards.
 *
 * - One list of languages (the same ones offered at sign-up).
 * - The account's preferred_language (chosen at sign-up) is applied on first load and whenever it changes.
 * - Choosing a language in a dashboard is remembered on this device and saved to the account.
 * - Sets <html lang/dir> (Arabic is right-to-left) and drives the full-page translator.
 * - The logo, the loading ring and VTG IDs are never translated or mirrored.
 * Dashboards listen for the `vtg:languagechange` event to refresh their own built-in dictionaries.
 */
(function(){
  'use strict';
  var LANGS={
    en:{g:'en',name:'English'},fr:{g:'fr',name:'Français'},pt:{g:'pt',name:'Português'},
    ar:{g:'ar',name:'العربية',rtl:true},sw:{g:'sw',name:'Kiswahili'},
    zh:{g:'zh-CN',name:'中文'},ko:{g:'ko',name:'한국어'},es:{g:'es',name:'Español'}
  };
  var KEY='vtg-language',ACC='vtg-language-account';
  var GOOGLE_LIST='en,fr,pt,ar,sw,zh-CN,ko,es';
  // Everything that must stay exactly as designed in every language.
  var PROTECT='.vtg-loader svg,.vtg-loader-mark,.vtg-loader-inline svg,#vtg-guard-loader svg,.vtg-header-brand,.brand img,img.logo,.vtg-uid,[data-vtg-uid-chip],#google_translate_element';

  function store(k,v){try{localStorage.setItem(k,v)}catch(_){}}
  function load(k){try{return localStorage.getItem(k)}catch(_){return null}}
  function norm(v){v=String(v||'').toLowerCase();if(v==='zh-cn'||v==='zh-hans')return 'zh';v=v.slice(0,2);return LANGS[v]?v:'en'}
  function current(){return norm(load(KEY))}

  function setDoc(lang){
    var h=document.documentElement;
    h.lang=lang==='zh'?'zh-CN':lang;
    h.dir=LANGS[lang].rtl?'rtl':'ltr';
    h.setAttribute('data-language',lang);
  }

  // ---- protect the logo / loading ring from translation and right-to-left mirroring ----
  function css(){
    if(document.getElementById('vtg-lang-css'))return;
    var s=document.createElement('style');s.id='vtg-lang-css';
    s.textContent='.vtg-loader svg,.vtg-loader-mark,.vtg-loader-inline svg,#vtg-guard-loader svg,.vtg-header-brand,.vtg-uid,[data-vtg-uid-chip]{direction:ltr!important;unicode-bidi:isolate!important}'
      +'.vtg-loader svg text,#vtg-guard-loader svg text,.vtg-loader-inline svg text{font-family:Georgia,"Times New Roman",serif!important;text-transform:none!important}'
      +'#google_translate_element{position:fixed!important;left:-10000px!important;top:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}'
      +'body{top:0!important}.goog-te-banner-frame,.skiptranslate>iframe{display:none!important}';
    (document.head||document.documentElement).appendChild(s);
  }
  function tag(el){
    if(el.nodeType!==1)return;
    var list=[];
    if(el.matches&&el.matches(PROTECT))list.push(el);
    if(el.querySelectorAll)Array.prototype.push.apply(list,el.querySelectorAll(PROTECT));
    list.forEach(function(n){
      if(n.getAttribute('translate')!=='no')n.setAttribute('translate','no');
      if(n.classList&&!n.classList.contains('notranslate'))n.classList.add('notranslate');
    });
  }
  function watch(){
    tag(document.documentElement);
    if(!window.MutationObserver)return;
    new MutationObserver(function(list){list.forEach(function(m){m.addedNodes&&m.addedNodes.forEach(tag)})})
      .observe(document.documentElement,{childList:true,subtree:true});
  }

  // ---- full-page translator ----
  var gLoading=false;
  function host(){
    var h=document.getElementById('google_translate_element');
    if(!h){h=document.createElement('div');h.id='google_translate_element';h.setAttribute('aria-hidden','true');(document.body||document.documentElement).appendChild(h);}
    h.setAttribute('translate','no');h.classList.add('notranslate');return h;
  }
  function cookie(lang){
    var past='expires=Thu, 01 Jan 1970 00:00:00 GMT';
    try{
      if(lang==='en'){document.cookie='googtrans=; '+past+'; path=/';document.cookie='googtrans=; '+past+'; path=/; domain='+location.hostname;}
      else{var v='/en/'+LANGS[lang].g;document.cookie='googtrans='+v+'; path=/';document.cookie='googtrans='+v+'; path=/; domain='+location.hostname;}
    }catch(_){}
  }
  function drive(lang,tries){
    var combo=document.querySelector('.goog-te-combo');
    if(combo){
      var want=lang==='en'?'':LANGS[lang].g;
      if(combo.value!==want){combo.value=want;combo.dispatchEvent(new Event('change',{bubbles:true}));}
      return;
    }
    if((tries||0)<40)setTimeout(function(){drive(lang,(tries||0)+1)},250);
  }
  function ensureTranslator(lang){
    if(gLoading||document.querySelector('.goog-te-combo')){drive(lang);return;}
    if(lang==='en')return;                // nothing to translate, don't load a third-party script
    gLoading=true;host();
    window.googleTranslateElementInit=function(){
      try{new google.translate.TranslateElement({pageLanguage:'en',includedLanguages:GOOGLE_LIST,autoDisplay:false},'google_translate_element');}catch(_){}
      drive(current());
    };
    var sc=document.createElement('script');
    sc.src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';sc.async=true;
    sc.onerror=function(){gLoading=false;};   // blocked network: the built-in dictionaries still apply
    document.head.appendChild(sc);
  }

  function announce(lang){
    try{document.dispatchEvent(new CustomEvent('vtg:languagechange',{detail:{lang:lang}}));}catch(_){}
  }
  function engine(lang){setDoc(lang);cookie(lang);ensureTranslator(lang);}

  // Save the choice to the account (best effort; the column is user-editable).
  // The sign-in service loads separately; wait (up to ~8s) until it exists.
  function whenAuth(cb,tries){
    if(window.VTG_AUTH_READY){Promise.resolve(window.VTG_AUTH_READY).then(cb).catch(function(){});return;}
    if((tries||0)<40)setTimeout(function(){whenAuth(cb,(tries||0)+1)},200);
  }
  var UNSAVED='vtg-language-unsaved';
  function saveToAccount(lang){
    store(UNSAVED,'1');   // stays set until the account actually has it (e.g. picked while signed out)
    whenAuth(function(a){
      if(!a||!a.client||!a.getCurrent)return;
      return a.getCurrent().then(function(c){
        var id=c&&c.user&&c.user.id;if(!id)return;
        return a.client.from('profiles').update({preferred_language:lang}).eq('id',id).then(function(r){
          if(!r||!r.error)try{localStorage.removeItem(UNSAVED)}catch(_){}
        });
      });
    });
  }

  // Called when the user picks a language in a dashboard.
  function set(value){
    var lang=norm(value);
    store(KEY,lang);store(ACC,lang);store('vtg-supplier-os-language',lang);
    engine(lang);announce(lang);saveToAccount(lang);
    return lang;
  }

  // The account's language (chosen at sign-up) wins when it differs from what this device last synced.
  function syncAccount(){
    whenAuth(function(a){
      if(!a||!a.getCurrent)return;
      return a.getCurrent().then(function(c){
        var acc=c&&c.user&&c.user.preferredLanguage;if(!acc)return;
        var n=norm(acc);
        // a choice made on this device that never reached the account (picked while signed out) wins and is saved now
        if(load(UNSAVED)==='1'&&load(KEY)&&norm(load(KEY))!==n){saveToAccount(norm(load(KEY)));return;}
        try{localStorage.removeItem(UNSAVED)}catch(_){}
        if(load(ACC)!==n){store(ACC,n);store(KEY,n);store('vtg-supplier-os-language',n);engine(n);announce(n);}
      });
    });
  }

  // Sign-up / profile forms: choosing the preferred language switches the whole page straight away,
  // and the form starts on the language the visitor already picked on the site.
  var FORM_SEL='#preferredLanguage,#preferred_language,select[name="preferredLanguage"],select[name="preferred_language"]';
  function bindForms(){
    document.addEventListener('change',function(e){
      var t=e.target;
      if(t&&t.matches&&t.matches(FORM_SEL)&&!t.__vtgSetting){set(t.value);}
    },true);
    var cur=current();
    Array.prototype.forEach.call(document.querySelectorAll(FORM_SEL),function(sel){
      if(cur!=='en'&&Array.prototype.some.call(sel.options,function(o){return o.value===cur;})){sel.__vtgSetting=true;sel.value=cur;sel.__vtgSetting=false;}
    });
    document.addEventListener('vtg:languagechange',function(ev){
      var l=ev.detail&&ev.detail.lang;
      Array.prototype.forEach.call(document.querySelectorAll(FORM_SEL),function(sel){
        if(l&&sel.value!==l&&Array.prototype.some.call(sel.options,function(o){return o.value===l;})){sel.__vtgSetting=true;sel.value=l;sel.__vtgSetting=false;}
      });
    });
  }

  // run as early as possible so the first paint already has the right direction
  setDoc(current());
  css();
  function ready(){
    watch();
    bindForms();
    var lang=current();
    engine(lang);announce(lang);
    syncAccount();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();

  window.VTGLang={set:set,current:current,languages:LANGS,normalize:norm};
})();
