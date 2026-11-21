import { isRecommendationEligible } from "./recommendation-coverage.js";
import { selectRecommendedCategoryCandidate } from "./packages.js?v=20261121-partial-buyer1";
import { caravanComponentRequirement } from "./caravan-component-requirements.js?v=20261121-bms-evidence1";
import { caravanPvNominalReview, controllerNominalPvWatts } from "./caravan-pv-array-review.js?v=20261121-actual-pv1";

// A technically compatible model is not a purchase-ready SKU without its
// actual approved product click URL. Keep the technical result, but mark the
// buying-plan category missing rather than render a dead checkout action.
function hasBuyableProductLink(product) {
  if (!product?.id || !product?.merchant || typeof product.affiliateUrl !== "string") return false;
  try {
    const uri = new URL(product.affiliateUrl);
    return uri.protocol === "https:" && Boolean(uri.hostname) && uri.pathname !== "/";
  } catch {
    return false;
  }
}

// The real buyer checklist is based only on existing technically vetted and
// currently eligible recommendations. It never invents a missing product.
export function buildCaravanBuyerChecklist({ coverage, packages = [], recommendations = {}, setup = null, locale = setup?.locale || "cs" } = {}) {
  if (!coverage || !Array.isArray(coverage.required)) return null;
  const recommended = packages.find((variant) => variant?.id === "recommended");
  const packageByCategory = new Map((recommended?.items || [])
    .filter(({ category, product }) => category && product)
    .map(({ category, product }) => [category, product]));
  const rows = coverage.required.map((category) => {
    const packageProduct = packageByCategory.get(category);
    const candidates = recommendations[category] || [];
    // Only explicit, currently confirmed product stock may create a purchase-
    // ready basket row. An unknown feed stock flag is NOT evidence of stock.
    // Prefer a confirmed-in-stock vetted alternative even if a higher ranked
    // candidate has missing stock evidence.
    const availableOffers = candidates.filter((item) =>
      isRecommendationEligible(item) && item.product?.available === true
      && hasBuyableProductLink(item.product));
    // Reuse the canonical best-value choice but only among actual purchasable
    // links; an unlinked technical recommendation must not block a valid SKU.
    const packageMatch = availableOffers.find((item) =>
      item.product.id === packageProduct?.id);
    const candidate = packageMatch || selectRecommendedCategoryCandidate(
      { [category]: availableOffers }, category);
    const product = candidate?.product || null;
    const quantity = product && Number.isSafeInteger(product.recommendedQuantity) && product.recommendedQuantity > 0
      ? product.recommendedQuantity : 1;
    const uncertainStock = !product && candidates.some((item) =>
      isRecommendationEligible(item) && item.product?.available == null
      && hasBuyableProductLink(item.product));
    return {
      category, product, ready: Boolean(product), quantity,
      missingReason: !product && uncertainStock ? "stock_unconfirmed" : !product ? "no_buyable_offer" : null,
      requirement: caravanComponentRequirement(setup, category, locale),
    };
  });
  // Check the actual 1–4 panel quantity selected for the basket, not just
  // the calculator target Wp. A rated MPPT below installed Wp requires
  // manual manufacturer overpaneling review; it is not purchase-ready as a
  // complete automatically selected package.
  const panelRow = rows.find((row) => row.category === "solar_panel" && row.ready);
  const controllerIndex = rows.findIndex((row) => row.category === "controller" && row.ready);
  if (panelRow && controllerIndex >= 0 && setup?.systemVoltage) {
    const selectedController = rows[controllerIndex];
    const review = caravanPvNominalReview(panelRow, selectedController.product, setup.systemVoltage);
    if (review.needsManualReview) {
      const alternatives = (recommendations.controller || []).filter((candidate) =>
        isRecommendationEligible(candidate) && candidate.product?.available === true
        && hasBuyableProductLink(candidate.product)
        && !caravanPvNominalReview(panelRow, candidate.product, setup.systemVoltage).needsManualReview);
      // Prefer a manufacturer-rated match; an undocumented PV power rating
      // remains a component candidate but never gains proof it does not have.
      const known = alternatives.filter(({ product }) =>
        controllerNominalPvWatts(product, setup.systemVoltage) !== null);
      const replacement = selectRecommendedCategoryCandidate({controller: known.length ? known : alternatives}, "controller");
      rows[controllerIndex] = replacement
        ? {...selectedController, product: replacement.product, ready: true, missingReason: null}
        : {...selectedController, product: null, ready: false, quantity: 1,
          missingReason: "pv_nominal_review", installedPvWp: review.actualWp, nominalPvWp: review.nominalWp};
    }
  }

  const available = rows.filter((row) => row.ready).length;
  const manualDesign = Boolean(coverage.manualDesignCharging?.length);
  const complete = rows.length > 0 && available === rows.length && !manualDesign;
  return {
    rows,
    systemVoltage: setup?.systemVoltage ?? null,
    readyCount: available,
    requiredCount: rows.length,
    complete,
    manualDesign,
    status: complete ? "complete" : available ? "partial" : "unavailable",
  };
}
