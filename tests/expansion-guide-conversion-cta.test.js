import test from "node:test";
import assert from "node:assert/strict";

import { expansionPublicationManifest } from "../src/expansion-publication.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { renderExpansionVoltageGuidePage } from "../src/expansion-voltage-guides.js";

const CASES = Object.freeze([
  Object.freeze({ market: "pt", hub: "/pt/guias/", calculator: "/pt/#calculator-preview", render: renderPortugalPrivateContentPage }),
  Object.freeze({ market: "ro", hub: "/ro/ghiduri/", calculator: "/ro/#calculator-preview", render: renderRomaniaPrivateContentPage }),
  Object.freeze({ market: "si", hub: "/si/vodici/", calculator: "/si/#calculator-preview", render: renderSloveniaPrivateContentPage }),
]);

test("all 36 PT RO SI guides offer an early and late calculator/product journey", () => {
  let checked = 0;

  for (const entry of CASES) {
    const routes = expansionPublicationManifest(entry.market)
      .map(({ route }) => route)
      .filter((route) => route.startsWith(entry.hub) && route !== entry.hub);

    assert.equal(routes.length, 12, `${entry.market}: guide route count changed`);

    for (const route of routes) {
      const privateHtml = entry.render(route);
      const html = privateHtml || renderExpansionVoltageGuidePage(entry.market, route);
      assert.ok(html, `${route}: guide render missing`);

      const escaped = entry.calculator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const calculatorLinks = html.match(new RegExp(`href="${escaped}"`, "g")) || [];
      assert.ok(calculatorLinks.length >= 2, `${route}: expected early + late calculator CTA, found ${calculatorLinks.length}`);

      if (privateHtml) {
        assert.match(html, /data-guide-top-cta/, `${route}: explicit early CTA marker missing`);
        assert.match(html, /data-guide-conversion-cta/, `${route}: late conversion CTA marker missing`);
      }

      assert.match(html, /button button-primary/, `${route}: primary CTA styling missing`);
      checked += 1;
    }
  }

  assert.equal(checked, 36);
});
