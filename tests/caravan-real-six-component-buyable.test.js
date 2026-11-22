import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { recommendProducts } from "../src/products.js";
import { assessRecommendationCoverage } from "../src/recommendation-coverage.js";
import { buildProductPackages } from "../src/packages.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";
import { caravanBasketPriceSummary } from "../src/caravan-basket-pricing.js";
import { featuredCaravanBasketBudgetMarkup } from "../src/caravan-featured-basket-budget.js";
import { documentedBatteryContinuousBmsAmps } from "../src/caravan-bms-buyer-evidence.js";

const cases=[
  {
    voltage:12,starter:12,dc:30,shore:15,
    parts:{
      battery:"svetkaravanu:107356_32721",
      solar_panel:"svetkaravanu:109069",
      controller:"svetkaravanu:24828",
      inverter:"svetkaravanu:104878_31001",
      dc_charger:"svetkaravanu:26963_28360",
      shore_charger:"svetkaravanu:24087_26040",
    },
  },
  {
    voltage:24,starter:12,dc:10,shore:40,
    parts:{
      battery:"svetkaravanu:107358",
      solar_panel:"svetkaravanu:109069",
      controller:"svetkaravanu:24828",
      inverter:"solarimport:E6723",
      dc_charger:"svetkaravanu:107361",
      shore_charger:"svetkaravanu:24088_26048",
    },
  },
];

test("real current approved catalog supports two 6-component 12/24V source-priced, BMS/MPPT-safe caravan purchases",async()=>{
  const catalog=JSON.parse(await readFile(new URL("../data/products.json",import.meta.url),"utf8"));
  assert.equal(catalog.sources.svetkaravanu.status,"ok");
  assert.equal(catalog.sources.solarimport.status,"ok");
  const order=["battery","solar_panel","controller","inverter","dc_charger","shore_charger"];
  for(const fixture of cases) {
    const source=order.map(category=>{
      const p=catalog.products.find(row=>row.id===fixture.parts[category]);
      assert.ok(p,fixture.voltage+"V missing "+category);
      assert.equal(p.category,category);
      assert.equal(p.available,true);
      assert.equal(p.priceCurrency,"CZK");
      assert.ok(p.priceCzk>0);
      assert.equal(p.affiliateUrl?.startsWith("https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid="),true);
      return p;
    });
    const setup={
      locale:"cs",systemVoltage:fixture.voltage,batteryType:"lifepo4",batteryAh:100,
      solarWatts:380,controllerAmps:30,inverterWatts:300,
      charging:{
        starterVoltage:fixture.starter,
        dcDc:{enabled:true,suggestedCurrentAmps:fixture.dc},
        shore:{enabled:true,suggestedCurrentAmps:fixture.shore}
      },
    };
    const rec=recommendProducts(source,setup,4,catalog.sources);
    for(const category of order)assert.equal(rec[category].length,1,fixture.voltage+"V "+category);
    assert.equal(documentedBatteryContinuousBmsAmps(rec.battery[0].product),50);
    const coverage=assessRecommendationCoverage(rec,setup,"cs");
    assert.equal(coverage.complete,true);
    assert.equal(coverage.required.length,6);
    const packages=buildProductPackages(rec,setup);
    const plan=buildCaravanBuyerChecklist({coverage,packages,recommendations:rec,setup,locale:"cs"});
    assert.equal(plan.readyCount,6,fixture.voltage+"V "+JSON.stringify(plan.rows));
    assert.equal(plan.complete,true,fixture.voltage+"V");
    assert.equal(plan.rows.find(p=>p.category==="solar_panel").quantity,2);
    assert.equal(plan.rows.find(p=>p.category==="controller").pvWiringReview?.status,"within_reviewed_limits");
    assert.equal(purchaseReadyCaravanPackages(packages,plan)[0]?.id,"recommended");
    const price=caravanBasketPriceSummary(plan,"cs");
    assert.equal(price.complete,true);
    assert.equal(price.priced,6);
    assert.equal(price.subtotals.length,1);
    assert.equal(price.subtotals[0].currency,"CZK");
    assert.ok(price.subtotals[0].amount>0);
    const preview=featuredCaravanBasketBudgetMarkup(plan,"cs");
    assert.ok(preview.includes('data-budget-completeness="selected-products"'));
    assert.match(preview,/6\/6 kategorií/);
    assert.match(preview,/kabeláže, jištění a montáže/);
    assert.ok(!preview.includes("NaN"));
    // A stale source may not promote any part of this as a checkout-ready plan.
    const stale={...catalog.sources,svetkaravanu:{status:"stale"}};
    assert.equal(recommendProducts(source,setup,4,stale).battery.length,0);
  }
});
