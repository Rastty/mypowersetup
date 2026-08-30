import { classifyProduct, normalizeProduct } from "./products.js";

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
    const verified = verifiedByUrl.get(productUrl);
    try {
      const normalized = sanitizeBatteryEnergy(normalizeProduct({
        id: product.id,
        name: verified?.name || product.title,
        description: verified?.description || product.body_html,
        category: verified?.categoryPath || product.product_type,
        brand: product.vendor,
        price: variant.price,
        available: variants.some((item) => item?.available),
        imageUrl: product.images?.[0]?.src || product.image?.src,
        url: productUrl
      }, merchantKey));
      if (!verified) return [normalized];
      const specs = { ...normalized.specs, ...verified.specs };
      const categoryPath = verified.categoryPath || normalized.categoryPath;
      return [{
        ...normalized,
        categoryPath,
        category: classifyProduct({ name: normalized.name, categoryPath, specs }),
        description: verified.description || normalized.description,
        specs,
        verifiedAt: verified.verifiedAt
      }];
    } catch {
      return [];
    }
  });
}

function sanitizeBatteryEnergy(product) {
  if (product.category !== "battery") return product;
  const { voltageV, capacityAh, capacityWh } = product.specs || {};
  if (!(voltageV > 0 && capacityAh > 0 && capacityWh > 0)) return product;

  const nominalWh = voltageV * capacityAh;
  const ratio = capacityWh / nominalWh;
  if (ratio >= 0.5 && ratio <= 2) return product;

  return {
    ...product,
    specs: {
      ...product.specs,
      capacityWh: null
    }
  };
}
