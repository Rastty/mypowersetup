import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { recommendProducts, refreshCatalogProduct } from "../src/products.js";
import { documentedBatteryContinuousBmsAmps, batteryDischargeBuyerCheck } from "../src/caravan-bms-buyer-evidence.js";
import { minimumBatteryDischargeAmps } from "../src/battery-discharge-safety.js";
import { assessRecommendationCoverage } from "../src/recommendation-coverage.js";
import { buildProductPackages } from "../src/packages.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";
import { caravanBasketPriceSummary } from "../src/caravan-basket-pricing.js";
import { featuredCaravanBasketBudgetMarkup } from "../src/caravan-featured-basket-budget.js";

const ID = "powerqueen_eu:7752838578396";
const MERCHANT_URL = "https://www.ipowerqueen.de/en/products/power-queen-12v-200ah-plus-lifepo4-solar-battery";
const setup = (locale, watts=1000) => ({
  locale, systemVoltage:12, batteryType:"lifepo4", batteryAh:200,
  inverterWatts:watts, solarWatts:380, controllerAmps:30,
  charging: {
    starterVoltage:12,
    dcDc:{enabled:true,suggestedCurrentAmps:30},
    shore:{enabled:true,suggestedCurrentAmps:35}
  }
});
async function catalog(locale) {
  return JSON.parse(await readFile(new URL(`../data/products-${locale}.json`, import.meta.url), "utf8"));
}
function merchantProduct(cat) { return cat.products.find(p=>p.id===ID); }

test("Power Queen 200Ah Plus is the exact approved EU 200A MAX continuous SKU in refreshed SK PL catalogs", async () => {
  for (const locale of ["sk","pl"]) {
    const cat=await catalog(locale), raw=merchantProduct(cat);
    assert.equal(cat.sources.powerqueen_eu.status,"ok");
    assert.ok(raw,locale);
    assert.equal(raw.available,true);
    assert.equal(raw.merchant,"powerqueen_eu");
    assert.equal(raw.category,"battery");
    assert.equal(raw.name,"Power Queen 12V 200Ah Plus LiFePO4 Battery, Built-in 200A BMS");
    assert.equal(raw.productUrl,MERCHANT_URL);
    assert.equal(raw.priceCurrency,"EUR");
    assert.ok(raw.priceCzk>0);
    assert.equal(raw.specs.voltageV,12);
    assert.equal(raw.specs.capacityAh,200);
    assert.equal(raw.specs.currentA,200);
    assert.match(raw.description,/maximum continuous discharge current of 200A/);
    const url=new URL(raw.affiliateUrl);
    assert.equal(url.origin,"https://www.awin1.com");
    assert.equal(url.searchParams.get("awinmid"),"97025");
    assert.equal(url.searchParams.get("awinaffid"),"3044971");
    assert.equal(url.searchParams.get("ued"),MERCHANT_URL);
    const product=refreshCatalogProduct(raw);
    assert.equal(product.specs.bmsContinuousCurrentA,200,locale);
    assert.equal(product.specs.bmsEvidenceKind,"manufacturer_max_continuous");
    assert.equal(product.specs.bmsManufacturerModel,"Power Queen 12V 200Ah Plus");
    assert.equal(product.specs.bmsManufacturerEvidenceUrl,MERCHANT_URL);
    assert.equal(documentedBatteryContinuousBmsAmps(product),200);
    assert.equal(minimumBatteryDischargeAmps(setup(locale)),99);
    assert.match(batteryDischargeBuyerCheck(product,setup(locale),locale),/200 A/);
    assert.equal(recommendProducts([raw],setup(locale),3,cat.sources).battery[0]?.product.id,ID);
    // The manufacturer's 200A MAX CONTINUOUS rating is not limitless.
    assert.equal(minimumBatteryDischargeAmps(setup(locale,2050)),201);
    assert.equal(recommendProducts([raw],setup(locale,2050),3,cat.sources).battery.length,0);
    assert.deepEqual(recommendProducts([raw],setup(locale),3,{powerqueen_eu:{status:"stale"}}).battery,[]);
  }
});

test("lookalike 100A BMS and mutated/unpriced/unavailable SKU or AWIN destination never inherit 200A proof", async () => {
  for (const locale of ["sk","pl"]) {
    const cat=await catalog(locale), raw=merchantProduct(cat);
    const sibling=cat.products.find(p=>p.id==="powerqueen_eu:7752832352476");
    assert.ok(sibling);
    assert.equal(documentedBatteryContinuousBmsAmps(refreshCatalogProduct(sibling)),null);
    const bad=[
      {...raw,id:"powerqueen_eu:wrong"},
      {...raw,merchant:"padabo_pl"},
      {...raw,category:"other"},
      {...raw,name:raw.name.replace("Plus","")},
      {...raw,name:raw.name.replace("200A","100A")},
      {...raw,description:"BMS 200 A peak only"},
      {...raw,productUrl:raw.productUrl+"-standard"},
      {...raw,priceCurrency:"PLN"},
      {...raw,priceCzk:0},
      {...raw,priceCzk:null},
      {...raw,available:false},
      {...raw,staleSource:true},
      {...raw,marketEligible:false},
      {...raw,affiliateUrl:raw.affiliateUrl.replace("awinmid=97025","awinmid=0")},
      {...raw,affiliateUrl:raw.affiliateUrl.replace("awinaffid=3044971","awinaffid=0")},
      {...raw,affiliateUrl:raw.affiliateUrl.replace("ued=","desturl=")},
      {...raw,affiliateUrl:raw.affiliateUrl+"&clickref=fake"},
      {...raw,specs:{...raw.specs,voltageV:24}},
      {...raw,specs:{...raw.specs,capacityAh:100}},
      {...raw,specs:{...raw.specs,currentA:100}},
      {...raw,specs:{...raw.specs,powerW:5120}},
      {...raw,specs:{...raw.specs,bmsContinuousCurrentA:100}},
    ];
    for (const item of bad) {
      assert.equal(documentedBatteryContinuousBmsAmps(refreshCatalogProduct(item)),null,locale+" "+item.name+" "+item.id);
    }
    const tampered=refreshCatalogProduct(raw);
    assert.equal(documentedBatteryContinuousBmsAmps({
      ...tampered,specs:{...tampered.specs,bmsEvidenceKind:"manufacturer_recommended_sustained"}
    }),null);
    assert.equal(documentedBatteryContinuousBmsAmps({
      ...tampered,specs:{...tampered.specs,bmsManufacturerEvidenceUrl:"https://fake.example/model"}
    }),null);
  }
});

test("real approved SK/PL 1000W 12V caravan builds have six buyable categories without assuming currency conversion", async () => {
  const ids=["109069","24828","104292_30467","26963_28360","24087_26042"];
  const required=["battery","solar_panel","controller","inverter","dc_charger","shore_charger"];
  for (const locale of ["sk","pl"]) {
    const cat=await catalog(locale),merchant="padabo_"+locale;
    const offers=[merchantProduct(cat),...ids.map(sku=>cat.products.find(p=>p.id===merchant+":"+sku))];
    const input=setup(locale);
    if(cat.sources[merchant].status==="stale") {
      assert.ok(offers.slice(1).every(p=>p?.available===false&&p.staleSource===true),locale+" stale Padabo");
      const held=recommendProducts(offers,input,3,cat.sources);
      assert.equal(held.battery[0]?.product.id,ID,locale+" manufacturer Power Queen still approved");
      for(const category of ["solar_panel","controller","inverter","dc_charger","shore_charger"])
        assert.equal(held[category].length,0,locale+" "+category+" withheld");
      continue;
    }
    assert.equal(cat.sources[merchant].status,"ok");
    assert.ok(offers.every(p=>p?.available===true&&p.priceCzk>0),locale+" exact shopping SKUs");
    const rec=recommendProducts(offers,input,3,cat.sources);
    for (const category of required) assert.equal(rec[category].length,1,locale+" "+category);
    assert.equal(rec.inverter[0].product.specs.powerW,1000,locale);
    assert.equal(documentedBatteryContinuousBmsAmps(rec.battery[0].product),200,locale);
    const coverage=assessRecommendationCoverage(rec,input,locale);
    assert.equal(coverage.complete,true,locale);
    const packages=buildProductPackages(rec,input);
    const plan=buildCaravanBuyerChecklist({coverage,packages,recommendations:rec,setup:input,locale});
    assert.equal(plan.complete,true,locale+" "+JSON.stringify(plan.rows.map(x=>[x.category,x.ready,x.missingReason])));
    assert.equal(plan.readyCount,6);
    assert.equal(plan.rows.find(x=>x.category==="controller").pvWiringReview?.status,"within_reviewed_limits");
    assert.equal(purchaseReadyCaravanPackages(packages,plan)[0]?.id,"recommended",locale);
    const budget=caravanBasketPriceSummary(plan,locale);
    assert.equal(budget.complete,true);
    assert.equal(budget.priced,6);
    assert.deepEqual(budget.subtotals.map(x=>x.currency).sort(),
      locale==="sk"?["EUR"]:["EUR","PLN"],locale);
    assert.ok(budget.subtotals.every(x=>x.amount>0));
    const preview=featuredCaravanBasketBudgetMarkup(plan,locale,
      (id)=>id==="powerqueen_eu"?"Power Queen":id);
    assert.match(preview,/data-budget-completeness="selected-products"/);
    assert.ok(!preview.includes("NaN"));
    assert.ok(!preview.includes("USD"));
  }
});

test("SK/PL pages version both refreshed manufacturer BMS evidence chains; CZ remains unchanged",async()=>{
  const read=(path)=>readFile(new URL("../"+path,import.meta.url),"utf8");
  const [products,evidence,readiness,czech,csPage]=await Promise.all([
    read("src/products.js"),read("src/caravan-bms-buyer-evidence.js"),
    read("src/caravan-package-readiness.js"),read("src/app.js"),read("index.html")
  ]);
  assert.ok(products.includes("caravan-bms-manufacturer-proof.js?v=20261122-pq200a1"));
  assert.ok(products.includes("caravan-bms-buyer-evidence.js?v=20261122-pq200a1"));
  assert.ok(evidence.includes("caravan-bms-manufacturer-proof.js?v=20261122-pq200a1"));
  assert.ok(readiness.includes("caravan-bms-buyer-evidence.js?v=20261122-pq200a1"));
  assert.ok(czech.includes("products.js?v=20261122-legacy70a"));
  assert.ok(csPage.includes("app.js?v=20261122-shore-mca1"));
  for (const locale of ["sk","pl"]) {
    const [app,page]=await Promise.all([read("src/app-"+locale+".js"),read(locale+"/index.html")]);
    assert.ok(app.includes("products.js?v=20261122-legacy70a-dpsi1-pq200a1"),locale);
    assert.ok(app.includes("caravan-package-readiness.js?v=20261122-pq200a1"),locale);
    assert.ok(page.includes("dpsi1-pq200a1"),locale);
  }
});
