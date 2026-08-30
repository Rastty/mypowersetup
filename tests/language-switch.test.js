import test from "node:test";
import assert from "node:assert/strict";

import {
  PUBLIC_LANGUAGE_MARKETS,
  isPublicMarketHomepage,
  marketFromHomepagePath,
} from "../src/language-switch.js";

test("public language selector exposes all seven published markets", () => {
  assert.deepEqual(
    PUBLIC_LANGUAGE_MARKETS.map((market) => market.code),
    ["CZ", "SK", "PL", "HU", "PT", "SI", "RO"],
  );
});

test("published homepage paths resolve to their market", () => {
  for (const market of PUBLIC_LANGUAGE_MARKETS) {
    assert.equal(isPublicMarketHomepage(market.path), true);
    assert.equal(marketFromHomepagePath(market.path)?.code, market.code);
  }
});

test("non-homepage routes are not rewritten by the selector", () => {
  assert.equal(isPublicMarketHomepage("/pl/przewodniki/"), false);
  assert.equal(isPublicMarketHomepage("/pt/guias/"), false);
  assert.equal(marketFromHomepagePath("/o-projektu/"), null);
});
