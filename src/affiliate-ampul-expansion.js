export const AMPUL_EHUB = Object.freeze({
  clickHostname: "ehub.cz",
  clickPath: "/system/scripts/click.php",
  affiliateId: "f34c86c8",
  campaignId: "ddb5edae",
  merchantHostname: "ampul.eu",
  approvalConfirmed: true,
});

export const AMPUL_24V_2000W_INVERTER = Object.freeze({
  id: "ampul-eu-inverter-24v-2000w",
  category: "inverter",
  name: "AMPUL 24V DC to 230V AC 2000W pure-sine inverter",
  exactPath: "/cs/menice-napeti/5577-7392-menic-napeti-z-dc-na-230v-ac-50hz-2000w",
  systemVoltageV: 24,
  continuousPowerW: 2000,
  pureSine: true,
  verifiedAt: "2026-09-07",
});

export const AMPUL_12V_30A_DCDC = Object.freeze({
  id: "ampul-eu-dcdc-12v-30a",
  category: "dc_charger",
  name: "AMPUL DC/DC LiFePO4 charger 14.6V 30A 400W IP68",
  exactPath: "/cs/nabijecky/6195-dc-dc-nabijecka-lifepo4-baterii-146v-30a-400w-ip68",
  inputVoltagesV: Object.freeze([12, 24]),
  outputVoltageV: 14.6,
  currentA: 30,
  powerW: 400,
  batteryTypes: Object.freeze(["lifepo4"]),
  verifiedAt: "2026-09-07",
});

export const AMPUL_EXPANSION_MARKETS = Object.freeze(["pt", "ro", "si"]);

const PRODUCTS = Object.freeze([
  AMPUL_24V_2000W_INVERTER,
  AMPUL_12V_30A_DCDC,
]);

function exactDestination(destination) {
  let url;
  try {
    url = new URL(destination);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== AMPUL_EHUB.merchantHostname) return null;
  const product = PRODUCTS.find((item) => item.exactPath === url.pathname);
  if (!product) return null;
  url.search = "";
  url.hash = "";
  return { product, destination: url.toString() };
}

export function validateAmpulEhubUrl(affiliateUrl, expectedDestination) {
  let click;
  try {
    click = new URL(affiliateUrl);
  } catch {
    return false;
  }

  const exact = exactDestination(expectedDestination);
  if (!exact) return false;
  if (click.protocol !== "https:"
    || click.hostname !== AMPUL_EHUB.clickHostname
    || click.pathname !== AMPUL_EHUB.clickPath
    || click.searchParams.get("a_aid") !== AMPUL_EHUB.affiliateId
    || click.searchParams.get("a_bid") !== AMPUL_EHUB.campaignId
    || click.searchParams.get("desturl") !== exact.destination) return false;

  const keys = [...click.searchParams.keys()].sort();
  return JSON.stringify(keys) === JSON.stringify(["a_aid", "a_bid", "desturl"]);
}

export function buildAmpulEhubUrl(destination) {
  const exact = exactDestination(destination);
  if (!AMPUL_EHUB.approvalConfirmed || !exact) return null;

  const click = new URL("https://ehub.cz/system/scripts/click.php");
  click.searchParams.set("a_aid", AMPUL_EHUB.affiliateId);
  click.searchParams.set("a_bid", AMPUL_EHUB.campaignId);
  click.searchParams.set("desturl", exact.destination);
  return click.toString();
}

export function createAmpulExpansionCandidate(product, {
  destination,
  available,
  verifiedMarkets = [],
} = {}) {
  if (!PRODUCTS.includes(product)) throw new Error("AMPUL_PRODUCT_INVALID");
  const exact = exactDestination(destination);
  const affiliateUrl = exact?.product === product ? buildAmpulEhubUrl(destination) : null;
  const markets = AMPUL_EXPANSION_MARKETS.filter((market) => verifiedMarkets.includes(market));

  return {
    ...product,
    merchant: "ampul_eu",
    network: "ehub",
    destination: exact?.product === product ? exact.destination : null,
    affiliateUrl,
    availability: available === true ? "in_stock" : available === false ? "unavailable" : "unverified",
    verifiedMarkets: Object.freeze(markets),
    recommendationEligible: Boolean(
      affiliateUrl
      && validateAmpulEhubUrl(affiliateUrl, destination)
      && available === true
      && markets.length > 0
    ),
  };
}
