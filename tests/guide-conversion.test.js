import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { classifyGuideCalculatorLink } from "../src/analytics-links.js";
import { coreMoneyGuideRoutes, enhanceGuideConversion, isCoreMoneyGuide } from "../src/guide-conversion.js";

function attrNode(initial = []) {
  const attributes = new Set(initial);
  const values = new Map();
  return {
    attributes,
    setAttribute(name, value = "") { attributes.add(name); values.set(name, value); },
    removeAttribute(name) { attributes.delete(name); values.delete(name); },
    hasAttribute(name) { return attributes.has(name); },
    getAttribute(name) { return values.get(name) ?? null; },
  };
}

test("the mature core money guides receive the early CTA experiment", () => {
  const routes = coreMoneyGuideRoutes();
  assert.equal(routes.length, 24);

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

test("every early-CTA money route has an answer block and local calculator CTA", async () => {
  for (const route of coreMoneyGuideRoutes()) {
    const html = await readFile(`${route.slice(1)}index.html`, "utf8");
    assert.match(html, /class="answer"/, `${route} is missing the answer-first block`);
    assert.match(html, /<section class="cta">/, `${route} is missing the conversion CTA`);
    assert.match(html, /href="[^\"]*#kalkulator"/, `${route} is missing the local calculator link`);
  }
});

test("enhancer inserts one early CTA and marks the existing CTA as late", () => {
  const lateLink = attrNode();
  lateLink.setAttribute("href", "/kalkulacky/mppt-regulator/");
  const earlyLink = attrNode(["data-guide-conversion-cta"]);
  const earlyCta = {
    attributes: new Set(),
    setAttribute(name) { this.attributes.add(name); },
    querySelector(selector) { return selector === "[data-guide-conversion-cta]" ? earlyLink : null; },
  };
  const lateCta = {
    querySelector(selector) { return selector === "a[href]" ? lateLink : null; },
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
