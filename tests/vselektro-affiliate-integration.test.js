import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildAffiliateUrl, normalizeProduct } from "../src/products.js";

const products = [
  {
    id: "slpo12-100n",
    url: "https://www.vselektro.eu/lifepo4-baterie-12v-100ah-sunstone-power-slpo12-100n/",
    capacityAh: 100,
    bmsA: 100,
  },
  {
    id: "slpo12-200n",
    url: "https://www.vselektro.eu/lifepo4-baterie-12v-200ah-slpo12-200n-hc200a-sunstone-power/",
    capacityAh: 200,
    bmsA: 200,
  },
];

test("approved VSelektro eHub deeplink retains publisher, programme and exact technical product", () => {
  for (const product of products) {
    const url = new URL(buildAffiliateUrl("vselektro", product.url));
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "ehub.cz");
    assert.equal(url.pathname, "/system/scripts/click.php");
    assert.equal(url.searchParams.get("a_aid"), "f34c86c8");
    assert.equal(url.searchParams.get("a_bid"), "f897865f");
    assert.equal(url.searchParams.get("desturl"), product.url);
    assert.equal([...url.searchParams.keys()].length, 3);
  }
});

test("VSelektro deeplinks fail closed for external domains, HTTP and homepages", () => {
  for (const bad of [
    "http://www.vselektro.eu/lifepo4-baterie-12v-100ah-sunstone-power-slpo12-100n/",
    "https://www.vselektro.eu.evil.example/product/",
    "https://example.com/product/",
    "https://www.vselektro.eu/",
  ]) assert.throws(() => buildAffiliateUrl("vselektro", bad));
});

test("VSelektro optional feed products normalize as batteries but don't invent availability", () => {
  const item = normalizeProduct({
    id: "slpo12-100n",
    name: "Sunstone Power 12V 100Ah LiFePO4 baterie",
    description: "12.8V 100Ah with BMS",
    category: "LiFePO4 baterie",
    url: products[0].url,
    price: "",
    available: "",
  }, "vselektro");
  assert.equal(item.category, "battery");
  assert.equal(item.specs.batteryType, "lifepo4");
  assert.equal(item.specs.capacityAh, 100);
  assert.equal(item.available, null);
  assert.equal(item.priceCzk, null);
});

test("Czech battery guide discloses exactly two merchant examples, without claiming calculated match", async () => {
  const html = await readFile("pruvodce/kapacita-baterie-do-karavanu/index.html", "utf8");
  const section = html.match(/<section\b[^>]*data-vselektro-cz-products[^>]*>([\s\S]*?)<\/section>/i)?.[1];
  assert.ok(section, "CZ guide should expose a clear example section");
  const links = [...section.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/gi)];
  const external = links.filter(([all]) => all.includes("rel=\"sponsored nofollow noopener\""));
  assert.equal(external.length, 2);
  for (let index=0; index<products.length;index++) {
    const decoded = external[index][1].replaceAll("&amp;", "&");
    assert.equal(decoded, buildAffiliateUrl("vselektro", products[index].url));
    assert.ok(section.includes(`data-vselektro-product="${products[index].id}"`));
    assert.ok(section.includes(`${products[index].bmsA} A`));
  }
  assert.match(section, /Nejde o univerzální doporučení/);
  assert.match(section, /100Ah varianta v tomto modelu nestačí/);
  assert.match(section, /cenu a dostupnost ověřte/i);
  assert.match(html, /"dateModified":"2026-10-13"/);
  const sitemap = await readFile("sitemap.xml", "utf8");
  const entry = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .find((match)=>match[1].includes("<loc>https://mypowersetup.com/pruvodce/kapacita-baterie-do-karavanu/</loc>"))?.[1];
  assert.match(entry||"", /<lastmod>2026-10-13<\/lastmod>/);
});
