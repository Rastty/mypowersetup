import { readdir, readFile } from "node:fs/promises";
import { HU_GUIDE_ROUTES } from "../src/guides-hu.js";
import { HU_POWER_STATION_GUIDE_ROUTE } from "../src/power-station-guide-hu.js";
import { HU_SYSTEM_GUIDE_ROUTE } from "../src/system-guide-hu.js";
import { HU_SYSTEM_VOLTAGE_GUIDE_ROUTE } from "../src/system-voltage-guide-hu.js";
import { assessMarketHealth, extractSitemapUrls, summarizeMarketHealth } from "../src/market-health.js";
import { renderHungarianPrivatePage } from "../src/page-hu.js";

const MARKETS = Object.freeze([
  { key: "cz", locale: "cs-CZ", expectedPublic: true, homepage: "index.html", canonicalUrl: "https://mypowersetup.com/", catalogs: ["data/products.json", "data/products-ampul-cz.json"], guideRoot: "pruvodce" },
  { key: "sk", locale: "sk-SK", expectedPublic: true, homepage: "sk/index.html", canonicalUrl: "https://mypowersetup.com/sk/", catalogs: ["data/products-sk.json"], guideRoot: "sk/sprievodca" },
  { key: "pl", locale: "pl-PL", expectedPublic: true, homepage: "pl/index.html", canonicalUrl: "https://mypowersetup.com/pl/", catalogs: ["data/products-pl.json"], guideRoot: "pl/poradnik" },
  {
    key: "hu", locale: "hu-HU", expectedPublic: false, homepageRenderer: renderHungarianPrivatePage, canonicalUrl: "https://mypowersetup.com/hu/", catalogs: ["data/products-hu.json"],
    preparedGuideCount: Object.keys(HU_GUIDE_ROUTES).filter((key) => key !== "hub").length
      + (HU_SYSTEM_GUIDE_ROUTE ? 1 : 0)
      + (HU_SYSTEM_VOLTAGE_GUIDE_ROUTE ? 1 : 0)
      + (HU_POWER_STATION_GUIDE_ROUTE ? 1 : 0),
  },
]);

const sitemapXml = await readFile("sitemap.xml", "utf8");
const sitemapUrls = extractSitemapUrls(sitemapXml);
const reports = [];
for (const market of MARKETS) {
  const [homepageHtml, catalogs, guideCount] = await Promise.all([
    market.homepageRenderer ? Promise.resolve(market.homepageRenderer()) : readFile(market.homepage, "utf8"),
    Promise.all(market.catalogs.map(async (path) => JSON.parse(await readFile(path, "utf8")))),
    Number.isInteger(market.preparedGuideCount) ? Promise.resolve(market.preparedGuideCount) : countGuideArticles(market.guideRoot),
  ]);
  reports.push(assessMarketHealth({ ...market, homepageHtml, catalogs, sitemapUrls, guideCount }));
}
const summary = summarizeMarketHealth(reports);
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), summary, markets: reports }, null, 2));
if (process.argv.includes("--require-safe") && !summary.safe) process.exitCode = 1;
if (process.argv.includes("--require-healthy") && !summary.allHealthy) process.exitCode = 1;

async function countGuideArticles(root) {
  const entries = await readdir(root, { withFileTypes: true, recursive: true });
  return entries.filter((entry) => entry.isFile() && entry.name === "index.html" && entry.parentPath !== root).length;
}
