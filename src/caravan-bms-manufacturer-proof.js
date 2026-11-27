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

// Manufacturer's exact EU product page lists 200A MAXIMUM CONTINUOUS
// discharge for the *Plus* 12V 200Ah SKU (not its separate 100A sibling).
// https://www.ipowerqueen.de/en/products/power-queen-12v-200ah-plus-lifepo4-solar-battery
// The approved SK/PL catalog imports the exact same AWIN EU destination,
// so validate the separate AWIN attribution boundary without weakening the
// existing eHub merchant allowlist. Seller pricing/stock are feed snapshots,
// not a promise of a final checkout price or a completed electrical design.
const POWERQUEEN_200A = Object.freeze({
  id:"powerqueen_eu:7752838578396",
  merchant:"powerqueen_eu",
  name:"Power Queen 12V 200Ah Plus LiFePO4 Battery, Built-in 200A BMS",
  url:"https://www.ipowerqueen.de/en/products/power-queen-12v-200ah-plus-lifepo4-solar-battery",
  currency:"EUR",
  voltageV:12,capacityAh:200,
  continuousDischargeA:200,
  dischargeKind:"manufacturer_max_continuous",
  model:"Power Queen 12V 200Ah Plus",
  evidenceUrl:"https://www.ipowerqueen.de/en/products/power-queen-12v-200ah-plus-lifepo4-solar-battery",
});
// Exact approved 25.6V/200Ah model: the manufacturer's specification gives
// 200A max continuous DISCHARGE, 5120W continuous output, 400A for 5 seconds.
// Neither 400A surge nor 200Ah capacity is a continuous-discharge rating.
// https://www.ipowerqueen.de/en/products/power-queen-24v-200ah-lifepo4-solar-battery-with-200a-bms
const POWERQUEEN_24V_200A = Object.freeze({
  id:"powerqueen_eu:7881294676188",
  merchant:"powerqueen_eu",
  name:"Power Queen 24V 200Ah LiFePO4 Battery, Built-in 200A BMS",
  url:"https://www.ipowerqueen.de/en/products/power-queen-24v-200ah-lifepo4-solar-battery-with-200a-bms",
  currency:"EUR",
  voltageV:24,capacityAh:200,
  continuousDischargeA:200,
  dischargeKind:"manufacturer_max_continuous",
  model:"Power Queen 24V 200Ah",
  evidenceUrl:"https://www.ipowerqueen.de/en/products/power-queen-24v-200ah-lifepo4-solar-battery-with-200a-bms",
});
function exactReviewedPowerQueenSku(product) {
  const record=product?.id===POWERQUEEN_24V_200A.id ? POWERQUEEN_24V_200A : POWERQUEEN_200A;
  if (product?.id!==record.id || product?.merchant!==record.merchant
    || product.category!=="battery" || product.name!==record.name
    || product.productUrl!==record.url || product.priceCurrency!==record.currency
    || product.available!==true || product.staleSource===true
    || product.marketEligible===false
    || !Number.isFinite(product.priceCzk) || product.priceCzk<=0
    || product.specs?.voltageV!==record.voltageV
    || product.specs?.capacityAh!==record.capacityAh
    || product.specs?.batteryType!=="lifepo4"
    || product.specs?.currentA!==200
    || product.specs?.powerW!==(record.voltageV===24?5120:2560)
    // The independently reviewed manufacturer source specifies exact maximum
    // continuous discharge amps. Also require matching live merchant copy:
    // 12V Plus explicitly states discharge amps; 24V states continuous watts.
    // Generic 200A BMS/title, charge-only or peak-only text cannot qualify.
    || !(record.voltageV===24
      ? /continuous power output of 5120 W\b/i.test(String(product.description||""))
      : /maximum continuous discharge current of 200A/i.test(String(product.description||"")))) return null;
  try {
    const affiliate=new URL(product.affiliateUrl);
    if (affiliate.origin!=="https://www.awin1.com"
      || affiliate.pathname!=="/cread.php"
      || affiliate.username || affiliate.password || affiliate.hash
      || affiliate.searchParams.size!==3
      || ["awinmid","awinaffid","ued"].some(k=>affiliate.searchParams.getAll(k).length!==1)
      || affiliate.searchParams.get("awinmid")!=="97025"
      || affiliate.searchParams.get("awinaffid")!=="3044971"
      || affiliate.searchParams.get("ued")!==record.url) return null;
  } catch {return null;}
  return record;
}

function exactBatteryEvidence(product) {
  return exactReviewedSku(product) || exactReviewedPowerQueenSku(product);
}

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
  const item=exactBatteryEvidence(product);
  if (!item || (product.specs?.voltageV!=null && product.specs.voltageV!==item.voltageV)
    || (product.specs?.capacityAh!=null && product.specs.capacityAh!==item.capacityAh)
    || (product.specs?.batteryType!=null && product.specs.batteryType!=="lifepo4")
    // Explicit contradictory raw merchant metadata must NOT be silently
    // dropped by refreshCatalogProduct's parser and upgraded to proof.
    || (product.specs?.bmsContinuousCurrentA!=null
      && product.specs.bmsContinuousCurrentA!==item.continuousDischargeA)
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
  const item=exactBatteryEvidence(product);
  if (!item || product.specs?.voltageV!==item.voltageV
    || product.specs?.capacityAh!==item.capacityAh
    || product.specs?.batteryType!=="lifepo4"
    || product.specs?.bmsContinuousCurrentA!==item.continuousDischargeA
    || product.specs?.bmsEvidenceKind!==(item.dischargeKind || "manufacturer_recommended_sustained")
    || product.specs?.bmsManufacturerModel!==item.model
    || product.specs?.bmsManufacturerEvidenceUrl!==(item.evidenceUrl || MANUFACTURER_EVIDENCE)) return null;
  return item.continuousDischargeA;
}
