import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_HREFLANG_GROUPS, routeToPublicFile } from "../src/public-hreflang-map.js";
import { COMMERCIAL_GUIDE_TOPICS, auditPublicGuideHtml } from "../src/public-conversion-funnel.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];
const reports = [];

for (const topic of COMMERCIAL_GUIDE_TOPICS) {
  const routes = PUBLIC_HREFLANG_GROUPS[topic];
  for (const [market, route] of Object.entries(routes)) {
    const file = routeToPublicFile(route);
    const html = await readFile(resolve(root, file), "utf8");
    const report = auditPublicGuideHtml(html, { market, topic, route });
    reports.push({ market, topic, route, ready: report.ready, blockers: report.blockers, calculatorLinks: report.calculatorLinks, internalGuideTopics: report.internalGuideTopics.length });
    if (!report.ready) failures.push(`${market}:${topic}:${report.blockers.join(",")}`);
  }
}

console.log(JSON.stringify({ ready: failures.length === 0, checked: reports.length, failures, reports }, null, 2));
if (failures.length) process.exitCode = 1;
