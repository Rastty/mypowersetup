import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HU_SYSTEM_GUIDE_ROUTE, renderHungarianSystemGuide } from "../src/system-guide-hu.js";
import { injectHungarianSystemGuideLink } from "../src/system-guide-link-hu.js";
import { HU_PUBLICATION_MANIFEST, publicizeHungarianHtml } from "../src/publication-hu.js";

test("Hungarian complete-system source stays private while its published route is indexed", async () => {
  const html = renderHungarianSystemGuide();
  const sitemap = await readFile("sitemap.xml", "utf8");

  assert.equal(HU_SYSTEM_GUIDE_ROUTE, "/hu/utmutatok/lakoauto-elektromos-rendszer-kapcsolasi-rajz/");
  assert.match(html, /<html lang="hu">/);
  assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.match(sitemap, new RegExp(`mypowersetup\\.com${HU_SYSTEM_GUIDE_ROUTE.replaceAll("/", "\\/")}`));
  assert.match(html, /MPPT töltésvezérlő/);
  assert.match(html, /lakótéri akkumulátor/);
  assert.match(html, /Balaton/);
  assert.match(html, /termálkemping/);
  assert.match(html, /600 × 2 × 1,15 ÷ 0,80 ÷ 12/);
  assert.match(html, /144 Ah LiFePO₄/);
  assert.match(html, /205 Wp/);
  assert.match(html, /27,8 A/);
  assert.match(html, /nem villamos terv/i);
  assert.doesNotMatch(html, /biztosíték[^.<]{0,50}\b\d+[,.]?\d*\s*A\b/i);
});

test("Hungarian system guide connects every major decision back to the calculator and detailed guides", () => {
  const html = renderHungarianSystemGuide();
  for (const route of [
    "/hu/#kalkulator",
    "/hu/utmutatok/",
    "/hu/utmutatok/lakoauto-akkumulator-kapacitas/",
    "/hu/utmutatok/hany-watt-napelem-lakoautohoz/",
    "/hu/utmutatok/mppt-szabalyozo-kivalasztasa/",
    "/hu/utmutatok/dc-dc-tolto-kivalasztasa/",
    "/hu/utmutatok/230-v-os-tolto-kivalasztasa/",
    "/hu/utmutatok/lakoauto-inverter-kivalasztasa/",
    "/hu/utmutatok/12-v-vezetekek-es-biztositekok/",
  ]) assert.ok(html.includes(`href="${route}"`), route);
});

test("Hungarian system guide becomes indexable only through the publication layer", () => {
  const privateHtml = renderHungarianSystemGuide();
  const publicHtml = publicizeHungarianHtml(privateHtml, HU_SYSTEM_GUIDE_ROUTE);
  assert.doesNotMatch(publicHtml, /noindex/);
  assert.match(publicHtml, new RegExp(`rel="canonical" href="https://mypowersetup\\.com${HU_SYSTEM_GUIDE_ROUTE.replaceAll("/", "\\/")}"`));
  assert.equal(publicizeHungarianHtml(publicHtml, HU_SYSTEM_GUIDE_ROUTE), publicHtml);
});

test("future Hungarian home and guide hub receive the system pillar link idempotently", () => {
  const shell = '<!doctype html><html lang="hu"><head></head><body><main><p>HU</p></main></body></html>';
  const once = injectHungarianSystemGuideLink(shell);
  const twice = injectHungarianSystemGuideLink(once);
  assert.match(once, new RegExp(`href="${HU_SYSTEM_GUIDE_ROUTE.replaceAll("/", "\\/")}"`));
  assert.match(once, /Teljes lakóautó-kapcsolási útmutató/);
  assert.equal(twice, once);
});

test("Hungarian publication manifest includes exactly one complete-system guide", () => {
  const entries = HU_PUBLICATION_MANIFEST.filter(({ source }) => source === "system-guide");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].route, HU_SYSTEM_GUIDE_ROUTE);
  assert.equal(entries[0].path, `${HU_SYSTEM_GUIDE_ROUTE.slice(1)}index.html`);
});