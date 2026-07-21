import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, parseFragment, serialize } from "parse5";

import {
  DEFAULT_SITE_LOCALE,
  SITE_NAV_ROUTES,
  SITE_LOCALES,
  SITE_ORIGIN,
  SITE_ROUTES,
  localesForRoute,
  localizedRoute,
  localizedUrl,
  normalizeLocalizedText,
  outputPathForRoute,
} from "./site-locales.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(repositoryRoot, "site");
const outputRoot = join(repositoryRoot, "site-dist");
const localeRoot = join(repositoryRoot, "site-locales");
const forbiddenPublicReferences = [
  ["CoreRobin", "Internal"].join("-"),
  ["github.com/JimmyDaddy", "StatusOrbit"].join("/"),
  ["jimmydaddy.github.io", "StatusOrbit"].join("/"),
];
const discouragedChineseCopy = [
  "看见你的电脑，不带走你的数据",
  "一级页面",
  "权威重扫",
  "不会让你误关",
  "形成有用证据",
  "按稳定、可复核的顺序",
  "只整理证据和下一步",
  "保留为明确的空白",
  "一屏深入",
  "文件声称有多大",
  "想简单一点，或看得更深，都可以",
];

await verifySynchronizedDocs();
const releaseManifest = await verifyReleaseManifest();
const sourcePages = await loadSourcePages();
verifyChineseCopy(sourcePages);
const requiredTranslations = collectRequiredTranslations(sourcePages);
const catalogs = await loadTranslationCatalogs(requiredTranslations);

await rm(outputRoot, { recursive: true, force: true });
await cp(sourceRoot, outputRoot, { recursive: true });
await generateLocalizedPages(sourcePages, catalogs, releaseManifest);
await generateSitemap();
await verifyPublicReferences();

const files = await walk(outputRoot);
const htmlFiles = files.filter((path) => extname(path) === ".html");
const htmlInfoCache = new Map();

for (const htmlFile of htmlFiles) await readHtmlInfo(htmlFile);
await verifyLocalReferences(htmlFiles);
await verifySiteMetadata();
await verifySitemap();

console.log(
  `Built CoreRobin site: ${files.length} files, ${htmlFiles.length} HTML pages, ${SITE_LOCALES.length} languages.`,
);

async function loadSourcePages() {
  return new Map(await Promise.all(SITE_ROUTES.map(async (route) => [
    route.source,
    await readFile(join(sourceRoot, route.source), "utf8"),
  ])));
}

function verifyChineseCopy(sourcePages) {
  for (const [source, html] of sourcePages) {
    for (const phrase of discouragedChineseCopy) {
      if (html.includes(phrase)) {
        throw new Error(`Unnatural Chinese copy in ${source}: ${phrase}`);
      }
    }
  }
}

function collectRequiredTranslations(sourcePages) {
  const required = new Set();
  for (const route of SITE_ROUTES.filter((item) => localesForRoute(item).some(({ code }) => !["zh-CN", "en"].includes(code)))) {
    const html = sourcePages.get(route.source);
    for (const node of collectNodes(parse(html))) {
      for (const name of ["data-en", "data-content-en", "data-aria-en"]) {
        const value = attribute(node, name);
        if (value) required.add(value);
      }
    }
  }
  return [...required].sort((left, right) => left.localeCompare(right, "en"));
}

async function loadTranslationCatalogs(requiredTranslations) {
  const catalogs = new Map();
  for (const locale of SITE_LOCALES.filter(({ code }) => !["zh-CN", "en"].includes(code))) {
    const path = join(localeRoot, `${locale.code}.json`);
    let catalog;
    try {
      catalog = JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      throw new Error(`Missing or invalid site translation catalog: site-locales/${locale.code}.json`, { cause: error });
    }
    if (catalog.schemaVersion !== 1 || catalog.locale !== locale.code || typeof catalog.translations !== "object") {
      throw new Error(`Invalid site translation catalog header: site-locales/${locale.code}.json`);
    }
    const missing = requiredTranslations.filter((source) => !String(catalog.translations[source] ?? "").trim());
    const stale = Object.keys(catalog.translations).filter((source) => !requiredTranslations.includes(source));
    if (missing.length > 0 || stale.length > 0) {
      throw new Error(
        `Translation catalog ${locale.code} is out of sync: ${missing.length} missing, ${stale.length} stale.`,
      );
    }
    for (const source of requiredTranslations) verifyMarkupContract(source, catalog.translations[source], locale.code);
    catalogs.set(locale.code, catalog.translations);
  }
  return catalogs;
}

function verifyMarkupContract(source, translation, locale) {
  const tags = (value) => [...String(value).matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)]
    .map((match) => match[1].toLowerCase())
    .sort()
    .join(",");
  if (tags(source) !== tags(translation)) {
    throw new Error(`Translation ${locale} changed required HTML tags for: ${source}`);
  }
}

async function generateLocalizedPages(sourcePages, catalogs, releaseManifest) {
  for (const route of SITE_ROUTES) {
    const source = sourcePages.get(route.source);
    for (const locale of localesForRoute(route)) {
      const outputPath = join(outputRoot, outputPathForRoute(route, locale));
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(
        outputPath,
        localizeHtml(source, route, locale, catalogs.get(locale.code), releaseManifest),
        "utf8",
      );
    }
  }
}

function localizeHtml(html, route, locale, catalog, releaseManifest) {
  const document = parse(html);
  const nodes = collectNodes(document);
  const htmlNode = nodes.find((node) => node.tagName === "html");
  const head = nodes.find((node) => node.tagName === "head");
  setAttribute(htmlNode, "lang", locale.code);
  setAttribute(htmlNode, "data-language", locale.code);
  removeAttribute(htmlNode, "data-alternate-url");

  for (const node of nodes) {
    if (!node.tagName) continue;
    localizeNodeText(node, locale, catalog);
    localizeNodeAttribute(node, "content", "data-content-zh", "data-content-en", locale, catalog);
    localizeNodeAttribute(node, "aria-label", "data-aria-zh", "data-aria-en", locale, catalog);
    localizeProductScreenshot(node, locale);

    if (node.tagName === "a") {
      const href = attribute(node, "href");
      const localizedHref = localizeInternalHref(href, locale);
      if (localizedHref !== href) setAttribute(node, "href", localizedHref);
    }
    if (hasAttribute(node, "data-language-picker")) {
      const label = translate("Choose language", "选择语言", locale, catalog);
      replaceChildren(node, languagePickerMarkup(route, locale, label));
    }
    removeLocalizationAttributes(node);
  }

  const canonical = nodes.find((node) => node.tagName === "link" && hasToken(attribute(node, "rel"), "canonical"));
  const ogUrl = nodes.find((node) => node.tagName === "meta" && attribute(node, "property") === "og:url");
  if (canonical) setAttribute(canonical, "href", localizedUrl(route, locale));
  if (ogUrl) setAttribute(ogUrl, "content", localizedUrl(route, locale));
  replaceAlternateLinks(head, route);
  replaceOpenGraphLocales(head, route, locale);
  updateStructuredData(nodes, route, locale, releaseManifest);

  return serialize(document);
}

function localizeNodeText(node, locale, catalog) {
  const english = attribute(node, "data-en");
  const chinese = attribute(node, "data-zh");
  if (!english && !chinese) return;
  replaceChildren(node, translate(english, chinese, locale, catalog));
}

function localizeNodeAttribute(node, target, chineseName, englishName, locale, catalog) {
  const english = attribute(node, englishName);
  const chinese = attribute(node, chineseName);
  if (!english && !chinese) return;
  setAttribute(node, target, translate(english, chinese, locale, catalog));
}

function localizeProductScreenshot(node, locale) {
  const english = attribute(node, "data-src-en");
  const chinese = attribute(node, "data-src-zh");
  if (!english && !chinese) return;
  setAttribute(node, "src", locale.code === "zh-CN" ? chinese || english : english || chinese);
}

function translate(english, chinese, locale, catalog) {
  if (locale.code === "zh-CN") return chinese || english;
  if (locale.code === "en") return english || chinese;
  const translated = catalog?.[english];
  if (!translated) throw new Error(`Missing ${locale.code} translation for: ${english}`);
  return normalizeLocalizedText(locale.code, translated);
}

function replaceChildren(node, html) {
  const fragment = parseFragment(String(html));
  node.childNodes = fragment.childNodes;
  for (const child of node.childNodes) child.parentNode = node;
}

function languagePickerMarkup(route, locale, label) {
  const options = localesForRoute(route).map((option) => {
    const selected = option.code === locale.code ? " selected" : "";
    return `<option value="${escapeHtml(localizedRoute(route, option))}"${selected}>${escapeHtml(option.nativeName)}</option>`;
  }).join("");
  return `<span class="language-picker__icon" aria-hidden="true">文</span><select data-language-select aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${options}</select>`;
}

function localizeInternalHref(href, locale) {
  if (!href?.startsWith("/")) return href;
  const match = href.match(/^([^?#]*)([?#].*)?$/);
  const route = SITE_ROUTES.find(({ path }) => path === match?.[1]);
  return route ? `${localizedRoute(route, locale)}${match?.[2] ?? ""}` : href;
}

function replaceAlternateLinks(head, route) {
  head.childNodes = head.childNodes.filter((node) => !(
    node.tagName === "link" && hasToken(attribute(node, "rel"), "alternate") && attribute(node, "hreflang")
  ));
  const links = [
    ...localesForRoute(route).map((locale) => `<link rel="alternate" hreflang="${locale.code}" href="${localizedUrl(route, locale)}">`),
    `<link rel="alternate" hreflang="x-default" href="${localizedUrl(route, DEFAULT_SITE_LOCALE)}">`,
  ].join("");
  appendFragment(head, links);
}

function replaceOpenGraphLocales(head, route, locale) {
  head.childNodes = head.childNodes.filter((node) => !(
    node.tagName === "meta" && ["og:locale", "og:locale:alternate"].includes(attribute(node, "property"))
  ));
  appendFragment(head, [
    `<meta property="og:locale" content="${locale.ogLocale}">`,
    ...localesForRoute(route).filter(({ code }) => code !== locale.code)
      .map((item) => `<meta property="og:locale:alternate" content="${item.ogLocale}">`),
  ].join(""));
}

function appendFragment(parent, html) {
  const fragment = parseFragment(html);
  for (const child of fragment.childNodes) child.parentNode = parent;
  parent.childNodes.push(...fragment.childNodes);
}

function updateStructuredData(nodes, route, locale, releaseManifest) {
  const pageTitle = textContent(nodes.find((node) => node.tagName === "h1")).trim();
  const pageDescription = attribute(nodes.find((node) => (
    node.tagName === "meta" && attribute(node, "name") === "description"
  )), "content");
  for (const node of nodes.filter((item) => item.tagName === "script" && attribute(item, "type") === "application/ld+json")) {
    const raw = node.childNodes?.map((child) => child.value ?? "").join("") ?? "";
    const data = JSON.parse(raw);
    data.url = localizedUrl(route, locale);
    data.inLanguage = locale.code;
    if (data["@type"] === "TechArticle") {
      data.headline = pageTitle;
      data.description = pageDescription;
    }
    if (data["@type"] === "CollectionPage") {
      data.name = pageTitle;
      data.description = pageDescription;
    }
    if (data["@type"] === "SoftwareApplication" || Object.hasOwn(data, "softwareVersion")) {
      data.softwareVersion = releaseManifest.tagName.slice(1);
    }
    if (data.mainEntityOfPage) data.mainEntityOfPage = localizedUrl(route, locale);
    if (data.offers) data.offers.url = localizedUrl(SITE_ROUTES.find(({ path }) => path === "/download/"), locale);
    replaceChildren(node, JSON.stringify(data).replaceAll("<", "\\u003c"));
  }
}

async function generateSitemap() {
  const alternatesFor = (route) => [
    ...localesForRoute(route).map((locale) => `    <xhtml:link rel="alternate" hreflang="${locale.code}" href="${escapeXml(localizedUrl(route, locale))}" />`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localizedUrl(route, DEFAULT_SITE_LOCALE))}" />`,
  ].join("\n");
  const entries = SITE_ROUTES.flatMap((route) => localesForRoute(route).map((locale) => [
    "  <url>",
    `    <loc>${escapeXml(localizedUrl(route, locale))}</loc>`,
    alternatesFor(route),
    `    <changefreq>${route.changeFrequency}</changefreq>`,
    "  </url>",
  ].join("\n"))).join("\n");
  await writeFile(
    join(outputRoot, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries}\n</urlset>\n`,
    "utf8",
  );
}

async function verifySynchronizedDocs() {
  const manifestPath = join(repositoryRoot, "docs", ".source-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.schemaVersion !== 1 || !manifest.files || typeof manifest.files !== "object") {
    throw new Error("docs/.source-manifest.json must be a v1 source manifest.");
  }
  for (const [file, entry] of Object.entries(manifest.files)) {
    const content = await readFile(join(repositoryRoot, file));
    const actual = createHash("sha256").update(content).digest("hex");
    if (actual !== entry.sha256) throw new Error(`Synchronized public document is stale: ${file}`);
  }
}

async function verifyReleaseManifest() {
  const manifest = JSON.parse(await readFile(join(sourceRoot, "release-manifest.json"), "utf8"));
  const expectedIds = [
    "macos-arm64-dmg", "macos-x64-dmg", "windows-x64-exe",
    "windows-x64-msi", "linux-x64-appimage", "linux-x64-deb",
  ];
  if (!/^v\d+\.\d+\.\d+$/.test(manifest.tagName ?? "")) throw new Error("Release manifest requires a semver tagName.");
  const ids = manifest.installers?.map((asset) => asset.id) ?? [];
  if (ids.join(",") !== expectedIds.join(",")) throw new Error("Release manifest installer set is incomplete or out of order.");
  for (const asset of manifest.installers) {
    if (!asset.name || !Number.isFinite(asset.size) || asset.size <= 0 || !/^[a-f0-9]{64}$/i.test(asset.sha256 ?? "") || !isReleaseAssetUrl(asset.url, manifest.tagName)) {
      throw new Error(`Invalid release installer entry: ${asset.id}`);
    }
  }
  const evidence = manifest.evidence ?? [];
  const expectedEvidence = ["SHA256SUMS", "SHA256SUMS.sigstore.json", "corerobin.spdx.json"];
  if (evidence.map((asset) => asset.name).sort().join(",") !== expectedEvidence.sort().join(",")) {
    throw new Error("Release manifest is missing required verification evidence.");
  }
  for (const asset of evidence) {
    if (!Number.isFinite(asset.size) || asset.size <= 0 || !isReleaseAssetUrl(asset.url, manifest.tagName)) {
      throw new Error(`Invalid release verification entry: ${asset.name}`);
    }
  }
  return manifest;
}

function isReleaseAssetUrl(value, tag) {
  return typeof value === "string" && value.startsWith(`https://github.com/JimmyDaddy/corerobin-monitor/releases/download/${tag}/`);
}

async function verifyPublicReferences() {
  const files = await walk(repositoryRoot, new Set([".git", "node_modules", "site-dist", "test-results", "playwright-report"]));
  const textFiles = files.filter((path) => [".html", ".js", ".mjs", ".css", ".xml", ".txt", ".md", ".json", ".yml", ".yaml"].includes(extname(path)));
  for (const path of textFiles) {
    const content = await readFile(path, "utf8");
    for (const forbiddenReference of forbiddenPublicReferences) {
      if (content.includes(forbiddenReference)) {
        throw new Error(`Private or legacy reference in ${relative(repositoryRoot, path)}: ${forbiddenReference}`);
      }
    }
  }
}

async function verifyLocalReferences(htmlFiles) {
  for (const htmlFile of htmlFiles) {
    const { references } = await readHtmlInfo(htmlFile);
    for (const reference of references) {
      if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference)) continue;
      const hashIndex = reference.indexOf("#");
      const rawFragment = hashIndex >= 0 ? reference.slice(hashIndex + 1) : "";
      const referenceWithoutFragment = hashIndex >= 0 ? reference.slice(0, hashIndex) : reference;
      const [pathPart] = referenceWithoutFragment.split("?", 1);
      const target = !pathPart ? htmlFile : pathPart.startsWith("/")
        ? join(outputRoot, `.${pathPart}`)
        : resolve(dirname(htmlFile), pathPart);
      const resolvedTarget = pathPart?.endsWith("/") ? join(target, "index.html") : target;
      try {
        const targetStat = await stat(resolvedTarget);
        if (!targetStat.isFile()) throw new Error("not a file");
      } catch {
        throw new Error(`Broken local reference in ${relative(repositoryRoot, htmlFile)}: ${reference}`);
      }
      if (!rawFragment || extname(resolvedTarget) !== ".html") continue;
      let fragment;
      try {
        fragment = decodeURIComponent(rawFragment);
      } catch {
        throw new Error(`Invalid fragment in ${relative(repositoryRoot, htmlFile)}: ${reference}`);
      }
      const { ids } = await readHtmlInfo(resolvedTarget);
      if (!ids.has(fragment)) throw new Error(`Broken fragment in ${relative(repositoryRoot, htmlFile)}: ${reference}`);
    }
  }
}

async function verifySiteMetadata() {
  for (const route of SITE_ROUTES) {
    for (const locale of localesForRoute(route)) {
      await verifyStaticPage(join(outputRoot, outputPathForRoute(route, locale)), route, locale);
    }
  }
}

async function verifyStaticPage(path, route, locale) {
  const html = await readFile(path, "utf8");
  const document = parse(html);
  const nodes = collectNodes(document);
  const htmlNode = nodes.find((node) => node.tagName === "html");
  const title = textContent(nodes.find((node) => node.tagName === "title")).trim();
  const canonical = nodes.find((node) => node.tagName === "link" && hasToken(attribute(node, "rel"), "canonical"));
  const alternates = nodes.filter((node) => node.tagName === "link" && hasToken(attribute(node, "rel"), "alternate"));
  const ogTitle = nodes.find((node) => node.tagName === "meta" && attribute(node, "property") === "og:title");
  const ogDescription = nodes.find((node) => node.tagName === "meta" && attribute(node, "property") === "og:description");
  const ogImage = nodes.find((node) => node.tagName === "meta" && attribute(node, "property") === "og:image");
  const ogLocale = nodes.find((node) => node.tagName === "meta" && attribute(node, "property") === "og:locale");
  const twitter = nodes.find((node) => node.tagName === "meta" && attribute(node, "name") === "twitter:card");
  const h1Count = nodes.filter((node) => node.tagName === "h1").length;
  if (attribute(htmlNode, "lang") !== locale.code || attribute(htmlNode, "data-language") !== locale.code || h1Count !== 1 || !title || attribute(canonical, "href") !== localizedUrl(route, locale) || !ogTitle || !ogDescription || !ogImage || attribute(ogLocale, "content") !== locale.ogLocale || !twitter) {
    throw new Error(`Incomplete accessibility or SEO metadata in ${relative(outputRoot, path)}.`);
  }
  const alternateValues = new Map(alternates.map((node) => [attribute(node, "hreflang"), attribute(node, "href")]));
  for (const alternateLocale of localesForRoute(route)) {
    if (alternateValues.get(alternateLocale.code) !== localizedUrl(route, alternateLocale)) {
      throw new Error(`Missing ${alternateLocale.code} hreflang in ${relative(outputRoot, path)}.`);
    }
  }
  if (alternateValues.get("x-default") !== localizedUrl(route, DEFAULT_SITE_LOCALE)) {
    throw new Error(`Missing x-default hreflang in ${relative(outputRoot, path)}.`);
  }
  if (/data-(?:(?:content|aria|src)-)?(?:zh|en)=/.test(html)) {
    throw new Error(`Generated page still exposes source localization attributes: ${relative(outputRoot, path)}.`);
  }
  const globalNav = nodes.find((node) => node.tagName === "nav" && attribute(node, "id") === "site-navigation");
  const navLinks = collectNodes(globalNav).filter((node) => node.tagName === "a").map((node) => attribute(node, "href"));
  const expectedNavLinks = SITE_NAV_ROUTES.map((item) => localizedRoute(item, locale));
  if (navLinks.join(",") !== expectedNavLinks.join(",")) {
    throw new Error(`Inconsistent global navigation in ${relative(outputRoot, path)}.`);
  }
  const languageSelect = nodes.find((node) => node.tagName === "select" && hasAttribute(node, "data-language-select"));
  const options = collectNodes(languageSelect).filter((node) => node.tagName === "option");
  if (options.length !== localesForRoute(route).length || options.filter((node) => hasAttribute(node, "selected")).length !== 1) {
    throw new Error(`Incomplete language picker in ${relative(outputRoot, path)}.`);
  }
}

async function verifySitemap() {
  const sitemap = await readFile(join(outputRoot, "sitemap.xml"), "utf8");
  for (const route of SITE_ROUTES) {
    for (const locale of localesForRoute(route)) {
      if (!sitemap.includes(`<loc>${localizedUrl(route, locale)}</loc>`)) {
        throw new Error(`Sitemap is missing ${localizedRoute(route, locale)}`);
      }
      if (!sitemap.includes(`hreflang="${locale.code}" href="${localizedUrl(route, locale)}"`)) {
        throw new Error(`Sitemap is missing ${locale.code} alternate for ${route.path}`);
      }
    }
  }
}

async function readHtmlInfo(path) {
  if (htmlInfoCache.has(path)) return htmlInfoCache.get(path);
  const html = await readFile(path, "utf8");
  const references = [...html.matchAll(/(?:href|src)=(['"])(.*?)\1/g)].map((match) => match[2]);
  const idValues = [...html.matchAll(/\bid=(['"])(.*?)\1/g)].map((match) => match[2]);
  const ids = new Set();
  for (const id of idValues) {
    if (ids.has(id)) throw new Error(`Duplicate id in ${relative(repositoryRoot, path)}: ${id}`);
    ids.add(id);
  }
  const info = { references, ids };
  htmlInfoCache.set(path, info);
  return info;
}

async function walk(directory, ignored = new Set()) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.filter((entry) => !ignored.has(entry.name)).map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path, ignored) : [path];
  }));
  return nested.flat();
}

function collectNodes(node) {
  if (!node) return [];
  return [node, ...(node.childNodes ?? []).flatMap(collectNodes)];
}

function textContent(node) {
  return node ? (node.value ?? "") + (node.childNodes ?? []).map(textContent).join("") : "";
}

function attribute(node, name) {
  return node?.attrs?.find((item) => item.name === name)?.value ?? "";
}

function hasAttribute(node, name) {
  return node?.attrs?.some((item) => item.name === name) ?? false;
}

function setAttribute(node, name, value) {
  const existing = node.attrs?.find((item) => item.name === name);
  if (existing) existing.value = String(value);
  else (node.attrs ??= []).push({ name, value: String(value) });
}

function removeAttribute(node, name) {
  if (node?.attrs) node.attrs = node.attrs.filter((item) => item.name !== name);
}

function removeLocalizationAttributes(node) {
  if (node?.attrs) {
    node.attrs = node.attrs.filter(({ name }) => !/^data-(?:(?:content|aria|src)-)?(?:zh|en)$/.test(name));
  }
}

function hasToken(value, token) {
  return typeof value === "string" && value.split(/\s+/).includes(token);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
