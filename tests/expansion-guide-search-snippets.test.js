import test from "node:test";
import assert from "node:assert/strict";

import { expansionPublicationManifest, publicizeExpansionHtml } from "../src/expansion-publication.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { renderExpansionVoltageGuidePage } from "../src/expansion-voltage-guides.js";

const CASES = Object.freeze([
  Object.freeze({ market: "pt", hub: "/pt/guias/", render: renderPortugalPrivateContentPage }),
  Object.freeze({ market: "ro", hub: "/ro/ghiduri/", render: renderRomaniaPrivateContentPage }),
  Object.freeze({ market: "si", hub: "/si/vodici/", render: renderSloveniaPrivateContentPage }),
]);

test("expansion guide search snippets match mature-market quality bounds", () => {
  const titles = new Set();
  const descriptions = new Set();
  let guideCount = 0;

  for (const entry of CASES) {
    const routes = expansionPublicationManifest(entry.market)
      .map(({ route }) => route)
      .filter((route) => route.startsWith(entry.hub) && route !== entry.hub);

    assert.equal(routes.length, 12, `${entry.market} guide coverage changed`);

    for (const route of routes) {
      const privateHtml = entry.render(route) || renderExpansionVoltageGuidePage(entry.market, route);
      assert.ok(privateHtml, `${route}: render missing`);
      const html = publicizeExpansionHtml(privateHtml, entry.market, route);
      const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || "";
      const description = metaDescription(html);

      assert.ok(title.length >= 35 && title.length <= 60, `${route}: title has ${title.length} characters: ${title}`);
      assert.ok(description.length >= 110 && description.length <= 160, `${route}: description has ${description.length} characters: ${description}`);
      assert.ok(!titles.has(title), `${route}: duplicate title: ${title}`);
      assert.ok(!descriptions.has(description), `${route}: duplicate description`);

      titles.add(title);
      descriptions.add(description);
      guideCount += 1;
    }
  }

  assert.equal(guideCount, 36);
});

function metaDescription(html) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== "description") continue;
    return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || "";
  }
  return "";
}
