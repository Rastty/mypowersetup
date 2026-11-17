import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rankTrafficOpportunities, scoreTrafficOpportunity } from "../src/traffic-distribution.js";

const registry = JSON.parse(readFileSync(new URL("../data/traffic-distribution.json", import.meta.url), "utf8"));

function daysBetween(from, to) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000);
}

test("the published CamperTeam LiFePO4 reply is retained for attribution but excluded from the action queue", () => {
  const item = registry.opportunities.find((entry) => entry.id === "pl-camperteam-lifepo4-use-202606");
  assert.ok(item);
  assert.equal(item.lastKnownActivity, "2026-09-03");
  assert.equal(item.status, "replied");
  assert.equal(item.repliedAt, "2026-09-03");
  assert.equal(item.publishedPostUrl, item.sourceUrl);
  const scored = scoreTrafficOpportunity(item, { asOf: registry.updatedAt });
  assert.equal(scored.ageDays, daysBetween(item.lastKnownActivity, registry.updatedAt));
  assert.equal(scored.actionable, false);
  assert.equal(
    rankTrafficOpportunities(registry.opportunities, { asOf: registry.updatedAt }).some((entry) => entry.id === item.id),
    false,
  );
});

test("the author's October follow-up exposes an unresolved DC/DC diagnostic thread", () => {
  const item = registry.opportunities.find((entry) => entry.id === "pl-camperteam-ford-dcdc-202608");
  assert.ok(item);
  const scored = scoreTrafficOpportunity(item, { asOf: registry.updatedAt });
  assert.equal(item.lastKnownActivity, "2026-10-23");
  assert.equal(item.status, "ready_for_manual_reply");
  assert.equal(scored.actionable, true);
  assert.equal(scoreTrafficOpportunity(item, { asOf: "2026-12-01" }).actionable, false);
});
