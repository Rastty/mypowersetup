import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { recommendProducts, refreshCatalogProduct } from "../src/products.js";
import { buildProductPackages } from "../src/packages.js";
import { assessRecommendationCoverage } from "../src/recommendation-coverage.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { caravanBasketPriceSummary } from "../src/caravan-basket-pricing.js";
const catalog=async()=>JSON.parse(await readFile(new URL("../data/products.json",import.meta.url),"utf8"));
const setup=(watts=1500,volts=24,amps=40,ah=100)=>({
  locale:"cs",systemVoltage:volts,batteryType:"lifepo4",batteryAh:ah,inverterWatts:watts,
  dailyWh:1500,autonomyDays:1,applianceRows:[{ac:true,watts:1000,quantity:1}],
  solarWatts:380,controllerAmps:30,charging:{starterVoltage:12,
    dcDc:{enabled:true,suggestedCurrentAmps:10},shore:{enabled:true,suggestedCurrentAmps:amps}},
});
test("NOCO voltage-dependent current is selected at matching voltage and never misquoted at 24V",async()=>{
  const c=await catalog();
  for(const [id,a12,a24] of [["E8066",25,12.5],["E8067",50,25]]){
    const p=c.products.find(p=>p.id==="batterycz:"+id);
    assert.ok(p,id);
    if(c.sources.batterycz.status!=="ok"||p.available!==true)continue;
    const profile=refreshCatalogProduct(p);
    assert.deepEqual(profile.specs.chargingCurrentABySystemVoltage,{12:a12,24:a24});
    for(const [v,a] of [[12,a12],[24,a24]]){
      const rec=recommendProducts([p],setup(600,v,a),3,c.sources).shore_charger;
      assert.equal(rec[0]?.product.specs.currentA,a,id+" "+v);
      assert.ok(rec[0].checks.some(x=>x.includes(a+" A")));
      assert.equal(recommendProducts([p],setup(600,v,a+0.1),3,c.sources).shore_charger.length,0);
    }
    for(const bad of [{...p,description:"NOCO 50A 24V"},
      {...p,affiliateUrl:p.affiliateUrl.replace("7095cb16","00000000")},
      {...p,available:false},{...p,staleSource:true},{...p,priceCurrency:"EUR"},
      {...p,specs:{...p.specs,currentA:999}}]){
      assert.equal(recommendProducts([bad],setup(600,24,10),3,c.sources).shore_charger.length,0,id);
    }
  }
});
test("exact CZ ROGERELE 1500/2000W offers are manufacturer-backed value alternatives and not peak-rated",async()=>{
  const c=await catalog();
  for(const [id,watts,suffix,ah] of [["E7934",1500,"30474",100],["E7935",2000,"30475",200]]){
    const p=c.products.find(p=>p.id==="solarimport:"+id);
    const premium=c.products.find(p=>p.id==="svetkaravanu:104292_"+suffix);
    // Product assortment may change; a missing SKU must not be manufactured.
    if(!p||c.sources.solarimport.status!=="ok"||p.available!==true)continue;
    const reviewed=refreshCatalogProduct(p);
    assert.equal(reviewed.specs.inverterManufacturerModel,"REP"+watts+"-24");
    assert.equal(reviewed.specs.powerW,watts);
    assert.equal(reviewed.specs.inverterPeakPowerW,watts*2);
    assert.equal(recommendProducts([p],setup(watts+1),3,c.sources).inverter.length,0);
    assert.equal(recommendProducts([{...p,affiliateUrl:p.affiliateUrl.replace("35cb7fb0","00000000")}],setup(watts),3,c.sources).inverter.length,0);
    assert.equal(recommendProducts([{...p,specs:{...p.specs,powerW:watts*2}}],setup(watts),3,c.sources).inverter.length,0);
    if(!premium||premium.available!==true||c.sources.svetkaravanu.status!=="ok")continue;
    const input=setup(watts,24,40,ah);
    const ids=["svetkaravanu:109069","svetkaravanu:24828","svetkaravanu:107361","svetkaravanu:24088_26048","powerqueen_eu:"+(ah===100?"7752840380636":"7881294676188")];
    const other=ids.map(id=>c.products.find(x=>x.id===id));
    if(!other.every(x=>x?.available===true)||c.sources.powerqueen_eu.status!=="ok")continue;
    const full=recommendProducts(c.products,input,24,c.sources);
    assert.ok(full.inverter.some(x=>x.product.id===p.id),"actual catalog contains reviewed value option");
    const planFor=offers=>{
      const rec=recommendProducts(offers,input,24,c.sources),packages=buildProductPackages(rec,input);
      return buildCaravanBuyerChecklist({coverage:assessRecommendationCoverage(rec,input,"cs"),packages,recommendations:rec,setup:input,locale:"cs"});
    };
    const plan=planFor([...other,p,premium]),reference=planFor([...other,premium]);
    assert.equal(plan.readyCount,6);
    assert.equal(plan.rows.find(x=>x.category==="inverter").product.id,p.id);
    assert.equal(reference.readyCount,6);
    const amount=x=>caravanBasketPriceSummary(x,"cs").subtotals.find(t=>t.currency==="CZK").amount;
    assert.equal(amount(reference)-amount(plan),premium.priceCzk-p.priceCzk);
    assert.ok(amount(plan)<amount(reference));
  }
});
