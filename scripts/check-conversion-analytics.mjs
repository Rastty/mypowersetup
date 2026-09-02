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
const affiliateAnalytics = read("src/affiliate-analytics.js");

requireMatch(analytics, /choice === "granted" \? resolveCommunityAttribution/, "community_persistence_requires_consent");
requireMatch(analytics, /carryCommunityAttributionToUrl\(/, "community_attribution_carried_to_calculator");
requireMatch(analytics, /window\.gtag\("event", event/, "events_use_shared_analytics_context");
requireMatch(analytics, /mypowersetup:analytics-granted/, "consent_grant_retries_visible_product_impressions");
requireMatch(analytics, /track\("calculator_to_guide_click"/, "calculator_to_guide_click_shared_across_markets");
forbidMatch(analytics, /calculator_(?:result|component)_guide_click/, "calculator_to_guide_click_has_one_event_name");
requireMatch(navigation, /destination\.origin !== page\.origin/, "community_carry_is_same_origin_only");
requireMatch(navigation, /searchParams\.set\("utm_medium", "community"\)/, "community_carry_keeps_medium");
forbidMatch(navigation, /sessionStorage|localStorage|gtag\(|fetch\(/, "community_navigation_must_not_persist_track_or_send");
requireMatch(affiliateAnalytics, /tracker\("affiliate_click",/, "affiliate_click_has_one_shared_tracker");
requireMatch(affiliateAnalytics, /tracker\("product_choice_impression", buildAffiliateClickParameters\(link\)\)/, "product_impressions_share_click_dimensions");
requireMatch(affiliateAnalytics, /details:not\(\[open\]\)/, "closed_product_comparisons_are_not_impressions");
requireMatch(affiliateAnalytics, /affiliateImpressionTracked/, "product_impressions_are_deduplicated");

for (const [market, path] of [
  ["cz", "src/app.js"],
  ["sk", "src/app-sk.js"],
  ["pl", "src/app-pl.js"],
]) {
  const source = read(path);
  requireMatch(source, /trackCalculatorStarted\(/, `${market}_calculator_started`);
  requireMatch(source, /calculation_completed/, `${market}_calculation_completed`);
  requireMatch(source, /trackAffiliateClick\(/, `${market}_affiliate_click`);
  requireMatch(source, /bindAffiliateImpressionTracking\(/, `${market}_visible_affiliate_impressions`);
  forbidMatch(source, /mypowersetup:affiliate-click/, `${market}_affiliate_click_must_not_fan_out`);
}

const hu = read("src/app-hu-browser.js");
requireMatch(analytics, /context\.market !== "hu"/, "hu_shared_start_tracking_scope");
requireMatch(analytics, /track\("calculator_started"/, "hu_calculator_started");
requireMatch(hu, /calculation_completed/, "hu_calculation_completed");
requireMatch(hu, /trackAffiliateClick\(/, "hu_affiliate_click");
requireMatch(hu, /bindAffiliateImpressionTracking\(/, "hu_visible_affiliate_impressions");
forbidMatch(hu, /mypowersetup:affiliate-click/, "hu_affiliate_click_must_not_fan_out");

const expansion = read("src/expansion-calculator-browser.js");
requireMatch(expansion, /track\("calculator_started"/, "expansion_calculator_started");
requireMatch(expansion, /track\("calculation_completed"/, "expansion_calculation_completed");
requireMatch(expansion, /track\("product_coverage_calculated"/, "expansion_product_coverage_calculated");
requireMatch(expansion, /trackAffiliateClick\(/, "expansion_affiliate_click");
requireMatch(expansion, /bindAffiliateImpressionTracking\(/, "expansion_visible_affiliate_impressions");
forbidMatch(expansion, /mypowersetup:affiliate-click/, "expansion_affiliate_click_must_not_fan_out");
forbidMatch(expansion, /calculator_(?:result|component)_guide_click/, "expansion_guide_click_uses_shared_tracker");
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

console.log("Conversion analytics guard passed: 7/7 markets track calculator start, calculation completion, product coverage, visible product-choice impressions, calculator-to-guide journeys and affiliate clicks; community attribution remains consent-gated and survives guide-to-calculator navigation without storage.");
