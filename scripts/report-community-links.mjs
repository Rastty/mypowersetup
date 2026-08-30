import { readFileSync } from "node:fs";
import { rankTrafficOpportunities } from "../src/traffic-distribution.js";
import { buildCommunityTrackedUrl } from "../src/community-attribution.js";

const registry = JSON.parse(readFileSync(new URL("../data/traffic-distribution.json", import.meta.url), "utf8"));
const args = process.argv.slice(2);
const marketIndex = args.indexOf("--market");
const market = marketIndex >= 0 ? args[marketIndex + 1] : null;
const ranked = rankTrafficOpportunities(registry.opportunities, { asOf: registry.updatedAt, market });
const actionable = ranked.filter((item) => item.actionable);

console.log(`Manual community opportunities | as-of=${registry.updatedAt} | market=${market || "all"} | actionable=${actionable.length}`);
for (const [index, item] of actionable.entries()) {
  console.log(`${index + 1}. ${item.market.toUpperCase()} score=${item.score} | ${item.community} | ${item.sourceTitle}`);
  console.log(`   source: ${item.sourceUrl}`);
  console.log(`   reply target: ${buildCommunityTrackedUrl(item)}`);
  console.log(`   rule: ${item.postingRule}`);
}
