import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { auditPublicSeo, publicRoutePath, sitemapRoutes } from "../src/public-seo-audit.js";

const schema = (items) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": items })}</script>`;
const page = ({ route, schemas = [], robots = "" }) => `<html><head>${robots}<link href="https://mypowersetup.com${route}" rel="canonical">${schema(schemas)}</head></html>`;

test("public SEO audit accepts calculator and localized article schema", async () => {
  const pages = new Map([
    ["index.html", page({ route: "/", schemas: [{ "@type": "WebSite" }, { "@type": "WebApplication" }] })],
    ["pt/guias/bateria/index.html", page({ route: "/pt/guias/bateria/", schemas: [{ "@type": "Article", inLanguage: "pt-PT" }] })],
  ]);
  const report = await auditPublicSeo({
    sitemapXml: '<urlset><url><loc>https://mypowersetup.com/</loc></url><url><loc>https://mypowersetup.com/pt/guias/bateria/</loc></url></urlset>',
    readPage: async (path) => pages.get(path),
  });
  assert.equal(report.ready, true);
  assert.equal(report.routeCount, 2);
  assert.equal(report.articlePages, 1);
  assert.deepEqual(report.failures, []);
});

test("public SEO audit fails closed on canonical, robots, JSON-LD and article language defects", async () => {
  const broken = '<html><head><meta name="robots" content="noindex"><link rel="canonical" href="https://mypowersetup.com/wrong"><script type="application/ld+json">{broken</script></head></html>';
  const report = await auditPublicSeo({
    sitemapXml: '<urlset><url><loc>https://mypowersetup.com/ro/ghiduri/baterie/</loc></url></urlset>',
    readPage: async () => broken,
  });
  assert.equal(report.ready, false);
  for (const blocker of ["CANONICAL_INVALID", "NOINDEX_PUBLIC", "JSON_LD_INVALID", "ARTICLE_SCHEMA_MISSING"]) {
    assert.ok(report.failures.some((failure) => failure.endsWith(blocker)));
  }
});

test("sitemap route and file mapping remain deterministic", () => {
  assert.deepEqual(sitemapRoutes('<loc>https://mypowersetup.com/</loc><loc>https://mypowersetup.com/si/vodici/</loc>'), ["/", "/si/vodici/"]);
  assert.equal(publicRoutePath("/"), "index.html");
  assert.equal(publicRoutePath("/si/vodici/"), "si/vodici/index.html");
});

test("committed sitemap passes the seven-market public SEO audit", async () => {
  const report = await auditPublicSeo({
    sitemapXml: await readFile("sitemap.xml", "utf8"),
    readPage: (path) => readFile(path, "utf8"),
  });
  assert.equal(report.ready, true, report.failures.join("\n"));
  assert.equal(Object.keys(report.marketCounts).length, 7);
  assert.ok(Object.values(report.marketCounts).every((count) => count > 0));
  assert.ok(report.articlePages >= 80);
});
