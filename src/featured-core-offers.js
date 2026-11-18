// Prefer the engine's recommended basket; when a complete basket does not
// exist, expose the best already-verified match from each available category.
// Presentation only: never introduce an unverified product.
export function selectFeaturedOffers(recommendations, packages = [], limit = 3) {
  const selected = [];
  const seenProducts = new Set();
  const seenCategories = new Set();
  const append = (candidate, category) => {
    if (!candidate?.product?.id || seenProducts.has(candidate.product.id)
      || seenCategories.has(category) || selected.length >= limit) return;
    seenProducts.add(candidate.product.id);
    seenCategories.add(category);
    selected.push({ ...candidate, category, product: candidate.product });
  };
  const recommendedPackage = Array.isArray(packages)
    ? packages.find(({ id }) => id === "recommended") : null;
  for (const candidate of recommendedPackage?.items || []) {
    append(candidate, candidate.category);
  }
  for (const [category, candidates] of Object.entries(recommendations || {})) {
    append(candidates?.[0], category);
  }
  return selected;
}
