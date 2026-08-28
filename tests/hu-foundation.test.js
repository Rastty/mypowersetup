import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HU_UI_COPY } from "../src/ui-copy-hu.js";

test("Hungarian UI copy covers the full calculator and purchase journey", () => {
  assert.match(HU_UI_COPY.hero.title, /akkumulátorra és napelemre/);
  assert.deepEqual(HU_UI_COPY.calculator.steps, ["Használat", "Fogyasztók", "Eredmény"]);
  assert.match(HU_UI_COPY.result.why, /Hogyan kaptuk/);
  assert.match(HU_UI_COPY.result.installation, /szakembernek/);
  assert.deepEqual(Object.keys(HU_UI_COPY.products.categories).sort(), [
    "battery", "controller", "dcCharger", "inverter", "powerStation", "shoreCharger", "solarPanel"
  ]);
  assert.match(HU_UI_COPY.products.affiliate, /jutalék nem módosítja/);
  assert.match(HU_UI_COPY.safety.text, /nem villamos tervet/);
});

test("Hungarian analytics copy is ready without activating an unfinished public route", async () => {
  const [analytics, sitemap, czech, slovak, polish] = await Promise.all([
    readFile("src/analytics.js", "utf8"),
    readFile("sitemap.xml", "utf8"),
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("pl/index.html", "utf8"),
  ]);
  assert.match(analytics, /Analitika engedélyezése/);
  assert.match(analytics, /\/hu\/adatvedelem\//);
  assert.doesNotMatch(sitemap, /mypowersetup\.com\/hu\//);
  for (const html of [czech, slovak, polish]) assert.doesNotMatch(html, /hreflang="hu-HU"/);
});
