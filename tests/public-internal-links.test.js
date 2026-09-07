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
  assert.equal(report.inboundCounts["/a/"], 1);
});

test("committed public sitemap has no orphan content routes", async () => {
  const sitemapXml = await readFile("sitemap.xml", "utf8");
  const routes = sitemapRoutes(sitemapXml);
  const report = await auditPublicInternalLinks({
    routes,
    readPage: async (route) => readFile(publicRoutePath(route), "utf8"),
  });
  assert.equal(report.safe, true, JSON.stringify({ orphanRoutes: report.orphanRoutes, unreadable: report.unreadable }, null, 2));
});
