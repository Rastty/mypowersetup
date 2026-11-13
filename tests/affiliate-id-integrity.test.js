import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { affiliatePointsToExactProduct, hasApprovedAffiliateIdentity, isCommerciallyEligibleProduct } from "../src/commercial-coverage.js";
import { auditAffiliateIds, checkPublicAffiliateCatalogIds, PUBLIC_CATALOGS } from "../scripts/check-affiliate-ids.mjs";

async function catalog(file) {
  return JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8"));
}

test("all eight public product snapshots have the exact approved publisher and campaign identity", async () => {
  const report = await checkPublicAffiliateCatalogIds(catalog);
  assert.equal(report.status, "PASS", JSON.stringify(report.failures.slice(0, 4)));
  assert.equal(report.checked, report.valid);
  assert.equal(report.markets.length, PUBLIC_CATALOGS.length);
  assert.ok(report.checked >= 2000, "a zero-row or tiny fixture must not masquerade as a complete audit");
  assert.equal(report.commissionVerified, false, "an ID audit is not a confirmed sale");
});

test("wrong, missing, duplicated or redirected affiliate IDs fail closed in commercial coverage", async () => {
  const [cz, sk, pt] = await Promise.all([catalog("products.json"), catalog("products-sk.json"), catalog("products-pt.json")]);
  const scenarios = [
    [cz.products.find(p => p.merchant === "vselektro"), "a_aid", "wrong-publisher"],
    [cz.products.find(p => p.merchant === "vselektro"), "a_bid", "wrong-program"],
    [sk.products.find(p => p.merchant === "allpowers_eu"), "awinaffid", "wrong-publisher"],
    [sk.products.find(p => p.merchant === "allpowers_eu"), "awinmid", "wrong-program"],
    [sk.products.find(p => p.merchant === "oxe_sk"), "chid", "wrong-channel"],
    [pt.products.find(p => p.merchant === "allpowers_pt"), "awinaffid", "wrong-publisher"],
  ];
  for (const [product, key, wrong] of scenarios) {
    assert.ok(product && hasApprovedAffiliateIdentity(product), product?.merchant || "missing fixture");
    for (const mutation of ["wrong", "missing", "duplicate"]) {
      const affiliate = new URL(product.affiliateUrl);
      if (mutation === "wrong") affiliate.searchParams.set(key, wrong);
      if (mutation === "missing") affiliate.searchParams.delete(key);
      if (mutation === "duplicate") affiliate.searchParams.append(key, wrong);
      const broken = { ...product, affiliateUrl: affiliate.toString() };
      assert.equal(hasApprovedAffiliateIdentity(broken), false, `${product.merchant}: ${key} ${mutation}`);
      assert.equal(affiliatePointsToExactProduct(broken), false, `${product.merchant}: coverage ${mutation}`);
      assert.equal(isCommerciallyEligibleProduct(broken, { [product.merchant]: { status: "ok" } }), false);
    }
    assert.equal(hasApprovedAffiliateIdentity({ ...product, affiliateUrl: product.productUrl }), false,
      "a raw merchant URL is not a commission-tracked clickout");
    assert.equal(affiliatePointsToExactProduct({ ...product, affiliateUrl: product.productUrl }), false);
    const modified = new URL(product.affiliateUrl);
    modified.searchParams.set("extra_redirect", "https://other.example/");
    assert.equal(hasApprovedAffiliateIdentity({ ...product, affiliateUrl: modified.toString() }), false);
    const destKey = product.merchant.startsWith("oxe_") ? "url"
      : modified.hostname.includes("awin1.com") ? "ued" : "desturl";
    modified.searchParams.delete("extra_redirect");
    modified.searchParams.set(destKey, "https://other.example/products/wrong");
    assert.equal(hasApprovedAffiliateIdentity({ ...product, affiliateUrl: modified.toString() }), false);
  }
});

test("catalog validation blocks an unexpected merchant or a missing source snapshot", async () => {
  const cz = await catalog("products.json");
  const original = cz.products.find(p => p.merchant === "vselektro");
  const report = auditAffiliateIds([{ file: "synthetic", data: { products: [
    original, { ...original, merchant: "unapproved-merchant" },
  ] } }, { file: "missing", data: null }]);
  assert.equal(report.status, "BLOCKED");
  assert.equal(report.checked, 2);
  assert.equal(report.valid, 1);
  assert.deepEqual(report.failures.map(x => x.reason), [
    "AFFILIATE_ID_OR_EXACT_DESTINATION_NOT_APPROVED", "PRODUCT_LIST_INVALID_OR_EMPTY",
  ]);
  assert.equal(auditAffiliateIds([{ file: "empty", data: { products: [] } }]).status, "BLOCKED");
});
