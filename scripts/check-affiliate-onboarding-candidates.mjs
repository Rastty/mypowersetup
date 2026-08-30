import { readFile } from "node:fs/promises";
import { BUTLER_TECHNIK_AWIN, BUTLER_VICTRON_MPPT_250_60_MC4 } from "../src/affiliate-butler.js";

const candidateFile = new URL("../data/affiliate-onboarding-candidates.json", import.meta.url);
const publicCatalogFiles = [
  ["sk-SK", new URL("../data/products-sk.json", import.meta.url)],
  ["pl-PL", new URL("../data/products-pl.json", import.meta.url)],
  ["hu-HU", new URL("../data/products-hu.json", import.meta.url)],
];

const onboarding = JSON.parse(await readFile(candidateFile, "utf8"));
assert(onboarding.schemaVersion === 1, "schemaVersion must be 1");
assert(Array.isArray(onboarding.candidates) && onboarding.candidates.length > 0, "candidate list is empty");
assert(BUTLER_TECHNIK_AWIN.approvalConfirmed === false, "Butler source must remain fail-closed until explicit approval activation");

const catalogs = new Map();
for (const [market, url] of publicCatalogFiles) catalogs.set(market, JSON.parse(await readFile(url, "utf8")));

const ids = new Set();
for (const candidate of onboarding.candidates) {
  assert(candidate.id && !ids.has(candidate.id), `candidate id invalid or duplicated: ${candidate.id || "missing"}`);
  ids.add(candidate.id);
  assert(candidate.merchant === "butler_technik", `${candidate.id}: unexpected merchant`);
  assert(candidate.status === "approval_pending", `${candidate.id}: candidate must remain approval_pending until explicit activation`);
  assert(candidate.productUrl === null, `${candidate.id}: pending candidate must not have a retail productUrl`);
  assert(candidate.affiliateUrl === null, `${candidate.id}: pending candidate must not have an affiliateUrl`);
  assert(typeof candidate.technicalEvidenceUrl === "string" && candidate.technicalEvidenceUrl.startsWith("https://"), `${candidate.id}: technical evidence missing`);
  for (const market of ["sk-SK", "pl-PL", "hu-HU"]) {
    assert(candidate.marketEligibility?.[market] === "unverified", `${candidate.id}: ${market} must remain unverified while approval is pending`);
    const publicProducts = catalogs.get(market)?.products || [];
    assert(!publicProducts.some((product) => product.merchant === candidate.merchant), `${candidate.id}: pending merchant leaked into ${market} public catalog`);
  }
}

const byId = new Map(onboarding.candidates.map((candidate) => [candidate.id, candidate]));
const phoenix12 = required("butler-victron-phoenix-12-250");
const phoenix24 = required("butler-victron-phoenix-24-250");
const smartSolar = required("butler-victron-smartsolar-250-60-mc4");

assert(phoenix12.category === "inverter" && phoenix12.specs?.systemVoltage === 12, "Phoenix 12/250 shape invalid");
assert(phoenix24.category === "inverter" && phoenix24.specs?.systemVoltage === 24, "Phoenix 24/250 shape invalid");
for (const candidate of [phoenix12, phoenix24]) {
  assert(candidate.specs?.waveform === "pure_sine", `${candidate.id}: pure-sine evidence missing`);
  assert(candidate.specs?.continuousPowerW >= 100 && candidate.specs?.continuousPowerW <= 300, `${candidate.id}: does not fit the current P0 100-300 W gap`);
}

assert(smartSolar.category === BUTLER_VICTRON_MPPT_250_60_MC4.category, "SmartSolar category diverges from Butler source");
assert(smartSolar.exactRetailPath === BUTLER_VICTRON_MPPT_250_60_MC4.exactPath, "SmartSolar retail path diverges from Butler source");
assert(smartSolar.specs?.technology === "mppt" && BUTLER_VICTRON_MPPT_250_60_MC4.mppt === true, "SmartSolar must be MPPT");
assert(smartSolar.specs?.currentA === BUTLER_VICTRON_MPPT_250_60_MC4.currentA && smartSolar.specs.currentA >= 60, "SmartSolar current does not cover 60 A scenario");
assert(smartSolar.specs?.systemVoltages?.includes(12) && BUTLER_VICTRON_MPPT_250_60_MC4.chargingVoltagesV.includes(12), "SmartSolar 12 V support missing");
assert(smartSolar.specs?.nominalPvPowerW12V === BUTLER_VICTRON_MPPT_250_60_MC4.pvWattsBySystemVoltage[12] && smartSolar.specs.nominalPvPowerW12V >= 550, "SmartSolar 12 V PV capability does not cover 550 W scenario");

console.log(JSON.stringify({
  ok: true,
  merchant: "butler_technik",
  status: "approval_pending",
  stagedCandidates: onboarding.candidates.length,
  publicLeakage: false,
  commercialCoverageImpact: 0,
  sourceApprovalConfirmed: BUTLER_TECHNIK_AWIN.approvalConfirmed,
  activationRequires: ["affiliate approval", "exact retail destination verification", "deeplink verification", "shipping eligibility per market"],
}, null, 2));

function required(id) {
  const candidate = byId.get(id);
  assert(candidate, `required candidate missing: ${id}`);
  return candidate;
}

function assert(condition, message) {
  if (!condition) throw new Error(`AFFILIATE_ONBOARDING_GUARD:${message}`);
}
