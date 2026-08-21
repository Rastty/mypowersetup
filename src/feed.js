import { normalizeProduct } from "./products.js";

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
      return [normalizeProduct(raw, merchantKey)];
    } catch {
      return [];
    }
  });
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
