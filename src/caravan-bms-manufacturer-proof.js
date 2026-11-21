// Reviewed manufacturer-backed continuous operating evidence, never inferred from Ah,
// merchant copy, generic currentA or a BMS marketing label. Restricted to the
// exact approved Padabo local SKU/variant, source campaign and country currency.
// Victron SuperPack NG technical data recommends 0.5C for continuous use;
// its higher 2C maximum can be thermal/SoC limited and is NOT used for sizing.
// https://www.victronenergy.com/media/pg/Lithium_SuperPack_NG/en/technical-data.html
// https://www.victronenergy.com/media/pg/Lithium_SuperPack_NG/en/operation.html
const MANUFACTURER_EVIDENCE = "https://www.victronenergy.com/media/pg/Lithium_SuperPack_NG/en/technical-data.html";
const REVIEWED = Object.freeze({
  "padabo_sk:107356_32721": {
    merchant:"padabo_sk",currency:"EUR",bid:"7aed5c13",
    name:"Batéria Victron Energy LiFePO Lithium SuperPack 12,8V NG kapacita 100 Ah",
    url:"https://www.padabo.sk/bateria-victron-energy-lifepo-lithium-superpack-12-8v-ng_z107356/",
    model:"BAT512110740",voltageV:12,capacityAh:100,continuousDischargeA:50,
  },
  "padabo_sk:107358": {
    merchant:"padabo_sk",currency:"EUR",bid:"7aed5c13",
    name:"Batéria Victron Energy LiFePO Lithium SuperPack 25,6V/100Ah NG",
    url:"https://www.padabo.sk/bateria-victron-energy-lifepo-lithium-superpack-25-6v-100ah-ng_z107358/",
    model:"BAT524110740",voltageV:24,capacityAh:100,continuousDischargeA:50,
  },
  "padabo_pl:107356_32721": {
    merchant:"padabo_pl",currency:"PLN",bid:"95d61abf",
    name:"Akumulator Victron Energy LiFePO Lithium SuperPack 12,8 V NG pojemność 100 Ah",
    url:"https://www.padabo.pl/akumulator-victron-energy-lifepo-lithium-superpack-12-8-v-ng_z107356/",
    model:"BAT512110740",voltageV:12,capacityAh:100,continuousDischargeA:50,
  },
  "padabo_pl:107358": {
    merchant:"padabo_pl",currency:"PLN",bid:"95d61abf",
    name:"Bateria Victron Energy LiFePO Lithium SuperPack 25,6 V/100 Ah NG",
    url:"https://www.padabo.pl/bateria-victron-energy-lifepo-lithium-superpack-25-6-v-100-ah-ng_z107358/",
    model:"BAT524110740",voltageV:24,capacityAh:100,continuousDischargeA:50,
  },
});

function exactReviewedSku(product) {
  if (product?.category !== "battery" || product.available !== true
    || !Object.hasOwn(REVIEWED,product?.id)) return null;
  const item=REVIEWED[product.id];
  if (product.merchant!==item.merchant || product.name!==item.name
    || product.productUrl!==item.url || product.priceCurrency!==item.currency) return null;
  try {
    const affiliate=new URL(product.affiliateUrl);
    if (affiliate.origin!=="https://ehub.cz"
      || affiliate.pathname!=="/system/scripts/click.php"
      || affiliate.username || affiliate.password || affiliate.hash
      || affiliate.searchParams.size!==3
      || ["a_aid","a_bid","desturl"].some(k=>affiliate.searchParams.getAll(k).length!==1)
      || affiliate.searchParams.get("a_aid")!=="f34c86c8"
      || affiliate.searchParams.get("a_bid")!==item.bid
      || affiliate.searchParams.get("desturl")!==item.url) return null;
  } catch {return null;}
  return item;
}

// Add the *recommended sustained 0.5C operating current*, not the short-duration
// maximum. Require exact known product identity AND technical voltage/chemistry.
// This is a conservative purchase-screening figure, not proof of total installation.
export function addReviewedBatteryContinuousSpecs(product,specs) {
  const item=exactReviewedSku(product);
  if (!item || (product.specs?.voltageV!=null && product.specs.voltageV!==item.voltageV)
    || (product.specs?.capacityAh!=null && product.specs.capacityAh!==item.capacityAh)
    || (product.specs?.batteryType!=null && product.specs.batteryType!=="lifepo4")
    || specs?.voltageV!==item.voltageV
    || specs.capacityAh!==item.capacityAh || specs.batteryType!=="lifepo4"
    || (specs.bmsContinuousCurrentA!=null
      && specs.bmsContinuousCurrentA!==item.continuousDischargeA)) return specs;
  return {
    ...specs,
    bmsContinuousCurrentA:item.continuousDischargeA,
    bmsEvidenceKind:"manufacturer_recommended_sustained",
    bmsManufacturerModel:item.model,
    bmsManufacturerEvidenceUrl:MANUFACTURER_EVIDENCE,
  };
}

export function verifiedBatteryContinuousDischargeAmps(product) {
  const item=exactReviewedSku(product);
  if (!item || product.specs?.voltageV!==item.voltageV
    || product.specs?.capacityAh!==item.capacityAh
    || product.specs?.batteryType!=="lifepo4"
    || product.specs?.bmsContinuousCurrentA!==item.continuousDischargeA
    || product.specs?.bmsEvidenceKind!=="manufacturer_recommended_sustained"
    || product.specs?.bmsManufacturerModel!==item.model
    || product.specs?.bmsManufacturerEvidenceUrl!==MANUFACTURER_EVIDENCE) return null;
  return item.continuousDischargeA;
}
