import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { recommendProducts, refreshCatalogProduct } from "../src/products.js";
import { documentedBatteryContinuousBmsAmps, batteryDischargeBuyerCheck } from "../src/caravan-bms-buyer-evidence.js";
import { minimumBatteryDischargeAmps } from "../src/battery-discharge-safety.js";
import { assessRecommendationCoverage } from "../src/recommendation-coverage.js";
import { buildProductPackages } from "../src/packages.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { caravanBasketPriceSummary } from "../src/caravan-basket-pricing.js";

const ID="powerqueen_eu:7752840380636", LARGE="powerqueen_eu:7881294676188";
const setup=(locale,watts=1500,ah=100)=>({
  locale,systemVoltage:24,batteryType:"lifepo4",batteryAh:ah,
  dailyWh:1500,autonomyDays:1,applianceRows:[{ac:true,watts:1000,quantity:1}],
  inverterWatts:watts,solarWatts:380,controllerAmps:30,
  charging:{starterVoltage:12,dcDc:{enabled:true,suggestedCurrentAmps:10},shore:{enabled:true,suggestedCurrentAmps:40}},
});
const catalog=async locale=>JSON.parse(await readFile(new URL("../data/products-"+locale+".json",import.meta.url),"utf8"));
test("exact 24V 100Ah Deep Cycle has independent 100A continuous proof, not 280A surge",async()=>{
  for(const locale of ["sk","pl"]){
    const c=await catalog(locale),raw=c.products.find(p=>p.id===ID);
    assert.ok(raw,locale);
    if(c.sources.powerqueen_eu.status!=="ok"||raw.available!==true){
      assert.equal(recommendProducts([raw],setup(locale),3,c.sources).battery.length,0);
      continue;
    }
    const p=refreshCatalogProduct(raw);
    assert.equal(documentedBatteryContinuousBmsAmps(p),100,locale);
    assert.equal(p.specs.bmsEvidenceKind,"manufacturer_max_continuous");
    assert.equal(p.specs.bmsManufacturerModel,"Power Queen 24V 100Ah Deep Cycle");
    assert.equal(minimumBatteryDischargeAmps(setup(locale)),74);
    assert.match(batteryDischargeBuyerCheck(p,setup(locale),locale),/100 A/);
    assert.equal(recommendProducts([raw],setup(locale,2100),3,c.sources).battery.length,0);
    assert.equal(recommendProducts([raw],setup(locale,1500,150),3,c.sources).battery.length,0);
    assert.equal(recommendProducts([raw],setup(locale),3,{powerqueen_eu:{status:"stale"}}).battery.length,0);
    for(const bad of [
      {...raw,id:"powerqueen_eu:other"},{...raw,name:raw.name.replace("100Ah","200Ah")},
      {...raw,description:"100A peak only"},{...raw,productUrl:raw.productUrl+"-wrong"},
      {...raw,available:false},{...raw,staleSource:true},{...raw,marketEligible:false},
      {...raw,priceCurrency:"PLN"},{...raw,priceCzk:0},
      {...raw,affiliateUrl:raw.affiliateUrl.replace("awinmid=97025","awinmid=0")},
      {...raw,specs:{...raw.specs,currentA:200}},
      {...raw,specs:{...raw.specs,powerW:5120}},
      {...raw,specs:{...raw.specs,bmsContinuousCurrentA:280}},
    ]) assert.equal(documentedBatteryContinuousBmsAmps(refreshCatalogProduct(bad)),null);
  }
});
test("100Ah adequate 1500W scenario ranks cheaper verified battery ahead of 200Ah in real complete market catalog",async()=>{
  for(const locale of ["sk","pl"]){
    const c=await catalog(locale),merchant="padabo_"+locale;
    const small=c.products.find(p=>p.id===ID),large=c.products.find(p=>p.id===LARGE);
    if(c.sources.powerqueen_eu.status!=="ok"||small?.available!==true||large?.available!==true)continue;
    const input=setup(locale);
    const all=recommendProducts(c.products,input,3,c.sources);
    // Compare the actual market catalog, not only a selected pair of products.
    assert.equal(all.battery[0]?.product.id,ID,locale);
    assert.equal(documentedBatteryContinuousBmsAmps(all.battery[0].product),100);
    assert.ok(small.priceCzk<large.priceCzk);
    const ids=["109069","24828","104292_30474","107361","24088_26048"];
    const offers=[small,...ids.map(id=>c.products.find(p=>p.id===merchant+":"+id))];
    if(c.sources[merchant].status!=="ok"||!offers.every(p=>p?.available===true))continue;
    const rec=recommendProducts(offers,input,3,c.sources);
    const plan=buildCaravanBuyerChecklist({coverage:assessRecommendationCoverage(rec,input,locale),
      packages:buildProductPackages(rec,input),recommendations:rec,setup:input,locale});
    assert.equal(plan.readyCount,6,locale+" "+JSON.stringify(plan.rows.map(r=>[r.category,r.missingReason])));
    assert.equal(plan.complete,true);
    const price=caravanBasketPriceSummary(plan,locale);
    assert.equal(price.complete,true);
    assert.deepEqual(price.subtotals.map(r=>r.currency).sort(),locale==="sk"?["EUR"]:["EUR","PLN"]);
    assert.equal(plan.rows.find(r=>r.category==="battery").product.id,ID);
  }
});
