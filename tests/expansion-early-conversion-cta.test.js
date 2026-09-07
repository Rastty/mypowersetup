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

test("all 36 PT RO SI guides expose an early and a closing calculator-to-products CTA", () => {
  let checked = 0;

  for (const entry of CASES) {
    const routes = expansionPublicationManifest(entry.market)
      .map(({ route }) => route)
      .filter((route) => route.startsWith(entry.hub) && route !== entry.hub);

    assert.equal(routes.length, 12, `${entry.market}: guide route count changed`);

    for (const route of routes) {
      const privateHtml = entry.render(route) || renderExpansionVoltageGuidePage(entry.market, route);
      assert.ok(privateHtml, `${route}: private render missing`);

      const html = publicizeExpansionHtml(privateHtml, entry.market, route);
      const early = [...html.matchAll(/data-guide-conversion-early-cta/g)];
      const closing = [...html.matchAll(/data-guide-conversion-cta/g)];
      const earlyIndex = html.indexOf("data-guide-conversion-early-cta");
      const firstContentH2 = html.indexOf("<h2", earlyIndex);
      const closingIndex = html.indexOf("data-guide-conversion-cta");

      assert.equal(early.length, 1, `${route}: expected exactly one early CTA`);
      assert.equal(closing.length, 1, `${route}: expected exactly one closing CTA`);
      assert.ok(earlyIndex >= 0 && firstContentH2 > earlyIndex, `${route}: early CTA must appear before article sections`);
      assert.ok(closingIndex > firstContentH2, `${route}: closing CTA must remain after article content`);
      assert.ok((html.match(new RegExp(`href="/${entry.market}/#calculator-preview"`, "g")) || []).length >= 2, `${route}: calculator journey needs top + bottom links`);
      checked += 1;
    }
  }

  assert.equal(checked, 36);
});
