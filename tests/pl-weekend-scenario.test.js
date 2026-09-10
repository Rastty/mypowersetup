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

test("PL weekend scenario is linked from the Polish guide hub and scenario sitemap", () => {
  const guideHub = readFileSync("pl/poradnik/index.html", "utf8");
  const sitemap = readFileSync("sitemap-scenarios.xml", "utf8");
  const path = new URL(CANONICAL).pathname;
  assert.ok(guideHub.includes(`href="${path}"`), "Polish guide hub must link to the weekend scenario");
  assert.ok(sitemap.includes(`<loc>${CANONICAL}</loc>`), "PL weekend scenario must be in the declared scenario sitemap");
});

test("PL battery and solar intent pages route readers into the weekend scenario", () => {
  const path = new URL(CANONICAL).pathname;
  for (const guide of [
    "pl/poradnik/pojemnosc-akumulatora-do-kampera/index.html",
    "pl/poradnik/ile-wat-paneli-solarnych-do-kampera/index.html",
  ]) {
    const html = readFileSync(guide, "utf8");
    assert.ok(html.includes(`href="${path}"`), `${guide} must link to the PL weekend scenario`);
  }
});
