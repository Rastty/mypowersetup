import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditProductionLive } from "../src/production-live-audit.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const localSitemapXml = await readFile(resolve(root, "sitemap.xml"), "utf8");
const report = await auditProductionLive({
  siteUrl: process.env.MPS_PRODUCTION_URL || "https://mypowersetup.com",
  localSitemapXml,
  readLocalHome: ({ home }) => readFile(resolve(root, home === "/" ? "index.html" : `${home.slice(1)}index.html`), "utf8"),
});

console.log(JSON.stringify(report, null, 2));
if (!report.ready) process.exitCode = 1;
