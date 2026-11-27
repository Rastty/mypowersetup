import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { recommendProducts, refreshCatalogProduct } from "../src/products.js";
import { documentedBatteryContinuousBmsAmps } from "../src/caravan-bms-buyer-evidence.js";
import { czechInverterVariantNote, czechProductDecisionFacts } from "../src/product-decision-facts.js";
import { buildProductPackages } from "../src/packages.js";
import { assessRecommendationCoverage } from "../src/recommendation-coverage.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { caravanBasketPriceSummary, caravanLinePrice } from "../src/caravan-basket-pricing.js";
import { czechProductPrice } from "../src/cz-offer-presentation.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";

const catalog = async () => JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
const setup = (watts, ah, voltage=24) => ({ locale:"cs",systemVoltage:voltage,batteryType:"lifepo4",
  batteryAh:ah,inverterWatts:watts,solarWatts:380,controllerAmps:30,dailyWh:1500,autonomyDays:1,
  applianceRows:[{ac:true,watts:1000,quantity:1}],
  charging:{starterVoltage:12,dcDc:{enabled:true,suggestedCurrentAmps:10},shore:{enabled:true,suggestedCurrentAmps:40}},
});
const cases=[["30466",12,600,1200,"612"],["30467",12,1000,2000,"1012"],["30472",24,600,1200,"624"],["30473",24,1000,2000,"1024"],["30474",24,1500,3000,"1524"],["30475",24,2000,4000,"2024"]];
test("six exact CZ Dometic variants prove continuous power and warn about shared merchant parent URL",async()=>{
  const c=await catalog();
  for(const [suffix,volts,watts,peak,model] of cases){
    const id="svetkaravanu:104292_"+suffix,raw=c.products.find(p=>p.id===id);
    assert.ok(raw,id);
    if(c.sources.svetkaravanu.status!=="ok"||raw.available!==true){
      assert.equal(recommendProducts([raw],setup(watts,100,volts),3,c.sources).inverter.length,0);
      continue;
    }
    const p=refreshCatalogProduct(raw);
    assert.equal(p.specs.powerW,watts,id);
    assert.equal(p.specs.inverterPeakPowerW,peak,id);
    assert.equal(p.specs.inverterManufacturerModel,"DPSI "+model,id);
    assert.equal(p.specs.inverterVariantMustBeSelected,true,id);
    assert.equal(czechInverterVariantNote(p),"Před objednáním v obchodě zvolte přesně variantu DPSI "+model+" · "+watts+" W trvale · "+volts+" V.");
    assert.equal(recommendProducts([raw],setup(watts,100,volts),3,c.sources).inverter[0]?.product.id,id);
    assert.equal(recommendProducts([raw],setup(watts+1,100,volts),3,c.sources).inverter.length,0);
    for(const bad of [{...raw,affiliateUrl:raw.affiliateUrl.replace("38137ac4","00000000")},
      {...raw,productUrl:raw.productUrl+"wrong"},{...raw,available:false},{...raw,priceCurrency:"EUR"},
      {...raw,staleSource:true},{...raw,name:raw.name+" wrong"},{...raw,specs:{...raw.specs,powerW:9999}}]){
      assert.equal(recommendProducts([bad],setup(watts,100,volts),3,c.sources).inverter.length,0,id);
    }
  }
});
test("CZ 24V 100/200Ah high-load six-category baskets preserve foreign price suppression",async()=>{
  const c=await catalog();
  for(const [ah,watts,sku,amps] of [[100,1500,"30474",100],[200,2000,"30475",200]]){
    const battery=c.products.find(p=>p.id==="powerqueen_eu:"+(ah===100?"7752840380636":"7881294676188"));
    const ids=["109069","24828","104292_"+sku,"107361","24088_26048"];
    const offers=[battery,...ids.map(id=>c.products.find(p=>p.id==="svetkaravanu:"+id))];
    assert.ok(offers.every(Boolean));
    const input=setup(watts,ah);
    if(c.sources.svetkaravanu.status!=="ok"||c.sources.powerqueen_eu.status!=="ok"||!offers.every(p=>p.available===true))continue;
    const rec=recommendProducts(offers,input,3,c.sources);
    for(const cat of ["battery","solar_panel","controller","inverter","dc_charger","shore_charger"])assert.equal(rec[cat].length,1,cat);
    assert.equal(documentedBatteryContinuousBmsAmps(rec.battery[0].product),amps);
    assert.ok(czechProductDecisionFacts(rec.battery[0].product,input).some(f=>f.label.includes("Maximální trvalý")&&f.value===amps+" A"));
    const packages=buildProductPackages(rec,input);
    const plan=buildCaravanBuyerChecklist({coverage:assessRecommendationCoverage(rec,input,"cs"),packages,recommendations:rec,setup:input,locale:"cs"});
    assert.equal(plan.readyCount,6,JSON.stringify(plan.rows.map(r=>[r.category,r.missingReason])));
    assert.equal(plan.complete,true);
    assert.equal(plan.rows.find(r=>r.category==="controller").pvWiringReview?.status,"within_reviewed_limits");
    assert.equal(purchaseReadyCaravanPackages(packages,plan)[0]?.id,"recommended");
    const budget=caravanBasketPriceSummary(plan,"cs");
    assert.equal(budget.complete,false);
    assert.equal(budget.priced,5);
    assert.equal(budget.unpriced,1);
    assert.deepEqual(budget.subtotals.map(r=>r.currency),["CZK"]);
    assert.equal(czechProductPrice(battery),null);
    assert.equal(caravanLinePrice(plan.rows.find(r=>r.category==="battery"),"cs"),null);
    const all=recommendProducts(c.products,input,24,c.sources);
    assert.ok(all.battery.some(r=>r.product.id===battery.id));
  }
});
test("CZ Builder publishes refreshed evidence chain and warning beside every purchase surface",async()=>{
  const read=p=>readFile(new URL("../"+p,import.meta.url),"utf8");
  const [app,html,products,facts]=await Promise.all(["src/app.js","index.html","src/products.js","src/product-decision-facts.js"].map(read));
  assert.match(html,/app\.js\?v=[^"]*24vhigh1-pq100a1-cz1-value1-stockvalue1"/);
  assert.match(app,/products\.js\?v=[^"]*24vhigh1-pq100a1-cz1-value1"/);
  assert.match(products,/dometic-dpsi-inverter-profiles\.js\?v=[^"]*cz1"/);
  assert.match(facts,/caravan-bms-buyer-evidence\.js\?v=[^"]*pq100a1-cz1"/);
  assert.match(app,/data-inverter-variant-selection/);
  assert.equal((app.match(/czechInverterVariantMarkup\(product\)/g)||[]).length,5);
  assert.equal(czechInverterVariantNote({category:"battery",specs:{}}),null);
});
