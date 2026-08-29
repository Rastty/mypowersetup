import { normalizeProduct } from "./products.js";

export function parseShopifyProducts(payload, merchantKey, {
  origin,
  verifiedProducts = [],
  allowedProductTypes = null,
  productPathPrefix = "/products/"
} = {}) {
  if (!payload || !Array.isArray(payload.products)) {
    throw new Error("Shopify katalog neobsahuje pole products.");
  }
  const storeOrigin = new URL(origin);
  if (storeOrigin.protocol !== "https:") throw new Error("Shopify origin musí používat HTTPS.");
  if (!/^\/[a-z0-9/-]*products\/$/i.test(productPathPrefix)) throw new Error("Shopify productPathPrefix není bezpečný.");

  const verifiedByUrl = new Map(
    verifiedProducts.map((product) => [new URL(product.productUrl).toString(), product])
  );

  return payload.products.flatMap((product) => {
    if (allowedProductTypes && !allowedProductTypes.includes(product?.product_type)) return [];
    if (!product?.id || !product.title || !/^[a-z0-9-]+$/.test(product.handle || "")) return [];
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variant = variants.find((item) => item?.available) || variants[0];
    if (!variant) return [];

    const productUrl = new URL(`${productPathPrefix}${product.handle}`, storeOrigin).toString();
    try {
      const normalized = normalizeProduct({
        id: product.id,
        name: product.title,
        description: product.body_html,
        category: product.product_type,
        brand: product.vendor,
        price: variant.price,
        available: variants.some((item) => item?.available),
        imageUrl: product.images?.[0]?.src || product.image?.src,
        url: productUrl
      }, merchantKey);
      const verified = verifiedByUrl.get(productUrl);
      if (!verified) return [normalized];
      return [{
        ...normalized,
        description: verified.description || normalized.description,
        specs: { ...normalized.specs, ...verified.specs },
        verifiedAt: verified.verifiedAt
      }];
    } catch {
      return [];
    }
  });
}
