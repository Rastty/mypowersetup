import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";

const IDS = ["fridge", "lights", "pump", "laptop", "tv", "coffee"];
const CASES = [
  [PT_MARKET_SEED, "../pt/index.html"],
  [RO_MARKET_SEED, "../ro/index.html"],
  [SI_MARKET_SEED, "../si/index.html"],
];

for (const [seed, publicPath] of CASES) {
  test(`${seed.key} generated and committed calculator expose stable appliance IDs`, () => {
    const generated = renderPrivateMarketSeedPage(seed);
    const committed = readFileSync(new URL(publicPath, import.meta.url), "utf8");
    for (const id of IDS) {
      const marker = `data-appliance-id="${id}"`;
      assert.ok(generated.includes(marker), `${seed.key} generator missing ${marker}`);
      assert.ok(committed.includes(marker), `${seed.key} public homepage missing ${marker}; regenerate expansion output`);
    }
  });
}

test("expansion browser restores shared state, renders it and provides a result share action", () => {
  const source = readFileSync(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  assert.match(source, /decodeExpansionSetupQuery/);
  assert.match(source, /applyInitialSetup\(initialSetup\)/);
  assert.match(source, /calculateAndRender\(\{ source: "shared_url" \}\)/);
  assert.match(source, /data-share-result/);
  assert.match(source, /buildResultShareText\(latestResult, locale, latestShareUrl\)/);
  assert.match(source, /calculator_result_shared/);
});
