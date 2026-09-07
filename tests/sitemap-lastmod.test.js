import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { publicRoutePath } from "../src/public-seo-audit.js";

function sitemapEntries(xml) {
  const entries = new Map();
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const body = match[1];
    const loc = body.match(/<loc>https:\/\/mypowersetup\.com([^<]*)<\/loc>/)?.[1] || "/";
    const lastmod = body.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] || null;
    entries.set(loc || "/", lastmod);
  }
  return entries;
}

function articleModified(html) {
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const json = JSON.parse(match[1]);
      const nodes = Array.isArray(json?.["@graph"]) ? json["@graph"] : [json];
      const article = nodes.find((node) => node?.["@type"] === "Article");
      if (article) return article.dateModified || null;
    } catch {}
  }
  return null;
}

test("all 84 guide sitemap lastmod values match Article.dateModified", async () => {
  const xml = await readFile("sitemap.xml", "utf8");
  const entries = sitemapEntries(xml);
  const routes = [...entries.keys()].filter((route) =>
    (/^\/pruvodce\/.+\/$/.test(route) && route !== "/pruvodce/") ||
    (/^\/sk\/sprievodca\/.+\/$/.test(route) && route !== "/sk/sprievodca/") ||
    (/^\/pl\/poradnik\/.+\/$/.test(route) && route !== "/pl/poradnik/") ||
    (/^\/hu\/utmutatok\/.+\/$/.test(route) && route !== "/hu/utmutatok/") ||
    (/^\/pt\/guias\/.+\/$/.test(route) && route !== "/pt/guias/") ||
    (/^\/ro\/ghiduri\/.+\/$/.test(route) && route !== "/ro/ghiduri/") ||
    (/^\/si\/vodici\/.+\/$/.test(route) && route !== "/si/vodici/")
  );

  assert.equal(routes.length, 84);
  for (const route of routes) {
    const html = await readFile(publicRoutePath(route), "utf8");
    const modified = articleModified(html);
    assert.match(modified || "", /^\d{4}-\d{2}-\d{2}$/, `${route}: missing Article.dateModified`);
    assert.equal(entries.get(route), modified, `${route}: sitemap lastmod drift`);
  }
});

test("recently changed CZ and SK homes expose truthful lastmod", async () => {
  const entries = sitemapEntries(await readFile("sitemap.xml", "utf8"));
  assert.equal(entries.get("/"), "2026-09-07");
  assert.equal(entries.get("/sk/"), "2026-09-07");
});
