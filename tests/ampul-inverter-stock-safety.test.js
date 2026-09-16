import test from "node:test";
import assert from "node:assert/strict";

import { syncAmpulExpansion } from "../scripts/lib/sync-ampul-expansion.mjs";

const INVERTER_ID = "ampul-eu-inverter-24v-2000w";
const DCDC_ID = "ampul-eu-dcdc-12v-30a";
const now = Date.parse("2026-09-16T12:00:00.000Z");

const sourceCatalog = {
  generatedAt: "2026-09-16T11:00:00.000Z",
  market: "cs-CZ",
  currency: "CZK",
  sources: { ampul_cz: { status: "ok" } },
  products: [{
    id: "ampul_cz:5577-7392",
    merchant: "ampul_cz",
    name: "Měnič napětí z DC na 230V AC, 50Hz, 2000W - 24 V DC",
    description: "Pure sine inverter.",
    categoryPath: "Měniče napětí",
    category: "inverter",
    priceCzk: 8398,
    priceCurrency: "CZK",
    available: null,
    productUrl: "https://ampul.eu/cs/menice-napeti/5577-7392-menic-napeti-z-dc-na-230v-ac-50hz-2000w",
    specs: { voltageV: 24, powerW: 2000, pureSine: true },
  }],
};

const verification = {
  schemaVersion: 2,
  products: {
    [DCDC_ID]: {
      markets: {
        pt: { verified: false, evidenceUrl: null, verifiedAt: null },
        ro: { verified: false, evidenceUrl: null, verifiedAt: null },
        si: { verified: false, evidenceUrl: null, verifiedAt: null },
      },
    },
    [INVERTER_ID]: {
      markets: {
        pt: { verified: false, evidenceUrl: null, verifiedAt: null },
        ro: { verified: true, evidenceUrl: "https://evidence.example/inverter-ro", verifiedAt: "2026-09-16" },
        si: { verified: false, evidenceUrl: null, verifiedAt: null },
      },
    },
  },
};

test("verified checkout never turns unknown exact 24V variant stock into availability", () => {
  const result = syncAmpulExpansion(sourceCatalog, "ro-RO", verification, { now });

  assert.equal(result.source.status, "ok");
  assert.deepEqual(result.source.verifiedProductMarkets[INVERTER_ID], ["ro"]);
  assert.equal(result.source.exactProducts, 0);
  assert.deepEqual(result.products, []);
});
