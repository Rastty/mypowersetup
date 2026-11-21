// Manufacturer document: EcoFlow 175 W rigid TOPCon EF-SG-M175-01.
// This is electrical model evidence ONLY, not availability, checkout,
// rooftop mounting, wiring, cable sizing, or final installation approval.
// The approved CZ/SK/PL dealer listings explicitly identify the same
// 175 W RIGID TOPCon panel; reject any identity/currency/deeplink drift.
const MANUFACTURER_PDF = "https://websiteoss.ecoflow.com/cms/upload/2024/5/30/EcoFlow%20175W%20Rigid%20Solar%20Panel-Safety%20Instructions%20V1.0_1717050133698.pdf";
const VERIFIED = Object.freeze({
  "svetkaravanu:105298": {
    merchant:"svetkaravanu", name:"Solární panel EcoFlow 175 W",
    url:"https://www.svetkaravanu.cz/solarni-panel-ecoflow-175-w_z105298/",
    currency:"CZK", bid:"38137ac4",
  },
  "padabo_sk:105298": {
    merchant:"padabo_sk", name:"Solárny panel EcoFlow 175 W",
    url:"https://www.padabo.sk/solarny-panel-ecoflow-175-w_z105298/",
    currency:"EUR", bid:"7aed5c13",
  },
  "padabo_pl:105298": {
    merchant:"padabo_pl", name:"Panel słoneczny EcoFlow 175 W",
    url:"https://www.padabo.pl/panel-sloneczny-ecoflow-175-w_z105298/",
    currency:"PLN", bid:"95d61abf",
  },
});
const SPECS = Object.freeze({
  powerW:175,
  pvModel:"EF-SG-M175-01",
  pvVocV:25.5,
  pvIscA:8.3,
  pvVmpV:21.9,
  pvVocTempCoefficientPctPerC:-0.25,
  pvIscTempCoefficientPctPerC:0.045,
  pvElectricalEvidenceUrl:MANUFACTURER_PDF,
});

function exactAffiliateProduct(product, match) {
  if (!match || product?.merchant !== match.merchant
    || product?.category !== "solar_panel"
    || product.name !== match.name
    || product.priceCurrency !== match.currency
    || product.productUrl !== match.url) return false;
  try {
    const url=new URL(product.affiliateUrl);
    return url.origin==="https://ehub.cz"
      && url.pathname==="/system/scripts/click.php"
      && !url.username && !url.password && !url.hash
      && url.searchParams.size===3
      && ["a_aid","a_bid","desturl"].every(key=>url.searchParams.getAll(key).length===1)
      && url.searchParams.get("a_aid")==="f34c86c8"
      && url.searchParams.get("a_bid")===match.bid
      && url.searchParams.get("desturl")===match.url;
  } catch { return false; }
}

export function addVerifiedEcoFlowRigid175PvSpecs(product, specs) {
  const match=VERIFIED[product?.id];
  if (!exactAffiliateProduct(product,match) || !specs || specs.powerW!==175
    || Object.entries(SPECS).some(([key, expected]) =>
      specs[key] != null && specs[key]!==expected)) return specs;
  return {...specs,...SPECS};
}
