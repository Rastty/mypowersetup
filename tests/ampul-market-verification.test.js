import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAmpulMarketVerification, verifiedAmpulCandidateMarkets } from "../src/ampul-market-verification.js";

const CANDIDATE = "ampul-eu-inverter-24v-2000w";
const MARKETS = ["pt-PT", "ro-RO", "sl-SI"];

function proof(verifiedAt, evidenceUrl = "https://ampul.eu/en/order") {
  return { schemaVersion: 2, products: { [CANDIDATE]: { markets: {
    pt: { verified: true, evidenceUrl, verifiedAt },
    ro: { verified: false, evidenceUrl: null, verifiedAt: null },
    si: { verified: false, evidenceUrl: null, verifiedAt: null },
  } } } };
}

test("AMPUL checkout evidence rejects impossible calendar days instead of normalizing them", () => {
  for (const date of ["2026-02-30", "2026-09-31", "2027-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-2-01", "n/a", null, 20260916]) {
    const [pt] = normalizeAmpulMarketVerification(proof(date), CANDIDATE, MARKETS);
    assert.equal(pt.verified, false, String(date));
    assert.equal(pt.state, "invalid_evidence", String(date));
    assert.equal(pt.verifiedAt, null);
    assert.deepEqual(verifiedAmpulCandidateMarkets(proof(date), CANDIDATE, MARKETS), []);
  }
});

test("future dates cannot certify shipping before checkout evidence exists", () => {
  const [pt] = normalizeAmpulMarketVerification(proof("9999-12-31"), CANDIDATE, MARKETS);
  assert.equal(pt.verified, false);
  assert.equal(pt.state, "invalid_evidence");
});

test("real leap day and exact product-market evidence remain supported", () => {
  const data = proof("2024-02-29", "https://ampul.eu/en/order/verified-pt");
  const rows = normalizeAmpulMarketVerification(data, CANDIDATE, MARKETS);
  assert.deepEqual(rows.map(({ verified }) => verified), [true, false, false]);
  assert.equal(rows[0].verifiedAt, "2024-02-29");
  assert.equal(rows[0].evidenceUrl, "https://ampul.eu/en/order/verified-pt");
  assert.deepEqual(verifiedAmpulCandidateMarkets(data, CANDIDATE, MARKETS), ["pt-PT"]);
  assert.deepEqual(verifiedAmpulCandidateMarkets(data, "other-product", MARKETS), []);
});

test("a valid date does not bypass missing HTTPS evidence", () => {
  for (const url of [null, "http://ampul.eu/checkout", "javascript:alert(1)", ""]) {
    const [pt] = normalizeAmpulMarketVerification(proof("2024-02-29", url), CANDIDATE, MARKETS);
    assert.equal(pt.verified, false);
    assert.equal(pt.state, "invalid_evidence");
  }
});
