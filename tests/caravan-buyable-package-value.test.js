import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildProductPackages } from "../src/packages.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";
import { recommendProducts } from "../src/products.js";
import { documentedBatteryContinuousBmsAmps } from "../src/caravan-bms-buyer-evidence.js";

const candidate=(id,category,price,score,available=true,fit=1,link=true)=>({
  product:{id,category,name:id,merchant:"fixture",available,priceCurrency:"EUR",priceCzk:price,
    affiliateUrl:link?"https://example.test/product/"+id:null,specs:{}},
  score,fit,
});
const setup=(locale,watts=0)=>({locale,systemVoltage:24,batteryType:"lifepo4",batteryAh:100,
  inverterWatts:watts,solarWatts:380,controllerAmps:30,dailyWh:1500,autonomyDays:1,
  applianceRows:[{ac:true,watts:1000,quantity:1}],charging:{dcDc:{},shore:{}}});
const battery=candidate("battery","battery",400,95),panel=candidate("panel","solar_panel",100,95);
test("all mature markets select actual checkout offers before default, economy and reserve",()=>{
  for(const locale of ["cs","sk","pl"]){
    const unknown=candidate("unconfirmed-best","controller",10,99,null,1);
    const unlinked=candidate("no-link","controller",5,98,true,1,false);
    const strong=candidate("stocked-best","controller",80,90,true,1);
    const value=candidate("stocked-value","controller",40,85,true,1.25);
    const recommendations={battery:[battery],solar_panel:[panel],controller:[unknown,unlinked,strong,value]};
    const input=setup(locale);
    const packages=buildProductPackages(recommendations,input);
    assert.deepEqual(packages.map(x=>x.id),["recommended","economy"]);
    assert.equal(packages[0].items.find(x=>x.category==="controller").product.id,strong.product.id);
    assert.equal(packages[1].items.find(x=>x.category==="controller").product.id,value.product.id);
    assert.equal(packages[0].totalPriceCzk-packages[1].totalPriceCzk,40);
    const plan=buildCaravanBuyerChecklist({coverage:{required:["battery","solar_panel","controller"]},packages,recommendations,setup:input,locale});
    assert.equal(plan.complete,true);
    assert.deepEqual(purchaseReadyCaravanPackages(packages,plan).map(x=>x.id),["recommended","economy"]);
    // No false positive if only technical / unlinked items remain.
    const unavailable={...recommendations,controller:[unknown,unlinked]};
    const technical=buildProductPackages(unavailable,input);
    const held=buildCaravanBuyerChecklist({coverage:{required:["battery","solar_panel","controller"]},packages:technical,recommendations:unavailable,setup:input,locale});
    assert.equal(held.complete,false);
    assert.equal(held.rows.find(x=>x.category==="controller").ready,false);
    assert.deepEqual(purchaseReadyCaravanPackages(technical,held),[]);
  }
});
test("economy and reserve cannot downgrade an available manufacturer-verified BMS to unknown proof",async()=>{
  for(const locale of ["cs","sk","pl"]){
    const path=locale==="cs"?"products.json":"products-"+locale+".json";
    const c=JSON.parse(await readFile(new URL("../data/"+path,import.meta.url),"utf8"));
    const raw=c.products.find(p=>p.id==="powerqueen_eu:7752840380636");
    assert.ok(raw,locale);
    if(c.sources.powerqueen_eu.status!=="ok"||raw.available!==true)continue;
    const input=setup(locale,1500);
    const proven=recommendProducts([raw],input,3,c.sources).battery[0];
    assert.equal(documentedBatteryContinuousBmsAmps(proven?.product),100,locale);
    const unknown=candidate("unknown-cheap","battery",1,99,true,1.25);
    unknown.product.specs={voltageV:24,capacityAh:100,batteryType:"lifepo4"};
    const inverter=candidate("inverter","inverter",300,95);
    const recommendations={battery:[proven,unknown],solar_panel:[panel],controller:[candidate("mppt","controller",100,95)],inverter:[inverter]};
    const packages=buildProductPackages(recommendations,input);
    assert.ok(packages.length);
    for(const v of packages)assert.equal(v.items.find(x=>x.category==="battery").product.id,raw.id);
    // Keep an unknown technical candidate available for the separately
    // disclosed fallback if no reviewed SKU is currently obtainable.
    const noProof=buildProductPackages({...recommendations,battery:[unknown]},input);
    assert.equal(noProof[0].items.find(x=>x.category==="battery").product.id,unknown.product.id);
  }
});
test("all three Builder package and buyer-plan import chains use the same release",async()=>{
  for(const locale of ["cs","sk","pl"]){
    const app=locale==="cs"?"src/app.js":"src/app-"+locale+".js";
    const html=locale==="cs"?"index.html":locale+"/index.html";
    const read=p=>readFile(new URL("../"+p,import.meta.url),"utf8");
    const [a,h,b]=await Promise.all([read(app),read(html),read("src/caravan-buyer-checklist.js")]);
    assert.match(a,/packages\.js\?v=20261121-partial-buyer1-stockvalue1-shorepair1/);
    assert.match(a,/caravan-buyer-checklist\.js\?v=20261122-mppt-cz1-stockvalue1-shorepair1/);
    assert.match(b,/packages\.js\?v=20261121-partial-buyer1-stockvalue1-shorepair1/);
    assert.match(h,/app(?:-sk|-pl)?\.js\?v=[^"]*stockvalue1-carbest1-shorepair1-dcdcvalue1-chargesum3"/);
  }
});
