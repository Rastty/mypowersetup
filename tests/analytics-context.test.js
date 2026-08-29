import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalyticsContext, classifyAnalyticsPage } from "../src/analytics-context.js";

test("calculator events get explicit market and calculator context", () => {
  for (const [lang, path, market] of [["cs","/","cz"],["sk-SK","/sk/","sk"],["pl","/pl/","pl"],["hu","/hu/","hu"],["ro-RO","/ro/","ro"],["pt-PT","/pt/","pt"],["sl-SI","/si/","si"]]) {
    assert.deepEqual(buildAnalyticsContext({ lang, pathname: path, hasCalculator: true }), { market, page_path: path, page_type: "calculator" });
  }
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
  const context = buildAnalyticsContext({ lang: "xx", pathname: "/xx/", hasCalculator: false });
  assert.equal(context.market, "xx");
  assert.equal(context.page_path, "/xx/");
  assert.equal(context.page_type, "content");
});
