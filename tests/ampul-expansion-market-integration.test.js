import test from "node:test";
import assert from "node:assert/strict";

import { syncAmpulExpansion } from "../scripts/lib/sync-ampul-expansion.mjs";
import { validatePtCatalog } from "../src/products-pt.js";
import { validateRomaniaCatalog } from "../src/ro-recommendations.js";
import { validateSloveniaCatalog } from "../src/si-recommendations.js";

const DCDC_ID = "ampul-eu-dcdc-12v-30a";
const INVERTER_ID = "ampul-eu-inverter-24v-2000w";
const now = Date.parse("2026-09-07T18:00:00.000Z");
const sourceCatalog = {
  generatedAt: "2026-09-07T17:00:00.000Z",
  market: "cs-CZ",
  currency: "CZK",
  sources: { ampul_cz: { status: "ok" } },
  products: [{
    id: "ampul_cz:6195",
    merchant: "ampul_cz",
    name: "DC/DC nabíječka LiFePO4 baterií 14.6V, 30A, 400W, IP68",
    description: "Input 10-36V DC, output 14.6V 30A, LiFePO4.",
    categoryPath: "Nabíječky",
    category: "dc_charger",
    brand: "",
    priceCzk: 6800,
    priceCurrency: "CZK",
    available: true,
    productUrl: "https://ampul.eu/cs/nabijecky/6195-dc-dc-nabijecka-lifepo4-baterii-146v-30a-400w-ip68",
    affiliateUrl: "source-link-not-reused",
    imageUrl: "https://ampul.eu/25626-large_default/example.jpg",
    specs: {},
  }],
};

function record(verified, suffix) {
  return {
    verified,
    evidenceUrl: verified ? `https://evidence.example/${suffix}` : null,
    verifiedAt: verified ? "2026-09-07" : null,
  };
}

function verification(productId, market) {
  return {
    schemaVersion: 2,
    products: {
      [DCDC_ID]: {
        markets: {
          pt: record(productId === DCDC_ID && market === "pt", "dcdc-pt"),
          ro: record(productId === DCDC_ID && market === "ro", "dcdc-ro"),
          si: record(productId === DCDC_ID && market === "si", "dcdc-si"),
        },
      },
      [INVERTER_ID]: {
        markets: {
          pt: record(productId === INVERTER_ID && market === "pt", "inverter-pt"),
          ro: record(productId === INVERTER_ID && market === "ro", "inverter-ro"),
          si: record(productId === INVERTER_ID && market === "si", "inverter-si"),
        },
      },
    },
  };
}

function sourceFor(sync) {
  return { ampul_eu: { ...sync.source, affiliateApprovalConfirmed: true } };
}

function catalogFor(catalogMarket, sync) {
  const base = {
    generatedAt: "2026-09-07T18:00:00.000Z",
    market: catalogMarket,
    currency: "EUR",
    private: false,
    sources: sourceFor(sync),
    products: sync.products,
  };
  return catalogMarket === "pt-PT" ? base : {
    ...base,
    shippingEligibility: {
      country: catalogMarket === "ro-RO" ? "Romania" : "Slovenia",
      eligible: true,
    },
  };
}

test("exact AMPUL DC-DC passes PT RO SI runtime only when that exact product-market pair is verified", () => {
  const cases = [
    ["pt-PT", "pt", validatePtCatalog],
    ["ro-RO", "ro", validateRomaniaCatalog],
    ["sl-SI", "si", validateSloveniaCatalog],
  ];

  for (const [catalogMarket, market, validate] of cases) {
    const sync = syncAmpulExpansion(sourceCatalog, catalogMarket, verification(DCDC_ID, market), { now });
    assert.equal(sync.products.length, 1, catalogMarket);
    assert.deepEqual(sync.source.verifiedProductMarkets[DCDC_ID], [market]);
    assert.deepEqual(sync.source.verifiedProductMarkets[INVERTER_ID], []);

    const validated = validate(catalogFor(catalogMarket, sync));
    assert.equal(validated.products[0].merchant, "ampul_eu");
    assert.equal(validated.products[0].id, DCDC_ID);
    assert.equal(validated.products[0].specs.currentA, 30);
  }
});

test("PT RO SI reject an AMPUL inverter without valid continuous-rating proof even when checkout and stock are verified", () => {
  const inverter = {
    id: "ampul_cz:5577-7392",
    merchant: "ampul_cz",
    name: "24 V to 230 V AC inverter, advertised maximum 2000 W",
    category: "inverter",
    categoryPath: "Měniče napětí",
    priceCzk: 8398,
    priceCurrency: "CZK",
    available: true,
    productUrl: "https://ampul.eu/cs/menice-napeti/5577-7392-menic-napeti-z-dc-na-230v-ac-50hz-2000w",
    specs: { voltageV: 24, powerW: 2000, pureSine: true },
  };
  const source = { ...sourceCatalog, products: [...sourceCatalog.products, inverter] };
  const cases = [
    ["pt-PT", "pt", validatePtCatalog],
    ["ro-RO", "ro", validateRomaniaCatalog],
    ["sl-SI", "si", validateSloveniaCatalog],
  ];

  for (const [market, code, validate] of cases) {
    const evidence = verification(INVERTER_ID, code);
    evidence.products[INVERTER_ID].continuousRating = {
      continuousPowerW: 1500,
      verifiedAt: "2026-09-07",
      evidenceUrl: "https://evidence.example/manufacturer-continuous-24v.pdf",
    };
    const sync = syncAmpulExpansion(source, market, evidence, { now });
    assert.equal(sync.products.length, 1, market);
    assert.equal(sync.products[0].specs.powerW, 1500);
    const catalog = catalogFor(market, sync);
    assert.equal(validate(catalog).products[0].id, INVERTER_ID, market);

    const missingProof = structuredClone(catalog);
    missingProof.sources.ampul_eu.inverterContinuousRating = null;
    assert.throws(() => validate(missingProof), /AMPUL_EXPANSION_INVERTER_SPECS_INVALID/, `${market}: source proof lost`);

    const forgedPeak = structuredClone(catalog);
    forgedPeak.products[0].specs.powerW = 2000;
    assert.throws(() => validate(forgedPeak), /AMPUL_EXPANSION_INVERTER_SPECS_INVALID/, `${market}: peak power substituted`);
  }
});

test("runtime rejects AMPUL product when source loses verification for that exact product", () => {
  const sync = syncAmpulExpansion(sourceCatalog, "ro-RO", verification(DCDC_ID, "ro"), { now });
  const catalog = catalogFor("ro-RO", sync);
  catalog.sources.ampul_eu = {
    ...catalog.sources.ampul_eu,
    verifiedProductMarkets: {
      ...catalog.sources.ampul_eu.verifiedProductMarkets,
      [DCDC_ID]: [],
    },
  };
  assert.throws(() => validateRomaniaCatalog(catalog), /AMPUL_EXPANSION_PRODUCT_MARKET_UNVERIFIED/);
});

test("verification for a different AMPUL product does not authorize the current product", () => {
  const sync = syncAmpulExpansion(sourceCatalog, "ro-RO", verification(DCDC_ID, "ro"), { now });
  const catalog = catalogFor("ro-RO", sync);
  catalog.sources.ampul_eu = {
    ...catalog.sources.ampul_eu,
    verifiedProductMarkets: {
      [DCDC_ID]: [],
      [INVERTER_ID]: ["ro"],
    },
  };
  assert.throws(() => validateRomaniaCatalog(catalog), /AMPUL_EXPANSION_PRODUCT_MARKET_UNVERIFIED/);
});

test("runtime rejects modified AMPUL affiliate tracking even with exact product-market evidence", () => {
  const sync = syncAmpulExpansion(sourceCatalog, "sl-SI", verification(DCDC_ID, "si"), { now });
  const bad = { ...sync.products[0], affiliateUrl: sync.products[0].affiliateUrl.replace("ddb5edae", "wrong") };
  assert.throws(() => validateSloveniaCatalog({
    ...catalogFor("sl-SI", sync),
    products: [bad],
  }), /AMPUL_EXPANSION_AFFILIATE_INVALID/);
});
