import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { recommendProducts, refreshCatalogProduct } from "../src/products.js";
import { shoreVariantNote } from "../src/carbest-shore-profiles.js";
import { buildProductPackages } from "../src/packages.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { assessRecommendationCoverage } from "../src/recommendation-coverage.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";
const setup=(locale,ah,amps)=>({locale,systemVoltage:12,batteryType:"lifepo4",batteryAh:ah,
 inverterWatts:400,solarWatts:190,controllerAmps:20,dailyWh:600,autonomyDays:1,
 applianceRows:[{ac:true,watts:400,quantity:1}],
 charging:{starterVoltage:12,dcDc:{enabled:true,suggestedCurrentAmps:30},shore:{enabled:true,suggestedCurrentAmps:amps}}});
const merchant=l=>l==="cs"?"svetkaravanu":"padabo_"+l;
const catalog=async l=>JSON.parse(await readFile(new URL("../data/products"+(l==="cs"?"":"-"+l)+".json",import.meta.url),"utf8"));
test("Carbest exact nine local variants use independently verified 12V max amps and conservative capacity ranges",async()=>{
 for(const locale of ["cs","sk","pl"]){
  const c=await catalog(locale),m=merchant(locale);
  for(const [id,amps,maxAh,model] of [["27324",10,100,"80286"],["27325",15,150,"80287"],["27326",20,200,"80288"]]){
   const raw=c.products.find(p=>p.id===m+":25869_"+id);assert.ok(raw,locale);
   if(c.sources[m].status!=="ok"||raw.available!==true)continue;
   const p=refreshCatalogProduct(raw);
   assert.equal(p.specs.chargingManufacturerModel,"Carbest "+model);
   assert.deepEqual(p.specs.chargingInputVoltagesV,[230]);
   assert.deepEqual(p.specs.chargingAcInputRangeV,[190,265]);
   assert.equal(p.specs.chargingCapacityMinAh,50);
   assert.equal(p.specs.chargingCapacityMaxAh,maxAh);
   assert.match(shoreVariantNote(p,locale),new RegExp(model+" · "+amps+" A"));
   for(const ah of [50,maxAh])assert.equal(recommendProducts([raw],setup(locale,ah,amps),3,c.sources).shore_charger[0]?.product.id,raw.id);
   for(const [ah,a] of [[49,amps],[maxAh+1,amps],[100,amps+1]])assert.equal(recommendProducts([raw],setup(locale,ah,a),3,c.sources).shore_charger.length,0);
   assert.equal(recommendProducts([raw],{...setup(locale,100,amps),systemVoltage:24},3,c.sources).shore_charger.length,0);
   for(const bad of [{...raw,name:raw.name+" wrong"},{...raw,productUrl:raw.productUrl+"wrong"},
    {...raw,affiliateUrl:raw.affiliateUrl.replace("a_bid=","wrong=")},{...raw,available:false},{...raw,staleSource:true},
    {...raw,specs:{...raw.specs,currentA:amps*2}}])assert.equal(recommendProducts([bad],setup(locale,100,amps),3,c.sources).shore_charger.length,0);
  }
 }
});
test("15A Carbest beats same-voltage same-currency Dometic cost with real six-category local baskets",async()=>{
 for(const locale of ["cs","sk","pl"]){
  const c=await catalog(locale),m=merchant(locale),raw=c.products.find(p=>p.id===m+":25869_27325"),premium=c.products.find(p=>p.id===m+":24087_26040");
  const ids=["107357","109069","24828","104292_30466","26963_28360"];
  const others=ids.map(id=>c.products.find(p=>p.id===m+":"+id));
  // 107357 is not the 12V NG in all feeds; resolve only exact known 12V/100Ah SuperPack NG model if needed.
  if(!others[0]||others[0].specs?.voltageV!==12||others[0].specs?.capacityAh!==100)others[0]=c.products.find(p=>p.merchant===m&&p.category==="battery"&&p.specs?.voltageV===12&&p.specs?.capacityAh===100&&/SuperPack.*NG/i.test(p.name));
  const input=setup(locale,100,15);
  if(c.sources[m].status!=="ok"||!raw?.available||!premium?.available||!others.every(p=>p?.available===true))continue;
  const rec=recommendProducts([...others,raw,premium],input,24,c.sources);
  assert.equal(rec.shore_charger[0]?.product.id,raw.id);
  assert.ok(raw.priceCzk<premium.priceCzk);
  const packages=buildProductPackages(rec,input);
  const plan=buildCaravanBuyerChecklist({coverage:assessRecommendationCoverage(rec,input,locale),packages,recommendations:rec,setup:input,locale});
  assert.equal(plan.readyCount,6,locale+" "+JSON.stringify(plan.rows.map(r=>[r.category,r.missingReason])));
  assert.equal(plan.rows.find(r=>r.category==="shore_charger").product.id,raw.id);
  assert.equal(purchaseReadyCaravanPackages(packages,plan)[0]?.id,"recommended");
 }
});
