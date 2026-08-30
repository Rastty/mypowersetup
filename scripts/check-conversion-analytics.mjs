import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function requireMatch(source, pattern, label) {
  if (!pattern.test(source)) throw new Error(`CONVERSION_ANALYTICS_GUARD_FAILED:${label}`);
}

const analytics = read("src/analytics.js");
const navigation = read("src/community-navigation.js");
const coreMarkets = [
  ["cz", "src/app.js"],
  ["sk", "src/app-sk.js"],
  ["pl", "src/app-pl.js"],
];

requireMatch(analytics, /choice === "granted" \? resolveCommunityAttribution/, "community_persistence_requires_consent");
requireMatch(analytics, /carryCommunityAttributionToUrl\(/, "community_attribution_carried_to_calculator");
requireMatch(analytics, /window\.gtag\("event", event/, "events_use_shared_analytics_context");
requireMatch(navigation, /destination\.origin !== page\.origin/, "community_carry_is_same_origin_only");
requireMatch(navigation, /utm_medium", "community"/, "community_carry_keeps_medium");
requireMatch(navigation, /sessionStorage|localStorage|gtag\(/, "community_navigation_must_not_persist_or_track_before_consent");
