// A buyer must compare the price of the calculated quantity, not the unit
// price of a solar panel. This is an indicative merchandise subtotal only:
// shipping, tax differences, discounts and merchant checkout are not inferred.
export function expansionLinePrice(item) {
  if (!item || typeof item.price !== "number" ||
      !Number.isFinite(item.price) || item.price <= 0) return null;

  const quantity = item.category === "solar_panel" ? item.quantity : 1;
  if (!Number.isSafeInteger(quantity) || quantity < 1 ||
      (item.category === "solar_panel" && quantity > 4)) return null;
  const totalPrice = item.price * quantity;
  if (!Number.isFinite(totalPrice) || totalPrice <= 0 ||
      totalPrice > Number.MAX_SAFE_INTEGER / 100) return null;

  return Object.freeze({
    unitPrice: item.price,
    quantity,
    totalPrice,
    currency: item.currency || null,
  });
}
