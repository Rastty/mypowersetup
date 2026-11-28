import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = "/pruvodce/solarni-panely-seriove-nebo-paralelne-karavan/";
const html = readFileSync(`.${route}index.html`, "utf8");
const hub = readFileSync("pruvodce/index.html", "utf8");
const neighbor = readFileSync("pruvodce/kolik-w-solarnich-panelu/index.html", "utf8");
const sitemap = readFileSync("sitemap.xml", "utf8");

test("solar wiring guide is an independent indexable evergreen buyer path with honest metadata", () => {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || "";
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || "";
  assert.ok(title.length >= 35 && title.length <= 60, title);
  assert.ok(description.length >= 110 && description.length <= 160, description);
  assert.match(title, /sériově, nebo paralelně/);
  assert.match(html, new RegExp(`<link rel="canonical" href="https://mypowersetup.com${route}"`));
  const schemas = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const article = schemas.find(x => x["@type"] === "Article");
  const crumbs = schemas.find(x => x["@type"] === "BreadcrumbList");
  assert.equal(article.datePublished, "2026-11-20");
  assert.equal(article.dateModified, "2026-11-20");
  assert.equal(article.author.name, "Petr Gálík");
  assert.equal(article.inLanguage, "cs-CZ");
  assert.equal(crumbs.itemListElement.at(-1).item, `https://mypowersetup.com${route}`);
  assert.equal((sitemap.match(/\/pruvodce\/solarni-panely-seriove-nebo-paralelne-karavan\//g) || []).length, 1);
  assert.ok(sitemap.includes(`<loc>https://mypowersetup.com${route}</loc><lastmod>2026-11-20</lastmod>`));
  assert.ok(hub.includes(`href="${route}"`));
  assert.ok(neighbor.includes(`href="${route}"`), "existing solar sizing guide links back");
});

test("solar series and parallel guide protects the exact electrical-fit and purchase boundary", () => {
  for (const phrase of [
    "hypotetické", "Voc 22 V", "Vmp 18 V", "Isc 6 A", "44 V", "11,12 A", "12 A",
    "teplotní koeficient Voc", "absolutního maximálního PV napětí", "povolený vstupní zkratový proud",
    "nejnižší návrhovou teplotu", "MC4", "Bypass diody", "dva nezávislé MPPT",
    "BMS", "není konkrétní sestava ověřena",
  ]) assert.ok(html.includes(phrase), `missing safety or calculation rule: ${phrase}`);
  assert.match(html, /https:\/\/www\.victronenergy\.com\/media\/pg\/The_Wiring_Unlimited_book\/en\/dc-wiring\.html/);
  assert.match(html, /https:\/\/www\.victronenergy\.com\/media\/pg\/Manual_SmartSolar_MPPT_75-10_up_to_100-20/);
  assert.match(html, /https:\/\/www\.victronenergy\.com\/blog\/2015\/11\/10\/connecting-different-sized/);
  assert.ok(html.includes('href="/kalkulacky/mppt-regulator/"'));
  assert.ok(html.includes('href="/kalkulacky/solarni-panely/"'));
  assert.ok(html.includes('href="/pruvodce/kabely-a-pojistky-12-v/"'));
  assert.doesNotMatch(html, /data-guide-category=|data-affiliate-click|data-product-id=/,
    "do not claim a verified buyer SKU without exact PV evidence");
});

test("Czech guide hub ItemList includes solar wiring route once in the same visible order", () => {
  const raw = hub.match(/<script type="application\/ld\+json" data-guide-hub-schema>([\s\S]*?)<\/script>/)?.[1];
  const list = JSON.parse(raw)["@graph"].find(x => x["@type"] === "ItemList");
  assert.equal(list.numberOfItems, 18);
  assert.equal(list.itemListElement.length, 18);
  assert.deepEqual(list.itemListElement.map(x => x.position), Array.from({length:18},(_,i)=>i+1));
  assert.equal(list.itemListElement.filter(x => x.item.endsWith(route)).length, 1);
  const visible = [];
  for (const match of hub.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)) {
    if (/data-guide-hub-related/.test(match[0])) continue;
    if (match[1].startsWith("/pruvodce/") && match[1] !== "/pruvodce/" && !visible.includes(match[1])) visible.push(match[1]);
  }
  assert.deepEqual(list.itemListElement.map(x => x.item),visible.map(x => `https://mypowersetup.com${x}`));
  assert.ok(sitemap.includes("<loc>https://mypowersetup.com/pruvodce/kolik-w-solarnich-panelu/</loc><lastmod>2026-11-28</lastmod>"));
  assert.ok(neighbor.includes('"dateModified":"2026-11-28"'));
});
