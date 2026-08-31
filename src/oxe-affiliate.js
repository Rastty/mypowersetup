const DOGNET_HOST = "go.dognet.com";

export const OXE_MARKETS = Object.freeze({
  sk: Object.freeze({
    market: "sk-SK",
    merchant: "oxe_sk",
    hostname: "oxepower.sk",
    currency: "EUR",
    chid: "2mRVFbhJ",
    feedUrl: "https://www.oxepower.sk/export/google-dognet-sk.xml",
  }),
  pl: Object.freeze({
    market: "pl-PL",
    merchant: "oxe_pl",
    hostname: "oxepower.pl",
    currency: "PLN",
    chid: "2mRVFbhJ",
    feedUrl: "https://www.oxepower.pl/export/google-dognet-pl.xml",
  }),
  si: Object.freeze({
    market: "sl-SI",
    merchant: "oxe_si",
    hostname: "oxepower.si",
    currency: "EUR",
    chid: "2mRVFbhJ",
    feedUrl: "https://www.oxepower.si/export/google-dognet-si.xml",
  }),
  ro: Object.freeze({
    market: "ro-RO",
    merchant: "oxe_ro",
    hostname: "oxe.ro",
    currency: "EUR",
    chid: "2mRVFbhJ",
    feedUrl: "https://www.oxe.ro/export/google-dognet-ro.xml",
  }),
  hu: Object.freeze({
    market: "hu-HU",
    merchant: "oxe_hu",
    hostname: "oxe.hu",
    currency: "HUF",
    chid: "v9mcMMKw",
    feedUrl: "https://www.oxe.hu/export/google-dognet-hu.xml",
  }),
});

export function getOxeMarket(market) {
  const config = OXE_MARKETS[String(market || "").toLowerCase()];
  if (!config) throw new Error("OXE_MARKET_UNSUPPORTED");
  return config;
}

export function buildOxeDognetDeeplink(market, destinationUrl) {
  const config = getOxeMarket(market);
  const destination = validateOxeDestination(config, destinationUrl);
  const affiliate = new URL("https://go.dognet.com/");
  affiliate.searchParams.set("chid", config.chid);
  affiliate.searchParams.set("url", destination.toString());
  return affiliate.toString();
}

export function validateOxeDognetDeeplink(market, value) {
  const config = getOxeMarket(market);
  const affiliate = new URL(value);
  if (affiliate.protocol !== "https:" || affiliate.hostname !== DOGNET_HOST || affiliate.pathname !== "/") {
    throw new Error("OXE_DOGNET_HOST_INVALID");
  }
  if (affiliate.searchParams.get("chid") !== config.chid) throw new Error("OXE_DOGNET_CHANNEL_INVALID");
  const rawDestination = affiliate.searchParams.get("url");
  if (!rawDestination) throw new Error("OXE_DOGNET_DESTINATION_MISSING");
  const destination = validateOxeDestination(config, rawDestination);
  return Object.freeze({
    affiliateUrl: affiliate.toString(),
    destination: destination.toString(),
    merchant: config.merchant,
  });
}

export function validateOxeProductUrl(market, value) {
  return validateOxeDestination(getOxeMarket(market), value).toString();
}

function validateOxeDestination(config, value) {
  const destination = new URL(value);
  const hostname = destination.hostname.toLowerCase().replace(/^www\./, "");
  if (destination.protocol !== "https:" || hostname !== config.hostname) throw new Error("OXE_DESTINATION_HOST_INVALID");
  if (!destination.pathname || destination.pathname === "/") throw new Error("OXE_DESTINATION_MUST_BE_DEEP");
  destination.hash = "";
  return destination;
}
