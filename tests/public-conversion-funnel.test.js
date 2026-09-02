import test from "node:test";
import assert from "node:assert/strict";
import { PUBLIC_HREFLANG_GROUPS } from "../src/public-hreflang-map.js";
import { PUBLIC_MARKET_CALCULATORS, COMMERCIAL_GUIDE_TOPICS, classifyPublicGuideLink, auditPublicGuideHtml } from "../src/public-conversion-funnel.js";

test("public funnel covers all seven public calculators and all seven-market hreflang guide topics", () => {
  assert.deepEqual(Object.keys(PUBLIC_MARKET_CALCULATORS).sort(), ["cs", "hu", "pl", "pt", "ro", "si", "sk"]);
  assert.equal(PUBLIC_MARKET_CALCULATORS.pt, "/pt/#calculator-preview");
  assert.equal(PUBLIC_MARKET_CALCULATORS.si, "/si/#calculator-preview");
  assert.equal(PUBLIC_MARKET_CALCULATORS.ro, "/ro/#calculator-preview");
  assert.equal(COMMERCIAL_GUIDE_TOPICS.length, 12);
  for (const topic of COMMERCIAL_GUIDE_TOPICS) assert.deepEqual(Object.keys(PUBLIC_HREFLANG_GROUPS[topic]).sort(), ["cs", "hu", "pl", "pt", "ro", "si", "sk"]);
});

test("guide link classifier resolves localized topic and rejects external links", () => {
  assert.deepEqual(classifyPublicGuideLink("/pl/poradnik/jak-dobrac-regulator-mppt/"), {
    topic: "mppt", market: "pl", route: "/pl/poradnik/jak-dobrac-regulator-mppt/",
  });
  assert.deepEqual(classifyPublicGuideLink("/pt/guias/como-escolher-controlador-mppt/"), {
    topic: "mppt", market: "pt", route: "/pt/guias/como-escolher-controlador-mppt/",
  });
  assert.equal(classifyPublicGuideLink("https://example.com/guide"), null);
});

test("guide audit requires localized calculator CTA and at least two same-market onward topics", () => {
  const route = PUBLIC_HREFLANG_GROUPS.solar.cs;
  const html = `<html><head><link rel="canonical" href="https://mypowersetup.com${route}"></head><body><a href="/#kalkulator">calc</a><a href="/pruvodce/jak-vybrat-mppt-regulator/">mppt</a><a href="/pruvodce/kapacita-baterie-do-karavanu/">battery</a><script type="module" src="/src/analytics.js?v=1"></script></body></html>`;
  assert.equal(auditPublicGuideHtml(html, { market: "cs", topic: "solar", route }).ready, true);
});

test("guide audit fails cross-market CTA and weak internal journey", () => {
  const route = PUBLIC_HREFLANG_GROUPS.battery.sk;
  const html = `<html><head><link rel="canonical" href="https://mypowersetup.com${route}"></head><body><a href="/sk/#kalkulator">calc</a><a href="/#kalkulator">wrong</a><a href="/sk/sprievodca/agm-vs-lifepo4/">one</a><script type="module" src="/src/analytics.js"></script></body></html>`;
  const report = auditPublicGuideHtml(html, { market: "sk", topic: "battery", route });
  assert.equal(report.ready, false);
  assert.ok(report.blockers.includes("crossMarketCalculatorCta"));
  assert.ok(report.blockers.includes("weakInternalJourney"));
});
