import test from "node:test";
import assert from "node:assert/strict";
import { buildCommunityTrackedUrl, readCommunityAttribution } from "../src/community-attribution.js";

const opportunity = Object.freeze({
  id: "pl-camperteam-ford-dcdc-202608",
  market: "pl",
  community: "CamperTeam",
  targetRoute: "/pl/poradnik/jak-dobrac-ladowarke-dc-dc/",
});

test("builds first-party community URL with deterministic attribution", () => {
  const url = new URL(buildCommunityTrackedUrl(opportunity));
  assert.equal(url.origin, "https://mypowersetup.com");
  assert.equal(url.pathname, opportunity.targetRoute);
  assert.equal(url.searchParams.get("utm_source"), "camperteam");
  assert.equal(url.searchParams.get("utm_medium"), "community");
  assert.equal(url.searchParams.get("utm_campaign"), "pl_technical_help");
  assert.equal(url.searchParams.get("utm_content"), opportunity.id);
});

test("market cannot point to another localized route", () => {
  assert.throws(
    () => buildCommunityTrackedUrl({ ...opportunity, targetRoute: "/sk/sprievodca/ako-vybrat-dc-dc-nabijacku/" }),
    /COMMUNITY_ATTRIBUTION_MARKET_ROUTE_MISMATCH/,
  );
});

test("protocol-relative or non-https origins are rejected", () => {
  assert.throws(() => buildCommunityTrackedUrl({ ...opportunity, targetRoute: "//evil.example/path" }), /COMMUNITY_ATTRIBUTION_ROUTE_INVALID/);
  assert.throws(() => buildCommunityTrackedUrl(opportunity, { origin: "http://mypowersetup.com" }), /COMMUNITY_ATTRIBUTION_ORIGIN_INVALID/);
});

test("community attribution can be recovered for conversion events", () => {
  const url = new URL(buildCommunityTrackedUrl(opportunity));
  assert.deepEqual(readCommunityAttribution(url.search), {
    community_source: "camperteam",
    community_campaign: "pl_technical_help",
    community_opportunity_id: opportunity.id,
  });
  assert.equal(readCommunityAttribution("?utm_medium=email&utm_content=x&utm_campaign=y"), null);
});
