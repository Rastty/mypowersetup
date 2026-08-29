import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalyticsContext, classifyAnalyticsPage } from "../src/analytics-context.js";

test("calculator events get explicit market and calculator context", () => {
  assert.deepEqual(buildAnalyticsContext({ lang: "cs", pathname: "/", hasCalculator: true }), {
    market: "cz",
    page_path: "/",
    page_type: "calculator",
  });
  assert.deepEqual(buildAnalyticsContext({ lang: "sk-SK", pathname: "/sk/", hasCalculator: true }), {
    market: "sk",
    page_path: "/sk/",
    page_type: "calculator",
  });
  assert.deepEqual(buildAnalyticsContext({ lang: "pl", pathname: "/pl/", hasCalculator: true }), {
    market: "pl",
    page_path: "/pl/",
    page_type: "calculator",
  });
  assert.deepEqual(buildAnalyticsContext({ lang: "hu", pathname: "/hu/", hasCalculator: true }), {
    market: "hu",
    page_path: "/hu/",
    page_type: "calculator",
  });
});

test("guide and trust pages are separated from calculator traffic", () => {
  assert.equal(classifyAnalyticsPage("/pruvodce/kapacita-baterie-do-karavanu/"), "guide");
  assert.equal(classifyAnalyticsPage("/sk/sprievodca/agm-vs-lifepo4/"), "guide");
  assert.equal(classifyAnalyticsPage("/pl/poradnik/przetwornica-do-kampera/"), "guide");
  assert.equal(classifyAnalyticsPage("/hu/utmutatok/mppt-toltesvezerlo/"), "guide");
  assert.equal(classifyAnalyticsPage("/soukromi/"), "trust");
  assert.equal(classifyAnalyticsPage("/pl/prywatnosc/"), "trust");
  assert.equal(classifyAnalyticsPage("/kontakt/"), "content");
});

test("unknown language stays explicit instead of being silently counted as Czech", () => {
  const context = buildAnalyticsContext({ lang: "ro", pathname: "/ro/", hasCalculator: false });
  assert.equal(context.market, "ro");
  assert.equal(context.page_path, "/ro/");
  assert.equal(context.page_type, "content");
});
