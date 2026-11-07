import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalyticsContext, classifyAnalyticsPage } from "../src/analytics-context.js";
import { rememberGuideAttribution, resolveGuideAttribution } from "../src/guide-attribution.js";

test("calculator events get explicit market and calculator context", () => {
  for (const [lang, path, market] of [["cs","/","cz"],["sk-SK","/sk/","sk"],["pl","/pl/","pl"],["hu","/hu/","hu"],["ro-RO","/ro/","ro"],["pt-PT","/pt/","pt"],["sl-SI","/si/","si"]]) {
    assert.deepEqual(buildAnalyticsContext({ lang, pathname: path, hasCalculator: true }), { market, page_path: path, page_type: "calculator" });
  }
});

test("crawlable calculator landings are classified as calculator traffic without the full builder form", () => {
  assert.deepEqual(
    buildAnalyticsContext({ lang: "cs", pathname: "/kalkulacky/solarni-panely/", hasCalculator: false }),
    { market: "cz", page_path: "/kalkulacky/solarni-panely/", page_type: "calculator" }
  );
  assert.equal(classifyAnalyticsPage("/kalkulacky/kapacita-baterie/"), "calculator");
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


test("all published localized calculator landing pages and hubs are measured as calculators", () => {
  const cases = [
    ["sk", "/sk/kalkulacky/"],
    ["sk", "/sk/kalkulacky/kapacita-baterie/"],
    ["sk", "/sk/kalkulacky/solarne-panely/"],
    ["pl", "/pl/kalkulatory/"],
    ["pl", "/pl/kalkulatory/pojemnosc-akumulatora/"],
    ["pl", "/pl/kalkulatory/panele-solarne/"],
    ["hu", "/hu/kalkulatorok/"],
    ["hu", "/hu/kalkulatorok/akkumulator-kapacitas/"],
    ["hu", "/hu/kalkulatorok/napelem-teljesitmeny/"],
  ];
  for (const [lang, pathname] of cases) {
    const context = buildAnalyticsContext({ lang, pathname, hasCalculator: false });
    assert.equal(context.market, lang, pathname);
    assert.equal(context.page_path, pathname);
    assert.equal(context.page_type, "calculator", pathname);
  }
});

test("localized calculator classification does not swallow other pages or similar-looking slugs", () => {
  for (const pathname of [
    "/sk/kalkulacky-novinky/",
    "/pl/kalkulatory-porady/",
    "/hu/kalkulatorokrad/",
    "/sk/sprievodca/kapacita-baterie-do-karavanu/",
    "/pl/poradnik/ile-wat-paneli-solarnych-do-kampera/",
    "/hu/utmutatok/lakoauto-akkumulator-kapacitas/",
  ]) assert.notEqual(classifyAnalyticsPage(pathname), "calculator", pathname);
  assert.equal(classifyAnalyticsPage("/ro/ghiduri/invertor-autorulota-putere/"), "guide");
});

test("localized guide to calculator journey can carry consent-gated CTA position", () => {
  const cases = [
    ["sk", "/sk/sprievodca/kapacita-baterie-do-karavanu/", "/sk/kalkulacky/kapacita-baterie/"],
    ["pl", "/pl/poradnik/ile-wat-paneli-solarnych-do-kampera/", "/pl/kalkulatory/panele-solarne/"],
    ["hu", "/hu/utmutatok/lakoauto-akkumulator-kapacitas/", "/hu/kalkulatorok/akkumulator-kapacitas/"],
  ];
  const now = 1_700_000_000_000;
  for (const [lang, guidePath, landingPath] of cases) {
    const values = new Map();
    const storage = {
      getItem(key) { return values.get(key) ?? null; },
      setItem(key, value) { values.set(key, String(value)); },
      removeItem(key) { values.delete(key); },
    };
    rememberGuideAttribution({ sourcePath: guidePath, sourcePosition: "early", storage, now });
    const context = buildAnalyticsContext({ lang, pathname: landingPath, hasCalculator: false });
    assert.equal(context.page_type, "calculator", landingPath);
    const source = context.page_type === "calculator"
      ? resolveGuideAttribution({ storage, market: context.market, now: now + 1000 })
      : null;
    assert.equal(source?.guide_source_path, guidePath);
    assert.equal(source?.guide_source_market, lang);
    assert.equal(source?.guide_source_position, "early");
  }
});
