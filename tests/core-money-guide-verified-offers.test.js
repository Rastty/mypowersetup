import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { selectGuideOffers, guideCatalogFresh } from "../src/guide-verified-offers.js";

const routes = [
  ["pruvodce/kapacita-baterie-do-karavanu/", "battery"],
  ["pruvodce/jak-vybrat-mppt-regulator/", "controller"],
  ["pruvodce/jak-vybrat-dc-dc-nabijecku/", "dc_charger"],
];

test("three CZ core money guides render one fresh-SKU-gated offer container with a useful fallback", async () => {
  for (const [route, category] of routes) {
    const html = await readFile(new URL("../" + route + "index.html", import.meta.url), "utf8");
    assert.equal((html.match(/data-guide-category="/g) || []).length, 1, route);
    assert.ok(html.includes(`data-guide-category="${category}"`), route);
    assert.match(html, /guide-offer-fallback/, route);
    assert.match(html, /guide-verified-offers\.js\?v=20261110-dcdc-view1/, route);
    assert.match(html, /Nejde o automatickou shodu|nikoli potvrzení shody|Nejde o univerzální doporučení/, route);
    assert.ok(html.includes('href="/#kalkulator"'), route);
    const modified = html.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1];
    assert.ok(modified && modified >= "2026-11-07", route + ": credible publication date");
    assert.doesNotMatch(html, /<a[^>]+href="https:\/\/ehub\.cz\/system\/scripts\/click\.php/, route);
  }
});

test("changed core money guides expose actual lastmod in the main sitemap without new URLs", async () => {
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
  for (const [route] of routes) {
    const html = await readFile(new URL("../" + route + "index.html", import.meta.url), "utf8");
    const modified = html.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1];
    assert.ok(modified && modified >= "2026-11-07", route);
    const loc = `<loc>https://mypowersetup.com/${route}</loc><lastmod>${modified}</lastmod>`;
    assert.ok(sitemap.includes(loc), loc);
  }
});

function exactOffer(id, category, path) {
  const productUrl = "https://www.vselektro.eu" + path;
  const affiliateUrl = new URL("https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=f897865f");
  affiliateUrl.searchParams.set("desturl", productUrl);
  return {
    id, merchant: "vselektro", category, available: true,
    verifiedAt: "2026-10-14", offerObservedAt: "2026-11-07T08:55:00Z",
    priceCzk: 9999, priceCurrency: "CZK", name: "Verified SKU",
    productUrl, affiliateUrl: affiliateUrl.href,
  };
}

const offers = [
  exactOffer("vselektro:sunstone-slpo12-100n", "battery", "/lifepo4-baterie-12v-100ah-sunstone-power-slpo12-100n/"),
  exactOffer("vselektro:victron-smartsolar-100-20", "controller", "/solarni-regulator-victron-energy-mppt-smartsolar-100v-20a/"),
  exactOffer("vselektro:victron-orion-tr-12-12-18-isolated", "dc_charger", "/nabijecka-dc-dc-orion-tr-smart-12-12-18a/"),
];
const now = Date.parse("2026-11-07T09:00:00Z");
const catalog = (products = offers, status = "ok", generatedAt = "2026-11-07T08:59:00Z") => ({
  generatedAt, sources: { vselektro: { status } }, products,
});

test("all three guide categories show exact approved SKU from fresh and in-stock evidence", () => {
  for (const item of offers) {
    assert.deepEqual(selectGuideOffers(catalog(), item.category, now).map((p)=>p.id), [item.id], item.category);
  }
});

test("stale merchant, expired observation, unavailable SKU and redirected product all fail closed", () => {
  for (const item of offers) {
    assert.equal(selectGuideOffers(catalog(offers, "stale"), item.category, now).length, 0, item.id);
    assert.equal(selectGuideOffers(catalog(offers, "ok", "2026-11-01T08:59:00Z"), item.category, now).length, 0, item.id);
    assert.equal(selectGuideOffers(catalog(offers.map(p => p.id === item.id ? { ...p, offerObservedAt: "2026-11-01T08:55:00Z" } : p)), item.category, now).length, 0, item.id);
    assert.equal(selectGuideOffers(catalog(offers.map(p => p.id === item.id ? { ...p, available: false } : p)), item.category, now).length, 0, item.id);
    assert.equal(selectGuideOffers(catalog(offers.map(p => p.id === item.id ? { ...p, productUrl: "https://www.vselektro.eu/other-item/" } : p)), item.category, now).length, 0, item.id);
    assert.equal(selectGuideOffers(catalog([...offers, item]), item.category, now).length, 0, item.id);
  }
  assert.equal(guideCatalogFresh(catalog([], "failed"), now), false);
});
