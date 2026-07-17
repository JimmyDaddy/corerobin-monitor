document.documentElement.classList.add("js");

const root = document.documentElement;
const languageButton = document.querySelector("[data-language-toggle]");
const languageLabel = document.querySelector("[data-language-label]");
const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const guideSelect = document.querySelector("[data-guide-jump]");

const robinSvg = `
  <svg viewBox="0 0 220 220" focusable="false">
    <ellipse class="animated-robin__shadow" cx="106" cy="190" rx="50" ry="8"></ellipse>
    <g class="animated-robin__tail">
      <path class="animated-robin__tail-back" d="M82 133 27 176 76 164 97 142Z"></path>
      <path class="animated-robin__tail-coral" d="m79 151-37 30 38-15 16-22Z"></path>
    </g>
    <g class="animated-robin__body">
      <path class="animated-robin__body-fill" d="m68 76 38-23 35 14 15 39-18 51-33 25-39-17-15-38 6-32Z"></path>
      <path class="animated-robin__breast" d="m72 108 39-17 31 16-12 47-26 21-29-16-15-31Z"></path>
      <path class="animated-robin__wing" d="m68 96 40-10 19 22-21 32-34 10-12-25Z"></path>
      <path class="animated-robin__wing-fold" d="m72 126 32 13 17-28"></path>
      <path class="animated-robin__status" d="m53 100 6-6 6 6-6 6Z"></path>
    </g>
    <g class="animated-robin__head-track">
      <g class="animated-robin__head">
        <path class="animated-robin__head-fill" d="m87 62 18-27 35 1 19 18-9 28-28 14-29-14Z"></path>
        <path class="animated-robin__cheek" d="m121 72 32-16-3 25-20 11-15-10Z"></path>
        <path class="animated-robin__beak" d="m153 57 22 10-24 8Z"></path>
        <g class="animated-robin__eye">
          <ellipse cx="132" cy="55" rx="5" ry="5.5"></ellipse>
          <circle class="animated-robin__eye-light" cx="133.5" cy="53.5" r="1.35"></circle>
        </g>
      </g>
    </g>
    <g class="animated-robin__scanner">
      <path class="animated-robin__scanner-track" d="M34 111h151"></path>
      <path class="animated-robin__scanner-beam" d="M34 111h50"></path>
    </g>
  </svg>`;

document.querySelectorAll("[data-robin]").forEach((robin) => {
  robin.classList.add("animated-robin", "is-interactive");
  robin.dataset.active = robin.dataset.robinActive === "true" ? "true" : "false";
  robin.dataset.mood = robin.dataset.robinMood ?? "normal";
  robin.innerHTML = robinSvg;
  robin.addEventListener("pointermove", trackRobinPointer);
  robin.addEventListener("pointerleave", resetRobinPointer);
});

function trackRobinPointer(event) {
  if (
    event.pointerType !== "mouse"
    || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) return;

  const bounds = event.currentTarget.getBoundingClientRect();
  const horizontal = clamp((event.clientX - bounds.left) / bounds.width - 0.5, -0.5, 0.5) * 2;
  const vertical = clamp((event.clientY - bounds.top) / bounds.height - 0.5, -0.5, 0.5) * 2;
  event.currentTarget.style.setProperty("--robin-head-x", `${(horizontal * 4.5).toFixed(2)}px`);
  event.currentTarget.style.setProperty("--robin-head-y", `${(vertical * 2.5).toFixed(2)}px`);
  event.currentTarget.style.setProperty("--robin-head-turn", `${(horizontal * 3.4).toFixed(2)}deg`);
  event.currentTarget.style.setProperty("--robin-eye-x", `${(horizontal * 1.7).toFixed(2)}px`);
  event.currentTarget.style.setProperty("--robin-eye-y", `${(vertical * 1.2).toFixed(2)}px`);
}

function resetRobinPointer(event) {
  event.currentTarget.style.removeProperty("--robin-head-x");
  event.currentTarget.style.removeProperty("--robin-head-y");
  event.currentTarget.style.removeProperty("--robin-head-turn");
  event.currentTarget.style.removeProperty("--robin-eye-x");
  event.currentTarget.style.removeProperty("--robin-eye-y");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

languageButton?.addEventListener("click", () => {
  const alternateUrl = root.dataset.alternateUrl;
  if (alternateUrl) window.location.assign(alternateUrl);
});

if (languageLabel) languageLabel.textContent = root.dataset.language === "en" ? "中文" : "EN";

function closeNavigation({ restoreFocus = false } = {}) {
  nav?.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
  if (restoreFocus) navToggle?.focus();
}

navToggle?.addEventListener("click", (event) => {
  const expanded = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!expanded));
  nav?.classList.toggle("is-open", !expanded);
  if (!expanded && event.detail === 0) nav?.querySelector("a")?.focus();
});

nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNavigation));
window.addEventListener("resize", () => {
  if (window.innerWidth > 760) closeNavigation();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !nav?.classList.contains("is-open")) return;
  closeNavigation({ restoreFocus: true });
});

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 16);
}
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

if (window.matchMedia?.("(pointer: fine)").matches) {
  document.querySelectorAll(".capability").forEach((card) => {
    let pointerFrame;
    card.addEventListener("pointermove", (event) => {
      const { clientX, clientY } = event;
      if (pointerFrame !== undefined) window.cancelAnimationFrame(pointerFrame);
      pointerFrame = window.requestAnimationFrame(() => {
        const bounds = card.getBoundingClientRect();
        card.style.setProperty("--spotlight-x", `${clientX - bounds.left}px`);
        card.style.setProperty("--spotlight-y", `${clientY - bounds.top}px`);
        pointerFrame = undefined;
      });
    });
    card.addEventListener("pointerleave", () => {
      if (pointerFrame !== undefined) window.cancelAnimationFrame(pointerFrame);
      pointerFrame = undefined;
      card.style.removeProperty("--spotlight-x");
      card.style.removeProperty("--spotlight-y");
    });
  });
}

const revealElements = [...document.querySelectorAll("[data-reveal]")];
revealElements.forEach((element) => {
  const delay = Number(element.dataset.delay ?? 0);
  element.style.setProperty("--reveal-delay", `${Math.max(0, delay)}ms`);
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-revealed"));
}

const guideLinks = [...document.querySelectorAll(".guide-sidebar nav a")];
const guideSections = guideLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if (guideSections.length > 0) {
  let scrollFrame;

  function setActiveGuideSection(section) {
    guideLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${section.id}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    if (guideSelect) guideSelect.value = `#${section.id}`;
  }

  function updateActiveGuideSection() {
    scrollFrame = undefined;
    const marker = Math.min(180, window.innerHeight * 0.24);
    let activeSection = guideSections[0];

    guideSections.forEach((section) => {
      if (section.getBoundingClientRect().top <= marker) activeSection = section;
    });

    const atPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atPageEnd) activeSection = guideSections[guideSections.length - 1];
    setActiveGuideSection(activeSection);
  }

  function scheduleGuideUpdate() {
    if (scrollFrame !== undefined) return;
    scrollFrame = window.requestAnimationFrame(updateActiveGuideSection);
  }

  guideLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const section = document.querySelector(link.getAttribute("href"));
      if (section) setActiveGuideSection(section);
    });
  });

  updateActiveGuideSection();
  window.addEventListener("scroll", scheduleGuideUpdate, { passive: true });
  window.addEventListener("resize", scheduleGuideUpdate);
}

guideSelect?.addEventListener("change", () => {
  const section = document.querySelector(guideSelect.value);
  section?.scrollIntoView();
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const code = button.parentElement?.querySelector("code")?.textContent ?? "";
    if (!code) return;
    const isEnglish = root.dataset.language === "en";
    const status = button.parentElement?.querySelector("[data-copy-status]");
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = isEnglish ? "Copied" : "已复制";
      if (status) status.textContent = isEnglish ? "Command copied." : "命令已复制。";
      window.setTimeout(() => {
        button.textContent = isEnglish ? "Copy command" : "复制命令";
        if (status) status.textContent = "";
      }, 1400);
    } catch {
      button.textContent = isEnglish ? "Copy failed" : "复制失败";
      if (status) status.textContent = isEnglish ? "Could not copy the command." : "无法复制命令。";
    }
  });
});

const downloadRoot = document.querySelector("[data-download-root]");
const releaseRoot = document.querySelector("[data-release-root]");

if (downloadRoot || releaseRoot) {
  if (downloadRoot) recommendPlatform();
  loadReleaseManifest();
}

async function loadReleaseManifest() {
  try {
    const response = await fetch("/release-manifest.json", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Release manifest request failed: ${response.status}`);
    applyReleaseManifest(await response.json());
  } catch (error) {
    console.warn("Could not load the CoreRobin release manifest.", error);
    document.querySelectorAll("[data-release-version]").forEach((element) => {
      element.textContent = root.dataset.language === "en"
        ? "Release information is temporarily unavailable."
        : "暂时无法读取 Release 信息。";
    });
  }
}

function applyReleaseManifest(manifest) {
  const isEnglish = root.dataset.language === "en";
  const installerList = manifest.installers ?? manifest.assets ?? [];
  const assets = new Map(installerList.map((asset) => [asset.id, asset]));
  const evidence = new Map((manifest.evidence ?? []).map((asset) => [
    asset.id ?? ({ SHA256SUMS: "sha256sums", "SHA256SUMS.sigstore.json": "sigstore-bundle", "corerobin.spdx.json": "sbom" }[asset.name]),
    asset,
  ]));
  let selectedAsset = assets.get("macos-arm64-dmg") ?? installerList[0];

  document.querySelectorAll("[data-release-version]").forEach((element) => {
    const published = manifest.publishedAt ? new Intl.DateTimeFormat(isEnglish ? "en" : "zh-CN", {
      year: "numeric", month: "short", day: "numeric",
    }).format(new Date(manifest.publishedAt)) : "";
    element.textContent = `${manifest.tagName ?? manifest.tag}${published ? ` · ${published}` : ""}`;
  });
  document.querySelectorAll("[data-release-url]").forEach((element) => {
    element.href = manifest.releaseUrl;
  });
  const verificationSelect = document.querySelector("[data-verification-select]");

  document.querySelectorAll("[data-asset-id], [data-recommended-asset]").forEach((link) => {
    const asset = assets.get(link.dataset.assetId ?? link.dataset.recommendedAsset);
    if (!asset) return;
    link.href = asset.url;
    link.setAttribute("download", asset.name);
    const meta = link.querySelector("[data-asset-meta]");
    if (meta) meta.textContent = `${asset.format} · ${formatFileSize(asset.size ?? asset.sizeBytes, isEnglish)}`;
    const choose = () => {
      selectedAsset = asset;
      if (verificationSelect instanceof HTMLSelectElement) verificationSelect.value = asset.id;
      updateVerificationCommands(selectedAsset, evidence, manifest, isEnglish);
    };
    link.addEventListener("mouseenter", choose);
    link.addEventListener("focus", choose);
  });

  if (verificationSelect instanceof HTMLSelectElement) {
    verificationSelect.replaceChildren(...installerList.map((asset) => {
      const option = document.createElement("option");
      option.value = asset.id;
      option.textContent = `${asset.platform === "macos" ? "macOS" : asset.platform === "windows" ? "Windows" : "Linux"} · ${asset.architecture} · ${asset.format}`;
      return option;
    }));
    verificationSelect.value = selectedAsset?.id ?? "";
    verificationSelect.addEventListener("change", () => {
      selectedAsset = assets.get(verificationSelect.value) ?? selectedAsset;
      updateVerificationCommands(selectedAsset, evidence, manifest, isEnglish);
    });
  }

  updateVerificationCommands(selectedAsset, evidence, manifest, isEnglish);
}

function updateVerificationCommands(asset, evidence, manifest, isEnglish) {
  if (!asset) return;
  const sums = evidence.get("sha256sums");
  const sigstore = evidence.get("sigstore-bundle");
  const sbom = evidence.get("sbom");
  const baseCommand = sums
    ? `curl -LO "${asset.url}"\ncurl -LO "${sums.url}"\ngrep ' ${asset.name}$' ${sums.name} | shasum -a 256 -c -`
    : "";
  const provenanceCommand = sigstore && sums
    ? `curl -LO "${sums.url}"\ncurl -LO "${sigstore.url}"\ncosign verify-blob --bundle ${sigstore.name} --certificate-identity-regexp '^https://github\\.com/.+/.github/workflows/release\\.yml@refs/tags/.+$' --certificate-oidc-issuer https://token.actions.githubusercontent.com ${sums.name}`
    : "";
  document.querySelectorAll('[data-release-command="checksum"]').forEach((element) => { element.textContent = baseCommand; });
  document.querySelectorAll('[data-release-command="sigstore"]').forEach((element) => { element.textContent = provenanceCommand; });
  document.querySelectorAll("[data-release-evidence]").forEach((element) => {
    const links = [sums, sbom, sigstore].filter(Boolean).map((item) => `<a href="${item.url}">${item.name}</a>`).join(" · ");
    element.innerHTML = isEnglish
      ? `Release ${manifest.tagName ?? manifest.tag}: ${links}`
      : `Release ${manifest.tagName ?? manifest.tag} 验证材料：${links}`;
  });
}

function formatFileSize(bytes, isEnglish) {
  return new Intl.NumberFormat(isEnglish ? "en" : "zh-CN", {
    maximumFractionDigits: bytes >= 10_000_000 ? 1 : 0,
  }).format(bytes / 1_000_000) + " MB";
}

function recommendPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = navigator.userAgentData?.mobile === true
    || /android|iphone|ipad|ipod/.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isMobile) return;
  const platform = [navigator.userAgentData?.platform, navigator.platform, navigator.userAgent]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const target = platform.includes("mac")
    ? "macos"
    : platform.includes("win")
      ? "windows"
      : platform.includes("linux")
        ? "linux"
        : null;
  if (!target) return;
  document.querySelector(`[data-download-platform="${target}"]`)?.classList.add("is-recommended");
  const recommendation = document.querySelector(`[data-platform-recommendation="${target}"]`);
  if (recommendation instanceof HTMLElement) recommendation.hidden = false;
}
