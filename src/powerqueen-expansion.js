const MERCHANT = "powerqueen_eu";
const PRODUCT_HOSTS = new Set(["www.ipowerqueen.de", "ipowerqueen.de"]);
const AWIN_HOSTS = new Set(["www.awin1.com", "awin1.com"]);
const AWIN_MERCHANT_ID = "97025";
const AWIN_AFFILIATE_ID = "3044971";
const PRODUCT_PATH = /^\/en\/products\/[a-z0-9-]+\/?$/i;
const COMPONENT_CATEGORIES = new Set(["battery", "controller", "inverter", "shore_charger"]);

export function isPowerQueenExpansionProduct(product) {
  return product?.merchant === MERCHANT;
}

export function validatePowerQueenExpansionProduct(product) {
  if (!isPowerQueenExpansionProduct(product)) throw new Error("POWERQUEEN_MERCHANT_INVALID");
  if (product.marketEligible !== true || product.available === false) throw new Error("POWERQUEEN_MARKET_EVIDENCE_INVALID");
  if (!COMPONENT_CATEGORIES.has(product.category)) throw new Error("POWERQUEEN_CATEGORY_INVALID");
  if (product.priceCurrency !== "EUR" || !(Number(product.priceCzk) > 0)) throw new Error("POWERQUEEN_PRICE_INVALID");

  const productUrl = exactProductUrl(product.productUrl);
  const affiliate = new URL(product.affiliateUrl || "");
  if (affiliate.protocol !== "https:" || !AWIN_HOSTS.has(affiliate.hostname)) throw new Error("POWERQUEEN_AFFILIATE_HOST_INVALID");
  if (affiliate.searchParams.get("awinmid") !== AWIN_MERCHANT_ID) throw new Error("POWERQUEEN_AFFILIATE_MERCHANT_INVALID");
  if (affiliate.searchParams.get("awinaffid") !== AWIN_AFFILIATE_ID) throw new Error("POWERQUEEN_AFFILIATE_ACCOUNT_INVALID");
  if (exactProductUrl(affiliate.searchParams.get("ued")) !== productUrl) throw new Error("POWERQUEEN_AFFILIATE_DESTINATION_MISMATCH");

  validateSpecs(product);
  return product;
}

function exactProductUrl(value) {
  const url = new URL(value || "");
  if (url.protocol !== "https:" || !PRODUCT_HOSTS.has(url.hostname) || !PRODUCT_PATH.test(url.pathname)) {
    throw new Error("POWERQUEEN_PRODUCT_URL_INVALID");
  }
  url.hash = "";
  return url.toString();
}

function validateSpecs(product) {
  const specs = product.specs || {};
  if (product.category === "battery") {
    if (![12, 24].includes(specs.voltageV) || !(specs.capacityAh >= 50) || specs.batteryType !== "lifepo4") {
      throw new Error("POWERQUEEN_BATTERY_SPECS_INVALID");
    }
    if (!/\bbms\b/i.test(`${product.name || ""} ${product.description || ""}`)) throw new Error("POWERQUEEN_BATTERY_BMS_EVIDENCE_MISSING");
    return;
  }
  if (product.category === "controller") {
    if (!/\bmppt\b/i.test(product.name || "") || !(specs.currentA >= 20)) throw new Error("POWERQUEEN_CONTROLLER_SPECS_INVALID");
    return;
  }
  if (product.category === "inverter") {
    if (![12, 24].includes(specs.voltageV) || !(specs.powerW > 0) || specs.pureSine !== true || !product.verifiedAt) {
      throw new Error("POWERQUEEN_INVERTER_SPECS_INVALID");
    }
    return;
  }
  if (product.category === "shore_charger") {
    if (!(specs.currentA > 0)
      || !Array.isArray(specs.chargingVoltagesV)
      || !specs.chargingVoltagesV.some((value) => value === 12 || value === 24)
      || !Array.isArray(specs.chargingBatteryTypes)
      || !specs.chargingBatteryTypes.includes("lifepo4")
      || !product.verifiedAt) {
      throw new Error("POWERQUEEN_SHORE_CHARGER_SPECS_INVALID");
    }
  }
}
