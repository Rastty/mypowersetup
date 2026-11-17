import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ageInDays, currentTrafficDistributionDate, rankTrafficOpportunities, trafficDistributionSummary } from "../src/traffic-distribution.js";

const registry = JSON.parse(readFileSync(new URL("../data/traffic-distribution.json", import.meta.url), "utf8"));

function daysBetween(from, to) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000);
}

test("invalid calendar dates are rejected instead of normalized", () => {
  assert.throws(() => ageInDays("2026-02-31", "2026-08-30"), /TRAFFIC_DISTRIBUTION_DATE_INVALID:activity/);
});

test("future activity cannot be scored as fresh", () => {
  assert.throws(() => ageInDays("2026-08-31", "2026-08-30"), /TRAFFIC_DISTRIBUTION_ACTIVITY_IN_FUTURE/);
});

test("traffic report clock advances beyond the editorial registry date", () => {
  assert.equal(currentTrafficDistributionDate(new Date("2026-11-17T23:59:59Z")), "2026-11-17");
  assert.throws(() => currentTrafficDistributionDate(new Date("invalid")), /CLOCK_INVALID/);

  const summary = trafficDistributionSummary(registry.opportunities, {
    asOf: "2026-11-17",
    lastReviewedAt: registry.updatedAt,
  });
  assert.equal(summary.lastReviewedAt, "2026-09-16");
  assert.equal(summary.registryAgeDays, 62);
  assert.equal(summary.needsFreshResearch, true);
  assert.equal(summary.actionable, 0);
  const ford = summary.top.find((item) => item.id === "pl-camperteam-ford-dcdc-202608");
  assert.equal(ford?.ageDays, 98);
});

test("old ready forum threads cannot reappear when the registry review clock is stale", () => {
  const formerlyFresh = {
    ...registry.opportunities.find((item) => item.id === "pl-camperteam-ford-dcdc-202608"),
    status: "ready_for_manual_reply",
  };
  assert.equal(rankTrafficOpportunities([formerlyFresh], { asOf: registry.updatedAt })[0].actionable, false);
  const oldThread = { ...formerlyFresh, lastKnownActivity: "2026-09-15" };
  assert.equal(rankTrafficOpportunities([oldThread], { asOf: registry.updatedAt })[0].actionable, true);
  assert.equal(rankTrafficOpportunities([oldThread], { asOf: "2026-11-17" })[0].actionable, false);
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
  assert.equal(ford.ageDays, daysBetween("2026-08-11", registry.updatedAt));
});
