import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCommunityReplyBrief } from "../src/community-reply-brief.js";

const registry = JSON.parse(readFileSync(new URL("../data/traffic-distribution.json", import.meta.url), "utf8"));

test("fresh Polish CamperTeam opportunities produce answer-first technical briefs", () => {
  const opportunity = registry.opportunities.find((item) => item.id === "pl-camperteam-ford-dcdc-202608");
  assert.ok(opportunity);

  const brief = buildCommunityReplyBrief(opportunity);
  assert.equal(brief.linkRule, "answer_first_no_link_drop");
  assert.ok(brief.points.length >= 3);
  assert.match(brief.points.join(" "), /alternatora/i);
  assert.match(brief.points.join(" "), /DC\/DC|ładowark/i);
  assert.match(brief.points.join(" "), /bezpiecznik|zabezpieczeni/i);
  assert.ok(brief.supportingRoutes.every((route) => route.startsWith("/pl/")));
});

test("active all-season CamperTeam brief is written in Polish", () => {
  const opportunity = registry.opportunities.find((item) => item.id === "pl-camperteam-lifepo4-use-202606");
  assert.ok(opportunity);

  const brief = buildCommunityReplyBrief(opportunity);
  assert.match(brief.points.join(" "), /dobowego zużycia energii|dobowe zapotrzebowanie/i);
  assert.match(brief.points.join(" "), /LiFePO₄/);
  assert.match(brief.points.join(" "), /zimow|porę roku/i);
  assert.doesNotMatch(brief.points.join(" "), /Start with|Before changing|Compare daily/i);
});

test("reply briefs cap the answer checklist and never invent a promotional fallback", () => {
  const brief = buildCommunityReplyBrief({
    id: "test-opportunity",
    community: "Example",
    sourceTitle: "Example thread",
    problemIntent: ["battery_sizing", "solar_sizing", "inverter_sizing", "mppt_sizing", "system_design"],
    supportingRoutes: ["/pl/"],
    postingRule: "answer_first_no_link_drop",
  }, { maxPoints: 3 });

  assert.equal(brief.points.length, 3);
  assert.doesNotMatch(brief.points.join(" "), /buy|affiliate|promotion/i);
});

test("unknown intent still produces a safe answer-first brief", () => {
  const brief = buildCommunityReplyBrief({ id: "unknown", problemIntent: ["unknown_intent"] });
  assert.equal(brief.points.length, 1);
  assert.match(brief.points[0], /technical question first/i);
});
