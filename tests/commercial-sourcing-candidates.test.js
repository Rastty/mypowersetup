import test from "node:test";
import assert from "node:assert/strict";
import { bestCommercialSourcingCandidate, listCommercialSourcingCandidates } from "../src/commercial-sourcing-candidates.js";

test("Butler Victron 60A is the preferred SK controller candidate while approval is pending", () => {
  const candidate = bestCommercialSourcingCandidate({ market: "sk-SK", category: "controller" });
  assert.equal(candidate.id, "butler-victron-scc125060321");
  assert.equal(candidate.status, "pending_affiliate_approval");
  assert.equal(candidate.blocker, "awin_program_approval");
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
    ]);
    const best = bestCommercialSourcingCandidate({ market, category: "inverter" });
    assert.equal(best.id, "xdatou-datouboss-2000w-24v");
    assert.equal(best.status, "blocked_affiliate_verification");
    assert.equal(best.blocker, "goaffpro_terms_and_account_approval_not_verified");
    assert.equal(best.specs.powerW, 2000);
    assert.equal(best.specs.pureSine, true);

    const skipped = listCommercialSourcingCandidates({ market, category: "inverter", includeSkipped: true });
    assert.deepEqual(skipped.map(({ id }) => id), [
      "offgridtec-victron-phoenix-12-250",
      "offgridtec-victron-phoenix-24-250",
      "butler-victron-pmp242305010",
      "xdatou-datouboss-2000w-24v",
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
