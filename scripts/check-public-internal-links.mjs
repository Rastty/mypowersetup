import { readFile } from "node:fs/promises";
import { sitemapRoutes, publicRoutePath } from "../src/public-seo-audit.js";
import { auditPublicInternalLinks } from "../src/public-link-graph.js";

const sitemapXml = await readFile("sitemap.xml", "utf8");
const routes = sitemapRoutes(sitemapXml);
const report = await auditPublicInternalLinks({
  routes,
  readPage: async (route) => readFile(publicRoutePath(route), "utf8"),
});

console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--require-safe") && !report.safe) process.exitCode = 1;
