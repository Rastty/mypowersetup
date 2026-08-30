import test from "node:test";
import assert from "node:assert/strict";
import { classifyGuideCalculatorLink, classifyGuideClickZone } from "../src/analytics-links.js";

test("guide calculator classifier accepts exact calculator anchors for all published markets", () => {
  assert.deepEqual(classifyGuideCalculatorLink("/#kalkulator"), { destination_path: "/" });
  assert.deepEqual(classifyGuideCalculatorLink("/sk/#kalkulator"), { destination_path: "/sk/" });
  assert.deepEqual(classifyGuideCalculatorLink("https://mypowersetup.com/pl/#kalkulator"), { destination_path: "/pl/" });
  assert.deepEqual(classifyGuideCalculatorLink("/hu/#kalkulator"), { destination_path: "/hu/" });
  assert.deepEqual(classifyGuideCalculatorLink("/pt/#calculator-preview"), { destination_path: "/pt/" });
  assert.deepEqual(classifyGuideCalculatorLink("/si/#calculator-preview"), { destination_path: "/si/" });
  assert.deepEqual(classifyGuideCalculatorLink("/ro/#calculator-preview"), { destination_path: "/ro/" });
});

test("guide calculator classifier rejects stale anchors, external, malformed and non-calculator links", () => {
  assert.equal(classifyGuideCalculatorLink("https://evil.example/#kalkulator"), null);
  assert.equal(classifyGuideCalculatorLink("/pruvodce/#kalkulator"), null);
  assert.equal(classifyGuideCalculatorLink("/sk/"), null);
  assert.equal(classifyGuideCalculatorLink("/ro/#kalkulator"), null);
  assert.equal(classifyGuideCalculatorLink("/pt/#kalkulator"), null);
  assert.equal(classifyGuideCalculatorLink("/de/#kalkulator"), null);
  assert.equal(classifyGuideCalculatorLink("not a valid url"), null);
});

test("guide click zones preserve the strongest CTA context", () => {
  assert.equal(classifyGuideClickZone({ inPrimaryCta: true, inRelated: true, inHeader: true }), "primary_cta");
  assert.equal(classifyGuideClickZone({ inRelated: true, inHeader: true }), "related");
  assert.equal(classifyGuideClickZone({ inHeader: true }), "header");
  assert.equal(classifyGuideClickZone({}), "inline");
});
