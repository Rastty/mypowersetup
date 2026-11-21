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
    return categories.size === required.size;
  });
}
