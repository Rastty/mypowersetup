// Product cards should agree with the default shopping package. Keep the
// technical ranking intact for package selection; only change what is shown
// first in the optional, per-product comparison.
export function visibleRecommendationsForPackages(rankedRecommendations, packages, limit = 3, buyerPlan = null) {
  const recommendedPackage = packages?.find(({ id }) => id === "recommended");
  const selectedIds = new Map(
    (recommendedPackage?.items || [])
      .filter(({ category, product }) => category && product?.id)
      .map(({ category, product }) => [category, product.id])
  );
  // If the buyer has an actually confirmed-stock checkout choice, that SKU
  // takes precedence over a technically compatible but unbuyable package item.
  // The comparison must show the same linked product the shopping plan sells.
  for (const row of buyerPlan?.rows || []) {
    if (row.ready && row.category && row.product?.id) {
      selectedIds.set(row.category, row.product.id);
    } else if (buyerPlan) {
      selectedIds.delete(row.category);
    }
  }

  return Object.fromEntries(Object.entries(rankedRecommendations || {}).map(([category, candidates]) => {
    const items = Array.isArray(candidates) ? candidates : [];
    const selectedId = selectedIds.get(category);
    const selectedIndex = selectedId ? items.findIndex(({ product }) => product?.id === selectedId) : -1;
    if (selectedIndex <= 0) return [category, items.slice(0, limit)];
    return [category, [items[selectedIndex], ...items.slice(0, selectedIndex), ...items.slice(selectedIndex + 1)].slice(0, limit)];
  }));
}

// Card prices are unit prices in partner feeds, while sizing may require
// multiple units. Unknown feed prices must never become a fake zero total.
export function productCardPriceDetails(product) {
  const quantity = Number.isSafeInteger(product?.recommendedQuantity) && product.recommendedQuantity > 0
    ? product.recommendedQuantity : 1;
  const raw = product?.priceCzk;
  const unitPrice = raw === null || raw === undefined || raw === "" || !Number.isFinite(Number(raw)) || Number(raw) <= 0
    ? null : Number(raw);
  return { quantity, unitPrice, totalPrice: unitPrice === null ? null : unitPrice * quantity };
}
