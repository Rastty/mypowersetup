import { batteryBmsLoadWithinAdvertisedLimit } from "./battery-discharge-safety.js?v=20261117-bms-load1";
import { batteryContinuousLimitNotBelowRequirement } from "./caravan-bms-buyer-evidence.js?v=20261121-superpack-ng1";
import { caravanPvNominalReview } from "./caravan-pv-array-review.js?v=20261121-actual-pv1";
import { reviewCaravanPvString } from "./caravan-pv-string-review.js?v=20261122-mppt-cz1";

// The main buyer checklist is the source of truth for a purchasable caravan.
// The three package alternatives must not reintroduce unknown-stock products
// or imply complete charging design from technically matched catalog rows.
function confirmedPackageOffer(item) {
  const product = item?.product;
  if (!product?.id || !product?.merchant || product.available !== true
    || item.available === false || item.staleSource === true || product.staleSource === true
    || typeof product.affiliateUrl !== "string") return false;
  try {
    const uri = new URL(product.affiliateUrl);
    return uri.protocol === "https:" && uri.hostname.length > 0 && uri.pathname !== "/";
  } catch { return false; }
}

export function purchaseReadyCaravanPackages(packages, buyerPlan) {
  if (!Array.isArray(packages) || !buyerPlan?.complete || !Array.isArray(buyerPlan.rows)) return [];
  const required = new Set(buyerPlan.rows.map(({category})=>category));
  if (!required.size) return [];
  const selected = new Map(buyerPlan.rows.map(({category,product})=>[category,product?.id]));
  return packages.filter((variant) => {
    if (!Array.isArray(variant?.items) || variant.items.length !== required.size
      || variant.requiredCategoryCount !== required.size) return false;
    const categories = new Set();
    for (const item of variant.items) {
      if (!required.has(item.category) || categories.has(item.category) || !confirmedPackageOffer(item)) return false;
      categories.add(item.category);
      // The 'recommended' package must describe exactly the same SKUs as the
      // verified ready-to-buy plan; otherwise only that plan is recommended.
      if (variant.id === "recommended" && item.product.id !== selected.get(item.category)) return false;
    }
    // Economy/reserve variants must not re-introduce a controller whose
    // nominal 12/24 V PV rating is below their own rounded panel count.
    // This is a manual-sizing hold, not a claim the hardware will be damaged.
    // Technical matching of the main recommendation must not be bypassed by
    // economy/reserve variants. Screen each alternative battery against the
    // ACTUAL requested inverter wattage, never the inverter SKU's higher rating.
    // A missing BMS rating remains unknown (not manufacturer proof), while a
    // known under-rated sustained limit or advertised BMS current fails closed.
    const battery = variant.items.find(({category}) => category === "battery");
    const inverterLoad = Number(buyerPlan.inverterWatts);
    if (battery && Number.isFinite(inverterLoad) && inverterLoad > 0) {
      const batterySetup = { systemVoltage: buyerPlan.systemVoltage, inverterWatts: inverterLoad };
      if (!batteryBmsLoadWithinAdvertisedLimit(battery.product,batterySetup)
        || !batteryContinuousLimitNotBelowRequirement(battery.product,batterySetup)) return false;
    }
    const panels = variant.items.find(({category}) => category === "solar_panel");
    const controller = variant.items.find(({category}) => category === "controller");
    if (panels && controller && caravanPvNominalReview(
      panels, controller.product, buyerPlan.systemVoltage
    ).needsManualReview) return false;
    // A valid manufacturer-reviewed panel paired with unknown/inadequate
    // Victron electrical limits is NOT a complete alternative package.
    if (panels && controller) {
      const electrical = reviewCaravanPvString(panels, controller.product, buyerPlan.systemVoltage);
      if (electrical && electrical.status !== "within_reviewed_limits") return false;
    }
    return categories.size === required.size;
  });
}
