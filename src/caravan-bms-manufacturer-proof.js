// Reviewed manufacturer-backed continuous operating evidence, never inferred from Ah,
// merchant copy, generic currentA or a BMS marketing label. Restricted to the
// exact approved CZ/SK/PL local SKU/variant, source campaign and country currency.
// Victron SuperPack NG technical data recommends 0.5C for continuous use;
// its higher 2C maximum can be thermal/SoC limited and is NOT used for sizing.
// https://www.victronenergy.com/media/pg/Lithium_SuperPack_NG/en/technical-data.html
// https://www.victronenergy.com/media/pg/Lithium_SuperPack_NG/en/operation.html
const MANUFACTURER_EVIDENCE = "https://www.victronenergy.com/media/pg/Lithium_SuperPack_NG/en/technical-data.html";
const LEGACY_MANUFACTURER_EVIDENCE = "https://www.victronenergy.com/upload/documents/Datasheet-12%2C8V-%26-25%2C6-Lithium-SuperPack-EN.pdf";
const REVIEWED = Object.freeze({
  // OLDER (non-NG) 12.8V/200Ah SuperPack, BAT512120705, from Victron's
  // legacy manufacturer datasheet. 70A is the MAX CONTINUOUS discharge,
  // NOT 200A based on Ah and NOT the 100A (10-second) peak.
  // Source dealer families each explicitly list the 200Ah variant; unlike
  // their shared 100Ah pages, this variant maps to the 12.8V/200Ah model.
  // The shared seller description says "100A" for the *100Ah high-current*
  // sibling: it must never be inherited by this 200Ah offer.
  // The manufacturer warns that capacitive inverter inrush can disconnect
  // the BMS even when the nominal continuous sizing is below 70A.
  "svetkaravanu:26965_28369": {
    merchant:"svetkaravanu",currency:"CZK",bid:"38137ac4",requirePrice:true,
    name:"Baterie Victron Energy LiFePO Lithium SuperPack 12,8 V kapacita 200 Ah",
    url:"https://www.svetkaravanu.cz/baterie-victron-energy-lifepo-lithium-superpack-12-8-v_z26965/",
    model:"BAT512120705",voltageV:12,capacityAh:200,continuousDischargeA:70,
    dischargeKind:"manufacturer_max_continuous",evidenceUrl:LEGACY_MANUFACTURER_EVIDENCE,
  },
  "padabo_sk:26965_28369": {
    merchant:"padabo_sk",currency:"EUR",bid:"7aed5c13",requirePrice:true,
    name:"Batéria Victron Energy LiFePO Lithium SuperPack 12,8 V kapacita 200 Ah",
    url:"https://www.padabo.sk/bateria-victron-energy-lifepo-lithium-superpack-12-8-v_z26965/",
    model:"BAT512120705",voltageV:12,capacityAh:200,continuousDischargeA:70,
    dischargeKind:"manufacturer_max_continuous",evidenceUrl:LEGACY_MANUFACTURER_EVIDENCE,
  },
  "padabo_pl:26965_28369": {
    merchant:"padabo_pl",currency:"PLN",bid:"95d61abf",requirePrice:true,
    name:"Bateria Victron Energy LiFePO Lithium SuperPack 12,8 V pojemność 200 Ah",
    url:"https://www.padabo.pl/bateria-victron-energy-lifepo-lithium-superpack-12-8-v_z26965/",
    model:"BAT512120705",voltageV:12,capacityAh:200,continuousDischargeA:70,
    dischargeKind:"manufacturer_max_continuous",evidenceUrl:LEGACY_MANUFACTURER_EVIDENCE,
  },
  // Sunstone's dedicated 200A SLPO12-200N variant and manufacturer product
  // specification state "Constant current discharge: 200A" (distinct from
  // the separate peak field). Do NOT transfer this to plain 200N or 200M.
  // https://www.sunstonepower.com/downloads/157.html
  // https://www.sunstonepower.com/LiFePO4_Battery/137.html
  "vselektro:sunstone-slpo12-200n": {
    merchant:"vselektro", currency:"CZK", bid:"f897865f",
    name:"LiFePO4 Baterie 12V/200Ah, SLPO12-200N HC200A Sunstone Power",
    url:"https://www.vselektro.eu/lifepo4-baterie-12v-200ah-slpo12-200n-hc200a-sunstone-power/",
    model:"SLPO12-200N(200A) HC200A",voltageV:12,capacityAh:200,continuousDischargeA:200,
    evidenceUrl:"https://www.sunstonepower.com/LiFePO4_Battery/137.html",
  },

  // Approved CZ SvětKaravanů live feed contains these same exact two
  // manufacturer-part-number SuperPack NG 100Ah models as Padabo SK/PL.
  // Use Victron's 50A recommended sustained 0.5C, not the 2C 10min maximum.
  "svetkaravanu:107356_32721": {
    merchant:"svetkaravanu",currency:"CZK",bid:"38137ac4",
    name:"Baterie Victron Energy LiFePO Lithium SuperPack 12,8 V NG kapacita 100 Ah",
    url:"https://www.svetkaravanu.cz/baterie-victron-energy-lifepo-lithium-superpack-12-8-v-ng_z107356/",
    model:"BAT512110740",voltageV:12,capacityAh:100,continuousDischargeA:50,
  },
  "svetkaravanu:107358": {
    merchant:"svetkaravanu",currency:"CZK",bid:"38137ac4",
    name:"Baterie Victron Energy LiFePO Lithium SuperPack 25,6V/100Ah NG",
    url:"https://www.svetkaravanu.cz/baterie-victron-energy-lifepo-lithium-superpack-25-6v-100ah-ng_z107358/",
    model:"BAT524110740",voltageV:24,capacityAh:100,continuousDischargeA:50,
  },
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
    || product.productUrl!==item.url || product.priceCurrency!==item.currency
    || (item.requirePrice && !(Number.isFinite(product.priceCzk) && product.priceCzk>0))) return null;
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
    bmsEvidenceKind:item.dischargeKind || "manufacturer_recommended_sustained",
    bmsManufacturerModel:item.model,
    bmsManufacturerEvidenceUrl:item.evidenceUrl || MANUFACTURER_EVIDENCE,
  };
}

export function verifiedBatteryContinuousDischargeAmps(product) {
  const item=exactReviewedSku(product);
  if (!item || product.specs?.voltageV!==item.voltageV
    || product.specs?.capacityAh!==item.capacityAh
    || product.specs?.batteryType!=="lifepo4"
    || product.specs?.bmsContinuousCurrentA!==item.continuousDischargeA
    || product.specs?.bmsEvidenceKind!==(item.dischargeKind || "manufacturer_recommended_sustained")
    || product.specs?.bmsManufacturerModel!==item.model
    || product.specs?.bmsManufacturerEvidenceUrl!==(item.evidenceUrl || MANUFACTURER_EVIDENCE)) return null;
  return item.continuousDischargeA;
}
