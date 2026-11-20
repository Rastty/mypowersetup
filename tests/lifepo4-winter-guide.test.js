import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = "/pruvodce/lifepo4-baterie-zima-karavan/";
const source = readFileSync(`.${route}index.html`, "utf8");
const hub = readFileSync("pruvodce/index.html", "utf8");
const neighbor = readFileSync("pruvodce/agm-vs-lifepo4/index.html", "utf8");
const sitemap = readFileSync("sitemap.xml", "utf8");

test("winter LiFePO4 guide has distinct seasonal intent, canonical, authorship and indexable links", () => {
  assert.match(source, /<title>LiFePO4 v zimě v karavanu:/);
  const title = source.match(/<title>([^<]+)<\/title>/)?.[1] || "";
  const description = source.match(/<meta name="description" content="([^"]+)"/)?.[1] || "";
  assert.ok(title.length >= 35 && title.length <= 60, `title ${title.length}`);
  assert.ok(description.length >= 110 && description.length <= 160, `description ${description.length}`);
  assert.match(source, new RegExp(`<link rel="canonical" href="https://mypowersetup.com${route}"`));
  const scripts = [...source.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const article = scripts.find((x) => x["@type"] === "Article");
  const crumbs = scripts.find((x) => x["@type"] === "BreadcrumbList");
  assert.equal(article.datePublished, "2026-11-20");
  assert.equal(article.inLanguage, "cs-CZ");
  assert.equal(article.author.name, "Petr Gálík");
  assert.equal(crumbs.itemListElement.at(-1).item, `https://mypowersetup.com${route}`);
  assert.equal((sitemap.match(/\/pruvodce\/lifepo4-baterie-zima-karavan\//g) || []).length, 1);
  assert.match(hub, new RegExp(route));
  assert.match(neighbor, new RegExp(route));
});

test("winter guide distinguishes manufacturer cold thresholds and does not sell unverified winter compatibility", () => {
  assert.match(source, /LiFePO₄ může mít odlišné teplotní limity/);
  assert.match(source, /Lithium Smart.*?\+5 °C/s);
  assert.match(source, /Lithium NG/);
  assert.match(source, /BMS musí řídit všechny tři zdroje/);
  assert.match(source, /MPPT, DC–DC a síťovou nabíječku/);
  assert.match(source, /nejdřív spotřebují příchozí energii na ohřev/);
  assert.match(source, /<strong>nikoli parametr prodávané baterie<\/strong>/);
  assert.match(source, /<strong>nejsou certifikací vhodnosti do mrazu<\/strong>/);
  assert.match(source, /https:\/\/www.victronenergy.com\/media\/pg\/Lithium_NG_battery_/);
  assert.match(source, /https:\/\/www.ipowerqueen.de\/en\/blogs\/purchasing-guide/);
  assert.match(source, /href="\/kalkulacky\/kapacita-baterie\/"/);
  assert.doesNotMatch(source, /data-guide-category="battery"|data-affiliate-click/);
});

test("guide hub structured ItemList includes the new distinct seasonal page exactly once", () => {
  const json = hub.match(/<script type="application\/ld\+json" data-guide-hub-schema>([\s\S]*?)<\/script>/)?.[1];
  const graph = JSON.parse(json)["@graph"];
  const itemList = graph.find((item) => item["@type"] === "ItemList");
  assert.equal(itemList.numberOfItems, itemList.itemListElement.length);
  assert.equal(itemList.itemListElement.filter((item) => item.item.endsWith(route)).length, 1);
  const uniqueLinks = [];
  for (const match of hub.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)) {
    if (/data-guide-hub-related/.test(match[0])) continue;
    if (match[1].startsWith("/pruvodce/") && match[1] !== "/pruvodce/" && !uniqueLinks.includes(match[1])) uniqueLinks.push(match[1]);
  }
  assert.deepEqual(itemList.itemListElement.map((item) => item.item), uniqueLinks.map((href) => `https://mypowersetup.com${href}`));
});
