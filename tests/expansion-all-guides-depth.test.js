import test from "node:test";
import assert from "node:assert/strict";

import { expansionPublicationManifest, publicizeExpansionHtml } from "../src/expansion-publication.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { renderExpansionVoltageGuidePage } from "../src/expansion-voltage-guides.js";

const MARKETS = Object.freeze([
  Object.freeze({ market: "pt", hub: "/pt/guias/", render: renderPortugalPrivateContentPage }),
  Object.freeze({ market: "ro", hub: "/ro/ghiduri/", render: renderRomaniaPrivateContentPage }),
  Object.freeze({ market: "si", hub: "/si/vodici/", render: renderSloveniaPrivateContentPage }),
]);

test("all 36 PT RO SI guide articles stay above the mature content floor", () => {
  let checked = 0;
  const weakest = [];

  for (const entry of MARKETS) {
    const routes = expansionPublicationManifest(entry.market)
      .map(({ route }) => route)
      .filter((route) => route.startsWith(entry.hub) && route !== entry.hub);

    assert.equal(routes.length, 12, `${entry.market}: guide route count changed`);

    for (const route of routes) {
      const privateHtml = entry.render(route) || renderExpansionVoltageGuidePage(entry.market, route);
      assert.ok(privateHtml, `${route}: private render missing`);
      const html = publicizeExpansionHtml(privateHtml, entry.market, route);
      const words = visibleWordCount(html);
      weakest.push({ route, words });

      assert.ok(words >= 650, `${route}: thin guide at ${words} visible words`);
      assert.ok((html.match(/<h2\b/gi) || []).length >= 8, `${route}: insufficient section structure`);
      assert.match(html, /data-expansion-breadcrumbs/, `${route}: visible breadcrumb missing`);
      checked += 1;
    }
  }

  weakest.sort((a, b) => a.words - b.words);
  assert.equal(checked, 36);
  assert.ok(weakest[0].words >= 650);
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
