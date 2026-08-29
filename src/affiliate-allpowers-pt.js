const AWIN_HOSTS = new Set(["www.awin1.com", "awin1.com"]);
const PT_DESTINATION_HOST = "allpowers-pt.com";
const PT_AWIN_MERCHANT_ID = "125820";
const APPROVED_AWIN_AFFILIATE_ID = "3044971";

export function parseAllpowersPtDeeplink(input) {
  try {
    const tracking = new URL(input);
    if (!AWIN_HOSTS.has(tracking.hostname)) return null;
    if (tracking.pathname !== "/cread.php") return null;
    if (tracking.searchParams.get("awinmid") !== PT_AWIN_MERCHANT_ID) return null;
    if (tracking.searchParams.get("awinaffid") !== APPROVED_AWIN_AFFILIATE_ID) return null;

    const destinationValue = tracking.searchParams.get("ued");
    if (!destinationValue) return null;
    const destination = new URL(destinationValue);
    if (destination.protocol !== "https:") return null;
    if (destination.hostname !== PT_DESTINATION_HOST && destination.hostname !== `www.${PT_DESTINATION_HOST}`) return null;
    if (!destination.pathname.startsWith("/products/")) return null;
    if (destination.pathname === "/products/" || destination.pathname.split("/").filter(Boolean).length < 2) return null;

    return Object.freeze({
      trackingUrl: tracking.toString(),
      destinationUrl: destination.toString(),
      merchantId: PT_AWIN_MERCHANT_ID,
      affiliateId: APPROVED_AWIN_AFFILIATE_ID,
    });
  } catch {
    return null;
  }
}

export function buildAllpowersPtDeeplink(destinationUrl) {
  const destination = new URL(destinationUrl);
  if (destination.protocol !== "https:") throw new Error("ALLPOWERS PT destination must use HTTPS");
  if (destination.hostname !== PT_DESTINATION_HOST && destination.hostname !== `www.${PT_DESTINATION_HOST}`) {
    throw new Error("ALLPOWERS PT destination host is not allowed");
  }
  if (!destination.pathname.startsWith("/products/") || destination.pathname === "/products/") {
    throw new Error("ALLPOWERS PT destination must be an exact product URL");
  }

  const tracking = new URL("https://www.awin1.com/cread.php");
  tracking.searchParams.set("awinmid", PT_AWIN_MERCHANT_ID);
  tracking.searchParams.set("awinaffid", APPROVED_AWIN_AFFILIATE_ID);
  tracking.searchParams.set("ued", destination.toString());
  return tracking.toString();
}

export const ALLPOWERS_PT_AFFILIATE = Object.freeze({
  awinMerchantId: Number(PT_AWIN_MERCHANT_ID),
  awinAffiliateId: Number(APPROVED_AWIN_AFFILIATE_ID),
  destinationHost: PT_DESTINATION_HOST,
  exactProductOnly: true,
});
