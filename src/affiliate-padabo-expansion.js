export const PADABO_SK_EHUB = Object.freeze({
  merchant: "padabo_sk",
  merchantHostname: "www.padabo.sk",
  clickHostname: "ehub.cz",
  clickPath: "/system/scripts/click.php",
  affiliateId: "f34c86c8",
  campaignId: "7aed5c13",
  approvalConfirmed: true,
});

export const PADABO_VICTRON_PHOENIX_12_250 = Object.freeze({
  id: "padabo-sk-victron-phoenix-12-250",
  sourceProductId: "24820_26587",
  category: "inverter",
  brand: "Victron Energy",
  name: "Victron Energy Phoenix VE.Direct 12/250",
  exactPath: "/victron-energy-phoenix-ve-priamy-menic-napatia_z24820/",
  systemVoltageV: 12,
  ratedPowerVA: 250,
  continuousPowerW: 200,
  pureSine: true,
  verifiedAt: "2026-09-07",
});

export const PADABO_EXPANSION_MARKETS = Object.freeze(["pt", "ro", "si"]);

function exactDestination(destination) {
  let url;
  try {
    url = new URL(destination);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== PADABO_SK_EHUB.merchantHostname) return null;
  if (url.pathname !== PADABO_VICTRON_PHOENIX_12_250.exactPath) return null;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function buildPadaboSkEhubUrl(destination) {
  const exact = exactDestination(destination);
  if (!PADABO_SK_EHUB.approvalConfirmed || !exact) return null;
  const click = new URL("https://ehub.cz/system/scripts/click.php");
  click.searchParams.set("a_aid", PADABO_SK_EHUB.affiliateId);
  click.searchParams.set("a_bid", PADABO_SK_EHUB.campaignId);
  click.searchParams.set("desturl", exact);
  return click.toString();
}

export function validatePadaboSkEhubUrl(affiliateUrl, destination) {
  const exact = exactDestination(destination);
  if (!exact) return false;
  let click;
  try {
    click = new URL(affiliateUrl);
  } catch {
    return false;
  }
  if (click.protocol !== "https:"
    || click.hostname !== PADABO_SK_EHUB.clickHostname
    || click.pathname !== PADABO_SK_EHUB.clickPath
    || click.searchParams.get("a_aid") !== PADABO_SK_EHUB.affiliateId
    || click.searchParams.get("a_bid") !== PADABO_SK_EHUB.campaignId
    || click.searchParams.get("desturl") !== exact) return false;
  return [...click.searchParams.keys()].sort().join(",") === "a_aid,a_bid,desturl";
}

export function createPadaboPhoenixExpansionCandidate({
  destination,
  available,
  verifiedMarkets = [],
} = {}) {
  const exact = exactDestination(destination);
  const affiliateUrl = exact ? buildPadaboSkEhubUrl(exact) : null;
  const markets = PADABO_EXPANSION_MARKETS.filter((market) => verifiedMarkets.includes(market));
  return Object.freeze({
    ...PADABO_VICTRON_PHOENIX_12_250,
    merchant: PADABO_SK_EHUB.merchant,
    network: "ehub",
    destination: exact,
    affiliateUrl,
    availability: available === true ? "in_stock" : available === false ? "unavailable" : "unverified",
    verifiedMarkets: Object.freeze(markets),
    recommendationEligible: Boolean(
      affiliateUrl
      && validatePadaboSkEhubUrl(affiliateUrl, exact)
      && available === true
      && markets.length > 0
    ),
  });
}
