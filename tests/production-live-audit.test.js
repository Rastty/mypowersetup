import test from "node:test";
import assert from "node:assert/strict";
import { moduleScriptSources, auditCaravanEntryReadback } from "../src/production-live-audit.js";

test("module asset comparison keeps versioned production entrypoints", () => {
  const html = `<!doctype html><script type="module" src="/src/app.js?v=one"></script><script src="/legacy.js"></script><script src='/src/analytics.js' type='module'></script>`;
  assert.deepEqual(moduleScriptSources(html), ["/src/app.js?v=one", "/src/analytics.js"]);
});

test("module asset extraction is safe for missing markup", () => {
  assert.deepEqual(moduleScriptSources(), []);
  assert.deepEqual(moduleScriptSources("<html></html>"), []);
});

const hero = (ids = ["weekend", "family", "work", "comfort"]) =>
  ids.map(id => `<a data-caravan-profile="${id}" href="#kalkulator"></a>`).join("") +
  '<script type="module" src="/src/caravan-entry.js?v=20261121-1"></script>' +
  '<link rel="stylesheet" href="/caravan-entry.css?v=20261121-1">';

test("production caravan audit proves all four cards and byte-identical served scripts and CSS", async () => {
  const report = await auditCaravanEntryReadback({
    localHtml: hero(),
    liveHtml: hero(),
    readLocalAsset: async path => path.endsWith(".css") ? "valid-css" : "valid-js",
    fetchLiveAsset: async route => route.includes(".css") ? "valid-css" : "valid-js",
  });
  assert.equal(report.ready, true);
  assert.deepEqual(report.scenarios, ["weekend", "family", "work", "comfort"]);
  assert.equal(report.checkedAssets, 2);
});

test("production caravan audit refuses missing preset and stale JS even if HTML succeeds", async () => {
  const report = await auditCaravanEntryReadback({
    localHtml: hero(),
    liveHtml: hero(["weekend", "family", "work"]),
    readLocalAsset: async () => "fresh",
    fetchLiveAsset: async () => "stale",
  });
  assert.equal(report.ready, false);
  assert.ok(report.failures.includes("CZ_CARAVAN_SCENARIOS_DRIFT"));
  assert.ok(report.failures.some(value => value.startsWith("CZ_CARAVAN_ASSET_DRIFT:")));
});

test("production caravan audit fails closed when asset cannot be fetched", async () => {
  const report = await auditCaravanEntryReadback({
    localHtml: hero(),
    liveHtml: hero(),
    readLocalAsset: async () => "fresh",
    fetchLiveAsset: async () => { throw new Error("offline"); },
  });
  assert.equal(report.ready, false);
  assert.equal(report.failures.filter(value => value.startsWith("CZ_CARAVAN_ASSET_FETCH_FAILED:")).length, 2);
});
