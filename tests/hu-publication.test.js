import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isHungarianPublishedRuntime } from "../src/app-hu.js";
import { HU_POWER_STATION_GUIDE_ROUTE } from "../src/power-station-guide-hu.js";
import { HU_SYSTEM_GUIDE_ROUTE } from "../src/system-guide-hu.js";
import { HU_SYSTEM_VOLTAGE_GUIDE_ROUTE } from "../src/system-voltage-guide-hu.js";
import {
  HU_PUBLICATION_MANIFEST,
  addHungarianHomeAlternate,
  addHungarianRoutesToSitemap,
  publicizeHungarianHtml,
} from "../src/publication-hu.js";

test("Hungarian publication manifest covers home, trust pages and every guide exactly once", () => {
  assert.equal(HU_PUBLICATION_MANIFEST.length, 18);
  assert.equal(new Set(HU_PUBLICATION_MANIFEST.map(({ route }) => route)).size, HU_PUBLICATION_MANIFEST.length);
  assert.equal(new Set(HU_PUBLICATION_MANIFEST.map(({ path }) => path)).size, HU_PUBLICATION_MANIFEST.length);
  assert.equal(HU_PUBLICATION_MANIFEST[0].route, "/hu/");
  assert.ok(HU_PUBLICATION_MANIFEST.every(({ route, path }) => route.startsWith("/hu/") && path.startsWith("hu/")));
  assert.deepEqual(HU_PUBLICATION_MANIFEST.filter(({ source }) => source === "system-guide").map(({ route }) => route), [HU_SYSTEM_GUIDE_ROUTE]);
  assert.deepEqual(HU_PUBLICATION_MANIFEST.filter(({ source }) => source === "system-voltage-guide").map(({ route }) => route), [HU_SYSTEM_VOLTAGE_GUIDE_ROUTE]);
  assert.deepEqual(HU_PUBLICATION_MANIFEST.filter(({ source }) => source === "power-station-guide").map(({ route }) => route), [HU_POWER_STATION_GUIDE_ROUTE]);
});

test("Hungarian publicizer removes private robots directive and adds complete home metadata idempotently", () => {
  const privateHtml = '<!doctype html><html><head><meta name="robots" content="noindex,nofollow,noarchive"><meta name="description" content="HU leírás"><title>HU kalkulátor</title></head><body></body></html>';
  const once = publicizeHungarianHtml(privateHtml, "/hu/", { home: true });
  const twice = publicizeHungarianHtml(once, "/hu/", { home: true });
  assert.doesNotMatch(once, /noindex/);
  assert.match(once, /rel="canonical" href="https:\/\/mypowersetup\.com\/hu\/"/);
  for (const locale of ["cs-CZ", "sk-SK", "pl-PL", "hu-HU", "x-default"]) assert.match(once, new RegExp(`hreflang="${locale}"`));
  assert.match(once, /globalThis\.__MPS_HU_PUBLICATION__=true/);
  assert.match(once, /property="og:title" content="HU kalkulátor"/);
  assert.match(once, /property="og:description" content="HU leírás"/);
  assert.match(once, /property="og:locale" content="hu_HU"/);
  assert.match(once, /name="twitter:card" content="summary_large_image"/);
  assert.match(once, /"@id":"https:\/\/mypowersetup\.com\/hu\/#calculator"/);
  assert.match(once, /"inLanguage":"hu-HU"/);
  assert.equal(twice, once);
});

test("Hungarian runtime is public only with the explicit release marker", () => {
  assert.equal(isHungarianPublishedRuntime({}), false);
  assert.equal(isHungarianPublishedRuntime({ __MPS_HU_PUBLICATION__: false }), false);
  assert.equal(isHungarianPublishedRuntime({ __MPS_HU_PUBLICATION__: true }), true);
});

test("public pages receive the Hungarian home alternate only once", () => {
  const input = '<head>\n<link rel="alternate" hreflang="pl-PL" href="https://mypowersetup.com/pl/" />\n<link rel="alternate" hreflang="x-default" href="https://mypowersetup.com/" />\n</head>';
  const once = addHungarianHomeAlternate(input);
  const twice = addHungarianHomeAlternate(once);
  assert.match(once, /hreflang="hu-HU" href="https:\/\/mypowersetup\.com\/hu\/"/);
  assert.ok(once.indexOf('hreflang="hu-HU"') < once.indexOf('hreflang="x-default"'));
  assert.equal(twice, once);
});

test("Hungarian sitemap publication is complete and idempotent", () => {
  const input = '<?xml version="1.0"?><urlset><url><loc>https://mypowersetup.com/</loc></url></urlset>';
  const once = addHungarianRoutesToSitemap(input);
  const twice = addHungarianRoutesToSitemap(once);
  for (const { route } of HU_PUBLICATION_MANIFEST) assert.match(once, new RegExp(`<loc>https://mypowersetup\\.com${route.replaceAll("/", "\\/")}</loc>`));
  assert.equal(twice, once);
});

test("Hungarian publish command cannot write before publication readiness passes", async () => {
  const script = await readFile("scripts/publish-hu.mjs", "utf8");
  assert.match(script, /requireHungarianPublicationReady\(\{/);
  assert.ok(script.indexOf("requireHungarianPublicationReady({") < script.indexOf("writeFile(item.path"));
  assert.match(script, /HU_LANGUAGE_REVIEWED/);
  assert.match(script, /HU_MOBILE_JOURNEY_REVIEWED/);
});
