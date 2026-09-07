import test from "node:test";
import assert from "node:assert/strict";

import { publicizeExpansionHtml } from "../src/expansion-publication.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";

const CASES = Object.freeze([
  Object.freeze({
    market: "pt",
    render: renderPortugalPrivateContentPage,
    marker: "data-search-growth-content",
    routes: [
      "/pt/guias/consumo-frigorifico-compressor-autocaravana/",
      "/pt/guias/sistema-eletrico-completo-autocaravana/",
    ],
    calculator: "/pt/#calculator-preview",
  }),
  Object.freeze({
    market: "ro",
    render: renderRomaniaPrivateContentPage,
    marker: "data-ro-search-growth",
    routes: [
      "/ro/ghiduri/consum-frigider-compresor-autorulota/",
      "/ro/ghiduri/sistem-electric-complet-autorulota/",
    ],
    calculator: "/ro/#calculator-preview",
  }),
  Object.freeze({
    market: "si",
    render: renderSloveniaPrivateContentPage,
    marker: "data-si-search-growth",
    routes: [
      "/si/vodici/poraba-kompresorski-hladilnik-avtodom/",
      "/si/vodici/elektricni-sistem-avtodom/",
    ],
    calculator: "/si/#calculator-preview",
  }),
]);

test("weak expansion clusters are substantial, structured and conversion-linked", () => {
  let checked = 0;

  for (const entry of CASES) {
    for (const route of entry.routes) {
      const privateHtml = entry.render(route);
      assert.ok(privateHtml, `${route}: private page missing`);

      const html = publicizeExpansionHtml(privateHtml, entry.market, route);
      const words = visibleWordCount(html);
      const schemaTypes = jsonLdTypes(html);

      assert.match(html, new RegExp(entry.marker), `${route}: growth layer missing`);
      assert.ok(words >= 650, `${route}: still thin at ${words} visible words`);
      assert.ok((html.match(/<h2\b/gi) || []).length >= 10, `${route}: insufficient topic structure`);
      assert.ok(html.includes(`href="${entry.calculator}"`), `${route}: calculator path missing`);
      assert.ok((html.match(/<a\b/gi) || []).length >= 14, `${route}: weak internal discovery`);
      assert.ok(schemaTypes.includes("Article"), `${route}: Article schema missing`);
      assert.ok(schemaTypes.includes("FAQPage"), `${route}: FAQ schema missing`);
      assert.ok(schemaTypes.includes("BreadcrumbList"), `${route}: breadcrumb schema missing`);

      checked += 1;
    }
  }

  assert.equal(checked, 6);
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
    let value;
    try {
      value = JSON.parse(match[1]);
    } catch {
      continue;
    }
    visit(value);
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
