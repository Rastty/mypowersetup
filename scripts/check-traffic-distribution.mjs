import { readFileSync } from "node:fs";
import { rankTrafficOpportunities } from "../src/traffic-distribution.js";

const registry = JSON.parse(readFileSync(new URL("../data/traffic-distribution.json", import.meta.url), "utf8"));
const ranked = rankTrafficOpportunities(registry.opportunities, { asOf: registry.updatedAt });
const actionable = ranked.filter((item) => item.actionable);

if (!ranked.length) throw new Error("TRAFFIC_DISTRIBUTION_EMPTY");
if (!actionable.length) throw new Error("TRAFFIC_DISTRIBUTION_NO_ACTIONABLE_OPPORTUNITY");
if (ranked.slice(0, 3).some((item) => item.status === "research_only")) {
  throw new Error("TRAFFIC_DISTRIBUTION_STALE_RESEARCH_RANKED_TOO_HIGH");
}
if (actionable.some((item) => item.ageDays > 90 || item.fit !== "direct_camper_technical_current")) {
  throw new Error("TRAFFIC_DISTRIBUTION_ACTIONABLE_POLICY_BROKEN");
}

console.log(`Traffic distribution guard OK: ${ranked.length} candidates, ${actionable.length} actionable; top=${ranked[0].id} score=${ranked[0].score}`);
