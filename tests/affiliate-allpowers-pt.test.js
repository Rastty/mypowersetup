import test from "node:test";
import assert from "node:assert/strict";
import { ALLPOWERS_PT_AFFILIATE, buildAllpowersPtDeeplink, parseAllpowersPtDeeplink } from "../src/affiliate-allpowers-pt.js";

const supplied = "https://www.awin1.com/cread.php?awinmid=125820&awinaffid=3044971&ued=https%3A%2F%2Fallpowers-pt.com%2Fproducts%2Fallpower-solar-generator-kit-1800w-r1500-sp033-200w-solar-panel";

test("accepts supplied approved ALLPOWERS PT deeplink", () => {
  const parsed = parseAllpowersPtDeeplink(supplied);
  assert.ok(parsed);
  assert.equal(parsed.merchantId, "125820");
  assert.equal(parsed.affiliateId, "3044971");
  assert.equal(parsed.destinationUrl, "https://allpowers-pt.com/products/allpower-solar-generator-kit-1800w-r1500-sp033-200w-solar-panel");
});

test("builds exact product deeplinks with approved account ids", () => {
  const built = buildAllpowersPtDeeplink("https://allpowers-pt.com/products/example-product");
  const parsed = parseAllpowersPtDeeplink(built);
  assert.ok(parsed);
  assert.equal(parsed.destinationUrl, "https://allpowers-pt.com/products/example-product");
});

test("fails closed for wrong merchant, affiliate, host and generic destinations", () => {
  assert.equal(parseAllpowersPtDeeplink(supplied.replace("awinmid=125820", "awinmid=1")), null);
  assert.equal(parseAllpowersPtDeeplink(supplied.replace("awinaffid=3044971", "awinaffid=1")), null);
  assert.equal(parseAllpowersPtDeeplink(supplied.replace("allpowers-pt.com", "example.com")), null);
  assert.throws(() => buildAllpowersPtDeeplink("https://allpowers-pt.com/"), /exact product/i);
});

test("records approved Portugal account metadata", () => {
  assert.equal(ALLPOWERS_PT_AFFILIATE.awinMerchantId, 125820);
  assert.equal(ALLPOWERS_PT_AFFILIATE.awinAffiliateId, 3044971);
  assert.equal(ALLPOWERS_PT_AFFILIATE.destinationHost, "allpowers-pt.com");
  assert.equal(ALLPOWERS_PT_AFFILIATE.exactProductOnly, true);
});
