import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeSetupQuery } from "../src/setup-url.js";
import { APPLIANCES } from "../src/catalog-pl.js";

const PAGE = "pl/poradnik/zasilanie-kampera-na-weekend/index.html";
const CANONICAL = "https://mypowersetup.com/pl/poradnik/zasilanie-kampera-na-weekend/";

function extractPresetHref(html) {
  const match = html.match(/href="(\/pl\/\?loads=[^"]+#kalkulator)"/);
  assert.ok(match, "PL weekend scenario must expose a prefilled Polish calculator CTA");
  return match[1].replaceAll("&amp;", "&");
}

function structuredDataNodes(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((match) => {
      try {
        const json = JSON.parse(match[1]);
        return Array.isArray(json?.["@graph"]) ? json["@graph"] : [json];
      } catch {
        return [];
      }
    });
}

test("PL weekend scenario is canonical, indexable and carries a valid calculator preset", () => {
  const html = readFileSync(PAGE, "utf8");
  assert.match(html, /<html lang="pl">/);
  assert.ok(html.includes(`<link rel="canonical" href="${CANONICAL}">`));
  assert.doesNotMatch(html, /noindex/i);
  assert.match(html, /utm_source=scenario_page/);
  assert.match(html, /utm_campaign=pl_weekend/);

  const href = extractPresetHref(html);
  const parsed = new URL(href, "https://mypowersetup.com");
  const config = decodeSetupQuery(parsed.search, APPLIANCES.map((item) => item.id));
  assert.ok(config, "PL weekend preset must decode");
  assert.deepEqual(config.appliances.map((item) => item.id), ["fridge", "lights", "phones", "pump"]);
  assert.equal(config.autonomyDays, "2");
  assert.equal(config.season, "summer");
  assert.equal(config.batteryType, "lifepo4");
  assert.equal(config.systemVoltage, "auto");
});

test("PL weekend scenario answers battery-size intent and exposes FAQ structured data", () => {
  const html = readFileSync(PAGE, "utf8");
  assert.match(html, /czy 100 Ah wystarczy/i);
  assert.match(html, /100, 150 czy 200 Ah/i);
  assert.match(html, /132 Ah LiFePO₄/);
  assert.match(html, /1440 Wh/);
  assert.match(html, /1920 Wh/);
  assert.match(html, /poniżej 0 °C/);
  assert.match(html, /victronenergy\.com/);

  const faq = structuredDataNodes(html).find((node) => node?.["@type"] === "FAQPage");
  assert.ok(faq, "PL weekend scenario must expose FAQPage structured data");
  assert.equal(faq.mainEntity?.length, 3);
});

test("PL weekend scenario measures early and late calculator CTA positions", () => {
  const html = readFileSync(PAGE, "utf8");
  assert.match(html, /data-guide-top-cta/);
  assert.match(html, /data-guide-conversion-cta/);
  assert.equal((html.match(/utm_campaign=pl_weekend/g) || []).length, 2);
});

test("PL weekend scenario is linked from the Polish guide hub and scenario sitemap", () => {
  const guideHub = readFileSync("pl/poradnik/index.html", "utf8");
  const sitemap = readFileSync("sitemap-scenarios.xml", "utf8");
  const path = new URL(CANONICAL).pathname;
  assert.ok(guideHub.includes(`href="${path}"`), "Polish guide hub must link to the weekend scenario");
  assert.ok(sitemap.includes(`<loc>${CANONICAL}</loc>`), "PL weekend scenario must be in the declared scenario sitemap");
  assert.match(sitemap, /<loc>https:\/\/mypowersetup\.com\/pl\/poradnik\/zasilanie-kampera-na-weekend\/<\/loc>\s*<lastmod>2026-09-11<\/lastmod>/);
});

test("PL high-intent guides route readers into the weekend scenario", () => {
  const path = new URL(CANONICAL).pathname;
  for (const guide of [
    "pl/poradnik/pojemnosc-akumulatora-do-kampera/index.html",
    "pl/poradnik/ile-wat-paneli-solarnych-do-kampera/index.html",
    "pl/poradnik/agm-czy-lifepo4/index.html",
    "pl/poradnik/zuzycie-lodowki-kompresorowej/index.html",
  ]) {
    const html = readFileSync(guide, "utf8");
    assert.ok(html.includes(`href="${path}"`), `${guide} must link to the PL weekend scenario`);
  }
});
