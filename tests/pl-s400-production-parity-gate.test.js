import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("PL S400 buyer guide, dynamic offers and source catalog trigger postdeployment public parity", async () => {
  const workflow = await readFile(".github/workflows/audit-live-html-parity.yml", "utf8");
  const push = workflow.slice(workflow.indexOf("  push:"), workflow.indexOf("permissions:"));
  assert.match(push, /branches: \[main,/);
  for (const path of ["pl/poradnik/**", "src/pl-s400-guide-offers.js", "data/products-pl.json"]) {
    assert.ok(push.includes("      - " + path), "missing main push trigger: " + path);
  }
  assert.match(workflow, /Wait for exact Pages commit or proven deployed descendant/);
  assert.match(workflow, /node scripts\/audit-live-html-parity\.mjs/);
  const audit = await readFile("scripts/audit-live-html-parity.mjs", "utf8");
  assert.match(audit, /await walk\(ROOT\)/);
  assert.match(audit, /const live = await fetchHtml\(entry\.path\)/);
  assert.match(audit, /if \(issues\.length\) process\.exitCode = 1/);
});

test("PL guide hub has truthful modified date identical to sitemap", async () => {
  const hub = await readFile("pl/poradnik/index.html", "utf8");
  const sitemap = await readFile("sitemap.xml", "utf8");
  assert.match(hub, /"dateModified":"2026-11-28"/);
  assert.match(sitemap, /<loc>https:\/\/mypowersetup\.com\/pl\/poradnik\/<\/loc><lastmod>2026-11-28<\/lastmod>/);
  assert.match(hub, /href="\/pl\/poradnik\/oxe-s400-czy-zestaw-sp100w-kamper\/"/);
});
