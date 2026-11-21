// A calculator's target Wp is not the actual installed array: rounded panel
// quantities can put more PV power into the basket than the nominal MPPT
// recommendation was compared against. This check is a buyer REVIEW gate,
// not a claim that overpaneling is electrically unsafe: a manufacturer may
// allow it within voltage/current limits and clip the excess production.
export function selectedSolarArrayWatts(panelItem) {
  const product = panelItem?.product || panelItem;
  const watts = product?.specs?.powerW;
  const quantity = panelItem?.quantity ?? product?.recommendedQuantity ?? 1;
  if (typeof watts !== "number" || !Number.isFinite(watts) || watts <= 0
    || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 4) return null;
  return watts * quantity;
}

export function controllerNominalPvWatts(controllerProduct, systemVoltage) {
  if (![12, 24, 48].includes(Number(systemVoltage))) return null;
  const value = controllerProduct?.specs?.maxPvWattsBySystemVoltage?.[systemVoltage];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function caravanPvNominalReview(panelItem, controllerProduct, systemVoltage) {
  const actualWp = selectedSolarArrayWatts(panelItem);
  const nominalWp = controllerNominalPvWatts(controllerProduct, systemVoltage);
  return {
    actualWp, nominalWp,
    needsManualReview: actualWp !== null && nominalWp !== null && actualWp > nominalWp,
  };
}
