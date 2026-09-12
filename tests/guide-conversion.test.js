import test from "node:test";
import assert from "node:assert/strict";

import { enhanceGuideConversion, isCoreBatteryGuide } from "../src/guide-conversion.js";

function attrNode(initial = []) {
  const attributes = new Set(initial);
  return {
    attributes,
    setAttribute(name) { attributes.add(name); },
    removeAttribute(name) { attributes.delete(name); },
    hasAttribute(name) { return attributes.has(name); },
  };
}

test("only the four mature battery money guides receive the early CTA experiment", () => {
  for (const route of [
    "/pruvodce/kapacita-baterie-do-karavanu/",
    "/sk/sprievodca/kapacita-baterie-do-karavanu/",
    "/pl/poradnik/pojemnosc-akumulatora-do-kampera/",
    "/hu/utmutatok/lakoauto-akkumulator-kapacitas/",
  ]) assert.equal(isCoreBatteryGuide(route), true, route);

  assert.equal(isCoreBatteryGuide("/pruvodce/kolik-w-solarnich-panelu/"), false);
  assert.equal(isCoreBatteryGuide("/pt/guias/capacidade-bateria-autocaravana/"), false);
});

test("enhancer inserts one early CTA and marks the existing CTA as late", () => {
  const lateLink = attrNode();
  const earlyLink = attrNode(["data-guide-conversion-cta"]);
  const earlyCta = {
    attributes: new Set(),
    setAttribute(name) { this.attributes.add(name); },
    querySelector(selector) { return selector === "[data-guide-conversion-cta]" ? earlyLink : null; },
  };
  const lateCta = {
    querySelector(selector) { return selector === 'a[href*="#kalkulator"]' ? lateLink : null; },
    cloneNode() { return earlyCta; },
  };
  let inserted = null;
  const answer = { insertAdjacentElement(position, node) { inserted = { position, node }; } };
  let alreadyEnhanced = false;
  const article = {
    querySelector(selector) {
      if (selector === ".answer") return answer;
      if (selector === ".cta") return lateCta;
      if (selector === "[data-guide-top-cta]") return alreadyEnhanced ? earlyCta : null;
      return null;
    },
  };
  const root = { querySelector(selector) { return selector === "main article.article" ? article : null; } };

  assert.equal(enhanceGuideConversion({ root, pathname: "/pruvodce/kapacita-baterie-do-karavanu/" }), true);
  assert.equal(lateLink.hasAttribute("data-guide-conversion-cta"), true);
  assert.equal(earlyCta.attributes.has("data-guide-top-cta"), true);
  assert.equal(earlyLink.hasAttribute("data-guide-conversion-cta"), false);
  assert.deepEqual(inserted, { position: "afterend", node: earlyCta });

  alreadyEnhanced = true;
  assert.equal(enhanceGuideConversion({ root, pathname: "/pruvodce/kapacita-baterie-do-karavanu/" }), false);
});
