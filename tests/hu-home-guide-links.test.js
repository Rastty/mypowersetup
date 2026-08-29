import test from "node:test";
import assert from "node:assert/strict";
import { renderHungarianPrivatePage } from "../src/page-hu.js";

test("Hungarian calculator exposes the guide hub and core local decision guides", () => {
  const html = renderHungarianPrivatePage();
  assert.match(html, /href="\/hu\/utmutatok\/">Útmutatók<\/a>/);
  assert.match(html, /href="\/hu\/utmutatok\/lakoauto-akkumulator-kapacitas\//);
  assert.match(html, /href="\/hu\/utmutatok\/agm-vagy-lifepo4-lakoautohoz\//);
  assert.match(html, /href="\/hu\/utmutatok\/dc-dc-tolto-kivalasztasa\//);
  assert.match(html, /Előbb értsd meg\. Utána vásárolj\./);
});
