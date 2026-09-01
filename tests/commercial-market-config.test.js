import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COMMERCIAL_MARKET_CONFIG } from "../src/commercial-market-config.js";

test("commercial opportunity audit covers every public market with the correct locale", async () => {
  assert.deepEqual(
    COMMERCIAL_MARKET_CONFIG.map(({ market, locale }) => [market, locale]),
    [
      ["cs-CZ", "cs"],
      ["sk-SK", "sk"],
      ["pl-PL", "pl"],
      ["hu-HU", "hu"],
      ["pt-PT", "pt"],
      ["ro-RO", "ro"],
      ["sl-SI", "sl"],
    ],
  );

  for (const config of COMMERCIAL_MARKET_CONFIG) {
    assert.ok(config.files.length > 0, `${config.market} has no catalog files`);
    for (const path of config.files) {
      const catalog = JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
      assert.ok(Array.isArray(catalog.products), `${path} does not expose products`);
    }
  }
});
