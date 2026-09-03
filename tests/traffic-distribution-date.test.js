import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ageInDays, rankTrafficOpportunities } from "../src/traffic-distribution.js";

const registry = JSON.parse(readFileSync(new URL("../data/traffic-distribution.json", import.meta.url), "utf8"));

test("invalid calendar dates are rejected instead of normalized", () => {
  assert.throws(() => ageInDays("2026-02-31", "2026-08-30"), /TRAFFIC_DISTRIBUTION_DATE_INVALID:activity/);
});

test("future activity cannot be scored as fresh", () => {
  assert.throws(() => ageInDays("2026-08-31", "2026-08-30"), /TRAFFIC_DISTRIBUTION_ACTIVITY_IN_FUTURE/);
});

test("live registry cleanly reports when no reply is currently warranted", () => {
  const ranked = rankTrafficOpportunities(registry.opportunities, { asOf: registry.updatedAt });
  assert.ok(!ranked.some((item) => item.actionable));
  assert.notEqual(ranked[0].status, "research_only");
  assert.equal(ranked.some((item) => item.status === "replied"), false);
});

test("Ford Transit DC-DC thread waits for the author's promised follow-up", () => {
  const ranked = rankTrafficOpportunities(registry.opportunities, { asOf: registry.updatedAt, market: "pl" });
  const ford = ranked.find((item) => item.id === "pl-camperteam-ford-dcdc-202608");
  assert.ok(ford);
  assert.equal(ford.status, "monitor");
  assert.equal(ford.actionable, false);
  assert.equal(ford.ageDays, 23);
});
