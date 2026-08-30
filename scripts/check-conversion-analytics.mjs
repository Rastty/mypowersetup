import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function requireMatch(source, pattern, label) {
  if (!pattern.test(source)) throw new Error(`CONVERSION_ANALYTICS_GUARD_FAILED:${label}`);
}

function forbidMatch(source, pattern, label) {
  if (pattern.test(source)) throw new Error(`CONVERSION_ANALYTICS_GUARD_FAILED:${label}`);
}

const analytics = read("src/analytics.js");
const navigation = read("src/community-navigation.js");

requireMatch(analytics, /choice === "granted" \? resolveCommunityAttribution/, "community_persistence_requires_consent");
requireMatch(analytics, /carryCommunityAttributionToUrl\(/, "community_attribution_carried_to_calculator");
requireMatch(analytics, /window\.gtag\("event", event/, "events_use_shared_analytics_context");
requireMatch(navigation, /destination\.origin !== page\.origin/, "community_carry_is_same_origin_only");
requireMatch(navigation, /searchParams\.set\("utm_medium", "community"\)/, "community_carry_keeps_medium");
forbidMatch(navigation, /sessionStorage|localStorage|gtag\(|fetch\(/, "community_navigation_must_not_persist_track_or_send");

for (const [market, path] of [
  ["cz", "src/app.js"],
  ["sk", "src/app-sk.js"],
  ["pl", "src/app-pl.js"],
]) {
  const source = read(path);
  requireMatch(source, /trackCalculatorStarted\(/, `${market}_calculator_started`);
  requireMatch(source, /calculation_completed/, `${market}_calculation_completed`);
  requireMatch(source, /affiliate_click/, `${market}_affiliate_click`);
}

const hu = read("src/app-hu-browser.js");
requireMatch(analytics, /context\.market !== "hu"/, "hu_shared_start_tracking_scope");
requireMatch(analytics, /track\("calculator_started"/, "hu_calculator_started");
requireMatch(hu, /calculation_completed/, "hu_calculation_completed");
requireMatch(hu, /affiliate_click/, "hu_affiliate_click");

const expansion = read("src/expansion-calculator-browser.js");
requireMatch(expansion, /track\("calculator_started"/, "expansion_calculator_started");
requireMatch(expansion, /track\("calculation_completed"/, "expansion_calculation_completed");
requireMatch(expansion, /affiliate_click/, "expansion_affiliate_click");
for (const market of ["pt", "si", "ro"]) {
  requireMatch(expansion, new RegExp(`\\b${market}:\\s*\\{`), `${market}_expansion_locale`);
}

for (const [market, path, appPattern] of [
  ["cz", "index.html", /\/src\/app\.js(?:\?[^\"]*)?/],
  ["sk", "sk/index.html", /\/src\/app-sk\.js(?:\?[^\"]*)?/],
  ["pl", "pl/index.html", /\/src\/app-pl\.js(?:\?[^\"]*)?/],
  ["hu", "hu/index.html", /\/src\/app-hu-browser\.js(?:\?[^\"]*)?/],
  ["pt", "pt/index.html", /\/src\/expansion-calculator-browser\.js(?:\?[^\"]*)?/],
  ["si", "si/index.html", /\/src\/expansion-calculator-browser\.js(?:\?[^\"]*)?/],
  ["ro", "ro/index.html", /\/src\/expansion-calculator-browser\.js(?:\?[^\"]*)?/],
]) {
  const html = read(path);
  requireMatch(html, /\/src\/analytics\.js(?:\?[^\"]*)?/, `${market}_analytics_loaded`);
  requireMatch(html, appPattern, `${market}_calculator_app_loaded`);
  requireMatch(html, /id="setup-form"/, `${market}_calculator_form_present`);
}

console.log("Conversion analytics guard passed: 7/7 markets track calculator start, calculation completion and affiliate click; community attribution remains consent-gated and survives guide-to-calculator navigation without storage.");
