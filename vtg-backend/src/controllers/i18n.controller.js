const { asyncHandler } = require('../utils/asyncHandler');

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', flag: '🇳🇬' },
];

const TERM_OVERRIDES = {
  portalTitle: { en: 'Select Your Portal', zh: '选择您的门户', fr: 'Sélectionnez votre portail', es: 'Seleccione su portal', ar: 'اختر بوابتك', ha: 'Zaɓi mashigin ku' },
  portalSub: { en: 'Three dedicated experiences · One integrated Africa-China trade platform', zh: '三种专用体验 · 一个集成的非洲-中国贸易平台', fr: 'Trois expériences dédiées · Une plateforme intégrée d’Afrique et de Chine', es: 'Tres experiencias dedicadas · Una plataforma integrada de comercio África-China', ar: 'ثلاثة تجارب مخصصة · منصة متكاملة للتجارة بين أفريقيا والصين', ha: 'Kware da aka keɓe uku · Dandalin kasuwanci na Afirka da China daya' },
  signIn: { en: 'Sign In', zh: '登录', fr: 'Se connecter', es: 'Iniciar sesión', ar: 'تسجيل الدخول', ha: 'Shiga' },
  buyerPortal: { en: 'Buyer Portal', zh: '采购方门户', fr: 'Portail acheteur', es: 'Portal del comprador', ar: 'بوابة المشتري', ha: 'Portal din mai sayayya' },
  supplierPortal: { en: 'Supplier Portal', zh: '供应商门户', fr: 'Portail fournisseur', es: 'Portal del proveedor', ar: 'بوابة المورد', ha: 'Portal din mai samarwa' },
  bankPortal: { en: 'Bank Portal', zh: '银行门户', fr: 'Portail bancaire', es: 'Portal bancario', ar: 'بوابة البنك', ha: 'Portal din banki' },
};

const getTranslationConfig = asyncHandler(async (req, res) => {
  res.json({
    supportedLanguages: SUPPORTED_LANGUAGES,
    defaultLanguage: 'en',
    terms: TERM_OVERRIDES,
  });
});

module.exports = { getTranslationConfig, SUPPORTED_LANGUAGES };
