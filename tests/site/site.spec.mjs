import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { SITE_LOCALES, SITE_ROUTES, localesForRoute, localizedRoute } from "../../scripts/site-locales.mjs";

const localizedRoutes = SITE_ROUTES.flatMap((route) => localesForRoute(route).map((locale) => ({
  path: localizedRoute(route, locale),
  route,
})));
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
];

for (const viewport of viewports) {
  for (const { path, route } of localizedRoutes) {
    test(`${viewport.name} ${path} renders without horizontal overflow`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "userAgent", {
          configurable: true,
          value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        });
        Object.defineProperty(navigator, "platform", { configurable: true, value: "MacIntel" });
      });
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("#site-navigation > a")).toHaveCount(6);
      await expect(page.locator("[data-language-select] > option")).toHaveCount(localesForRoute(route).length);
      await page.evaluate(() => document.fonts?.ready);
      await page.locator("[data-reveal]").evaluateAll((elements) => {
        for (const element of elements) {
          element.classList.add("is-revealed");
          element.style.setProperty("opacity", "1");
          element.style.setProperty("transform", "none");
          element.style.setProperty("transition", "none");
        }
      });

      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth + 1);

      await page.screenshot({
        path: testInfo.outputPath("screenshots", `${viewport.name}-${routeName(path)}.png`),
        fullPage: true,
        animations: "disabled",
      });
    });
  }
}

for (const { path } of localizedRoutes) {
  test(`axe accessibility check ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(path, { waitUntil: "networkidle" });
    await page.locator("[data-reveal]").evaluateAll((elements) => {
      for (const element of elements) {
        element.classList.add("is-revealed");
        element.style.setProperty("opacity", "1");
        element.style.setProperty("transform", "none");
        element.style.setProperty("transition", "none");
      }
    });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("mobile navigation manages focus and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  const toggle = page.locator("[data-nav-toggle]");
  await toggle.focus();
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#site-navigation > a").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("global navigation opens the cross-platform knowledge base", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator('#site-navigation a[href="/articles/"]').click();
  await page.waitForURL("**/articles/");
  await expect(page.locator('#site-navigation a[href="/articles/"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#macos")).toBeVisible();
  await expect(page.locator("#windows")).toBeVisible();
  await expect(page.locator("#linux")).toBeVisible();
});

test("language picker uses the matching static localized route", async ({ page }) => {
  await page.goto("/guide/", { waitUntil: "networkidle" });
  await page.locator("[data-language-select]").selectOption("/ja/guide/");
  await page.waitForURL("**/ja/guide/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://monitor-app.corerobin.com/ja/guide/");
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(SITE_LOCALES.length + 1);
});

test("release history starts with the current release manifest", async ({ page }) => {
  const manifest = JSON.parse(
    await readFile(new URL("../../site/release-manifest.json", import.meta.url), "utf8"),
  );

  for (const path of ["/releases/", "/en/releases/"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.locator(".release-timeline h2").first()).toHaveText(manifest.tagName);
  }
});

test("product screenshots match the page language", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator('.hero-proof__screen img')).toHaveAttribute(
    "src",
    "/assets/corerobin-daily-overview.jpg",
  );

  for (const path of ["/en/", "/zh-hant/", "/ja/"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.locator('.hero-proof__screen img')).toHaveAttribute(
      "src",
      "/assets/corerobin-daily-overview-en.png",
    );
  }
});

test("article language picker offers curated Chinese and English pages", async ({ page }) => {
  await page.goto("/articles/mac-running-slow/", { waitUntil: "networkidle" });
  await expect(page.locator("[data-language-select] > option")).toHaveCount(2);
  await page.locator("[data-language-select]").selectOption("/en/articles/mac-running-slow/");
  await page.waitForURL("**/en/articles/mac-running-slow/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://monitor-app.corerobin.com/en/articles/mac-running-slow/",
  );
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(3);
  await expect(page.locator('.article-source a[href*="support.apple.com"]')).toHaveCount(2);
});

test("knowledge pages expose page-specific structured data", async ({ page }) => {
  await page.goto("/articles/", { waitUntil: "networkidle" });
  const collection = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(collection)['@type']).toBe("CollectionPage");

  await page.goto("/articles/mac-storage-full/", { waitUntil: "networkidle" });
  const article = await page.locator('script[type="application/ld+json"]').first().textContent();
  const articleData = JSON.parse(article);
  expect(articleData['@type']).toBe("TechArticle");
  expect(articleData.headline).toBe("Mac 磁盘空间不足怎么清理");
  expect(articleData.mainEntityOfPage).toBe("https://monitor-app.corerobin.com/articles/mac-storage-full/");

  await page.goto("/articles/windows-troubleshooting/", { waitUntil: "networkidle" });
  const windowsArticle = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
  expect(windowsArticle['@type']).toBe("TechArticle");
  expect(windowsArticle.headline).toBe("Windows 电脑变慢与磁盘空间怎么排查");

  await page.goto("/articles/linux-troubleshooting/", { waitUntil: "networkidle" });
  const linuxArticle = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
  expect(linuxArticle['@type']).toBe("TechArticle");
  expect(linuxArticle.headline).toBe("Linux 电脑变慢与磁盘空间怎么排查");
});

for (const sample of [
  { name: "macOS", navigatorPlatform: "MacIntel", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36", platform: "macos" },
  { name: "Windows", navigatorPlatform: "Win32", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36", platform: "windows" },
  { name: "Linux", navigatorPlatform: "Linux x86_64", userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36", platform: "linux" },
]) {
  test(`download page recommends ${sample.name} without auto-downloading`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await stubNavigatorPlatform(page, sample);
    const downloads = [];
    page.on("download", (download) => downloads.push(download));
    await page.goto("/download/", { waitUntil: "networkidle" });
    await expect(page.locator(`[data-platform-recommendation="${sample.platform}"]`)).toBeVisible();
    await expect(page.locator(`[data-download-platform="${sample.platform}"]`)).toHaveClass(/is-recommended/);
    expect(downloads).toHaveLength(0);
  });
}

test("mobile browsers do not receive a desktop installer recommendation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubNavigatorPlatform(page, {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    navigatorPlatform: "iPhone",
    mobile: true,
  });
  await page.goto("/download/", { waitUntil: "networkidle" });
  await expect(page.locator("[data-platform-recommendation]:visible")).toHaveCount(0);
});

test("checksum command accepts both legacy nested and current flat asset names", async ({ page }) => {
  await page.goto("/download/", { waitUntil: "networkidle" });
  const command = page.locator('[data-release-command="checksum"]').first();
  await expect(command).toContainText("sed 's#  .*/#  #'");
  await expect(command).toContainText("shasum -a 256 -c -");
});

test("every installer in the release manifest resolves at GitHub", async ({ request }) => {
  const manifest = JSON.parse(await readFile(new URL("../../site/release-manifest.json", import.meta.url), "utf8"));
  for (const asset of [...manifest.installers, ...manifest.evidence]) {
    const status = await releaseAssetStatus(request, asset.url);
    expect([200, 206, 301, 302, 303, 307, 308], `${status} ${asset.url}`).toContain(status);
  }
});

async function releaseAssetStatus(request, url) {
  let lastStatus = 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      let response = await request.head(url, { failOnStatusCode: false, maxRedirects: 0, timeout: 20_000 });
      lastStatus = response.status();

      if ([405, 501].includes(lastStatus)) {
        response = await request.get(url, {
          failOnStatusCode: false,
          headers: { Range: "bytes=0-0" },
          maxRedirects: 0,
          timeout: 20_000,
        });
        lastStatus = response.status();
      }

      if (lastStatus < 500 && ![403, 429].includes(lastStatus)) return lastStatus;
    } catch {
      lastStatus = 0;
    }

    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }

  return lastStatus;
}

function routeName(route) {
  return route === "/" ? "zh-home" : route.replaceAll("/", "-").replace(/^-|-$/g, "");
}

async function stubNavigatorPlatform(page, sample) {
  await page.addInitScript(({ mobile = false, navigatorPlatform, userAgent }) => {
    Object.defineProperties(navigator, {
      platform: { configurable: true, value: navigatorPlatform },
      userAgent: { configurable: true, value: userAgent },
      userAgentData: {
        configurable: true,
        value: { mobile, platform: navigatorPlatform },
      },
    });
  }, sample);
}
