import test from "node:test";
import assert from "node:assert/strict";
import { PUBLIC_CONVERSION_ROUTES, conversionRouteCount, conversionRouteFor } from "../src/public-conversion-map.js";
import { COMMERCIAL_GUIDE_TOPICS, classifyPublicGuideRoute } from "../src/public-conversion-funnel.js";
import { classifyGuideInternalLink } from "../src/analytics-links.js";

test("conversion map covers 78 commercial guide routes without inventing expansion-only missing topics", () => {
  const commercialCount = COMMERCIAL_GUIDE_TOPICS.reduce((sum, topic) => sum + Object.keys(PUBLIC_CONVERSION_ROUTES[topic] || {}).length, 0);
  assert.equal(commercialCount, 78);
  assert.equal(conversionRouteCount(), 85);
  for (const topic of ["battery", "chemistry", "solar", "mppt", "dcDc", "shore", "inverter", "wiring", "fridge", "system"]) {
    assert.equal(Object.keys(PUBLIC_CONVERSION_ROUTES[topic]).length, 7, `${topic} should cover all seven markets`);
  }
  assert.equal(Object.keys(PUBLIC_CONVERSION_ROUTES.voltage).length, 4);
  assert.equal(Object.keys(PUBLIC_CONVERSION_ROUTES.powerStation).length, 4);
  assert.equal(conversionRouteFor("voltage", "pt"), null);
  assert.equal(conversionRouteFor("powerStation", "si"), null);
});

test("expansion guide routes classify by local market and commercial topic", () => {
  assert.deepEqual(classifyPublicGuideRoute("/pt/guias/como-escolher-controlador-mppt/"), {
    topic: "mppt", market: "pt", route: "/pt/guias/como-escolher-controlador-mppt/",
  });
  assert.deepEqual(classifyPublicGuideRoute("/si/vodici/inverter-avtodom-moc/"), {
    topic: "inverter", market: "si", route: "/si/vodici/inverter-avtodom-moc/",
  });
  assert.deepEqual(classifyPublicGuideRoute("/ro/ghiduri/capacitate-baterie-autorulota/"), {
    topic: "battery", market: "ro", route: "/ro/ghiduri/capacitate-baterie-autorulota/",
  });
});

test("analytics recognizes expansion guide-to-guide journeys", () => {
  assert.deepEqual(
    classifyGuideInternalLink("/pt/guias/como-escolher-controlador-mppt/", { sourcePath: "/pt/guias/capacidade-bateria-autocaravana/" }),
    { destination_path: "/pt/guias/como-escolher-controlador-mppt/", destination_topic: "mppt", destination_market: "pt" },
  );
  assert.deepEqual(
    classifyGuideInternalLink("/si/vodici/koliko-soncnih-panelov-avtodom/", { sourcePath: "/si/vodici/kapaciteta-baterije-avtodom/" }),
    { destination_path: "/si/vodici/koliko-soncnih-panelov-avtodom/", destination_topic: "solar", destination_market: "si" },
  );
  assert.deepEqual(
    classifyGuideInternalLink("/ro/ghiduri/regulator-mppt-autorulota/", { sourcePath: "/ro/ghiduri/cate-panouri-solare-autorulota/" }),
    { destination_path: "/ro/ghiduri/regulator-mppt-autorulota/", destination_topic: "mppt", destination_market: "ro" },
  );
});
