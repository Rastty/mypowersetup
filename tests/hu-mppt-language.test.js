import test from "node:test";
import assert from "node:assert/strict";
import { HU_UI_COPY } from "../src/ui-copy-hu.js";

test("Hungarian purchase-facing MPPT copy uses local töltésvezérlő terminology", () => {
  assert.match(HU_UI_COPY.meta.description, /MPPT töltésvezérlőt/);
  assert.match(HU_UI_COPY.hero.lead, /MPPT töltésvezérlőre/);
  assert.equal(HU_UI_COPY.result.controller, "MPPT töltésvezérlő");
  assert.equal(HU_UI_COPY.products.categories.controller, "MPPT töltésvezérlők");
});
