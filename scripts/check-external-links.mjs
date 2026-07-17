import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const targets = process.argv.length > 2
  ? process.argv.slice(2)
  : ["site-dist", "README.md", "README.en.md", "PRIVACY.md", "PRIVACY.en.md", "SECURITY.md", "SUPPORT.md", "docs"];
const files = (await Promise.all(targets.map(collectFiles))).flat();
const urls = new Set();

for (const path of files.filter((path) => [".html", ".md"].includes(extname(path)))) {
  const content = await readFile(path, "utf8");
  for (const match of content.matchAll(/(?:href|src)=(['"])(https?:\/\/[^"']+)\1|\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) {
    const value = match[2] ?? match[3];
    if (value && !value.includes("{\{")) urls.add(value);
  }
}

const externalUrls = [...urls].filter((url) => !isLocallyValidatedUrl(url));
const results = await mapWithConcurrency(externalUrls, 6, checkUrl);
const failures = results.filter((result) => !result.ok);
for (const result of results) console.log(`${result.ok ? "OK" : "FAIL"} ${result.status ?? "network"} ${result.url}`);
if (failures.length > 0) {
  throw new Error(`External link check failed for ${failures.length} URL(s).`);
}
console.log(`Checked ${results.length} external URL(s).`);

function isLocallyValidatedUrl(value) {
  const url = new URL(value);
  return url.origin === "https://monitor-app.corerobin.com"
    || (url.origin === "https://github.com" && url.pathname.startsWith("/JimmyDaddy/corerobin-monitor"));
}

async function checkUrl(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      let response = await fetch(url, { method: "HEAD", redirect: "follow", headers: { "User-Agent": "CoreRobin-site-check/1.0" }, signal: AbortSignal.timeout(15_000) });
      if (response.status === 405 || response.status === 501) {
        response = await fetch(url, { method: "GET", redirect: "follow", headers: { "User-Agent": "CoreRobin-site-check/1.0" }, signal: AbortSignal.timeout(15_000) });
      }
      if (response.ok || response.status === 403 || response.status === 429) return { ok: true, status: response.status, url };
      if (response.status < 500) return { ok: false, status: response.status, url };
    } catch {
      // Retry transient network failures below.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 350 * (attempt + 1)));
  }
  return { ok: false, url };
}

async function mapWithConcurrency(values, concurrency, task) {
  const output = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await task(values[index]);
    }
  }));
  return output;
}

async function collectFiles(target) {
  const path = resolve(target);
  const targetStat = await stat(path);
  return targetStat.isDirectory() ? walk(path) : [path];
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}
