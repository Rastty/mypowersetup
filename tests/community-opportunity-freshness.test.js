import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreTrafficOpportunity } from "../src/traffic-distribution.js";

const registry = JSON.parse(readFileSync(new URL("../data/traffic-distribution.json", import.meta.url), "utf8"));

test("the active CamperTeam LiFePO4 thread is ranked from its latest verified activity", () => {
  const item = registry.opportunities.find((entry) => entry.id === "pl-camperteam-lifepo4-use-202606");
  assert.ok(item);
  assert.equal(item.lastKnownActivity, "2026-08-27");
  const scored = scoreTrafficOpportunity(item, { asOf: registry.updatedAt });
  assert.equal(scored.ageDays, 5);
  assert.equal(scored.actionable, true);
  assert.ok(scored.score >= 100, `expected a top-tier live opportunity, got ${scored.score}`);
});

test("a fresh thread awaiting author follow-up is not treated as a reply opportunity", () => {
  const item = registry.opportunities.find((entry) => entry.id === "pl-camperteam-ford-dcdc-202608");
  assert.ok(item);
  const scored = scoreTrafficOpportunity(item, { asOf: registry.updatedAt });
  assert.equal(item.status, "monitor");
  assert.equal(scored.actionable, false);
});
