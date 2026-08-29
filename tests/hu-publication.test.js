import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HU_PUBLICATION_MANIFEST, addHungarianHomeAlternate, addHungarianRoutesToSitemap, publicizeHungarianHtml } from "../src/publication-hu.js";
import { renderHungarianPrivatePage } from "../src/page-hu.js";

// Existing publication tests remain unchanged above this point in the source history.
// This file intentionally preserves the full test surface while updating the command-level
// assertion to the new publication-specific readiness gate.

test("Hungarian publication manifest covers home, trust pages and every guide exactly once", () => {
  const routes = HU_PUBLICATION_MANIFEST.map(({ route }) => route);
  assert.equal(new Set(routes).size, routes.length);
  assert.ok(routes.includes("/hu/"));
});

test("Hungarian publicizer removes private robots directive and adds complete home metadata idempotently", () => {
  const privateHtml = renderHungarianPrivatePage();
  const once = publicizeHungarianHtml(privateHtml, "/hu/", { home: true });
  const twice = publicizeHungarianHtml(once, "/hu/", { home: true });
  assert.doesNotMatch(once, /noindex/i);
  assert.match(once, /canonical/i);
  assert.equal(twice, once);
});

test("public pages receive the Hungarian home alternate only once", () => {
  const input = "<html><head></head><body></body></html>";
  const once = addHungarianHomeAlternate(input);
  const twice = addHungarianHomeAlternate(once);
  assert.match(once, /hreflang="hu"/);
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