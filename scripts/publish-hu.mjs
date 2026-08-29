import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderHungarianPrivatePage } from "../src/page-hu.js";
import { HU_TRUST_ROUTES, renderHungarianTrustPage } from "../src/trust-pages-hu.js";
import { HU_GUIDE_ROUTES, renderHungarianGuide } from "../src/guides-hu.js";
import { HU_SYSTEM_GUIDE_ROUTE, renderHungarianSystemGuide } from "../src/system-guide-hu.js";
import { HU_SYSTEM_VOLTAGE_GUIDE_ROUTE, renderHungarianSystemVoltageGuide } from "../src/system-voltage-guide-hu.js";
import { injectHungarianSystemGuideLink } from "../src/system-guide-link-hu.js";
import { requireHungarianLaunchReady } from "../src/readiness-hu.js";
import {
  HU_PUBLICATION_MANIFEST,
  addHungarianHomeAlternate,
  addHungarianRoutesToSitemap,
  publicizeHungarianHtml,
} from "../src/publication-hu.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const checkOnly = process.argv.includes("--check");
const catalog = JSON.parse(await readFile(resolve(root, "data/products-hu.json"), "utf8"));

const readiness = requireHungarianLaunchReady({
  catalog,
  languageReviewed: process.env.HU_LANGUAGE_REVIEWED === "true",
  mobileJourneyReviewed: process.env.HU_MOBILE_JOURNEY_REVIEWED === "true",
});

const plannedWrites = [];
for (const entry of HU_PUBLICATION_MANIFEST) {
  const privateHtml = renderEntry(entry);
  plannedWrites.push({
    path: resolve(root, entry.path),
    content: publicizeHungarianHtml(privateHtml, entry.route, { home: entry.source === "home" }),
  });
}

for (const relativePath of ["index.html", "sk/index.html", "pl/index.html"]) {
  const path = resolve(root, relativePath);
  plannedWrites.push({ path, content: addHungarianHomeAlternate(await readFile(path, "utf8")) });
}

const sitemapPath = resolve(root, "sitemap.xml");
plannedWrites.push({
  path: sitemapPath,
  content: addHungarianRoutesToSitemap(await readFile(sitemapPath, "utf8")),
});

if (checkOnly) {
  console.log(JSON.stringify({
    ready: readiness.ready,
    files: plannedWrites.map(({ path }) => path.slice(root.length + 1)),
  }, null, 2));
} else {
  for (const item of plannedWrites) {
    await mkdir(dirname(item.path), { recursive: true });
    await writeFile(item.path, item.content, "utf8");
  }
  console.log(`HU publication prepared: ${plannedWrites.length} files updated.`);
}

function renderEntry(entry) {
  if (entry.source === "home") return injectHungarianSystemGuideLink(renderHungarianPrivatePage());
  if (entry.source === "trust") {
    if (!Object.hasOwn(HU_TRUST_ROUTES, entry.key)) throw new Error(`HU_TRUST_PUBLICATION_UNKNOWN:${entry.key}`);
    return renderHungarianTrustPage(entry.key);
  }
  if (entry.source === "guide") {
    if (!Object.hasOwn(HU_GUIDE_ROUTES, entry.key)) throw new Error(`HU_GUIDE_PUBLICATION_UNKNOWN:${entry.key}`);
    const html = renderHungarianGuide(entry.key);
    return entry.key === "hub" ? injectHungarianSystemGuideLink(html) : html;
  }
  if (entry.source === "system-guide") {
    if (entry.route !== HU_SYSTEM_GUIDE_ROUTE) throw new Error(`HU_SYSTEM_GUIDE_PUBLICATION_UNKNOWN:${entry.route}`);
    return renderHungarianSystemGuide();
  }
  if (entry.source === "system-voltage-guide") {
    if (entry.route !== HU_SYSTEM_VOLTAGE_GUIDE_ROUTE) throw new Error(`HU_SYSTEM_VOLTAGE_GUIDE_PUBLICATION_UNKNOWN:${entry.route}`);
    return renderHungarianSystemVoltageGuide();
  }
  throw new Error(`HU_PUBLICATION_SOURCE_UNKNOWN:${entry.source}`);
}
