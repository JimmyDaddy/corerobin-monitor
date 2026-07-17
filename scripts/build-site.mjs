import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "parse5";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(repositoryRoot, "site");
const outputRoot = join(repositoryRoot, "site-dist");
const siteOrigin = "https://monitor-app.corerobin.com";
const routes = [
  { source: "index.html", zh: "/", en: "/en/" },
  { source: "guide/index.html", zh: "/guide/", en: "/en/guide/" },
  { source: "download/index.html", zh: "/download/", en: "/en/download/" },
  { source: "privacy/index.html", zh: "/privacy/", en: "/en/privacy/" },
];
const forbiddenPublicReferences = [
  ["CoreRobin", "Internal"].join("-"),
  ["github.com/JimmyDaddy", "StatusOrbit"].join("/"),
  ["jimmydaddy.github.io", "StatusOrbit"].join("/"),
];

await verifySynchronizedDocs();
await verifyReleaseManifest();
await rm(outputRoot, { recursive: true, force: true });
await cp(sourceRoot, outputRoot, { recursive: true });
await generateEnglishPages();
await verifyPublicReferences();

const files = await walk(outputRoot);
const htmlFiles = files.filter((path) => extname(path) === ".html");
const htmlInfoCache = new Map();

for (const htmlFile of htmlFiles) await readHtmlInfo(htmlFile);
await verifyLocalReferences(htmlFiles);
await verifySiteMetadata();
await verifySitemap();

console.log(`Built CoreRobin site: ${files.length} files, ${htmlFiles.length} HTML pages.`);

async function generateEnglishPages() {
  for (const route of routes) {
    const sourcePath = join(outputRoot, route.source);
    const outputPath = join(outputRoot, route.en.slice(1), "index.html");
    const source = await readFile(sourcePath, "utf8");
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, localizeHtml(source, route), "utf8");
  }
}

function localizeHtml(html, route) {
  let translated = html.replace(/<html\b[^>]*>/i, (tag) => {
    let result = setAttribute(tag, "lang", "en");
    result = setAttribute(result, "data-language", "en");
    return setAttribute(result, "data-alternate-url", route.zh);
  });

  translated = translated.replace(/<[^>]+>/g, (tag) => {
    let result = tag;
    const englishContent = getAttribute(result, "data-content-en");
    const englishAria = getAttribute(result, "data-aria-en");
    if (englishContent !== null) result = setAttribute(result, "content", englishContent);
    if (englishAria !== null) result = setAttribute(result, "aria-label", englishAria);
    return result;
  });

  translated = translated.replace(
    /<([a-z][\w:-]*)([^>]*\bdata-en=(['"])(.*?)\3[^>]*)>([^<]*)<\/\1>/gi,
    (match, tagName, attributes, quote, english) => `<${tagName}${attributes}>${english}</${tagName}>`,
  );

  translated = translated.replace(/<a\b[^>]*>/gi, (tag) => localizeAnchor(tag));
  translated = translated.replace(/<(?:link|meta)\b[^>]*>/gi, (tag) => {
    const rel = getAttribute(tag, "rel");
    const property = getAttribute(tag, "property");
    if (hasToken(rel, "canonical")) return localizeUrlAttribute(tag, "href");
    if (property === "og:url") return localizeUrlAttribute(tag, "content");
    return tag;
  });
  return translated;
}

function localizeAnchor(tag) {
  const href = getAttribute(tag, "href");
  const target = routes.find((route) => route.zh === href);
  return target ? setAttribute(tag, "href", target.en) : tag;
}

function localizeUrlAttribute(tag, name) {
  const value = getAttribute(tag, name);
  const target = routes.find((route) => `${siteOrigin}${route.zh}` === value);
  return target ? setAttribute(tag, name, `${siteOrigin}${target.en}`) : tag;
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${escapeRegex(name)}=(["'])([\\s\\S]*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function setAttribute(tag, name, value) {
  const expression = new RegExp(`\\s${escapeRegex(name)}=(["'])([\\s\\S]*?)\\1`, "i");
  const escapedValue = String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  if (expression.test(tag)) return tag.replace(expression, ` ${name}="${escapedValue}"`);
  return tag.replace(/\s*\/?>(?=$)/, ` ${name}="${escapedValue}"$&`);
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
}

function isReleaseAssetUrl(value, tag) {
  return typeof value === "string" && value.startsWith(`https://github.com/JimmyDaddy/corerobin-monitor/releases/download/${tag}/`);
}

async function verifyPublicReferences() {
  const files = await walk(repositoryRoot, new Set([".git", "node_modules", "site-dist"]));
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
  for (const route of routes) {
    await verifyStaticPage(join(outputRoot, route.source), route.zh, "zh-CN", false);
    await verifyStaticPage(join(outputRoot, route.en.slice(1), "index.html"), route.en, "en", true);
  }
}

async function verifyStaticPage(path, route, language, expectsEnglish) {
  const html = await readFile(path, "utf8");
  const document = parse(html);
  const nodes = collectNodes(document);
  const htmlNode = nodes.find((node) => node.tagName === "html");
  const title = nodes.find((node) => node.tagName === "title")?.childNodes?.map((node) => node.value ?? "").join("").trim() ?? "";
  const canonical = nodes.find((node) => node.tagName === "link" && hasToken(attribute(node, "rel"), "canonical"));
  const alternates = nodes.filter((node) => node.tagName === "link" && hasToken(attribute(node, "rel"), "alternate"));
  const ogTitle = nodes.find((node) => node.tagName === "meta" && attribute(node, "property") === "og:title");
  const ogDescription = nodes.find((node) => node.tagName === "meta" && attribute(node, "property") === "og:description");
  const ogImage = nodes.find((node) => node.tagName === "meta" && attribute(node, "property") === "og:image");
  const twitter = nodes.find((node) => node.tagName === "meta" && attribute(node, "name") === "twitter:card");
  const h1Count = nodes.filter((node) => node.tagName === "h1").length;
  if (attribute(htmlNode, "lang") !== language || h1Count !== 1 || !title || !canonical || attribute(canonical, "href") !== `${siteOrigin}${route}` || !ogTitle || !ogDescription || !ogImage || !twitter) {
    throw new Error(`Incomplete accessibility or SEO metadata in ${relative(outputRoot, path)}.`);
  }
  const alternateValues = new Map(alternates.map((node) => [attribute(node, "hreflang"), attribute(node, "href")]));
  if (alternateValues.get("zh-CN") !== `${siteOrigin}${routes.find((item) => item.zh === route || item.en === route).zh}` || alternateValues.get("en") !== `${siteOrigin}${routes.find((item) => item.zh === route || item.en === route).en}`) {
    throw new Error(`Missing bidirectional hreflang links in ${relative(outputRoot, path)}.`);
  }
  if (expectsEnglish && /[\u4e00-\u9fff]/.test(title + attribute(ogTitle, "content") + attribute(ogDescription, "content"))) {
    throw new Error(`English static metadata still contains Chinese in ${relative(outputRoot, path)}.`);
  }
  const globalNav = nodes.find((node) => node.tagName === "nav" && attribute(node, "id") === "site-navigation");
  const navLinks = (globalNav?.childNodes ?? [])
    .filter((node) => node.tagName === "a")
    .map((node) => attribute(node, "href"));
  const expectedNavLinks = expectsEnglish
    ? ["/en/", "/en/download/", "/en/guide/", "/en/privacy/"]
    : ["/", "/download/", "/guide/", "/privacy/"];
  if (navLinks.join(",") !== expectedNavLinks.join(",")) {
    throw new Error(`Inconsistent global navigation in ${relative(outputRoot, path)}.`);
  }
}

async function verifySitemap() {
  const sitemap = await readFile(join(outputRoot, "sitemap.xml"), "utf8");
  for (const route of routes.flatMap((item) => [item.zh, item.en])) {
    if (!sitemap.includes(`${siteOrigin}${route}`)) throw new Error(`Sitemap is missing ${route}`);
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
  return [node, ...(node.childNodes ?? []).flatMap(collectNodes)];
}

function attribute(node, name) {
  return node?.attrs?.find((item) => item.name === name)?.value ?? "";
}

function hasToken(value, token) {
  return typeof value === "string" && value.split(/\s+/).includes(token);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
