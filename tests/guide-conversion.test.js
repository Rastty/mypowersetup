import test from "node:test";
import assert from "node:assert/strict";

import { enhanceGuideConversion, isCoreMoneyGuide } from "../src/guide-conversion.js";

function attrNode(initial = []) {
  const attributes = new Set(initial);
  return {
    attributes,
    setAttribute(name) { attributes.add(name); },
    removeAttribute(name) { attributes.delete(name); },
    hasAttribute(name) { return attributes.has(name); },
  };
}

test("the mature core money guides receive the early CTA experiment", () => {
  for (const route of [
    "/pruvodce/kapacita-baterie-do-karavanu/",
    "/pruvodce/kolik-w-solarnich-panelu/",
    "/pruvodce/jak-vybrat-mppt-regulator/",
    "/pruvodce/jak-vybrat-dc-dc-nabijecku/",
    "/pruvodce/jak-vybrat-nabijecku-230-v/",
    "/pruvodce/jak-velky-menic-do-karavanu/",
    "/sk/sprievodca/aky-velky-menic-do-karavanu/",
    "/pl/poradnik/jak-dobrac-przetwornice-do-kampera/",
    "/hu/utmutatok/230-v-os-tolto-kivalasztasa/",
  ]) assert.equal(isCoreMoneyGuide(route), true, route);

  assert.equal(isCoreMoneyGuide("/pruvodce/kabely-a-pojistky-12-v/"), false);
  assert.equal(isCoreMoneyGuide("/pt/guias/capacidade-bateria-autocaravana/"), false);
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

  assert.equal(enhanceGuideConversion({ root, pathname: "/pruvodce/jak-vybrat-mppt-regulator/" }), true);
  assert.equal(lateLink.hasAttribute("data-guide-conversion-cta"), true);
  assert.equal(earlyCta.attributes.has("data-guide-top-cta"), true);
  assert.equal(earlyLink.hasAttribute("data-guide-conversion-cta"), false);
  assert.deepEqual(inserted, { position: "afterend", node: earlyCta });

  alreadyEnhanced = true;
  assert.equal(enhanceGuideConversion({ root, pathname: "/pruvodce/jak-vybrat-mppt-regulator/" }), false);
});
