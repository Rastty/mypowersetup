// Dometic's 600/1200 W and 1000/2000 W names distinguish CONTINUOUS
// (first) from peak/start (second), never the reverse. The local Padabo
// product page uses a shared parent URL: buyers must explicitly select the
// matching voltage/power variant before paying.
//
// Manufacturer product descriptions (pure sine, voltage, continuous W):
// https://www.dometic.com/en/product/dometic-sinepower-dpsi-612-9620017417
// https://www.dometic.com/cs-cz/product/dometic-sinepower-dpsi-1012-9620017419
// https://www.dometic.com/en/product/dometic-sinepower-dpsi-624-9620017418
// https://www.dometic.com/en/product/dometic-sinepower-dpsi-1024-9620017420
// Exact dealer models/continuous vs peak:
// https://www.padabo.pl/przetwornica-napiecia-dometic-sinepower-dpsi-12-v-lub-24-v_z104292/
const MODELS = Object.freeze({
  "30466": { voltage:12, continuous:600, peak:1200, model:"DPSI 612", evidence:"https://www.dometic.com/en/product/dometic-sinepower-dpsi-612-9620017417" },
  "30467": { voltage:12, continuous:1000, peak:2000, model:"DPSI 1012", evidence:"https://www.dometic.com/cs-cz/product/dometic-sinepower-dpsi-1012-9620017419" },
  "30472": { voltage:24, continuous:600, peak:1200, model:"DPSI 624", evidence:"https://www.dometic.com/en/product/dometic-sinepower-dpsi-624-9620017418" },
  "30473": { voltage:24, continuous:1000, peak:2000, model:"DPSI 1024", evidence:"https://www.dometic.com/en/product/dometic-sinepower-dpsi-1024-9620017420" },
  "30474": { voltage:24, continuous:1500, peak:3000, model:"DPSI 1524", evidence:"https://www.dometic.com/en-de/product/dometic-sinepower-dpsi-1524-9620017422" },
  "30475": { voltage:24, continuous:2000, peak:4000, model:"DPSI 2024", evidence:"https://www.dometic.com/en/product/dometic-sinepower-dpsi-2024-9620017424" },
});
const SELLERS = Object.freeze({
  svetkaravanu: { currency:"CZK", bid:"38137ac4",
    url:"https://www.svetkaravanu.cz/menic-napeti-dometic-sinepower-dpsi-12-v-nebo-24-v_z104292/",
    name: (model) => `Měnič napětí Dometic SinePower DPSI 12 V nebo 24 V stálý / špičkový výkon ${model.continuous}/${model.peak} W napětí ${model.voltage} V`,
  },
  padabo_sk: { currency:"EUR", bid:"7aed5c13",
    url:"https://www.padabo.sk/menic-napatia-dometic-sinepower-dpsi-12-v-alebo-24-v_z104292/",
    name: (model) => `Menič napätia Dometic SinePower DPSI 12 V alebo 24 V stály / špičkový výkon ${model.continuous}${model.continuous===1000?"":" W"} / ${model.peak} W napätie ${model.voltage} V`,
  },
  padabo_pl: { currency:"PLN", bid:"95d61abf",
    url:"https://www.padabo.pl/przetwornica-napiecia-dometic-sinepower-dpsi-12-v-lub-24-v_z104292/",
    name: (model) => `Przetwornica napięcia Dometic SinePower DPSI 12 V lub 24 V wydajność stała/szczytowa ${model.continuous}/${model.peak} W napięcie ${model.voltage} V`,
  },
});

function exactApprovedDpsi(product, model, seller) {
  if (!seller || product?.category!=="inverter" || product.merchant!==product.id.split(":")[0]
    || product.name!==seller.name(model) || product.productUrl!==seller.url
    || product.available!==true || product.staleSource===true
    || product.priceCurrency!==seller.currency
    || !Number.isFinite(product.priceCzk) || product.priceCzk<=0
    || product.specs?.voltageV!==model.voltage
    || ![model.continuous,model.peak].includes(product.specs?.powerW)
    || product.specs?.pureSine!==true) return false;
  try {
    const url=new URL(product.affiliateUrl);
    return url.origin==="https://ehub.cz" && url.pathname==="/system/scripts/click.php"
      && !url.username && !url.password && !url.hash
      && url.searchParams.size===3
      && ["a_aid","a_bid","desturl"].every(k=>url.searchParams.getAll(k).length===1)
      && url.searchParams.get("a_aid")==="f34c86c8"
      && url.searchParams.get("a_bid")===seller.bid
      && url.searchParams.get("desturl")===seller.url;
  } catch { return false; }
}

export function addReviewedDometicDpsiInverterSpecs(product, specs) {
  const key=/^(svetkaravanu|padabo_sk|padabo_pl):104292_(\d+)$/.exec(String(product?.id||""));
  if(!key || !Object.hasOwn(MODELS,key[2]))return specs;
  const merchant=key[1],variant=key[2];
  const model=MODELS[variant],seller=SELLERS[merchant];
  // This known SKU must not fall back to a feed-provided peak rating on any
  // mismatched, stale, unpriced or unattributed variant. Fail closed.
  if(!exactApprovedDpsi(product,model,seller) || specs?.voltageV!==model.voltage
    || ![model.continuous,model.peak].includes(specs.powerW)
    || specs.pureSine!==true) return { ...specs, powerW:null, pureSine:null };
  return {
    ...specs,
    powerW:model.continuous,
    pureSine:true,
    inverterPeakPowerW:model.peak,
    inverterManufacturerModel:model.model,
    inverterManufacturerEvidenceUrl:model.evidence,
    // The approved affiliate destination is a *family* listing, not an
    // add-to-cart deep-link for this specific variant.
    inverterVariantMustBeSelected:true,
  };
}
