import test from "node:test";
import assert from "node:assert/strict";
import { rankTrafficOpportunities, scoreTrafficOpportunity, trafficDistributionSummary } from "../src/traffic-distribution.js";

const freshPl = Object.freeze({
  id: "fresh-pl",
  market: "pl",
  community: "CamperTeam",
  sourceUrl: "https://camperteam.pl/forum/viewtopic.php?t=42375",
  sourceTitle: "Ford Transit + DC/DC",
  problemIntent: ["dc_dc_charging", "battery_sizing", "charging_diagnostics"],
  targetRoute: "/pl/poradnik/jak-dobrac-ladowarke-dc-dc/",
  lastKnownActivity: "2026-08-11",
  priority: "high",
  fit: "direct_camper_technical_current",
  status: "ready_for_manual_reply",
});

const staleSk = Object.freeze({
  id: "stale-sk",
  market: "sk",
  community: "MyPower.CZ",
  sourceUrl: "https://forum.mypower.cz/viewtopic.php?t=13269",
  sourceTitle: "Solarna zostava pre karavan",
  problemIntent: ["system_design", "battery_sizing", "solar_sizing", "mppt_sizing"],
  targetRoute: "/sk/",
  lastKnownActivity: "2024-08-02",
  priority: "medium",
  fit: "direct_camper_technical_stale",
  status: "research_only",
});

test("fresh direct current opportunity outranks stale research backlink candidate", () => {
  const ranked = rankTrafficOpportunities([staleSk, freshPl], { asOf: "2026-08-30" });
  assert.equal(ranked[0].id, "fresh-pl");
  assert.equal(ranked[0].actionable, true);
  assert.ok(ranked[0].score > ranked[1].score);
});

test("scoring is deterministic for an explicit as-of date", () => {
  const a = scoreTrafficOpportunity(freshPl, { asOf: "2026-08-30" });
  const b = scoreTrafficOpportunity(freshPl, { asOf: "2026-08-30" });
  assert.deepEqual(a, b);
  assert.equal(a.ageDays, 19);
});

test("market filter never leaks another market", () => {
  const ranked = rankTrafficOpportunities([staleSk, freshPl], { asOf: "2026-08-30", market: "sk" });
  assert.deepEqual(ranked.map((item) => item.id), ["stale-sk"]);
});

test("completed opportunities are excluded unless explicitly requested", () => {
  const replied = { ...freshPl, id: "done", status: "replied" };
  assert.deepEqual(rankTrafficOpportunities([replied], { asOf: "2026-08-30" }), []);
  assert.equal(rankTrafficOpportunities([replied], { asOf: "2026-08-30", includeCompleted: true }).length, 1);
});

test("report is manual-only metadata and does not expose a posting action", () => {
  const summary = trafficDistributionSummary([freshPl], { asOf: "2026-08-30" });
  assert.equal(summary.actionable, 1);
  assert.equal(summary.top[0].actionable, true);
  assert.equal(Object.hasOwn(summary.top[0], "post"), false);
  assert.equal(Object.hasOwn(summary.top[0], "send"), false);
});
