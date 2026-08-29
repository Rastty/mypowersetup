import test from "node:test";
import assert from "node:assert/strict";
import { HU_UI_COPY } from "../src/ui-copy-hu.js";

test("Hungarian DC-DC category uses caravan-market charging terminology", () => {
  assert.equal(HU_UI_COPY.products.categories.dcCharger, "Menet közbeni DC–DC akkumulátortöltők");
});
