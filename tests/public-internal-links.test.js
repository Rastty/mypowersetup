import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { auditPublicInternalLinks, extractInternalAnchorRoutes } from "../src/public-link-graph.js";
import { publicRoutePath, sitemapRoutes } from "../src/public-seo-audit.js";

test("internal anchor extraction keeps only crawlable same-origin routes", () => {
  const html = '<a href="/guide/">Guide</a><a href="../other/">Other</a><a href="#x">Jump</a><a href="https://example.com/x">External</a>';
  assert.deepEqual(extractInternalAnchorRoutes(html, "/pt/guias/"), ["/guide/", "/pt/other/"]);
});

test("link graph detects a public orphan", async () => {
  const pages = new Map([
    ["/", '<a href="/a/">A</a>'],
    ["/a/", "<p>A</p>"],
    ["/b/", "<p>B</p>"],
  ]);
  const report = await auditPublicInternalLinks({
    routes: ["/", "/a/", "/b/"],
    readPage: async (route) => pages.get(route),
  });
  assert.equal(report.safe, false);
  assert.deepEqual(report.orphanRoutes, ["/b/"]);
  assert.deepEqual(report.unreachableRoutes, ["/b/"]);
  assert.equal(report.inboundCounts["/a/"], 1);
  assert.equal(report.crawlDepths["/a/"], 1);
  assert.equal(report.maxCrawlDepth, 1);
});

test("link graph rejects a mutually linked island that has no path from home", async () => {
  const pages = new Map([
    ["/", '<a href="/reachable/">Reachable</a>'],
    ["/reachable/", '<a href="/">Home</a>'],
    ["/island-a/", '<a href="/island-b/">B</a>'],
    ["/island-b/", '<a href="/island-a/">A</a>'],
  ]);
  const report = await auditPublicInternalLinks({
    routes: [...pages.keys()],
    readPage: async (route) => pages.get(route),
  });

  assert.deepEqual(report.orphanRoutes, []);
  assert.deepEqual(report.unreachableRoutes, ["/island-a/", "/island-b/"]);
  assert.equal(report.safe, false);
});

test("link graph rejects content more than three clicks from home", async () => {
  const pages = new Map([
    ["/", '<a href="/a/">A</a>'],
    ["/a/", '<a href="/b/">B</a>'],
    ["/b/", '<a href="/c/">C</a>'],
    ["/c/", '<a href="/d/">D</a>'],
    ["/d/", "<p>Deep</p>"],
  ]);
  const report = await auditPublicInternalLinks({
    routes: [...pages.keys()],
    readPage: async (route) => pages.get(route),
  });

  assert.equal(report.crawlDepths["/d/"], 4);
  assert.deepEqual(report.deepRoutes, [{ route: "/d/", depth: 4 }]);
  assert.equal(report.safe, false);
});

test("committed public sitemap has no orphan content routes", async () => {
  const sitemapXml = await readFile("sitemap.xml", "utf8");
  const routes = sitemapRoutes(sitemapXml);
  const report = await auditPublicInternalLinks({
    routes,
    readPage: async (route) => readFile(publicRoutePath(route), "utf8"),
  });
  assert.equal(report.safe, true, JSON.stringify({
    orphanRoutes: report.orphanRoutes,
    unreachableRoutes: report.unreachableRoutes,
    deepRoutes: report.deepRoutes,
    maxCrawlDepth: report.maxCrawlDepth,
    unreadable: report.unreadable,
  }, null, 2));
  assert.deepEqual(report.unreachableRoutes, []);
  assert.deepEqual(report.deepRoutes, []);
  assert.ok(report.maxCrawlDepth <= 3, `public max crawl depth is ${report.maxCrawlDepth}`);
});
