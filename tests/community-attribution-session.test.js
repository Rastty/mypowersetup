import test from "node:test";
import assert from "node:assert/strict";
import { buildCommunityTrackedUrl, resolveCommunityAttribution } from "../src/community-attribution.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

const opportunity = Object.freeze({
  id: "pl-camperteam-ford-dcdc-202608",
  market: "pl",
  community: "CamperTeam",
  targetRoute: "/pl/poradnik/jak-dobrac-ladowarke-dc-dc/",
});

test("landing attribution survives an internal navigation in session storage", () => {
  const storage = memoryStorage();
  const landing = new URL(buildCommunityTrackedUrl(opportunity));
  const first = resolveCommunityAttribution({ search: landing.search, storage });
  const later = resolveCommunityAttribution({ search: "", storage });
  assert.deepEqual(later, first);
  assert.equal(later.community_opportunity_id, opportunity.id);
});

test("malformed externally supplied attribution is not persisted", () => {
  const storage = memoryStorage();
  const result = resolveCommunityAttribution({
    search: "?utm_source=x&utm_medium=community&utm_campaign=pl_technical_help&utm_content=%3Cscript%3E",
    storage,
  });
  assert.equal(result, null);
  assert.equal(resolveCommunityAttribution({ search: "", storage }), null);
});

test("storage failures do not break the page or tracking context", () => {
  const storage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  const landing = new URL(buildCommunityTrackedUrl(opportunity));
  const result = resolveCommunityAttribution({ search: landing.search, storage });
  assert.equal(result.community_source, "camperteam");
});
