import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMarketHomeSearchSurface } from "../src/search-surface.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";

const CASES = [
  [PT_MARKET_SEED, "../pt/index.html"],
  [SI_MARKET_SEED, "../si/index.html"],
  [RO_MARKET_SEED, "../ro/index.html"],
];

for (const [seed, publicPath] of CASES) {
  test(`${seed.key} committed homepage search surface matches the reusable generator`, () => {
    const publicHtml = readFileSync(new URL(publicPath, import.meta.url), "utf8");
    const expected = buildMarketHomeSearchSurface(seed);

    assert.ok(
      publicHtml.includes(expected),
      `${seed.key} public homepage search metadata drifted from src/search-surface.js; regenerate the committed expansion homepage before merging`,
    );
  });
}
