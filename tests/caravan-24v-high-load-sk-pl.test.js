import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { recommendProducts, refreshCatalogProduct } from "../src/products.js";
import { documentedBatteryContinuousBmsAmps } from "../src/caravan-bms-buyer-evidence.js";
import { assessRecommendationCoverage } from "../src/recommendation-coverage.js";
import { buildProductPackages } from "../src/packages.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";
import { caravanBasketPriceSummary } from "../src/caravan-basket-pricing.js";
import { minimumBatteryDischargeAmps } from "../src/battery-discharge-safety.js";

const batteryId="powerqueen_eu:7881294676188";
const setup=(locale,watts)=>({
  locale,systemVoltage:24,batteryType:"lifepo4",batteryAh:200,
  inverterWatts:watts,solarWatts:380,controllerAmps:30,
  charging:{starterVoltage:12,dcDc:{enabled:true,suggestedCurrentAmps:10},shore:{enabled:true,suggestedCurrentAmps:40}},
});
const catalog=async locale=>JSON.parse(await readFile(new URL("../data/products-"+locale+".json",import.meta.url),"utf8"));
test("exact 24V Power Queen model has manufacturer 200A continuous proof, not 400A surge",async()=>{
  for(const locale of ["sk","pl"]){
    const c=await catalog(locale),raw=c.products.find(p=>p.id===batteryId);
    assert.ok(raw,locale);
    if(c.sources.powerqueen_eu.status!=="ok"||raw.available!==true){
      assert.equal(recommendProducts([raw],setup(locale,2000),3,c.sources).battery.length,0);
      continue;
    }
    const p=refreshCatalogProduct(raw);
    assert.equal(documentedBatteryContinuousBmsAmps(p),200,locale);
    assert.equal(p.specs.bmsEvidenceKind,"manufacturer_max_continuous");
    assert.equal(p.specs.bmsManufacturerModel,"Power Queen 24V 200Ah");
    assert.equal(minimumBatteryDischargeAmps(setup(locale,2000)),99);
    assert.equal(recommendProducts([raw],setup(locale,2000),3,c.sources).battery[0]?.product.id,batteryId);
    assert.equal(recommendProducts([raw],setup(locale,4100),3,c.sources).battery.length,0);
    for(const bad of [
      {...raw,name:raw.name.replace("200Ah","100Ah")},
      {...raw,description:"200A charge, 400A peak only"},
      {...raw,productUrl:raw.productUrl+"-wrong"},
      {...raw,available:false},{...raw,staleSource:true},{...raw,priceCurrency:"PLN"},
      {...raw,affiliateUrl:raw.affiliateUrl.replace("awinmid=97025","awinmid=0")},
      {...raw,specs:{...raw.specs,powerW:10240}},
      {...raw,specs:{...raw.specs,bmsContinuousCurrentA:400}},
    ]) assert.equal(documentedBatteryContinuousBmsAmps(refreshCatalogProduct(bad)),null);
  }
});
test("approved SK/PL 24V 1500/2000W variants have exact continuous output and six-category purchase path",async()=>{
  for(const locale of ["sk","pl"]){
    const c=await catalog(locale),merchant="padabo_"+locale;
    const raw=c.products.find(p=>p.id===batteryId);
    for(const [suffix,watts,peak] of [["30474",1500,3000],["30475",2000,4000]]){
      const ids=["109069","24828","104292_"+suffix,"107361","24088_26048"];
      const offers=[raw,...ids.map(id=>c.products.find(p=>p.id===merchant+":"+id))];
      assert.ok(offers.every(Boolean),locale+" missing fixture identity");
      const inverter=offers[3];
      if(c.sources[merchant].status!=="ok"||inverter.available!==true){
        assert.equal(recommendProducts([inverter],setup(locale,watts),3,c.sources).inverter.length,0);
        continue;
      }
      const reviewed=refreshCatalogProduct(inverter);
      assert.equal(reviewed.specs.powerW,watts);
      assert.equal(reviewed.specs.inverterPeakPowerW,peak);
      assert.equal(reviewed.specs.inverterVariantMustBeSelected,true);
      assert.equal(reviewed.specs.inverterManufacturerModel,"DPSI "+(watts===1500?"1524":"2024"));
      assert.equal(recommendProducts([inverter],setup(locale,watts+1),3,c.sources).inverter.length,0);
      const spoof={...inverter,specs:{...inverter.specs,powerW:9999}};
      assert.equal(recommendProducts([spoof],setup(locale,watts),3,c.sources).inverter.length,0);
      if(!offers.every(p=>p.available===true&&p.priceCzk>0)||c.sources.powerqueen_eu.status!=="ok")continue;
      const input=setup(locale,watts);
      const rec=recommendProducts(offers,input,3,c.sources);
      for(const category of ["battery","solar_panel","controller","inverter","dc_charger","shore_charger"])
        assert.equal(rec[category].length,1,locale+" "+watts+" "+category);
      const coverage=assessRecommendationCoverage(rec,input,locale);
      const packages=buildProductPackages(rec,input);
      const plan=buildCaravanBuyerChecklist({coverage,packages,recommendations:rec,setup:input,locale});
      assert.equal(plan.readyCount,6,locale+" "+watts+" "+JSON.stringify(plan.rows.map(r=>[r.category,r.missingReason])));
      assert.equal(plan.complete,true);
      assert.equal(plan.rows.find(r=>r.category==="controller").pvWiringReview?.status,"within_reviewed_limits");
      assert.equal(purchaseReadyCaravanPackages(packages,plan)[0]?.id,"recommended");
      const budget=caravanBasketPriceSummary(plan,locale);
      assert.equal(budget.complete,true);
      assert.deepEqual(budget.subtotals.map(r=>r.currency).sort(),locale==="sk"?["EUR"]:["EUR","PLN"]);
    }
  }
});
