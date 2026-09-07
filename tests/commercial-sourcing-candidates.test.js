import test from "node:test";
import assert from "node:assert/strict";
import { bestCommercialSourcingCandidate, listCommercialSourcingCandidates } from "../src/commercial-sourcing-candidates.js";

test("Butler Victron 60A is the preferred SK controller candidate while approval is pending", () => {
  const candidate = bestCommercialSourcingCandidate({ market: "sk-SK", category: "controller" });
  assert.equal(candidate.id, "butler-victron-scc125060321");
  assert.equal(candidate.status, "pending_affiliate_approval");
  assert.equal(candidate.blocker, "awin_program_approval");
  assert.equal(candidate.stockStatus, "in_stock");
  assert.equal(candidate.stockVerifiedAt, "2026-09-07");
  assert.equal(candidate.specs.currentA, 60);
  assert.equal(candidate.specs.maxPvWattsAt12V, 860);
});

test("same exact-fit controller candidate is tracked for SK, PL and HU", () => {
  for (const market of ["sk-SK", "pl-PL", "hu-HU"]) {
    const candidates = listCommercialSourcingCandidates({ market, category: "controller" });
    assert.ok(candidates.some((candidate) => candidate.id === "butler-victron-scc125060321"));
  }
});

test("blocked controller fallbacks cannot outrank pending Butler approval", () => {
  const candidates = listCommercialSourcingCandidates({ market: "hu-HU", category: "controller" });
  const renogy = candidates.find((candidate) => candidate.id === "renogy-rover-60a-de");
  const ecoWorthy = candidates.find((candidate) => candidate.id === "ecoworthy-60a-mppt");
  assert.equal(renogy.status, "blocked_stock");
  assert.equal(ecoWorthy.status, "blocked_market_stock");
  assert.equal(ecoWorthy.merchantId, "73461");
  assert.equal(ecoWorthy.specs.currentA, 60);
  assert.equal(ecoWorthy.specs.maxPvWattsAt12V, 780);
  assert.equal(bestCommercialSourcingCandidate({ market: "hu-HU", category: "controller" }).merchant, "butler_technik");
});

test("small pure-sine inverter sourcing remains fail-closed until affiliate verification", () => {
  for (const market of ["sk-SK", "pl-PL", "hu-HU"]) {
    const candidates = listCommercialSourcingCandidates({ market, category: "inverter" });
    assert.equal(candidates.length, 3);
    assert.ok(candidates.every((candidate) => candidate.specs.systemVoltagesV.includes(12)));
    assert.ok(candidates.every((candidate) => candidate.specs.powerW === 300));
    assert.ok(candidates.every((candidate) => candidate.specs.pureSine === true));
    assert.ok(candidates.every((candidate) => candidate.status === "blocked_affiliate_verification"));
  }
});

test("PT, RO and SI inverter sourcing prefers the in-stock Xdatou exact fit behind its affiliate gate", () => {
  for (const market of ["pt-PT", "ro-RO", "sl-SI"]) {
    const candidates = listCommercialSourcingCandidates({ market, category: "inverter" });
    assert.deepEqual(candidates.map(({ id }) => id), [
      "butler-victron-pmp242305010",
      "xdatou-datouboss-2000w-24v",
      "solaris-victron-phoenix-12-250",
      "solaris-victron-phoenix-24-250",
    ]);
    const best = bestCommercialSourcingCandidate({ market, category: "inverter" });
    assert.equal(best.id, "xdatou-datouboss-2000w-24v");
    assert.equal(best.status, "blocked_affiliate_verification");
    assert.equal(best.blocker, "goaffpro_account_approval_not_verified");
    assert.deepEqual(best.activationFieldsNeeded, ["approvalConfirmed", "referralIdentifier", "referralCode"]);
    assert.equal(best.affiliateNetworkVerifiedAt, "2026-09-07");
    assert.equal(best.specs.powerW, 2000);
    assert.equal(best.specs.pureSine, true);

    const skipped = listCommercialSourcingCandidates({ market, category: "inverter", includeSkipped: true });
    assert.deepEqual(skipped.map(({ id }) => id), [
      "offgridtec-victron-phoenix-12-250",
      "offgridtec-victron-phoenix-24-250",
      "butler-victron-pmp242305010",
      "xdatou-datouboss-2000w-24v",
      "solaris-victron-phoenix-12-250",
      "solaris-victron-phoenix-24-250",
    ]);
    assert.ok(skipped.slice(0, 2).every((candidate) => candidate.status === "skipped_by_owner"));
    assert.ok(skipped.slice(0, 2).every((candidate) => candidate.blocker === "owner_declined_application"));
  }
});

test("pending Butler controller is also tracked for the expansion markets", () => {
  for (const market of ["pt-PT", "ro-RO", "sl-SI"]) {
    const candidate = bestCommercialSourcingCandidate({ market, category: "controller" });
    assert.equal(candidate.id, "butler-victron-scc125060321");
    assert.equal(candidate.status, "pending_affiliate_approval");
  }
});

test("BLUETTI AC240+B210 is tracked as the exact family portable route without leaking before activation", () => {
  for (const market of ["pt-PT", "ro-RO", "sl-SI"]) {
    const candidate = bestCommercialSourcingCandidate({ market, category: "power_station" });
    assert.equal(candidate.id, "bluetti-eu-ac240-b210");
    assert.equal(candidate.status, "blocked_stock");
    assert.equal(candidate.blocker, "exact_eu_bundle_out_of_stock");
    assert.equal(candidate.secondaryBlocker, "eu_affiliate_deeplink_not_verified");
    assert.equal(candidate.specs.capacityWh, 3686);
    assert.equal(candidate.specs.dcOutputA, 30);
  }
});


test("Butler Orion XS is staged as the preferred DC-DC candidate across all supported markets", () => {
  for (const market of ["sk-SK", "pl-PL", "hu-HU", "pt-PT", "ro-RO", "sl-SI"]) {
    const candidate = bestCommercialSourcingCandidate({ market, category: "dc_charger" });
    assert.equal(candidate.id, "butler-victron-orion-xs-12-12-50");
    assert.equal(candidate.merchant, "butler_technik");
    assert.equal(candidate.status, "pending_affiliate_approval");
    assert.equal(candidate.blocker, "awin_program_approval");
    assert.equal(candidate.stockStatus, "in_stock");
    assert.equal(candidate.stockVerifiedAt, "2026-09-07");
    assert.equal(candidate.specs.currentA, 50);
    assert.equal(candidate.specs.powerW, 700);
    assert.equal(candidate.specs.smartAlternatorCompatible, true);
    assert.ok(candidate.specs.batteryTypes.includes("lifepo4"));
  }
});


test("Solaris exact Phoenix candidates cover both 12V and 24V P0 small-inverter bands while staying blocked", () => {
  for (const market of ["pt-PT", "ro-RO", "sl-SI"]) {
    const candidates = listCommercialSourcingCandidates({ market, category: "inverter" })
      .filter((candidate) => candidate.merchant === "solaris_store");

    assert.equal(candidates.length, 2);
    const byVoltage = new Map(candidates.map((candidate) => [candidate.specs.systemVoltagesV[0], candidate]));
    assert.deepEqual([...byVoltage.keys()].sort((a, b) => a - b), [12, 24]);

    for (const [voltage, candidate] of byVoltage) {
      assert.equal(candidate.status, "blocked_affiliate_verification");
      assert.equal(candidate.blocker, "affiliate_tracking_not_verified");
      assert.equal(candidate.secondaryBlocker, "market_shipping_checkout_unverified");
      assert.equal(candidate.stockStatus, "in_stock");
      assert.equal(candidate.stockVerifiedAt, "2026-09-07");
      assert.equal(candidate.specs.powerW, 200);
      assert.ok(candidate.specs.powerW >= 100 && candidate.specs.powerW <= 300);
      assert.equal(candidate.specs.pureSine, true);
      assert.ok([12, 24].includes(voltage));
    }
  }
});
