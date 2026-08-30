import { normalizeProduct } from "./products.js";

const AMPUL_VERIFIED_FEED_PRODUCTS = Object.freeze({
  "6195": Object.freeze({
    category: "dc_charger",
    verifiedAt: "2026-08-30",
    specs: Object.freeze({
      currentA: 30,
      chargingVoltagesV: Object.freeze([12]),
      chargingInputVoltagesV: Object.freeze([12, 24]),
      chargingBatteryTypes: Object.freeze(["lifepo4"]),
      batteryType: "lifepo4"
    })
  })
});

export function parseProductFeed(xml, merchantKey) {
  const itemPattern = /<SHOPITEM\b[^>]*>([\s\S]*?)<\/SHOPITEM>/gi;
  const googleItemPattern = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  const blocks = [...xml.matchAll(itemPattern)].map((match) => match[1]);
  if (blocks.length === 0) {
    blocks.push(...[...xml.matchAll(googleItemPattern)].map((match) => match[1]));
  }

  return blocks.flatMap((block) => {
    const raw = {
      id: tag(block, "ITEM_ID") || tag(block, "g:id"),
      name: tag(block, "PRODUCTNAME") || tag(block, "PRODUCT") || tag(block, "g:title") || tag(block, "title"),
      description: tag(block, "DESCRIPTION") || tag(block, "g:description") || tag(block, "description"),
      url: tag(block, "URL") || tag(block, "g:link") || tag(block, "link"),
      imageUrl: tag(block, "IMGURL") || tag(block, "g:image_link"),
      price: tag(block, "PRICE_VAT") || tag(block, "g:price"),
      brand: tag(block, "MANUFACTURER") || tag(block, "g:brand"),
      category: tag(block, "CATEGORYTEXT") || tag(block, "g:product_type"),
      available: tag(block, "DELIVERY_DATE") || tag(block, "g:availability")
    };

    if (!raw.name || !raw.url) return [];
    try {
      return [applyVerifiedFeedMetadata(normalizeProduct(raw, merchantKey), raw, merchantKey)];
    } catch {
      return [];
    }
  });
}

function applyVerifiedFeedMetadata(product, raw, merchantKey) {
  if (!/^ampul_(?:cz|sk|pl|hu)$/.test(merchantKey)) return product;
  const verified = AMPUL_VERIFIED_FEED_PRODUCTS[String(raw.id || "").trim()];
  if (!verified) return product;

  // Verification can tighten technical metadata but must never invent live
  // availability, price or a destination URL. Those continue to come only
  // from the current merchant feed and normalizeProduct's URL validation.
  return {
    ...product,
    category: verified.category,
    verifiedAt: verified.verifiedAt,
    specs: {
      ...product.specs,
      ...verified.specs,
      chargingVoltagesV: [...verified.specs.chargingVoltagesV],
      chargingInputVoltagesV: [...verified.specs.chargingInputVoltagesV],
      chargingBatteryTypes: [...verified.specs.chargingBatteryTypes]
    }
  };
}

function tag(xml, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeXml(stripCdata(match[1])).trim() : "";
}

function stripCdata(value) {
  return value.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
