import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { auditPublicInternalLinks, extractInternalAnchorRoutes } from "../src/public-link-graph.js";
import { publicRoutePath, sitemapRoutes } from "../src/public-seo-audit.js";

const SITE_ORIGIN = "https://mypowersetup.com";

async function declaredPublicRoutes() {
  const robots = await readFile("robots.txt", "utf8");
  const routes = [];
  for (const match of robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)) {
    const url = new URL(match[1]);
    if (url.origin !== SITE_ORIGIN) continue;
    const file = decodeURIComponent(url.pathname).replace(/^\//, "");
    if (!file) continue;
    const xml = await readFile(file, "utf8");
    for (const route of sitemapRoutes(xml)) {
      if (!routes.includes(route)) routes.push(route);
    }
  }
  assert.ok(routes.length > 0, "robots.txt must expose at least one public sitemap route");
  return routes;
}

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

test("all routes in declared public sitemaps have no orphan content routes", async () => {
  const routes = await declaredPublicRoutes();
  const report = await auditPublicInternalLinks({
    routes,
    readPage: async (route) => readFile(publicRoutePath(route), "utf8"),
  });
  assert.equal(report.safe, true, JSON.stringify({ orphanRoutes: report.orphanRoutes, unreadable: report.unreadable }, null, 2));
});
