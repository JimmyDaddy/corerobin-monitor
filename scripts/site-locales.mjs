export const SITE_ORIGIN = "https://monitor-app.corerobin.com";

export const SITE_LOCALES = [
  { code: "zh-CN", slug: "", nativeName: "简体中文", compactLabel: "中文", ogLocale: "zh_CN" },
  { code: "en", slug: "en", nativeName: "English", compactLabel: "EN", ogLocale: "en_US" },
  { code: "zh-Hant", slug: "zh-hant", nativeName: "繁體中文", compactLabel: "繁中", ogLocale: "zh_TW" },
  { code: "ja", slug: "ja", nativeName: "日本語", compactLabel: "日本語", ogLocale: "ja_JP" },
  { code: "de", slug: "de", nativeName: "Deutsch", compactLabel: "DE", ogLocale: "de_DE" },
  { code: "fr", slug: "fr", nativeName: "Français", compactLabel: "FR", ogLocale: "fr_FR" },
  { code: "es", slug: "es", nativeName: "Español", compactLabel: "ES", ogLocale: "es_ES" },
  { code: "pt-BR", slug: "pt-br", nativeName: "Português (Brasil)", compactLabel: "PT-BR", ogLocale: "pt_BR" },
  { code: "ko", slug: "ko", nativeName: "한국어", compactLabel: "한국어", ogLocale: "ko_KR" },
  { code: "ru", slug: "ru", nativeName: "Русский", compactLabel: "RU", ogLocale: "ru_RU" },
];

export const DEFAULT_SITE_LOCALE = SITE_LOCALES[0];

export const SITE_ROUTES = [
  { source: "index.html", path: "/", changeFrequency: "weekly" },
  { source: "download/index.html", path: "/download/", changeFrequency: "weekly" },
  { source: "guide/index.html", path: "/guide/", changeFrequency: "weekly" },
  { source: "privacy/index.html", path: "/privacy/", changeFrequency: "monthly" },
  { source: "releases/index.html", path: "/releases/", changeFrequency: "weekly" },
];

export function localizedRoute(route, locale) {
  if (!locale.slug) return route.path;
  return route.path === "/" ? `/${locale.slug}/` : `/${locale.slug}${route.path}`;
}

export function localizedUrl(route, locale) {
  return `${SITE_ORIGIN}${localizedRoute(route, locale)}`;
}

export function outputPathForRoute(route, locale) {
  return localizedRoute(route, locale).slice(1) + "index.html";
}

export function localeByCode(code) {
  return SITE_LOCALES.find((locale) => locale.code === code);
}

const terminologyReplacements = {
  "zh-Hant": [
    ["完全磁碟存取權限", "完整磁碟存取權限"],
  ],
  ja: [
    ["Everyday Records", "日常モードの記録"],
    ["Everyday Settings", "日常モードの設定"],
    ["Everyday assistant", "日常アシスタント"],
    ["エブリデイ モード", "日常モード"],
    ["毎日モード", "日常モード"],
    ["毎日の設定", "日常モードの設定"],
    ["プロフェッショナル モード", "プロフェッショナルモード"],
    ["フルディスク アクセス", "フルディスクアクセス"],
  ],
  de: [
    ["Everyday Records", "Aufzeichnungen im Alltagsmodus"],
    ["Everyday Settings", "Einstellungen im Alltagsmodus"],
  ],
  fr: [
    ["Everyday Records", "Les relevés du mode Quotidien"],
  ],
  es: [
    ["Everyday Records", "Los registros del modo Diario"],
    ["modo Todos los días", "modo Diario"],
  ],
  "pt-BR": [
    ["Everyday Records", "Os registros do modo Cotidiano"],
    ["modo Diário", "modo Cotidiano"],
  ],
  ko: [
    ["Everyday Records", "일상 모드의 기록"],
    ["Everyday Settings", "일상 모드 설정"],
    ["Everyday assistant", "일상 도우미"],
    ["Everyday 모드", "일상 모드"],
    ["Everyday 페이지", "일상 모드 페이지"],
    ["매일 모드", "일상 모드"],
    ["전문가 모드", "전문 모드"],
    ["프로페셔널 모드", "전문 모드"],
    ["전체 디스크 액세스", "전체 디스크 접근 권한"],
    ["CoreRobin는", "CoreRobin은"],
    ["CoreRobin가", "CoreRobin이"],
    ["CoreRobin를", "CoreRobin을"],
  ],
  ru: [
    ["Everyday Records", "Записи Повседневного режима"],
    ["ежедневном режиме", "Повседневном режиме"],
    ["ежедневный режим", "Повседневный режим"],
  ],
};

export function normalizeLocalizedText(locale, value) {
  return (terminologyReplacements[locale] ?? []).reduce(
    (result, [source, replacement]) => result.replaceAll(source, replacement),
    String(value),
  );
}
