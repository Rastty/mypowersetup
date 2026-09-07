import test from "node:test";
import assert from "node:assert/strict";

import { publicizeExpansionHtml } from "../src/expansion-publication.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";

const CASES = Object.freeze([
  Object.freeze({
    market: "ro",
    render: renderRomaniaPrivateContentPage,
    marker: "data-ro-search-growth",
    calculator: "/ro/#calculator-preview",
    routes: [
      "/ro/ghiduri/lifepo4-sau-agm-autorulota/",
      "/ro/ghiduri/regulator-mppt-autorulota/",
      "/ro/ghiduri/cate-panouri-solare-autorulota/",
      "/ro/ghiduri/invertor-autorulota-putere/",
    ],
  }),
  Object.freeze({
    market: "si",
    render: renderSloveniaPrivateContentPage,
    marker: "data-si-search-growth",
    calculator: "/si/#calculator-preview",
    routes: [
      "/si/vodici/lifepo4-ali-agm-avtodom/",
      "/si/vodici/mppt-regulator-avtodom/",
      "/si/vodici/koliko-soncnih-panelov-avtodom/",
      "/si/vodici/inverter-avtodom-moc/",
    ],
  }),
]);

test("RO and SI core component guides meet mature content depth", () => {
  let checked = 0;
  for (const entry of CASES) {
    for (const route of entry.routes) {
      const privateHtml = entry.render(route);
      assert.ok(privateHtml, `${route}: private render missing`);
      const html = publicizeExpansionHtml(privateHtml, entry.market, route);
      const words = visibleWordCount(html);
      const schemaTypes = jsonLdTypes(html);

      assert.match(html, new RegExp(entry.marker), `${route}: growth content missing`);
      assert.ok(words >= 650, `${route}: mature-depth floor missed at ${words} words`);
      assert.ok((html.match(/<h2\b/gi) || []).length >= 10, `${route}: weak topic structure`);
      assert.ok((html.match(/<a\b/gi) || []).length >= 16, `${route}: weak internal discovery`);
      assert.ok(html.includes(`href="${entry.calculator}"`), `${route}: calculator link missing`);
      assert.ok(schemaTypes.includes("Article"), `${route}: Article schema missing`);
      assert.ok(schemaTypes.includes("FAQPage"), `${route}: FAQ schema missing`);
      assert.ok(schemaTypes.includes("BreadcrumbList"), `${route}: BreadcrumbList missing`);
      checked += 1;
    }
  }
  assert.equal(checked, 8);
});

function visibleWordCount(html) {
  const visible = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return visible ? visible.split(" ").length : 0;
}

function jsonLdTypes(html) {
  const types = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(match[1]));
    } catch {}
  }
  return types;

  function visit(value) {
    if (!value || typeof value !== "object") return;
    const type = value["@type"];
    if (typeof type === "string") types.push(type);
    else if (Array.isArray(type)) types.push(...type);
    if (Array.isArray(value["@graph"])) value["@graph"].forEach(visit);
  }
}
