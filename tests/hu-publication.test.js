import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  HU_PUBLICATION_MANIFEST,
  addHungarianHomeAlternate,
  addHungarianRoutesToSitemap,
  publicizeHungarianHtml,
} from "../src/publication-hu.js";

test("Hungarian publication manifest covers home, trust pages and every guide exactly once", () => {
  assert.equal(HU_PUBLICATION_MANIFEST.length, 15);
  assert.equal(new Set(HU_PUBLICATION_MANIFEST.map(({ route }) => route)).size, HU_PUBLICATION_MANIFEST.length);
  assert.equal(new Set(HU_PUBLICATION_MANIFEST.map(({ path }) => path)).size, HU_PUBLICATION_MANIFEST.length);
  assert.equal(HU_PUBLICATION_MANIFEST[0].route, "/hu/");
  assert.ok(HU_PUBLICATION_MANIFEST.every(({ route, path }) => route.startsWith("/hu/") && path.startsWith("hu/")));
});

test("Hungarian publicizer removes private robots directive and adds canonical metadata idempotently", () => {
  const privateHtml = '<!doctype html><html><head><meta name="robots" content="noindex,nofollow,noarchive"><title>HU</title></head><body></body></html>';
  const once = publicizeHungarianHtml(privateHtml, "/hu/", { home: true });
  const twice = publicizeHungarianHtml(once, "/hu/", { home: true });
  assert.doesNotMatch(once, /noindex/);
  assert.match(once, /rel="canonical" href="https:\/\/mypowersetup\.com\/hu\/"/);
  for (const locale of ["cs-CZ", "sk-SK", "pl-PL", "hu-HU", "x-default"]) {
    assert.match(once, new RegExp(`hreflang="${locale}"`));
  }
  assert.equal(twice, once);
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

test("Hungarian publish command cannot write before launch readiness passes", async () => {
  const script = await readFile("scripts/publish-hu.mjs", "utf8");
  assert.match(script, /requireHungarianLaunchReady\(\{/);
  assert.ok(script.indexOf("requireHungarianLaunchReady({") < script.indexOf("writeFile(item.path"));
  assert.match(script, /HU_LANGUAGE_REVIEWED/);
  assert.match(script, /HU_MOBILE_JOURNEY_REVIEWED/);
});
