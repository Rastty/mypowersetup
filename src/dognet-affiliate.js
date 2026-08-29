const DOGNET_REDIRECT_HOST = "login.dognet.sk";
const SUPPORTED_DESTINATION_PARAMS = new Set(["desturl", "data2"]);

export function validateDognetCampaignLink(value, { requireChannel = true } = {}) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== DOGNET_REDIRECT_HOST) {
    throw new Error("DOGNET_CAMPAIGN_LINK_INVALID_HOST");
  }
  if (!/^\/scripts\//.test(url.pathname)) {
    throw new Error("DOGNET_CAMPAIGN_LINK_INVALID_PATH");
  }
  if (!url.searchParams.get("a_aid") || !url.searchParams.get("a_bid")) {
    throw new Error("DOGNET_CAMPAIGN_LINK_MISSING_TRACKING_IDS");
  }
  if (requireChannel && !url.searchParams.get("chan")) {
    throw new Error("DOGNET_CAMPAIGN_LINK_MISSING_CHANNEL");
  }
  return url;
}

export function buildDognetDeeplink({
  campaignLink,
  destinationUrl,
  destinationParam,
  destinationHost,
  requireChannel = true,
}) {
  if (!SUPPORTED_DESTINATION_PARAMS.has(destinationParam)) {
    throw new Error("DOGNET_DESTINATION_PARAM_UNCONFIRMED");
  }
  const link = validateDognetCampaignLink(campaignLink, { requireChannel });
  const destination = validateDestination(destinationUrl, destinationHost);
  link.searchParams.set(destinationParam, destination.toString());
  return link.toString();
}

export function buildArukeresoDognetDeeplink({ campaignLink, destinationUrl, destinationParam }) {
  const destination = new URL(destinationUrl);
  if (!isArukeresoHost(destination.hostname) || destination.protocol !== "https:") {
    throw new Error("ARUKERESO_DESTINATION_INVALID");
  }
  if (destination.pathname === "/" || destination.pathname === "") {
    throw new Error("ARUKERESO_DESTINATION_MUST_BE_DEEP");
  }
  return buildDognetDeeplink({
    campaignLink,
    destinationUrl: destination.toString(),
    destinationParam,
    destinationHost: "arukereso.hu",
    requireChannel: true,
  });
}

export function isArukeresoHost(hostname) {
  const normalized = String(hostname || "").toLowerCase().replace(/^www\./, "");
  return normalized === "arukereso.hu" || normalized.endsWith(".arukereso.hu");
}

function validateDestination(value, destinationHost) {
  const destination = new URL(value);
  if (destination.protocol !== "https:") throw new Error("DOGNET_DESTINATION_REQUIRES_HTTPS");
  const host = String(destinationHost || "").toLowerCase().replace(/^www\./, "");
  const current = destination.hostname.toLowerCase().replace(/^www\./, "");
  if (!host || (current !== host && !current.endsWith(`.${host}`))) {
    throw new Error("DOGNET_DESTINATION_INVALID_HOST");
  }
  destination.hash = "";
  return destination;
}
