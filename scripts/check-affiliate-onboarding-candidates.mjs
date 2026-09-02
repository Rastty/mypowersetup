import { readFile } from "node:fs/promises";
import { BUTLER_TECHNIK_AWIN, BUTLER_VICTRON_MPPT_250_60_MC4 } from "../src/affiliate-butler.js";
import { listCommercialSourcingCandidates } from "../src/commercial-sourcing-candidates.js";

const candidateFile = new URL("../data/affiliate-onboarding-candidates.json", import.meta.url);
const publicCatalogFiles = [
  ["sk-SK", new URL("../data/products-sk.json", import.meta.url)],
  ["pl-PL", new URL("../data/products-pl.json", import.meta.url)],
  ["hu-HU", new URL("../data/products-hu.json", import.meta.url)],
  ["pt-PT", new URL("../data/products-pt.json", import.meta.url)],
  ["ro-RO", new URL("../data/products-ro.json", import.meta.url)],
  ["sl-SI", new URL("../data/products-si.json", import.meta.url)],
];

const onboarding = JSON.parse(await readFile(candidateFile, "utf8"));
assert(onboarding.schemaVersion === 2, "schemaVersion must be 2");
assert(Array.isArray(onboarding.candidates) && onboarding.candidates.length > 0, "candidate list is empty");
assert(BUTLER_TECHNIK_AWIN.approvalConfirmed === false, "Butler source must remain fail-closed until explicit approval activation");

const catalogs = new Map();
for (const [market, url] of publicCatalogFiles) catalogs.set(market, JSON.parse(await readFile(url, "utf8")));

const merchantPolicies = new Map([
  ["butler_technik", new Set(["approval_pending", "blocked_stock"])],
  ["offgridtec", new Set(["skipped_by_owner"])],
  ["xdatou", new Set(["blocked_affiliate_verification"])],
  ["bluetti_eu", new Set(["blocked_stock"])],
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
  for (const market of Object.keys(candidate.marketEligibility || {})) {
    assert(candidate.marketEligibility?.[market] === "unverified", `${candidate.id}: ${market} must remain unverified before activation`);
    const publicProducts = catalogs.get(market)?.products || [];
    assert(!publicProducts.some((product) => product.merchant === candidate.merchant), `${candidate.id}: inactive merchant leaked into ${market} public catalog`);
  }
}

const byId = new Map(onboarding.candidates.map((candidate) => [candidate.id, candidate]));
const phoenix12 = required("offgridtec-victron-phoenix-12-250");
const phoenix24 = required("offgridtec-victron-phoenix-24-250");
const multiPlus = required("butler-victron-multiplus-ii-24-3000-70-32");
const smartSolar = required("butler-victron-smartsolar-250-60-mc4");
const xdatouInverter = required("xdatou-datouboss-2000w-24v");
const bluettiFamilyStation = required("bluetti-eu-ac240-b210");

for (const [candidate, voltage] of [[phoenix12, 12], [phoenix24, 24]]) {
  assert(candidate.merchant === "offgridtec", `${candidate.id}: wrong merchant for current Phoenix evidence`);
  assert(candidate.network === "adcell" && candidate.programId === 12136, `${candidate.id}: Offgridtec affiliate programme metadata invalid`);
  assert(candidate.status === "skipped_by_owner", `${candidate.id}: Offgridtec must remain skipped after the owner's decision`);
  assert(candidate.category === "inverter" && candidate.specs?.systemVoltage === voltage, `${candidate.id}: Phoenix voltage shape invalid`);
  assert(candidate.specs?.waveform === "pure_sine", `${candidate.id}: pure-sine evidence missing`);
  assert(candidate.specs?.continuousPowerW >= 100 && candidate.specs?.continuousPowerW <= 300, `${candidate.id}: does not fit the current P0 100-300 W gap`);
  assert(new URL(candidate.retailEvidenceUrl).hostname === "www.offgridtec.com", `${candidate.id}: retail evidence must be Offgridtec`);
  const applicationUrl = new URL(candidate.applicationUrl);
  assert(applicationUrl.hostname === "www.adcell.de" && applicationUrl.pathname === "/partnerprogramme/offgridtec", `${candidate.id}: exact ADCELL application URL missing`);
  assert(candidate.commissionPercent === 5, `${candidate.id}: verified Offgridtec commission must be 5%`);
  assert(sameValues(Object.keys(candidate.marketEligibility || {}), ["pt-PT", "ro-RO", "sl-SI"]), `${candidate.id}: targets must match the current PT/RO/SI inverter gap`);

  assert(!listCommercialSourcingCandidates({ category: "inverter" }).some(({ id }) => id === candidate.id), `${candidate.id}: skipped candidate leaked into actionable sourcing queue`);
  const sourcingCandidate = listCommercialSourcingCandidates({ category: "inverter", includeSkipped: true }).find(({ id }) => id === candidate.id);
  assert(sourcingCandidate, `${candidate.id}: missing from commercial sourcing queue`);
  assert(sourcingCandidate.status === candidate.status, `${candidate.id}: onboarding and sourcing statuses diverge`);
  assert(sourcingCandidate.merchantId === String(candidate.programId), `${candidate.id}: onboarding and sourcing programme IDs diverge`);
  assert(sameValues(sourcingCandidate.markets, Object.keys(candidate.marketEligibility)), `${candidate.id}: onboarding and sourcing target markets diverge`);
}

assert(multiPlus.merchant === "butler_technik", "MultiPlus merchant invalid");
assert(multiPlus.network === "awin" && multiPlus.programId === BUTLER_TECHNIK_AWIN.merchantId, "MultiPlus affiliate programme metadata invalid");
assert(multiPlus.status === "blocked_stock", "MultiPlus must remain blocked while the exact Butler SKU is out of stock");
assert(multiPlus.secondaryBlocker === "approval_pending", "MultiPlus must retain the pending Butler approval blocker");
assert(multiPlus.category === "inverter", "MultiPlus category invalid");
assert(new URL(multiPlus.retailEvidenceUrl).hostname === BUTLER_TECHNIK_AWIN.hostname, "MultiPlus retail evidence must be Butler Technik");
assert(new URL(multiPlus.technicalEvidenceUrl).hostname === "www.victronenergy.com", "MultiPlus technical evidence must be Victron Energy");
assert(multiPlus.stockStatus === "out_of_stock" && /^\d{4}-\d{2}-\d{2}$/.test(multiPlus.stockEvidenceVerifiedAt || ""), "MultiPlus stock evidence invalid");
assert(multiPlus.specs?.systemVoltage === 24, "MultiPlus must fit the 24 V inverter gap");
assert(multiPlus.specs?.continuousPowerW >= 1300 && multiPlus.specs?.continuousPowerW <= 3900, "MultiPlus does not fit the 1300-3900 W gap");
assert(multiPlus.specs?.waveform === "pure_sine", "MultiPlus pure-sine evidence missing");
assert(sameValues(Object.keys(multiPlus.marketEligibility || {}), ["pt-PT", "ro-RO", "sl-SI"]), "MultiPlus targets must match the PT/RO/SI inverter gap");
const sourcingMultiPlus = listCommercialSourcingCandidates({ category: "inverter" }).find(({ id }) => id === "butler-victron-pmp242305010");
assert(sourcingMultiPlus?.status === multiPlus.status, "MultiPlus onboarding and sourcing statuses diverge");
assert(sourcingMultiPlus?.blocker === "exact_product_out_of_stock", "MultiPlus stock blocker missing from sourcing queue");
assert(sourcingMultiPlus?.secondaryBlocker === "awin_program_approval", "MultiPlus approval blocker missing from sourcing queue");

assert(xdatouInverter.merchant === "xdatou", "Xdatou inverter merchant invalid");
assert(xdatouInverter.network === "goaffpro" && xdatouInverter.programId === null, "Xdatou affiliate metadata must remain unapproved");
assert(xdatouInverter.status === "blocked_affiliate_verification", "Xdatou inverter must remain blocked until affiliate terms and account approval are verified");
assert(xdatouInverter.category === "inverter", "Xdatou inverter category invalid");
assert(new URL(xdatouInverter.applicationUrl).hostname === "eu.xdatou.com", "Xdatou application evidence must be first-party");
assert(new URL(xdatouInverter.retailEvidenceUrl).hostname === "eu.xdatou.com", "Xdatou retail evidence must be first-party");
assert(new URL(xdatouInverter.shippingEvidenceUrl).hostname === "eu.xdatou.com", "Xdatou shipping evidence must be first-party");
assert(xdatouInverter.stockStatus === "in_stock" && /^\d{4}-\d{2}-\d{2}$/.test(xdatouInverter.stockEvidenceVerifiedAt || ""), "Xdatou stock evidence invalid");
assert(xdatouInverter.exactRetailPath === "/collections/xdatou-portable-inverter/products/datouboss-2000w-pure-sine-wave-inverter-24v-car-truck", "Xdatou exact retail path invalid");
assert(xdatouInverter.specs?.systemVoltage === 24, "Xdatou inverter must fit the 24 V gap");
assert(xdatouInverter.specs?.continuousPowerW >= 1300 && xdatouInverter.specs?.continuousPowerW <= 3900, "Xdatou inverter does not fit the 1300-3900 W gap");
assert(xdatouInverter.specs?.waveform === "pure_sine", "Xdatou pure-sine evidence missing");
assert(sameValues(Object.keys(xdatouInverter.marketEligibility || {}), ["pt-PT", "ro-RO", "sl-SI"]), "Xdatou targets must match the PT/RO/SI inverter gap");
assert(["pt-PT", "ro-RO", "sl-SI"].every((market) => xdatouInverter.shippingEligibleMarkets.includes(market)), "Xdatou shipping evidence does not cover PT/RO/SI");
const sourcingXdatou = listCommercialSourcingCandidates({ category: "inverter" }).find(({ id }) => id === xdatouInverter.id);
assert(sourcingXdatou?.status === xdatouInverter.status, "Xdatou onboarding and sourcing statuses diverge");
assert(sourcingXdatou?.blocker === "goaffpro_terms_and_account_approval_not_verified", "Xdatou affiliate blocker missing from sourcing queue");
assert(sameValues(sourcingXdatou?.markets || [], Object.keys(xdatouInverter.marketEligibility)), "Xdatou onboarding and sourcing target markets diverge");

assert(bluettiFamilyStation.category === "power_station", "BLUETTI AC240+B210 category invalid");
assert(bluettiFamilyStation.stockStatus === "out_of_stock", "BLUETTI AC240+B210 must remain blocked while its EU bundle is unavailable");
assert(bluettiFamilyStation.secondaryBlocker === "affiliate_deeplink_unverified", "BLUETTI EU affiliate blocker missing");
assert(bluettiFamilyStation.specs?.capacityWh >= 2200, "BLUETTI AC240+B210 capacity does not fit family touring");
assert(bluettiFamilyStation.specs?.continuousPowerW >= 100, "BLUETTI AC240+B210 AC output does not fit family touring");
assert(bluettiFamilyStation.specs?.solarInputW >= 300, "BLUETTI AC240+B210 solar input does not fit family touring");
assert(bluettiFamilyStation.specs?.dcOutputVoltageV === 12 && bluettiFamilyStation.specs?.dcOutputA >= 14, "BLUETTI AC240+B210 RV output does not fit family touring");
assert(sameValues(Object.keys(bluettiFamilyStation.marketEligibility || {}), ["pt-PT", "ro-RO", "sl-SI"]), "BLUETTI AC240+B210 target markets invalid");
const sourcingBluetti = listCommercialSourcingCandidates({ category: "power_station" }).find(({ id }) => id === bluettiFamilyStation.id);
assert(sourcingBluetti?.blocker === "exact_eu_bundle_out_of_stock", "BLUETTI AC240+B210 stock blocker missing from sourcing queue");
assert(sourcingBluetti?.secondaryBlocker === "eu_affiliate_deeplink_not_verified", "BLUETTI AC240+B210 affiliate blocker missing from sourcing queue");

assert(smartSolar.merchant === "butler_technik", "SmartSolar merchant invalid");
assert(smartSolar.network === "awin" && smartSolar.programId === BUTLER_TECHNIK_AWIN.merchantId, "SmartSolar affiliate programme metadata invalid");
assert(smartSolar.status === "approval_pending", "SmartSolar must remain approval_pending until explicit Butler activation");
assert(smartSolar.category === BUTLER_VICTRON_MPPT_250_60_MC4.category, "SmartSolar category diverges from Butler source");
assert(smartSolar.exactRetailPath === BUTLER_VICTRON_MPPT_250_60_MC4.exactPath, "SmartSolar retail path diverges from Butler source");
assert(new URL(smartSolar.retailEvidenceUrl).hostname === BUTLER_TECHNIK_AWIN.hostname, "SmartSolar retail evidence must be Butler Technik");
assert(new URL(smartSolar.shippingEvidenceUrl).hostname === BUTLER_TECHNIK_AWIN.hostname, "SmartSolar shipping evidence must be Butler Technik");
assert(smartSolar.specs?.technology === "mppt" && BUTLER_VICTRON_MPPT_250_60_MC4.mppt === true, "SmartSolar must be MPPT");
assert(smartSolar.specs?.currentA === BUTLER_VICTRON_MPPT_250_60_MC4.currentA && smartSolar.specs.currentA >= 60, "SmartSolar current does not cover 60 A scenario");
assert(smartSolar.specs?.systemVoltages?.includes(12) && BUTLER_VICTRON_MPPT_250_60_MC4.chargingVoltagesV.includes(12), "SmartSolar 12 V support missing");
assert(smartSolar.specs?.systemVoltages?.includes(24) && BUTLER_VICTRON_MPPT_250_60_MC4.chargingVoltagesV.includes(24), "SmartSolar 24 V support missing");
assert(smartSolar.specs?.nominalPvPowerW12V === BUTLER_VICTRON_MPPT_250_60_MC4.pvWattsBySystemVoltage[12] && smartSolar.specs.nominalPvPowerW12V >= 550, "SmartSolar 12 V PV capability does not cover 550 W scenario");
assert(smartSolar.specs?.nominalPvPowerW24V === BUTLER_VICTRON_MPPT_250_60_MC4.pvWattsBySystemVoltage[24] && smartSolar.specs.nominalPvPowerW24V >= 500, "SmartSolar 24 V PV capability does not cover 500 W scenario");
assert(["sk-SK", "pl-PL", "hu-HU", "pt-PT", "ro-RO", "sl-SI"].every((market) => smartSolar.shippingEligibleMarkets.includes(market)), "SmartSolar shipping evidence does not cover all target markets");

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
    inverter: "Xdatou exact 24 V / 2000 W SKU is in stock and ships to PT/RO/SI, but GoAffPro terms and account approval are not verified; Butler remains out of stock and Offgridtec stays skipped by owner",
    controller: "Wait for Butler Technik Awin approval; shipping and exact product evidence now cover SK/PL/HU/PT/RO/SI"
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

function sameValues(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}
