const MERCHANT = "arukereso_hu";
const REQUIRED_TRACKING = Object.freeze(["a_aid", "a_bid", "chan"]);

export async function syncArukeresoHu(previousCatalog = { products: [], sources: {} }, {
  feedUrl = process.env.ARUKERESO_HU_FEED_URL,
  affiliateLink = process.env.ARUKERESO_HU_AFFILIATE_LINK,
  fetchImpl = globalThis.fetch,
} = {}) {
  const preserved = (previousCatalog.products || []).filter((product) => product.merchant === MERCHANT);
  const wasConfigured = Boolean(previousCatalog.sources?.[MERCHANT]);

  if (!feedUrl || !affiliateLink) {
    if (!preserved.length && !wasConfigured) return { products: [], source: null };
    return {
      products: preserved,
      source: {
        status: "stale",
        error: "Árukereső HU feed nebo affiliate link není nakonfigurován",
        preservedProducts: preserved.length,
      },
    };
  }

  try {
    if (typeof fetchImpl !== "function") throw new Error("FETCH_UNAVAILABLE");
    const tracking = parseDognetTrackingTemplate(affiliateLink);
    const response = await fetchImpl(feedUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "MyPowerSetup/1.0 (+https://mypowersetup.com/)",
        accept: "application/xml,text/xml,application/rss+xml,text/plain;q=0.9,*/*;q=0.8",
        "accept-language": "hu-HU,hu;q=0.9,en;q=0.6",
        "cache-control": "no-cache",
      },
    });
    if (!response?.ok) throw new Error(`HTTP ${response?.status || "ERROR"}`);

    const parsed = parseArukeresoFeed(await response.text(), tracking);
    const controllers = uniqueProducts(parsed.filter((product) => product.category === "controller"));
    if (controllers.length < 1) throw new Error("Árukereső feed neobsahuje ověřitelný MPPT regulátor");

    return {
      products: controllers,
      source: {
        status: "ok",
        parsedProducts: parsed.length,
        relevantProducts: controllers.length,
        controllers: controllers.length,
        trackingChannel: tracking.chan,
      },
    };
  } catch (error) {
    return preserved.length
      ? {
          products: preserved,
          source: { status: "stale", error: error.message, preservedProducts: preserved.length },
        }
      : { products: [], source: { status: "error", error: error.message } };
  }
}

export function parseArukeresoFeed(xml, affiliateLink) {
  const tracking = typeof affiliateLink === "string" ? parseDognetTrackingTemplate(affiliateLink) : affiliateLink;
  const blocks = extractBlocks(xml);
  return blocks.flatMap((block, index) => {
    const name = readTag(block, ["PRODUCTNAME", "PRODUCT", "g:title", "title", "name"]);
    const description = readTag(block, ["DESCRIPTION", "g:description", "description"]);
    const productUrl = readTag(block, ["URL", "g:link", "link", "product_url", "productUrl"]);
    if (!name || !productUrl || !/\bmppt\b/i.test(`${name} ${description}`)) return [];

    const currentA = extractControllerCurrent(name, description);
    if (!currentA || currentA < 20) return [];

    let exactUrl;
    try {
      exactUrl = validateArukeresoProductUrl(productUrl);
    } catch {
      return [];
    }

    const rawPrice = readTag(block, ["PRICE_VAT", "g:price", "price", "PRICE"]);
    const price = parsePrice(rawPrice);
    const currency = parseCurrency(rawPrice) || "HUF";
    const id = readTag(block, ["ITEM_ID", "g:id", "id", "product_id"]) || `${exactUrl.hostname}${exactUrl.pathname}`;
    const imageUrl = safeHttpsUrl(readTag(block, ["IMGURL", "g:image_link", "image", "image_url"]));
    const available = parseAvailability(readTag(block, ["DELIVERY_DATE", "g:availability", "availability", "stock"]));

    return [{
      id: `${MERCHANT}:${String(id).trim() || index}`,
      merchant: MERCHANT,
      name: cleanText(name),
      description: cleanText(description).slice(0, 500),
      categoryPath: cleanText(readTag(block, ["CATEGORYTEXT", "g:product_type", "category", "category_name"])) || "Napelemes töltésvezérlők",
      category: "controller",
      brand: cleanText(readTag(block, ["MANUFACTURER", "g:brand", "brand"])),
      priceCzk: price,
      priceCurrency: currency,
      available,
      productUrl: exactUrl.toString(),
      affiliateUrl: buildDognetTrackedUrl(exactUrl, tracking),
      imageUrl,
      specs: {
        voltageV: null,
        capacityAh: null,
        capacityWh: null,
        powerW: null,
        currentA,
        chargingVoltagesV: [],
        chargingInputVoltagesV: [],
        chargingBatteryTypes: [],
        batteryType: null,
        pureSine: null,
        solarInputW: null,
        dcOutputA: null,
      },
    }];
  });
}

export function parseDognetTrackingTemplate(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !isArukeresoHost(url.hostname)) {
    throw new Error("ARUKERESO_AFFILIATE_LINK_INVALID_HOST");
  }

  const hashText = url.hash.replace(/^#\??/, "");
  const hashParams = new URLSearchParams(hashText);
  const values = new Map([...url.searchParams.entries(), ...hashParams.entries()]);
  for (const key of REQUIRED_TRACKING) {
    if (!values.get(key)) throw new Error(`ARUKERESO_AFFILIATE_LINK_MISSING_${key.toUpperCase()}`);
  }

  return Object.freeze({
    search: Object.freeze([...url.searchParams.entries()]),
    hash: url.hash || "",
    chan: values.get("chan"),
  });
}

export function buildDognetTrackedUrl(productUrl, trackingInput) {
  const destination = productUrl instanceof URL ? new URL(productUrl) : validateArukeresoProductUrl(productUrl);
  const tracking = typeof trackingInput === "string" ? parseDognetTrackingTemplate(trackingInput) : trackingInput;
  for (const [key, value] of tracking.search || []) destination.searchParams.set(key, value);
  if (tracking.hash) destination.hash = tracking.hash;
  return destination.toString();
}

function extractBlocks(xml) {
  for (const tag of ["SHOPITEM", "item", "product", "offer"]) {
    const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    const blocks = [...String(xml || "").matchAll(pattern)].map((match) => match[1]);
    if (blocks.length) return blocks;
  }
  return [];
}

function readTag(xml, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(xml || "").match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
    if (match) return decodeXml(stripCdata(match[1])).trim();
  }
  return "";
}

function validateArukeresoProductUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !isArukeresoHost(url.hostname)) throw new Error("ARUKERESO_PRODUCT_URL_INVALID_HOST");
  if (!url.pathname || url.pathname === "/") throw new Error("ARUKERESO_PRODUCT_URL_HOMEPAGE");
  url.hash = "";
  return url;
}

function isArukeresoHost(hostname) {
  const normalized = String(hostname || "").toLowerCase().replace(/\.$/, "");
  return normalized === "arukereso.hu" || normalized.endsWith(".arukereso.hu");
}

function extractControllerCurrent(name, description) {
  const text = `${cleanText(name)} ${cleanText(description)}`;
  const explicit = text.match(/\b(\d+(?:[.,]\d+)?)\s*a\b/i);
  if (explicit) return number(explicit[1]);
  const model = text.match(/(?:mppt|smartsolar|bluesolar)[^\n]{0,80}?\b\d{2,3}\s*[\/-]\s*(\d{1,3})\b/i);
  return model ? number(model[1]) : null;
}

function parsePrice(value) {
  const text = String(value || "").replace(/[\u00a0\s]/g, "");
  const match = text.match(/-?\d+(?:[.,]\d+)?/);
  return match ? number(match[0]) : null;
}

function parseCurrency(value) {
  const match = String(value || "").toUpperCase().match(/\b(HUF|EUR|CZK|PLN|USD)\b/);
  return match?.[1] || null;
}

function parseAvailability(value) {
  const text = cleanText(value);
  if (!text) return null;
  if (/out[ _-]?of[ _-]?stock|nincs készleten|elfogyott|nem elérhető/i.test(text)) return false;
  if (/in[ _-]?stock|készleten|raktáron|azonnal|true|^0$/i.test(text)) return true;
  return null;
}

function uniqueProducts(products) {
  const urls = new Set();
  return products.filter((product) => {
    if (urls.has(product.productUrl)) return false;
    urls.add(product.productUrl);
    return true;
  });
}

function safeHttpsUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function number(value) {
  const parsed = Number(String(value).replace(/[\u00a0\s]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function stripCdata(value) {
  return String(value || "").replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
