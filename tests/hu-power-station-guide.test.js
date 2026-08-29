import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HU_POWER_STATION_GUIDE_ROUTE, renderHungarianPowerStationGuide } from "../src/power-station-guide-hu.js";
import { HU_PUBLICATION_MANIFEST, addHungarianRoutesToSitemap, publicizeHungarianHtml } from "../src/publication-hu.js";
import { injectHungarianSystemGuideLink } from "../src/system-guide-link-hu.js";

test("Hungarian power station source stays private while the published route is indexed", async () => {
  const html = renderHungarianPowerStationGuide();
  const sitemap = await readFile("sitemap.xml", "utf8");
  assert.match(html, /<html lang="hu">/);
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.equal(/rel="canonical"/.test(html), false);
  assert.equal(sitemap.includes(`https://mypowersetup.com${HU_POWER_STATION_GUIDE_ROUTE}`), true);
  assert.match(html, /Magyar példa/);
  assert.match(html, /Power station vagy beépített rendszer/);
  assert.match(html, /href="\/hu\/#kalkulator"/);
  assert.match(html, /lakoauto-elektromos-rendszer-kapcsolasi-rajz/);
  assert.match(html, /12-v-vagy-24-v-lakoauto/);
  assert.match(html, /soha ne tápláld vissza/);
});

test("Hungarian power station guide is publicized only through publication machinery", () => {
  const privateHtml = renderHungarianPowerStationGuide();
  const publicHtml = publicizeHungarianHtml(privateHtml, HU_POWER_STATION_GUIDE_ROUTE);
  assert.equal(publicHtml.includes("noindex,nofollow,noarchive"), false);
  assert.ok(publicHtml.includes(`rel="canonical" href="https://mypowersetup.com${HU_POWER_STATION_GUIDE_ROUTE}"`));
  const entry = HU_PUBLICATION_MANIFEST.find(({ route }) => route === HU_POWER_STATION_GUIDE_ROUTE);
  assert.ok(entry);
  assert.equal(entry.source, "power-station-guide");
});

test("Hungarian publication sitemap contains the published power-station route idempotently", async () => {
  const sitemap = await readFile("sitemap.xml", "utf8");
  const published = addHungarianRoutesToSitemap(sitemap);
  assert.equal(sitemap.includes(HU_POWER_STATION_GUIDE_ROUTE), true);
  assert.ok(published.includes(`https://mypowersetup.com${HU_POWER_STATION_GUIDE_ROUTE}`));
  assert.equal(published, sitemap);
});

test("Hungarian launch-only guide promotion includes power station decision guide", () => {
  const html = injectHungarianSystemGuideLink("<html><body><main><p>Teszt</p></main></body></html>");
  assert.ok(html.includes(`href="${HU_POWER_STATION_GUIDE_ROUTE}"`));
  assert.match(html, /Power station vagy beépített rendszer/);
});

test("Hungarian guide contains no Czech, Slovak or Polish localization leaks", () => {
  const html = renderHungarianPowerStationGuide().toLowerCase();
  for (const leak of ["český scénář", "slovenský scenár", "polski scenariusz", "pevná instalace", "stała instalacja", "spočítat", "vypočítať"]) {
    assert.equal(html.includes(leak), false, `Localization leak: ${leak}`);
  }
});