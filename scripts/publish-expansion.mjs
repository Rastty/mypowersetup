import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { PT_REVIEW_EVIDENCE } from "../src/review-evidence-pt.js";
import { SI_REVIEW_EVIDENCE } from "../src/review-evidence-si.js";
import { RO_REVIEW_EVIDENCE } from "../src/review-evidence-ro.js";
import { addExpansionHomeAlternate, addExpansionRoutesToSitemap, assessExpansionNativeApproval, expansionPublicationManifest, publicizeExpansionHtml, publishedExpansionMarketsFromSitemap, requireExpansionNativeApproval } from "../src/expansion-publication.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const market = argValue("--market");
const checkOnly = process.argv.includes("--check");
const dryRun = process.argv.includes("--dry-run") || checkOnly;
const config = marketConfig(market);
const approval = assessExpansionNativeApproval(market, config.review);

if (!approval.ready && checkOnly) {
  console.log(JSON.stringify({
    market,
    ready: false,
    dryRun: true,
    blockers: approval.blockers,
    review: {
      nativeLanguageReview: config.review.nativeLanguageReview === true,
      publicPublicationApproved: config.review.publicPublicationApproved === true,
      checklistApproved: approval.checklist.approved,
    },
    routes: expansionPublicationManifest(market).map(({ route }) => route),
  }, null, 2));
  process.exitCode = 1;
} else {
  requireExpansionNativeApproval(market, config.review);
  const manifest = expansionPublicationManifest(market);
  const sitemapPath = resolve(root, "sitemap.xml");
  const sitemapXml = await readFile(sitemapPath, "utf8");
  const existingExpansionMarkets = publishedExpansionMarketsFromSitemap(sitemapXml, { exclude: market });
  const plannedWrites = [];

  for (const entry of manifest) {
    const privateHtml = entry.source === "home" ? renderPrivateMarketSeedPage(config.seed) : config.render(entry.route);
    if (!privateHtml) throw new Error(`EXPANSION_PUBLICATION_RENDER_MISSING:${market}:${entry.route}`);
    let publicHtml = publicizeExpansionHtml(privateHtml, market, entry.route, { home: entry.source === "home" });
    if (entry.source === "home") {
      for (const existingMarket of existingExpansionMarkets) publicHtml = addExpansionHomeAlternate(publicHtml, existingMarket);
    }
    plannedWrites.push({ path: resolve(root, entry.path), content: publicHtml });
  }

  for (const relativePath of ["index.html", "sk/index.html", "pl/index.html", "hu/index.html"]) {
    const path = resolve(root, relativePath);
    plannedWrites.push({ path, content: addExpansionHomeAlternate(await readFile(path, "utf8"), market) });
  }

  for (const existingMarket of existingExpansionMarkets) {
    const existingHome = expansionPublicationManifest(existingMarket)[0];
    const path = resolve(root, existingHome.path);
    plannedWrites.push({ path, content: addExpansionHomeAlternate(await readFile(path, "utf8"), market) });
  }

  plannedWrites.push({ path: sitemapPath, content: addExpansionRoutesToSitemap(sitemapXml, market) });

  const report = {
    market,
    ready: true,
    dryRun,
    blockers: [],
    existingExpansionMarkets,
    files: plannedWrites.map(({ path }) => path.slice(root.length + 1)),
    routes: manifest.map(({ route }) => route),
  };
  if (dryRun) console.log(JSON.stringify(report, null, 2));
  else {
    for (const item of plannedWrites) {
      await mkdir(dirname(item.path), { recursive: true });
      await writeFile(item.path, item.content, "utf8");
    }
    console.log(JSON.stringify({ ...report, written: plannedWrites.length }, null, 2));
  }
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`EXPANSION_PUBLISH_ARGUMENT_REQUIRED:${flag}`);
  return process.argv[index + 1];
}

function marketConfig(key) {
  if (key === "pt") return { seed: PT_MARKET_SEED, review: PT_REVIEW_EVIDENCE, render: renderPortugalPrivateContentPage };
  if (key === "si") return { seed: SI_MARKET_SEED, review: SI_REVIEW_EVIDENCE, render: renderSloveniaPrivateContentPage };
  if (key === "ro") return { seed: RO_MARKET_SEED, review: RO_REVIEW_EVIDENCE, render: renderRomaniaPrivateContentPage };
  throw new Error(`EXPANSION_PUBLICATION_UNKNOWN:${key}`);
}
