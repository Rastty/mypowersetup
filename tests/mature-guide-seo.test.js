import test from "node:test";
import assert from "node:assert/strict";

import {
  articleModifiedDate,
  enhanceMatureGuideSeo,
  matureGuideRoutesFromSitemap,
  setSitemapLastmod,
} from "../src/mature-guide-seo.js";

function page(route, { language, dates = true, publisher = false } = {}) {
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "MPPT test",
    ...(language ? { inLanguage: language } : {}),
    ...(dates ? { datePublished: "2026-08-21", dateModified: "2026-08-21" } : {}),
    author: { "@type": "Person", name: "Petr Gálík" },
    ...(publisher ? { publisher: { "@type": "Organization", name: "MyPowerSetup" } } : {}),
    mainEntityOfPage: `https://mypowersetup.com${route}`,
  };
  return `<!doctype html><html><head><link rel="canonical" href="https://mypowersetup.com${route}"><script type="application/ld+json">${JSON.stringify(article)}</script></head><body><section class="article-hero"><div class="article-hero-inner"><div class="crumbs"><a href="/">Old</a></div><h1>Jak vybrat MPPT regulátor</h1></div></section></body></html>`;
}

test("mature guide SEO fills authority metadata and upgrades the existing visual crumbs semantically", () => {
  const route = "/pruvodce/jak-vybrat-mppt-regulator/";
  const output = enhanceMatureGuideSeo(page(route, { language: null, publisher: false }), route, {
    datePublished: "2026-08-20",
    dateModified: "2026-09-07",
  });

  assert.match(output, /data-mature-breadcrumbs/);
  assert.match(output, /aria-current="page">Jak vybrat MPPT regulátor/);
  assert.match(output, /"@type":"BreadcrumbList"/);
  assert.match(output, /"inLanguage":"cs-CZ"/);
  assert.match(output, /"publisher":\{"@type":"Organization","name":"MyPowerSetup","url":"https:\/\/mypowersetup.com\/"/);
  assert.match(output, /"author":\{"@type":"Person","name":"Petr Gálík","url":"https:\/\/mypowersetup.com\/o-projektu\/"/);
  assert.equal(articleModifiedDate(output), "2026-09-07");
  assert.equal((output.match(/data-mature-breadcrumbs/g) || []).length, 1);

  const second = enhanceMatureGuideSeo(output, route, {
    datePublished: "2026-08-20",
    dateModified: "2026-09-07",
  });
  assert.equal(second, output);
});

test("Hungarian guide gets truthful git-derived dates only when schema dates are absent", () => {
  const route = "/hu/utmutatok/mppt-szabalyozo-kivalasztasa/";
  const output = enhanceMatureGuideSeo(page(route, { language: "hu-HU", dates: false }), route, {
    datePublished: "2026-08-28",
    dateModified: "2026-09-02",
  });
  assert.match(output, /"datePublished":"2026-08-28"/);
  assert.match(output, /"dateModified":"2026-09-02"/);
  assert.match(output, /href="\/hu\/utmutatok\/"/);
  assert.match(output, /"publisher":\{"@type":"Organization","name":"MyPowerSetup"/);
});

test("existing publication date is preserved while dateModified advances to the newest truthful date", () => {
  const route = "/sk/sprievodca/ako-vybrat-mppt-regulator/";
  const output = enhanceMatureGuideSeo(page(route, { language: "sk-SK", publisher: true }), route, {
    datePublished: "2026-08-01",
    dateModified: "2026-09-01",
  });
  assert.match(output, /"datePublished":"2026-08-21"/);
  assert.match(output, /"dateModified":"2026-09-01"/);
});

test("mature route discovery and sitemap lastmod remain deterministic", () => {
  const xml = '<urlset><url><loc>https://mypowersetup.com/pruvodce/a/</loc></url><url><loc>https://mypowersetup.com/sk/sprievodca/b/</loc></url><url><loc>https://mypowersetup.com/pt/guias/c/</loc></url></urlset>';
  assert.deepEqual(matureGuideRoutesFromSitemap(xml), ["/pruvodce/a/", "/sk/sprievodca/b/"]);
  const updated = setSitemapLastmod(xml, "/pruvodce/a/", "2026-09-07");
  assert.match(updated, /<loc>https:\/\/mypowersetup.com\/pruvodce\/a\/<\/loc><lastmod>2026-09-07<\/lastmod>/);
});


test("regenerator keeps the original 52-guide baseline and accepts indexed comparison pages", async () => {
  const { readFile } = await import("node:fs/promises");
  const xml = await readFile("sitemap.xml", "utf8");
  const routes = matureGuideRoutesFromSitemap(xml);
  assert.equal(routes.length, 55);
  assert.equal(new Set(routes).size, 55);
  for (const slug of [
    "lifepo4-100ah-nebo-200ah-karavan",
    "victron-mppt-100-20-vs-100-30-vs-100-50",
    "dc-dc-nabijecka-18a-vs-30a-vs-50a-karavan",
  ]) {
    assert.ok(routes.includes("/pruvodce/" + slug + "/"));
  }
  const source = await readFile("scripts/sync-mature-guide-seo.mjs", "utf8");
  assert.match(source, /routes.length < 52/);
  assert.match(source, /new Set\(routes\)\.size !== routes\.length/);
  assert.doesNotMatch(source, /routes.length !== 52/);
});
