import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { syncSolarisEu } from "../scripts/lib/sync-solaris-eu.mjs";
import { validateSolarisExpansionProduct } from "../src/affiliate-solaris.js";

const NOW = Date.parse("2026-09-16T20:00:00.000Z");
const ID_12 = "solaris-victron-phoenix-12-250";
const ID_24 = "solaris-victron-phoenix-24-250";

async function baseActivation() {
  return JSON.parse(await readFile(new URL("../data/solaris-affiliate-activation.json", import.meta.url), "utf8"));
}

function activateTracking(config, productId, suffix = productId) {
  config.products[productId].exactAffiliateUrl = `https://tracking.example/${suffix}`;
  config.products[productId].trackingVerifiedAt = "2026-09-16";
}

function verifyMarket(config, productId, marketCode) {
  config.products[productId].markets[marketCode] = {
    verified: true,
    evidenceUrl: `https://evidence.example/${productId}/${marketCode}`,
    verifiedAt: "2026-09-16",
  };
}

test("Solaris activation is blocked by default even with current public stock evidence", async () => {
  const activation = await baseActivation();
  const result = syncSolarisEu("pt-PT", activation, { now: NOW });

  assert.deepEqual(result.products, []);
  assert.equal(result.source.status, "blocked");
  assert.equal(result.source.blocker, "ambassador_approval_pending");
  assert.equal(result.source.approvalConfirmed, false);
  assert.equal(result.source.productStates.length, 2);
  assert.ok(result.source.productStates.every(({ stockVerified }) => stockVerified === true));
  assert.ok(result.source.productStates.every(({ trackingVerified, marketVerified, ready }) => !trackingVerified && !marketVerified && !ready));
});

test("one exact Solaris product-market pair activates without authorizing another market", async () => {
  const activation = await baseActivation();
  activation.approvalConfirmed = true;
  activation.approvalSource = "owner_confirmed";
  activateTracking(activation, ID_12);
  verifyMarket(activation, ID_12, "pt");

  const pt = syncSolarisEu("pt-PT", activation, { now: NOW });
  assert.equal(pt.source.status, "ok");
  assert.equal(pt.products.length, 1);
  assert.equal(pt.products[0].id, ID_12);
  assert.equal(pt.products[0].specs.voltageV, 12);
  assert.equal(pt.products[0].specs.powerW, 200);
  assert.equal(pt.products[0].specs.pureSine, true);
  assert.deepEqual(pt.source.verifiedProductMarkets[ID_12], ["pt"]);
  assert.deepEqual(pt.source.verifiedProductMarkets[ID_24], []);

  const ro = syncSolarisEu("ro-RO", activation, { now: NOW });
  assert.deepEqual(ro.products, []);
  assert.equal(ro.source.status, "blocked");
  assert.equal(ro.source.blocker, "product_market_shipping_checkout_unverified");
});

test("both P0 Solaris inverters can activate independently for one verified market", async () => {
  const activation = await baseActivation();
  activation.approvalConfirmed = true;
  activation.approvalSource = "owner_confirmed";
  for (const id of [ID_12, ID_24]) {
    activateTracking(activation, id);
    verifyMarket(activation, id, "si");
  }

  const result = syncSolarisEu("sl-SI", activation, { now: NOW });
  assert.equal(result.products.length, 2);
  assert.deepEqual(result.products.map(({ id }) => id).sort(), [ID_12, ID_24].sort());
  assert.deepEqual(result.products.map(({ specs }) => specs.voltageV).sort((a, b) => a - b), [12, 24]);
  assert.ok(result.products.every(({ affiliateUrl }) => affiliateUrl.startsWith("https://tracking.example/")));
});

test("plain untracked Solaris landing URL cannot masquerade as an affiliate link", async () => {
  const activation = await baseActivation();
  activation.approvalConfirmed = true;
  activation.products[ID_12].exactAffiliateUrl = activation.products[ID_12].finalLandingUrl;
  activation.products[ID_12].trackingVerifiedAt = "2026-09-16";
  verifyMarket(activation, ID_12, "pt");

  const result = syncSolarisEu("pt-PT", activation, { now: NOW });
  assert.deepEqual(result.products, []);
  assert.equal(result.source.blocker, "exact_affiliate_tracking_unverified");
});

test("stale stock evidence fails closed after affiliate and market verification", async () => {
  const activation = await baseActivation();
  activation.approvalConfirmed = true;
  activateTracking(activation, ID_24);
  verifyMarket(activation, ID_24, "ro");
  activation.products[ID_24].stockVerifiedAt = "2026-08-01";

  const result = syncSolarisEu("ro-RO", activation, { now: NOW });
  assert.deepEqual(result.products, []);
  assert.equal(result.source.blocker, "exact_product_stock_unverified");
});

test("runtime validation rejects mutated Solaris electrical specs", async () => {
  const activation = await baseActivation();
  activation.approvalConfirmed = true;
  activateTracking(activation, ID_24);
  verifyMarket(activation, ID_24, "ro");
  const result = syncSolarisEu("ro-RO", activation, { now: NOW });
  const mutated = {
    ...result.products[0],
    specs: { ...result.products[0].specs, voltageV: 12 },
  };

  assert.throws(
    () => validateSolarisExpansionProduct(mutated, { market: "ro-RO", source: result.source }),
    /SOLARIS_INVERTER_SPECS_INVALID/
  );
});
