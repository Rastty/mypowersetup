import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rankTrafficOpportunities, scoreTrafficOpportunity } from "../src/traffic-distribution.js";

const registry = JSON.parse(readFileSync(new URL("../data/traffic-distribution.json", import.meta.url), "utf8"));

test("the published CamperTeam LiFePO4 reply is retained for attribution but excluded from the action queue", () => {
  const item = registry.opportunities.find((entry) => entry.id === "pl-camperteam-lifepo4-use-202606");
  assert.ok(item);
  assert.equal(item.lastKnownActivity, "2026-09-03");
  assert.equal(item.status, "replied");
  assert.equal(item.repliedAt, "2026-09-03");
  assert.equal(item.publishedPostUrl, item.sourceUrl);
  const scored = scoreTrafficOpportunity(item, { asOf: registry.updatedAt });
  assert.equal(scored.ageDays, 0);
  assert.equal(scored.actionable, false);
  assert.equal(
    rankTrafficOpportunities(registry.opportunities, { asOf: registry.updatedAt }).some((entry) => entry.id === item.id),
    false,
  );
});

test("a fresh thread awaiting author follow-up is not treated as a reply opportunity", () => {
  const item = registry.opportunities.find((entry) => entry.id === "pl-camperteam-ford-dcdc-202608");
  assert.ok(item);
  const scored = scoreTrafficOpportunity(item, { asOf: registry.updatedAt });
  assert.equal(item.status, "monitor");
  assert.equal(scored.actionable, false);
});
