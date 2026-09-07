import { readFile } from "node:fs/promises";
import { BUTLER_TECHNIK_AWIN, BUTLER_VICTRON_MPPT_250_60_MC4, BUTLER_VICTRON_ORION_XS_12_12_50 } from "../src/affiliate-butler.js";
import { XDATOU_DATOUBOSS_2000W_24V, XDATOU_GOAFFPRO } from "../src/affiliate-xdatou.js";
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
assert(XDATOU_GOAFFPRO.approvalConfirmed === false, "Xdatou source must remain fail-closed until explicit GoAffPro approval activation");
assert(XDATOU_GOAFFPRO.referralIdentifier === null && XDATOU_GOAFFPRO.referralCode === null, "Xdatou referral credentials must not be guessed before approval");

const catalogs = new Map();
for (const [market, url] of publicCatalogFiles) catalogs.set(market, JSON.parse(await readFile(url, "utf8")));

const merchantPolicies = new Map([
  ["butler_technik", new Set(["approval_pending", "blocked_stock"])],
  ["offgridtec", new Set(["skipped_by_owner"])],
  ["xdatou", new Set(["blocked_affiliate_verification"])],
  ["solaris_store", new Set(["blocked_affiliate_verification"])],
  ["ampul_eu", new Set(["blocked_market_verification", "blocked_market_stock_verification"])],
  ["padabo_sk", new Set(["blocked_crossborder_not_supported"])],
  ["renogy_eu", new Set(["blocked_stock"])],
  ["bluetti_eu", new Set(["blocked_stock", "blocked_affiliate_verification"])],
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
const orionXs = required("butler-victron-orion-xs-12-12-50");
const xdatouInverter = required("xdatou-datouboss-2000w-24v");
const solarisPhoenix12 = required("solaris-victron-phoenix-12-250");
const solarisPhoenix24 = required("solaris-victron-phoenix-24-250");
const padaboPhoenix12 = required("padabo-sk-victron-phoenix-12-250");
const ampulInverter24 = required("ampul-eu-inverter-24v-2000w");
const ampulDcDc30 = required("ampul-eu-dcdc-12v-30a");
const renogyRover40 = required("renogy-eu-rover-40a-mppt");
const renogyDcDc40 = required("renogy-eu-dcdc-12-12-40a");
const bluettiFamilyStation = required("bluetti-eu-ac240-b210");
const bluettiElite300 = required("bluetti-eu-elite-300");

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
assert(xdatouInverter.status === "blocked_affiliate_verification", "Xdatou inverter must remain blocked until account approval and trackable deeplink are verified");
assert(xdatouInverter.activation?.approvalConfirmed === false, "Xdatou activation must remain false before explicit approval");
assert(xdatouInverter.activation?.referralIdentifier === null, "Xdatou referral identifier must remain unset before approval");
assert(xdatouInverter.activation?.referralCode === null, "Xdatou referral code must remain unset before approval");
assert(xdatouInverter.applicationReady === true, "Xdatou GoAffPro application must be ready");
assert(xdatouInverter.nextActionOwner === "user" && xdatouInverter.nextAction === "submit_goaffpro_application", "Xdatou next action must be explicit");
assert(xdatouInverter.applicationPacketPath === "docs/affiliate/xdatou-goaffpro-application.md", "Xdatou application packet path missing");
const goAffProEndpoint = new URL(xdatouInverter.goAffProEndpoint);
assert(goAffProEndpoint.hostname === "xdatou.goaffpro.com", "Xdatou exact GoAffPro programme endpoint missing");
assert(typeof xdatouInverter.activationInstructions === "string" && /Do not infer or invent/i.test(xdatouInverter.activationInstructions), "Xdatou activation instructions must forbid guessed tracking credentials");
assert(xdatouInverter.category === "inverter", "Xdatou inverter category invalid");
assert(new URL(xdatouInverter.applicationUrl).hostname === "eu.xdatou.com", "Xdatou application evidence must be first-party");
assert(new URL(xdatouInverter.affiliateNetworkEvidenceUrl).hostname === "eu.xdatou.com", "Xdatou affiliate-network evidence must be first-party");
assert(/^\d{4}-\d{2}-\d{2}$/.test(xdatouInverter.affiliateNetworkVerifiedAt || ""), "Xdatou affiliate-network verification date missing");
assert(new URL(xdatouInverter.retailEvidenceUrl).hostname === "eu.xdatou.com", "Xdatou retail evidence must be first-party");
assert(new URL(xdatouInverter.shippingEvidenceUrl).hostname === "eu.xdatou.com", "Xdatou shipping evidence must be first-party");
assert(xdatouInverter.stockStatus === "in_stock" && /^\d{4}-\d{2}-\d{2}$/.test(xdatouInverter.stockEvidenceVerifiedAt || ""), "Xdatou stock evidence invalid");
assert(xdatouInverter.exactRetailPath === XDATOU_DATOUBOSS_2000W_24V.exactPath, "Xdatou exact retail path invalid");
assert(xdatouInverter.specs?.systemVoltage === XDATOU_DATOUBOSS_2000W_24V.systemVoltageV, "Xdatou inverter must fit the 24 V gap");
assert(xdatouInverter.specs?.continuousPowerW === XDATOU_DATOUBOSS_2000W_24V.continuousPowerW, "Xdatou inverter continuous-power evidence diverges from activation adapter");
assert(xdatouInverter.specs?.continuousPowerW >= 1300 && xdatouInverter.specs?.continuousPowerW <= 3900, "Xdatou inverter does not fit the 1300-3900 W gap");
assert(xdatouInverter.specs?.waveform === "pure_sine", "Xdatou pure-sine evidence missing");
assert(sameValues(Object.keys(xdatouInverter.marketEligibility || {}), ["pt-PT", "ro-RO", "sl-SI"]), "Xdatou targets must match the PT/RO/SI inverter gap");
assert(["pt-PT", "ro-RO", "sl-SI"].every((market) => xdatouInverter.shippingEligibleMarkets.includes(market)), "Xdatou shipping evidence does not cover PT/RO/SI");
const sourcingXdatou = listCommercialSourcingCandidates({ category: "inverter" }).find(({ id }) => id === xdatouInverter.id);
assert(sourcingXdatou?.status === xdatouInverter.status, "Xdatou onboarding and sourcing statuses diverge");
assert(sourcingXdatou?.blocker === "goaffpro_account_approval_not_verified", "Xdatou affiliate-account blocker missing from sourcing queue");
assert(sourcingXdatou?.affiliateNetworkVerifiedAt === xdatouInverter.affiliateNetworkVerifiedAt, "Xdatou network verification date diverges");
assert(sameValues(sourcingXdatou?.markets || [], Object.keys(xdatouInverter.marketEligibility)), "Xdatou onboarding and sourcing target markets diverge");

for (const [candidate, voltage, peakPowerW, exactPath] of [
  [solarisPhoenix12, 12, 400, "/2333-phoenix-inverter-12-250-230v-vedirect-iec-victron-pin121251100.html"],
  [solarisPhoenix24, 24, 350, "/8005-onduleur-victron-phoenix-24-250va-vedirect-schucko.html"],
]) {
  assert(candidate.merchant === "solaris_store", `${candidate.id}: Solaris merchant invalid`);
  assert(candidate.network === null && candidate.programId === null, `${candidate.id}: Solaris affiliate tracking must remain unverified`);
  assert(candidate.status === "blocked_affiliate_verification", `${candidate.id}: Solaris Phoenix affiliate status invalid`);
  assert(candidate.secondaryBlocker === "market_shipping_checkout_unverified", `${candidate.id}: Solaris market-checkout blocker missing`);
  assert(candidate.category === "inverter", `${candidate.id}: Solaris category invalid`);
  assert(candidate.productUrl === null && candidate.affiliateUrl === null, `${candidate.id}: Solaris inactive candidate leaked a public/tracked URL`);
  const application = new URL(candidate.applicationUrl);
  assert(application.hostname === "www.solaris-store.com" && application.pathname === "/contact" && application.searchParams.get("id") === "partenariat-ambassadeur", `${candidate.id}: Solaris exact ambassador application route missing`);
  const applicationEvidence = new URL(candidate.applicationEvidenceUrl);
  assert(applicationEvidence.hostname === "www.solaris-store.com" && applicationEvidence.pathname === "/content/95-partenariat", `${candidate.id}: Solaris affiliate programme evidence missing`);
  assert(candidate.applicationReady === true, `${candidate.id}: Solaris application handoff must be ready`);
  assert(candidate.nextActionOwner === "user" && candidate.nextAction === "submit_ambassador_application", `${candidate.id}: Solaris next action must be explicit`);
  assert(candidate.applicationPacketPath === "docs/affiliate/solaris-ambassador-application.md", `${candidate.id}: Solaris application packet path missing`);
  assert(candidate.checkoutStatus === "site_operational_country_checkout_unverified" && candidate.checkoutStatusVerifiedAt === "2026-09-07", `${candidate.id}: Solaris current checkout state invalid`);
  const checkoutEvidence = new URL(candidate.checkoutOperationalEvidenceUrl);
  assert(checkoutEvidence.hostname === "www.solaris-store.com" && checkoutEvidence.pathname === exactPath, `${candidate.id}: Solaris operational product evidence missing`);
  const retail = new URL(candidate.retailEvidenceUrl);
  assert(retail.hostname === "www.solaris-store.com" && retail.pathname === exactPath, `${candidate.id}: Solaris exact retail evidence invalid`);
  const shipping = new URL(candidate.shippingEvidenceUrl);
  assert(shipping.hostname === "www.solaris-store.com" && shipping.pathname === "/content/132-europe", `${candidate.id}: Solaris Europe shipping evidence invalid`);
  assert(candidate.shippingEvidenceScope === "all_europe_general", `${candidate.id}: generic Europe shipping scope must remain explicit`);
  assert(candidate.stockStatus === "in_stock" && candidate.stockEvidenceVerifiedAt === "2026-09-07", `${candidate.id}: Solaris stock evidence invalid`);
  assert(candidate.specs?.systemVoltage === voltage, `${candidate.id}: Solaris voltage evidence invalid`);
  assert(candidate.specs?.continuousPowerW === 200, `${candidate.id}: Solaris continuous power must fit the 100-300 W gap`);
  assert(candidate.specs?.peakPowerW === peakPowerW, `${candidate.id}: Solaris peak-power evidence invalid`);
  assert(candidate.specs?.waveform === "pure_sine", `${candidate.id}: Solaris pure-sine evidence missing`);
  assert(candidate.specs?.continuousPowerW >= 100 && candidate.specs?.continuousPowerW <= 300, `${candidate.id}: Solaris candidate does not fit the P0 small-inverter band`);
  assert(sameValues(Object.keys(candidate.marketEligibility || {}), ["pt-PT", "ro-RO", "sl-SI"]), `${candidate.id}: Solaris target markets invalid`);
  assert(Object.values(candidate.marketEligibility).every((value) => value === "unverified"), `${candidate.id}: Solaris market eligibility must remain fail-closed`);

  const sourcing = listCommercialSourcingCandidates({ category: "inverter" }).find(({ id }) => id === candidate.id);
  assert(sourcing?.status === candidate.status, `${candidate.id}: Solaris onboarding and sourcing statuses diverge`);
  assert(sourcing?.blocker === "affiliate_tracking_not_verified", `${candidate.id}: Solaris tracking blocker missing from sourcing queue`);
  assert(sourcing?.secondaryBlocker === candidate.secondaryBlocker, `${candidate.id}: Solaris market blocker diverges`);
  assert(sourcing?.specs?.systemVoltagesV?.includes(voltage), `${candidate.id}: Solaris sourcing voltage diverges`);
  assert(sourcing?.specs?.powerW === 200 && sourcing?.specs?.pureSine === true, `${candidate.id}: Solaris sourcing specs diverge`);
}

assert(padaboPhoenix12.merchant === "padabo_sk", "Padabo expansion merchant invalid");
assert(padaboPhoenix12.network === "ehub" && padaboPhoenix12.campaignId === "7aed5c13", "Padabo eHub campaign metadata invalid");
assert(padaboPhoenix12.affiliateApprovalConfirmed === true, "Padabo approved tracking evidence missing");
assert(padaboPhoenix12.status === "blocked_crossborder_not_supported", "Padabo expansion closeout status invalid");
assert(padaboPhoenix12.category === "inverter", "Padabo expansion category invalid");
assert(padaboPhoenix12.productUrl === null && padaboPhoenix12.affiliateUrl === null, "Padabo inactive expansion candidate leaked public URLs");
assert(padaboPhoenix12.sourceProductId === "24820_26587", "Padabo exact source variant missing");
const padaboTracked = new URL(padaboPhoenix12.trackingEvidenceUrl);
assert(padaboTracked.hostname === "ehub.cz" && padaboTracked.searchParams.get("a_aid") === "f34c86c8" && padaboTracked.searchParams.get("a_bid") === "7aed5c13", "Padabo eHub tracking evidence invalid");
assert(new URL(padaboTracked.searchParams.get("desturl")).hostname === "www.padabo.sk", "Padabo tracked destination invalid");
assert(padaboPhoenix12.stockStatus === "in_stock" && padaboPhoenix12.stockEvidenceVerifiedAt === "2026-09-07", "Padabo current stock evidence missing");
assert(padaboPhoenix12.specs?.systemVoltage === 12 && padaboPhoenix12.specs?.continuousPowerW === 200 && padaboPhoenix12.specs?.waveform === "pure_sine", "Padabo Phoenix technical evidence invalid");
assert(padaboPhoenix12.shippingEvidenceScope === "domestic_sk_only", "Padabo domestic-only shipping conclusion missing");
assert(sameValues(Object.keys(padaboPhoenix12.marketEligibility || {}), ["pt-PT", "ro-RO", "sl-SI"]), "Padabo expansion target markets invalid");
assert(Object.values(padaboPhoenix12.marketEligibility).every((value) => value === "unverified"), "Padabo expansion eligibility must remain fail-closed");
assert(padaboPhoenix12.nextActionOwner === null && padaboPhoenix12.nextAction === "none", "Padabo closed fallback must not keep a fake next action");
const actionablePadabo = listCommercialSourcingCandidates({ category: "inverter" }).find(({ id }) => id === padaboPhoenix12.id);
assert(!actionablePadabo, "Padabo closed fallback leaked into actionable sourcing");
const sourcingPadabo = listCommercialSourcingCandidates({ category: "inverter", includeSkipped: true }).find(({ id }) => id === padaboPhoenix12.id);
assert(sourcingPadabo?.status === "blocked_crossborder_not_supported", "Padabo sourcing closeout status diverges");
assert(sourcingPadabo?.blocker === "shipping_policy_domestic_sk_only", "Padabo domestic shipping blocker missing");
assert(sourcingPadabo?.standaloneUnlockWeight === 5 && sourcingPadabo?.affectedWeight === 5, "Padabo historical impact evidence missing");
assert(sourcingPadabo?.nextActionOwner === null && sourcingPadabo?.nextAction === "none", "Padabo closed sourcing route kept a next action");

for (const [candidate, expectedStatus, expectedCategory] of [
  [ampulInverter24, "blocked_market_stock_verification", "inverter"],
  [ampulDcDc30, "blocked_market_verification", "dc_charger"],
]) {
  assert(candidate.merchant === "ampul_eu", `${candidate.id}: Ampul merchant invalid`);
  assert(candidate.network === "ehub" && candidate.campaignId === "ddb5edae", `${candidate.id}: Ampul eHub campaign metadata invalid`);
  assert(candidate.affiliateApprovalConfirmed === true, `${candidate.id}: Ampul approved tracking evidence missing`);
  assert(candidate.status === expectedStatus, `${candidate.id}: Ampul onboarding status invalid`);
  assert(candidate.category === expectedCategory, `${candidate.id}: Ampul category invalid`);
  assert(candidate.productUrl === null && candidate.affiliateUrl === null, `${candidate.id}: Ampul inactive candidate leaked public URLs`);
  const tracked = new URL(candidate.trackingEvidenceUrl);
  assert(tracked.hostname === "ehub.cz" && tracked.pathname === "/system/scripts/click.php", `${candidate.id}: Ampul eHub tracking evidence invalid`);
  assert(tracked.searchParams.get("a_aid") === "f34c86c8" && tracked.searchParams.get("a_bid") === "ddb5edae", `${candidate.id}: Ampul tracking IDs invalid`);
  const trackedDestination = new URL(tracked.searchParams.get("desturl"));
  assert(trackedDestination.hostname === "ampul.eu", `${candidate.id}: Ampul tracked destination invalid`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(candidate.trackingVerifiedAt || ""), `${candidate.id}: Ampul tracking verification date missing`);
  assert(new URL(candidate.retailEvidenceUrl).hostname === "ampul.eu", `${candidate.id}: Ampul retail evidence invalid`);
  assert(new URL(candidate.shippingEvidenceUrl).hostname === "ampul.eu", `${candidate.id}: Ampul shipping evidence invalid`);
  assert(candidate.shippingEvidenceScope === "32_european_countries_general", `${candidate.id}: Ampul general shipping scope must stay explicit`);
  assert(candidate.storefrontEvidence?.["ro-RO"] === "https://ampul.eu/ro/", `${candidate.id}: Ampul Romanian storefront evidence missing`);
  assert(candidate.storefrontEvidence?.["sl-SI"] === "https://ampul.eu/sl/", `${candidate.id}: Ampul Slovenian storefront evidence missing`);
  assert(sameValues(Object.keys(candidate.marketEligibility || {}), ["pt-PT", "ro-RO", "sl-SI"]), `${candidate.id}: Ampul target markets invalid`);
  assert(Object.values(candidate.marketEligibility).every((value) => value === "unverified"), `${candidate.id}: Ampul market eligibility must stay fail-closed`);
  assert(candidate.nextActionOwner === "system", `${candidate.id}: Ampul checkout verification should remain system-owned`);

  const sourcing = listCommercialSourcingCandidates({ category: expectedCategory }).find(({ id }) => id === candidate.id);
  assert(sourcing?.status === candidate.status, `${candidate.id}: Ampul onboarding and sourcing statuses diverge`);
  assert(sourcing?.blocker === "market_shipping_checkout_unverified", `${candidate.id}: Ampul market blocker missing`);
  assert(sourcing?.affiliateApprovalConfirmed === true, `${candidate.id}: Ampul approved state missing from sourcing queue`);
  assert(sourcing?.nextActionOwner === "system", `${candidate.id}: Ampul sourcing action owner invalid`);
}

assert(ampulInverter24.stockStatus === "variant_unverified", "Ampul 24V inverter variant stock must remain unverified");
assert(ampulInverter24.specs?.systemVoltage === 24 && ampulInverter24.specs?.continuousPowerW === 2000 && ampulInverter24.specs?.waveform === "pure_sine", "Ampul 24V inverter evidence invalid");
assert(ampulInverter24.targetScenarioIds?.includes("coffee-offgrid"), "Ampul inverter target scenario missing");
assert(ampulDcDc30.stockStatus === "in_stock" && ampulDcDc30.stockEvidenceVerifiedAt === "2026-09-07", "Ampul DC-DC current stock evidence missing");
assert(ampulDcDc30.specs?.currentA === 30 && ampulDcDc30.specs?.outputVoltage === 14.6 && ampulDcDc30.specs?.batteryTypes?.includes("lifepo4"), "Ampul DC-DC technical evidence invalid");

for (const [candidate, category, exactPath] of [
  [renogyRover40, "controller", "/products/rover-li-40-amp-mppt-solar-charge-controller"],
  [renogyDcDc40, "dc_charger", "/products/12v-40a-dc-to-dc-battery-charger"],
]) {
  assert(candidate.merchant === "renogy_eu", `${candidate.id}: Renogy EU merchant invalid`);
  assert(candidate.network === "impact" && candidate.programId === null, `${candidate.id}: Renogy Impact programme must remain unapproved`);
  assert(candidate.status === "blocked_stock", `${candidate.id}: Renogy EU exact candidate must remain backordered`);
  assert(candidate.secondaryBlocker === "impact_program_approval_unverified", `${candidate.id}: Renogy affiliate blocker missing`);
  assert(candidate.category === category, `${candidate.id}: Renogy category invalid`);
  assert(candidate.productUrl === null && candidate.affiliateUrl === null, `${candidate.id}: inactive Renogy candidate leaked a public URL`);
  const application = new URL(candidate.applicationUrl);
  assert(application.hostname === "www.renogy.com" && application.pathname === "/pages/affiliate-program", `${candidate.id}: Renogy affiliate evidence missing`);
  assert(candidate.commissionPercent === 6 && candidate.commissionEvidence === "average", `${candidate.id}: Renogy average commission evidence invalid`);
  const retail = new URL(candidate.retailEvidenceUrl);
  assert(retail.hostname === "eu.renogy.com" && retail.pathname === exactPath, `${candidate.id}: Renogy exact retail evidence invalid`);
  const shipping = new URL(candidate.shippingEvidenceUrl);
  assert(shipping.hostname === "eu.renogy.com" && shipping.pathname === "/pages/shipping-policy", `${candidate.id}: Renogy EU shipping evidence invalid`);
  assert(candidate.stockStatus === "backorder" && candidate.stockEvidenceVerifiedAt === "2026-09-07", `${candidate.id}: Renogy backorder evidence invalid`);
  assert(["pt-PT", "ro-RO", "sl-SI"].every((market) => candidate.shippingEligibleMarkets.includes(market)), `${candidate.id}: Renogy shipping evidence must cover PT/RO/SI`);
  assert(Object.values(candidate.marketEligibility).every((value) => value === "unverified"), `${candidate.id}: Renogy market eligibility must remain fail-closed`);

  const sourcing = listCommercialSourcingCandidates({ category }).find(({ id }) => id === candidate.id);
  assert(sourcing?.status === candidate.status, `${candidate.id}: Renogy onboarding and sourcing statuses diverge`);
  assert(sourcing?.blocker === "exact_product_backordered", `${candidate.id}: Renogy stock blocker missing from sourcing queue`);
  assert(sourcing?.secondaryBlocker === candidate.secondaryBlocker, `${candidate.id}: Renogy affiliate blocker diverges`);
  assert(sourcing?.stockStatus === "backorder" && sourcing?.stockVerifiedAt === candidate.stockEvidenceVerifiedAt, `${candidate.id}: Renogy stock evidence diverges`);
}

assert(renogyRover40.specs?.technology === "mppt", "Renogy Rover 40A must be MPPT");
assert(renogyRover40.specs?.currentA === 40, "Renogy Rover current evidence invalid");
assert(renogyRover40.specs?.systemVoltages?.includes(12) && renogyRover40.specs?.systemVoltages?.includes(24), "Renogy Rover 12/24 V support missing");
assert(renogyRover40.specs?.nominalPvPowerW12V === 520 && renogyRover40.specs?.nominalPvPowerW24V === 1040, "Renogy Rover PV limits invalid");

assert(renogyDcDc40.specs?.inputVoltage === 12 && renogyDcDc40.specs?.outputVoltage === 12, "Renogy DC-DC voltage evidence invalid");
assert(renogyDcDc40.specs?.currentA === 40 && renogyDcDc40.specs?.powerW === 584, "Renogy DC-DC current/power evidence invalid");
assert(renogyDcDc40.specs?.batteryTypes?.includes("lifepo4"), "Renogy DC-DC LiFePO4 compatibility missing");
assert(renogyDcDc40.specs?.smartAlternatorCompatible === true, "Renogy DC-DC smart-alternator evidence missing");

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

assert(bluettiElite300.category === "power_station", "BLUETTI Elite 300 category invalid");
assert(bluettiElite300.status === "blocked_affiliate_verification", "BLUETTI Elite 300 must remain blocked until an exact EU affiliate deeplink is verified");
assert(bluettiElite300.stockStatus === "in_stock" && bluettiElite300.stockEvidenceVerifiedAt === "2026-09-07", "BLUETTI Elite 300 live stock evidence missing");
assert(bluettiElite300.exactRetailPath === "/products/elite-300-portable-power-station", "BLUETTI Elite 300 exact retail path invalid");
assert(new URL(bluettiElite300.retailEvidenceUrl).hostname === "www.bluettipower.eu", "BLUETTI Elite 300 retail evidence must be first-party");
assert(new URL(bluettiElite300.shippingEvidenceUrl).pathname === "/pages/shipping-country", "BLUETTI Elite 300 shipping-country evidence missing");
assert(new URL(bluettiElite300.affiliateEvidenceUrl).pathname === "/pages/affiliate-program", "BLUETTI Elite 300 affiliate evidence missing");
assert(bluettiElite300.specs?.capacityWh === 3014.4, "BLUETTI Elite 300 capacity evidence invalid");
assert(bluettiElite300.specs?.continuousPowerW === 2400 && bluettiElite300.specs?.peakPowerW === 4800, "BLUETTI Elite 300 AC power evidence invalid");
assert(bluettiElite300.specs?.solarInputW === 1200, "BLUETTI Elite 300 solar input evidence invalid");
assert(bluettiElite300.specs?.dcOutputVoltageV === 12 && bluettiElite300.specs?.dcOutputA === 30, "BLUETTI Elite 300 12V/30A RV output evidence invalid");
assert(bluettiElite300.specs?.batteryType === "lifepo4", "BLUETTI Elite 300 battery chemistry evidence invalid");
assert(sameValues(Object.keys(bluettiElite300.marketEligibility || {}), ["pt-PT", "ro-RO"]), "BLUETTI Elite 300 target markets must be PT and RO only");
assert(sameValues(bluettiElite300.shippingEligibleMarkets || [], ["pt-PT", "ro-RO"]), "BLUETTI Elite 300 verified shipping markets invalid");
assert(sameValues(bluettiElite300.unsupportedMarkets || [], ["sl-SI"]), "BLUETTI Elite 300 must record Slovenia as unsupported");
assert(bluettiElite300.standaloneUnlockWeight === 5 && bluettiElite300.affectedWeight === 5, "BLUETTI Elite 300 family unlock weight invalid");
assert(bluettiElite300.nextActionOwner === "user" && bluettiElite300.nextAction === "verify_eu_affiliate_deeplink", "BLUETTI Elite 300 next action must be exact");
const sourcingElite300 = listCommercialSourcingCandidates({ category: "power_station" }).find(({ id }) => id === bluettiElite300.id);
assert(sourcingElite300?.status === "blocked_affiliate_verification", "BLUETTI Elite 300 sourcing status diverges");
assert(sourcingElite300?.blocker === "eu_affiliate_deeplink_unverified", "BLUETTI Elite 300 affiliate blocker missing from sourcing queue");
assert(sourcingElite300?.standaloneUnlockWeight === 5, "BLUETTI Elite 300 sourcing unlock weight missing");
assert(sourcingElite300?.stockStatus === "in_stock", "BLUETTI Elite 300 sourcing stock evidence missing");
assert(sameValues(sourcingElite300?.markets || [], ["pt-PT", "ro-RO"]), "BLUETTI Elite 300 sourcing markets invalid");
assert(!listCommercialSourcingCandidates({ market: "sl-SI", category: "power_station" }).some(({ id }) => id === bluettiElite300.id), "BLUETTI Elite 300 must not leak into SI sourcing");


assert(smartSolar.merchant === "butler_technik", "SmartSolar merchant invalid");
assert(smartSolar.network === "awin" && smartSolar.programId === BUTLER_TECHNIK_AWIN.merchantId, "SmartSolar affiliate programme metadata invalid");
assert(smartSolar.status === "approval_pending", "SmartSolar must remain approval_pending until explicit Butler activation");
assert(smartSolar.applicationReady === true, "SmartSolar Butler application must be ready");
assert(smartSolar.nextActionOwner === "user" && smartSolar.nextAction === "join_awin_program_31291", "SmartSolar Butler next action must be explicit");
assert(smartSolar.applicationPacketPath === "docs/affiliate/butler-awin-application.md", "SmartSolar Butler application packet path missing");
const smartSolarApplication = new URL(smartSolar.applicationUrl);
assert(smartSolarApplication.hostname === "ui.awin.com" && smartSolarApplication.pathname === "/merchant-profile/31291", "SmartSolar Awin application route invalid");
assert(smartSolar.stockStatus === "in_stock" && smartSolar.stockEvidenceVerifiedAt === "2026-09-07", "SmartSolar current stock evidence missing");
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
const sourcingSmartSolar = listCommercialSourcingCandidates({ category: "controller" }).find(({ id }) => id === "butler-victron-scc125060321");
assert(sourcingSmartSolar?.stockStatus === "in_stock" && sourcingSmartSolar?.stockVerifiedAt === smartSolar.stockEvidenceVerifiedAt, "SmartSolar sourcing stock evidence diverges");

assert(orionXs.merchant === "butler_technik", "Orion XS merchant invalid");
assert(orionXs.network === "awin" && orionXs.programId === BUTLER_TECHNIK_AWIN.merchantId, "Orion XS affiliate programme metadata invalid");
assert(orionXs.status === "approval_pending", "Orion XS must remain approval_pending until explicit Butler activation");
assert(orionXs.applicationReady === true, "Orion XS Butler application must be ready");
assert(orionXs.nextActionOwner === "user" && orionXs.nextAction === "join_awin_program_31291", "Orion XS Butler next action must be explicit");
assert(orionXs.applicationPacketPath === "docs/affiliate/butler-awin-application.md", "Orion XS Butler application packet path missing");
const orionApplication = new URL(orionXs.applicationUrl);
assert(orionApplication.hostname === "ui.awin.com" && orionApplication.pathname === "/merchant-profile/31291", "Orion XS Awin application route invalid");
assert(orionXs.stockStatus === "in_stock" && orionXs.stockEvidenceVerifiedAt === "2026-09-07", "Orion XS current stock evidence missing");
assert(orionXs.category === BUTLER_VICTRON_ORION_XS_12_12_50.category, "Orion XS category diverges from Butler source");
assert(orionXs.exactRetailPath === BUTLER_VICTRON_ORION_XS_12_12_50.exactPath, "Orion XS retail path diverges from Butler source");
assert(new URL(orionXs.retailEvidenceUrl).hostname === BUTLER_TECHNIK_AWIN.hostname, "Orion XS retail evidence must be Butler Technik");
assert(new URL(orionXs.shippingEvidenceUrl).hostname === BUTLER_TECHNIK_AWIN.hostname, "Orion XS shipping evidence must be Butler Technik");
assert(orionXs.specs?.systemVoltage === 12 && BUTLER_VICTRON_ORION_XS_12_12_50.inputVoltagesV.includes(12), "Orion XS 12 V input evidence missing");
assert(orionXs.specs?.currentA === BUTLER_VICTRON_ORION_XS_12_12_50.currentA && orionXs.specs.currentA === 50, "Orion XS 50 A evidence missing");
assert(orionXs.specs?.powerW === BUTLER_VICTRON_ORION_XS_12_12_50.powerW && orionXs.specs.powerW === 700, "Orion XS 700 W evidence missing");
assert(orionXs.specs?.smartAlternatorCompatible === true && BUTLER_VICTRON_ORION_XS_12_12_50.smartAlternatorCompatible === true, "Orion XS smart-alternator evidence missing");
assert(orionXs.specs?.batteryTypes?.includes("lifepo4") && orionXs.specs?.batteryTypes?.includes("lead_acid"), "Orion XS battery chemistry evidence missing");
assert(["sk-SK", "pl-PL", "hu-HU", "pt-PT", "ro-RO", "sl-SI"].every((market) => orionXs.shippingEligibleMarkets.includes(market)), "Orion XS shipping evidence does not cover all target markets");
const sourcingOrionXs = listCommercialSourcingCandidates({ category: "dc_charger" }).find(({ id }) => id === orionXs.id);
assert(sourcingOrionXs?.status === "pending_affiliate_approval", "Orion XS sourcing status diverges");
assert(sourcingOrionXs?.blocker === "awin_program_approval", "Orion XS approval blocker missing from sourcing queue");
assert(sourcingOrionXs?.stockStatus === "in_stock" && sourcingOrionXs?.stockVerifiedAt === orionXs.stockEvidenceVerifiedAt, "Orion XS sourcing stock evidence diverges");
assert(sameValues(sourcingOrionXs?.markets || [], Object.keys(orionXs.marketEligibility)), "Orion XS onboarding and sourcing target markets diverge");

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
    inverter: "Xdatou exact 24 V / 2000 W remains behind GoAffPro activation; Solaris has exact in-stock 12 V and 24 V Phoenix 200 W candidates for the P0 small-inverter band, but affiliate tracking and per-market checkout eligibility are still unverified; Offgridtec stays skipped by owner",
    controller: "Butler SmartSolar 60 A remains the in-stock preferred route; Renogy Rover 40 A is a confirmed PT/RO/SI Impact fallback but is currently backordered",
    dcCharger: "Butler Orion XS 12/12 50 A remains the in-stock preferred route; Renogy EU 12/12 40 A is a confirmed PT/RO/SI Impact fallback but is currently backordered"
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
