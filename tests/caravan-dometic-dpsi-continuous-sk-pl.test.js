import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {refreshCatalogProduct,recommendProducts,extractSpecs} from "../src/products.js";
import {assessRecommendationCoverage} from "../src/recommendation-coverage.js";
import {buildProductPackages} from "../src/packages.js";
import {buildCaravanBuyerChecklist} from "../src/caravan-buyer-checklist.js";
import {purchaseReadyCaravanPackages} from "../src/caravan-package-readiness.js";
import {caravanBasketPriceSummary} from "../src/caravan-basket-pricing.js";

const variants=[
  ["30466",12,600,1200,"DPSI 612"],
  ["30467",12,1000,2000,"DPSI 1012"],
  ["30472",24,600,1200,"DPSI 624"],
  ["30473",24,1000,2000,"DPSI 1024"],
];
async function catalog(locale) {
  return JSON.parse(await readFile(new URL("../data/products-"+locale+".json",import.meta.url),"utf8"));
}
const setup=(locale,voltage,watts)=>({
  locale,systemVoltage:voltage,batteryType:"lifepo4",
  batteryAh:voltage===12?200:100,solarWatts:380,controllerAmps:30,
  inverterWatts:watts,
  charging:{starterVoltage:12,dcDc:{enabled:true,suggestedCurrentAmps:voltage===12?30:10},
    shore:{enabled:true,suggestedCurrentAmps:voltage===12?35:40}},
});

test("SL/PL continuous/peak parsing never treats 1200/2000 W peak as continuous",()=>{
  for(const name of [
    "Menič napätia Dometic SinePower DPSI 12 V alebo 24 V stály / špičkový výkon 1000 / 2000 W napätie 24 V",
    "Przetwornica napięcia Dometic SinePower DPSI 12 V lub 24 V wydajność stała/szczytowa 1000/2000 W napięcie 24 V",
  ]) {
    assert.equal(extractSpecs(name).powerW,1000,name);
  }
  assert.equal(extractSpecs("Przetwornica napięcia Dometic SinePower DPSI 12 V lub 24 V wydajność stała/szczytowa 600/1200 W napięcie 12 V").powerW,600);
});

test("eight current stocked SK/PL Dometic variants have exact manufacturer continuous W and buyer variant selection",async()=>{
 for(const locale of ["sk","pl"]){
  const c=await catalog(locale),merchant="padabo_"+locale,currency=locale==="sk"?"EUR":"PLN";
  const sourceHealthy=c.sources[merchant].status==="ok";
  assert.ok(sourceHealthy || c.sources[merchant].status==="stale");
  for(const [suffix,voltage,continuous,peak,model] of variants){
   const id=merchant+":104292_"+suffix,raw=c.products.find(p=>p.id===id);
   assert.ok(raw,id);assert.equal(raw.category,"inverter");
   if(!sourceHealthy){
     assert.equal(raw.available,false,id);assert.equal(raw.staleSource,true,id);
     assert.equal(recommendProducts([raw],setup(locale,voltage,continuous),3,c.sources).inverter.length,0,id+" stale blocked");
     continue;
   }
   assert.equal(raw.available,true);
   assert.equal(raw.priceCurrency,currency);assert.ok(raw.priceCzk>0);
   const a=new URL(raw.affiliateUrl);
   assert.equal(a.searchParams.get("a_aid"),"f34c86c8");
   assert.equal(a.searchParams.get("a_bid"),locale==="sk"?"7aed5c13":"95d61abf");
   assert.equal(a.searchParams.get("desturl"),raw.productUrl);
   const reviewed=refreshCatalogProduct(raw);
   assert.equal(reviewed.specs.voltageV,voltage,id);
   assert.equal(reviewed.specs.powerW,continuous,id);
   assert.equal(reviewed.specs.inverterPeakPowerW,peak,id);
   assert.equal(reviewed.specs.inverterManufacturerModel,model,id);
   assert.ok(reviewed.specs.inverterManufacturerEvidenceUrl.startsWith("https://www.dometic.com/"),id);
   assert.equal(reviewed.specs.inverterVariantMustBeSelected,true,id);
   assert.equal(recommendProducts([raw],setup(locale,voltage,continuous),3,c.sources).inverter[0]?.product.id,id);
   assert.equal(recommendProducts([raw],setup(locale,voltage,continuous+1),3,c.sources).inverter.length,0,id+" peak is not continuous");
   assert.equal(recommendProducts([raw],setup(locale,voltage,continuous),3,{[merchant]:{status:"stale"}}).inverter.length,0,id+" stale");
  }
 }
});

test("known variant with tampered merchant/stock/price/name/affiliate/voltage/rating fails closed, never falls back to peak",async()=>{
 for(const locale of ["sk","pl"]){
  const c=await catalog(locale),id="padabo_"+locale+":104292_30466",raw=c.products.find(p=>p.id===id);
  const broken=[
    {...raw,merchant:"other"},
    {...raw,available:false},
    {...raw,staleSource:true},
    {...raw,priceCzk:null},
    {...raw,priceCzk:0},
    {...raw,priceCurrency:"USD"},
    {...raw,name:raw.name+" wrong"},
    {...raw,productUrl:raw.productUrl+"wrong"},
    {...raw,affiliateUrl:raw.affiliateUrl.replace("f34c86c8","bad")},
    {...raw,affiliateUrl:raw.affiliateUrl.replace("desturl=","notdest=")},
    {...raw,affiliateUrl:raw.affiliateUrl+"&clickref=unvetted"},
    {...raw,specs:{...raw.specs,voltageV:24}},
    {...raw,specs:{...raw.specs,powerW:9000}},
    {...raw,specs:{...raw.specs,pureSine:false}},
  ];
  for(const p of broken){
    const reviewed=refreshCatalogProduct(p);
    assert.equal(reviewed.specs.inverterManufacturerModel,undefined,id+" "+p.name);
    assert.equal(recommendProducts([p],setup(locale,12,600),3,c.sources).inverter.length,0,id+" "+p.name);
  }
 }
});

test("real SK and PL 12/24V caravan baskets can buy six reviewed electrical categories",async()=>{
 const order=["battery","solar_panel","controller","inverter","dc_charger","shore_charger"];
 for(const locale of ["sk","pl"]){
  const c=await catalog(locale),merchant="padabo_"+locale;
  for(const voltage of [12,24]){
    const ids=[
      voltage===12?"26965_28369":"107358",
      "109069","24828",voltage===12?"104292_30466":"104292_30472",
      voltage===12?"26963_28360":"107361",
      voltage===12?"24087_26042":"24088_26048",
    ];
    const source=ids.map(suffix=>c.products.find(p=>p.id===merchant+":"+suffix));
    if(c.sources[merchant].status==="stale"){
      assert.ok(source.every(p=>p?.available===false&&p.staleSource===true),locale+" stale diagnostics");
      const held=recommendProducts(source,setup(locale,voltage,600),3,c.sources);
      assert.equal(Object.values(held).flat().length,0,locale+" no stale buyer");
      continue;
    }
    assert.ok(source.every(p=>p?.available===true&&p.priceCzk>0),locale+" "+voltage+" missing seller SKU");
    const proposed=setup(locale,voltage,600);
    const rec=recommendProducts(source,proposed,3,c.sources);
    for(const cat of order)assert.equal(rec[cat].length,1,locale+" "+voltage+" "+cat);
    const coverage=assessRecommendationCoverage(rec,proposed,locale);
    assert.equal(coverage.complete,true);
    const packages=buildProductPackages(rec,proposed);
    const plan=buildCaravanBuyerChecklist({coverage,packages,recommendations:rec,setup:proposed,locale});
    assert.equal(plan.readyCount,6,locale+" "+voltage+" "+JSON.stringify(plan.rows.map(r=>[r.category,r.missingReason])));
    assert.equal(plan.complete,true);
    assert.equal(plan.rows.find(r=>r.category==="controller").pvWiringReview?.status,"within_reviewed_limits");
    assert.equal(purchaseReadyCaravanPackages(packages,plan)[0]?.id,"recommended");
    const price=caravanBasketPriceSummary(plan,locale);
    assert.equal(price.complete,true);
    assert.deepEqual(price.subtotals.map(r=>r.currency),[locale==="sk"?"EUR":"PLN"]);
    assert.ok(price.subtotals[0].amount>0);
  }
 }
});

test("SK and PL published Builder imports and front-page cards tell buyers to select the precise shared-URL variant",async()=>{
 for(const locale of ["sk","pl"]){
  const [page,app]=await Promise.all(["../"+locale+"/index.html","../src/app-"+locale+".js"].map(path=>readFile(new URL(path,import.meta.url),"utf8")));
  assert.ok(page.includes("app-"+locale+".js?v=20261122-shore-mca1"));
  assert.ok(page.includes("-shopbreakdown1-dpsi1"),locale);
  assert.ok(app.includes("products.js?v=20261122-legacy70a-dpsi1"),locale);
  assert.ok(app.includes("caravan-buyer-plan-localized.js?v=20261122-dpsi-variant1"),locale);
  assert.ok(app.includes("data-inverter-variant-selection"),locale);
 }
 const products=await readFile(new URL("../src/products.js",import.meta.url),"utf8");
 const plan=await readFile(new URL("../src/caravan-buyer-plan-localized.js",import.meta.url),"utf8");
 assert.ok(products.includes("dometic-dpsi-inverter-profiles.js?v=20261122-dpsi-continuous1"));
 assert.ok(plan.includes("data-inverter-variant-selection"));
});
