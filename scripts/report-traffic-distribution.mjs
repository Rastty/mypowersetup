import { readFileSync } from "node:fs";
import { trafficDistributionSummary } from "../src/traffic-distribution.js";

const registry = JSON.parse(readFileSync(new URL("../data/traffic-distribution.json", import.meta.url), "utf8"));
const args = process.argv.slice(2);
const argValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

const asOf = argValue("--as-of") || registry.updatedAt;
const market = argValue("--market");
const json = args.includes("--json");
const summary = trafficDistributionSummary(registry.opportunities, { asOf, market });

if (json) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

console.log(`Traffic distribution as of ${summary.asOf} | market=${summary.market} | candidates=${summary.total} | actionable=${summary.actionable}`);
for (const [index, item] of summary.top.entries()) {
  const action = item.actionable ? "REPLY" : item.status.toUpperCase();
  console.log(`${index + 1}. ${item.market.toUpperCase()} ${item.score} ${action} | ${item.community} | ${item.sourceTitle}`);
  console.log(`   ${item.targetRoute} | age=${item.ageDays}d | ${item.sourceUrl}`);
}
