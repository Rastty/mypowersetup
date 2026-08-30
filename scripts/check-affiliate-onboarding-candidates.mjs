import { readFile } from "node:fs/promises";
import { BUTLER_TECHNIK_AWIN, BUTLER_VICTRON_MPPT_250_60_MC4 } from "../src/affiliate-butler.js";

const candidateFile = new URL("../data/affiliate-onboarding-candidates.json", import.meta.url);
const publicCatalogFiles = [
  ["sk-SK", new URL("../data/products-sk.json", import.meta.url)],
  ["pl-PL", new URL("../data/products-pl.json", import.meta.url)],
  ["hu-HU", new URL("../data/products-hu.json", import.meta.url)],
];

const onboarding = JSON.parse(await readFile(candidateFile, "utf8"));
assert(onboarding.schemaVersion === 2, "schemaVersion must be 2");
assert(Array.isArray(onboarding.candidates) && onboarding.candidates.length > 0, "candidate list is empty");
assert(BUTLER_TECHNIK_AWIN.approvalConfirmed === false, "Butler source must remain fail-closed until explicit approval activation");

const catalogs = new Map();
for (const [market, url] of publicCatalogFiles) catalogs.set(market, JSON.parse(await readFile(url, "utf8")));

const merchantPolicies = new Map([
  ["butler_technik", new Set(["approval_pending"])],
  ["offgridtec", new Set(["application_required", "approval_pending"])],
]);

const ids = new Set();
for (const candidate of onboarding.candidates) {
  assert(candidate.id && !ids.has(candidate.id), `candidate id invalid or duplicated: ${candidate.id || "missing"}`);
  ids.add(candidate.id);
  const statuses = merchantPolicies.get(candidate.merchant);
  assert(statuses, `${candidate.id}: unexpected merchant`);
  assert(statuses.has(candidate.status), `${candidate.id}: invalid onboarding status ${candidate.status}`);
  assert(candidate.productUrl === null, `${candidate.id}: inactive candidate must not have a retail productUrl`);
  assert(candidate.affiliateUrl === null, `${candidate.id}: inactive candidate must not have an affiliateUrl`);
  assert(typeof candidate.retailEvidenceUrl === "string" && candidate.retailEvidenceUrl.startsWith("https://"), `${candidate.id}: current retail evidence missing`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(candidate.retailEvidenceVerifiedAt || ""), `${candidate.id}: retail evidence date missing`);
  for (const market of ["sk-SK", "pl-PL", "hu-HU"]) {
    assert(candidate.marketEligibility?.[market] === "unverified", `${candidate.id}: ${market} must remain unverified before activation`);
    const publicProducts = catalogs.get(market)?.products || [];
    assert(!publicProducts.some((product) => product.merchant === candidate.merchant), `${candidate.id}: inactive merchant leaked into ${market} public catalog`);
  }
}

const byId = new Map(onboarding.candidates.map((candidate) => [candidate.id, candidate]));
const phoenix12 = required("offgridtec-victron-phoenix-12-250");
const phoenix24 = required("offgridtec-victron-phoenix-24-250");
const smartSolar = required("butler-victron-smartsolar-250-60-mc4");

for (const [candidate, voltage] of [[phoenix12, 12], [phoenix24, 24]]) {
  assert(candidate.merchant === "offgridtec", `${candidate.id}: wrong merchant for current Phoenix evidence`);
  assert(candidate.network === "adcell" && candidate.programId === 12136, `${candidate.id}: Offgridtec affiliate programme metadata invalid`);
  assert(candidate.status === "application_required", `${candidate.id}: Offgridtec must remain application_required until the user applies`);
  assert(candidate.category === "inverter" && candidate.specs?.systemVoltage === voltage, `${candidate.id}: Phoenix voltage shape invalid`);
  assert(candidate.specs?.waveform === "pure_sine", `${candidate.id}: pure-sine evidence missing`);
  assert(candidate.specs?.continuousPowerW >= 100 && candidate.specs?.continuousPowerW <= 300, `${candidate.id}: does not fit the current P0 100-300 W gap`);
  assert(new URL(candidate.retailEvidenceUrl).hostname === "www.offgridtec.com", `${candidate.id}: retail evidence must be Offgridtec`);
}

assert(smartSolar.merchant === "butler_technik", "SmartSolar merchant invalid");
assert(smartSolar.network === "awin" && smartSolar.programId === BUTLER_TECHNIK_AWIN.merchantId, "SmartSolar affiliate programme metadata invalid");
assert(smartSolar.status === "approval_pending", "SmartSolar must remain approval_pending until explicit Butler activation");
assert(smartSolar.category === BUTLER_VICTRON_MPPT_250_60_MC4.category, "SmartSolar category diverges from Butler source");
assert(smartSolar.exactRetailPath === BUTLER_VICTRON_MPPT_250_60_MC4.exactPath, "SmartSolar retail path diverges from Butler source");
assert(new URL(smartSolar.retailEvidenceUrl).hostname === BUTLER_TECHNIK_AWIN.hostname, "SmartSolar retail evidence must be Butler Technik");
assert(smartSolar.specs?.technology === "mppt" && BUTLER_VICTRON_MPPT_250_60_MC4.mppt === true, "SmartSolar must be MPPT");
assert(smartSolar.specs?.currentA === BUTLER_VICTRON_MPPT_250_60_MC4.currentA && smartSolar.specs.currentA >= 60, "SmartSolar current does not cover 60 A scenario");
assert(smartSolar.specs?.systemVoltages?.includes(12) && BUTLER_VICTRON_MPPT_250_60_MC4.chargingVoltagesV.includes(12), "SmartSolar 12 V support missing");
assert(smartSolar.specs?.nominalPvPowerW12V === BUTLER_VICTRON_MPPT_250_60_MC4.pvWattsBySystemVoltage[12] && smartSolar.specs.nominalPvPowerW12V >= 550, "SmartSolar 12 V PV capability does not cover 550 W scenario");

const statusCounts = onboarding.candidates.reduce((counts, candidate) => {
  counts[candidate.status] = (counts[candidate.status] || 0) + 1;
  return counts;
}, {});

console.log(JSON.stringify({
  ok: true,
  stagedCandidates: onboarding.candidates.length,
  statusCounts,
  publicLeakage: false,
  commercialCoverageImpact: 0,
  blockers: {
    inverter: "Apply to Offgridtec via ADCELL, then verify deeplinks and SK/PL/HU checkout before activation",
    controller: "Wait for Butler Technik Awin approval, then verify deeplink and checkout before activation"
  }
}, null, 2));

function required(id) {
  const candidate = byId.get(id);
  assert(candidate, `required candidate missing: ${id}`);
  return candidate;
}

function assert(condition, message) {
  if (!condition) throw new Error(`AFFILIATE_ONBOARDING_GUARD:${message}`);
}
