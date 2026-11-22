// Exact approved Padabo SK/PL shore-power battery charger variants. The
// manufacturer (not merchant feed labels) documents selectable LiFePO4
// profiles and battery Ah ranges. This is product screening, not installation
// or BMS charging approval.
// Dometic MCA series operating manual, chapter 9.5 and technical data:
// https://media.dometic.com/externalassets/08-0802-080209-080209011_9620017572_119810.pdf
const MANUAL="https://media.dometic.com/externalassets/08-0802-080209-080209011_9620017572_119810.pdf";
const MODELS=Object.freeze({
  "24087_26040":{model:"MCA 1215",system:12,current:15,minAh:30,maxAh:120},
  "24087_26042":{model:"MCA 1235",system:12,current:35,minAh:70,maxAh:280},
  "24088_26048":{model:"MCA 2440",system:24,current:40,minAh:80,maxAh:320},
});
const LOCAL=Object.freeze({
  sk:Object.freeze({
    merchant:"padabo_sk",currency:"EUR",bid:"7aed5c13",
    offers:{
      "24087_26040":{name:"Nabíjačka batérií PerfectCharge 12 V nabíjací prúd 15 A model MCA 1215",url:"https://www.padabo.sk/nabijacka-baterii-perfectcharge-12-v_z24087/"},
      "24087_26042":{name:"Nabíjačka batérií PerfectCharge 12 V nabíjací prúd 35 A model MCA 1235",url:"https://www.padabo.sk/nabijacka-baterii-perfectcharge-12-v_z24087/"},
      "24088_26048":{name:"Nabíjačka batérií Dometic PerfectCharge 24 V nabíjací prúd 40 A model MCA 2440",url:"https://www.padabo.sk/nabijacka-baterii-dometic-perfectcharge-24-v_z24088/"},
    },
  }),
  pl:Object.freeze({
    merchant:"padabo_pl",currency:"PLN",bid:"95d61abf",
    offers:{
      "24087_26040":{name:"Ładowarka akumulatorów Dometic PerfectCharge 12 V prąd ładowania 15 A model MCA 1215",url:"https://www.padabo.pl/ladowarka-akumulatorow-dometic-perfectcharge-12-v_z24087/"},
      "24087_26042":{name:"Ładowarka akumulatorów Dometic PerfectCharge 12 V prąd ładowania 35 A model MCA 1235",url:"https://www.padabo.pl/ladowarka-akumulatorow-dometic-perfectcharge-12-v_z24087/"},
      "24088_26048":{name:"Ładowarka Dometic PerfectCharge 24 V prąd ładowania 40 A model MCA 2440",url:"https://www.padabo.pl/ladowarka-dometic-perfectcharge-24-v_z24088/"},
    },
  }),
});

function exactApprovedOffer(product) {
  const [market,sku]=String(product?.id||"").split(":");
  const locale=market==="padabo_sk"?"sk":market==="padabo_pl"?"pl":null;
  const local=LOCAL[locale];
  const model=MODELS[sku];
  const offer=local?.offers[sku];
  if (!locale||!model||!offer||product.merchant!==local.merchant
    ||product.category!=="shore_charger"||product.available!==true
    ||product.staleSource===true||product.priceCurrency!==local.currency
    ||product.name!==offer.name||product.productUrl!==offer.url
    ||!Number.isFinite(product.priceCzk)||product.priceCzk<=0)return null;
  try {
    const url=new URL(product.affiliateUrl);
    if(url.origin!=="https://ehub.cz"||url.pathname!=="/system/scripts/click.php"
      ||url.hash||url.username||url.password||url.searchParams.size!==3
      ||["a_aid","a_bid","desturl"].some(k=>url.searchParams.getAll(k).length!==1)
      ||url.searchParams.get("a_aid")!=="f34c86c8"
      ||url.searchParams.get("a_bid")!==local.bid
      ||url.searchParams.get("desturl")!==offer.url)return null;
  }catch{return null;}
  return model;
}

export function addVerifiedDometicMcaShoreProfile(product,specs) {
  const model=exactApprovedOffer(product);
  if (!model || !specs||specs.voltageV!==model.system
    ||specs.currentA!==model.current
    ||!Array.isArray(specs.chargingVoltagesV)
    ||specs.chargingVoltagesV.length!==1
    ||specs.chargingVoltagesV[0]!==model.system
    || (product.specs?.batteryType!=null && product.specs.batteryType!=="lead")
    || (product.specs?.currentA!=null && product.specs.currentA!==model.current)
    || (product.specs?.voltageV!=null && product.specs.voltageV!==model.system)
  )return specs;
  return {
    ...specs,
    chargingBatteryTypes:["lifepo4","lead"],
    // AC shore input is 100–240 V, not the low-voltage battery output.
    chargingInputVoltagesV:[230],
    chargingAcInputRangeV:[100,240],
    chargingCapacityMinAh:model.minAh,
    chargingCapacityMaxAh:model.maxAh,
    chargingCapacityRangeChemistry:"lifepo4",
    chargingProfileEvidenceUrl:MANUAL,
    chargingManufacturerModel:model.model,
  };
}
