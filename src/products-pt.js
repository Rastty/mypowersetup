import { buildAllpowersPtDeeplink } from "./affiliate-allpowers-pt.js";

const PT_ORIGIN = "https://allpowers-pt.com";
const PRODUCT_PATH_PREFIX = "/products/";

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function numberFrom(text, pattern) {
  const match = cleanText(text).match(pattern);
  if (!match) return null;
  const value = Number(String(match[1]).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function exactProductUrl(handle) {
  if (!/^[a-z0-9-]+$/.test(handle || "")) throw new Error("PT_PRODUCT_HANDLE_INVALID");
  return new URL(`${PRODUCT_PATH_PREFIX}${handle}`, PT_ORIGIN).toString();
}

function classifyPortugueseProduct(product, verifiedByUrl) {
  const text = `${cleanText(product?.title)} ${cleanText(product?.body_html)} ${cleanText(product?.product_type)}`;
  const productUrl = exactProductUrl(product.handle);
  const isBundle = /\b(?:kit|conjunto|bundle|gerador solar)\b/i.test(text);
  if (isBundle) return null;

  if (/\bpain(?:el|éis)\s+solar(?:es)?\b|\bsolar\s+panel\b/i.test(text)) {
    const powerW = numberFrom(text, /(?:^|\D)(\d{2,4}(?:[.,]\d+)?)\s*w(?:p)?\b/i);
    if (!powerW || powerW < 60 || powerW > 1000) return null;
    return { category: "solar_panel", specs: { powerW }, verifiedAt: null };
  }

  if (/\besta(?:ção|cao)\s+(?:de\s+)?energia\b|\bportable\s+power\s+station\b/i.test(text)) {
    const verified = verifiedByUrl.get(productUrl);
    if (!verified) return null;
    const specs = verified.specs || {};
    if (!(specs.capacityWh > 0 && specs.powerW > 0 && specs.solarInputW > 0 && specs.dcOutputA > 0)) return null;
    return { category: "power_station", specs: { ...specs }, verifiedAt: verified.verifiedAt || null };
  }

  return null;
}

export function parseAllpowersPtProducts(payload, { verifiedProducts = [] } = {}) {
  if (!payload || !Array.isArray(payload.products)) throw new Error("PT_SHOPIFY_PRODUCTS_MISSING");
  const verifiedByUrl = new Map(
    verifiedProducts
      .filter((item) => item?.productUrl)
      .map((item) => [new URL(item.productUrl).toString(), item])
  );

  return payload.products.flatMap((product) => {
    if (!product?.id || !product?.title || !product?.handle) return [];
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variant = variants.find((item) => item?.available) || variants[0];
    if (!variant) return [];

    let productUrl;
    let classified;
    try {
      productUrl = exactProductUrl(product.handle);
      classified = classifyPortugueseProduct(product, verifiedByUrl);
    } catch {
      return [];
    }
    if (!classified) return [];

    const price = Number(String(variant.price ?? "").replace(",", "."));
    return [{
      id: `allpowers_pt-${product.id}`,
      merchant: "allpowers_pt",
      name: cleanText(product.title),
      description: cleanText(product.body_html).slice(0, 500),
      category: classified.category,
      brand: cleanText(product.vendor || "ALLPOWERS"),
      priceCzk: Number.isFinite(price) && price >= 0 ? price : null,
      priceCurrency: "EUR",
      available: variants.some((item) => item?.available === true),
      productUrl,
      affiliateUrl: buildAllpowersPtDeeplink(productUrl),
      imageUrl: product.images?.[0]?.src || product.image?.src || null,
      specs: classified.specs,
      verifiedAt: classified.verifiedAt,
    }];
  });
}

export function validatePtCatalog(payload) {
  if (payload?.market !== "pt-PT" || payload?.currency !== "EUR") throw new Error("PT_CATALOG_MARKET_INVALID");
  if (!Array.isArray(payload?.products) || !payload?.sources || typeof payload.sources !== "object") {
    throw new Error("PT_CATALOG_SHAPE_INVALID");
  }
  const products = payload.products.filter((product) => product?.merchant === "allpowers_pt");
  if (products.length !== payload.products.length) throw new Error("PT_CATALOG_FOREIGN_MERCHANT");
  for (const product of products) {
    if (!product.productUrl || !product.affiliateUrl) throw new Error("PT_CATALOG_DESTINATION_MISSING");
    const destination = new URL(product.productUrl);
    if (!["allpowers-pt.com", "www.allpowers-pt.com"].includes(destination.hostname)
      || !destination.pathname.startsWith(PRODUCT_PATH_PREFIX)) {
      throw new Error("PT_CATALOG_DESTINATION_INVALID");
    }
  }
  return Object.freeze({
    generatedAt: payload.generatedAt || null,
    sources: Object.freeze({ ...payload.sources }),
    products: Object.freeze(products.map((product) => Object.freeze({ ...product }))),
  });
}
