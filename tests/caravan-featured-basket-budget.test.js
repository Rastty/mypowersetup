import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { caravanBasketPriceSummary } from "../src/caravan-basket-pricing.js";
import { featuredCaravanBasketBudgetMarkup } from "../src/caravan-featured-basket-budget.js";

const CATEGORIES = ["battery","solar_panel","controller","inverter","dc_charger","shore_charger"];
function ready(id,currency,price,quantity=1){
  return {
    category:id,ready:true,quantity,
    product:{id:"seller:"+id,merchant:"seller",priceCurrency:currency,priceCzk:price,
      affiliateUrl:"https://ehub.cz/system/scripts/click.php?a_aid=approved&a_bid=verified&desturl="+encodeURIComponent("https://seller.example/"+id)},
  };
}
const build=(currency,price)=>({
  rows:CATEGORIES.map(cat=>ready(cat,currency,price,cat==="solar_panel"?2:1)),
  complete:true,manualDesign:false,
});

test("upfront CZ and SK totals match the existing real basket calculation, include panel quantity and exclude installation",()=>{
  for(const [locale,currency,expected] of [["cs","CZK","7"],["sk","EUR","7"]]){
    const plan=build(currency,1000);
    const summary=caravanBasketPriceSummary(plan,locale);
    assert.equal(summary.complete,true);
    assert.deepEqual(summary.subtotals,[{currency,amount:7000}]);
    const html=featuredCaravanBasketBudgetMarkup(plan,locale);
    assert.match(html,/data-budget-completeness="selected-products"/);
    assert.ok(html.includes("7"),locale);
    assert.ok(html.includes(expected),locale);
    assert.match(html,/6\/6/);
    assert.ok(!html.includes("NaN"));
    assert.ok(!html.includes("undefined"));
    assert.ok(html.includes(locale==="cs"?"jištění":"istenia"));
  }
});

test("incomplete CZ list never presents a partial amount as a full basket",()=>{
  const plan=build("CZK",1000);
  plan.rows[4]={category:"dc_charger",ready:false,product:null};
  plan.rows[5]=ready("shore_charger","CZK",null);
  plan.complete=false;
  const html=featuredCaravanBasketBudgetMarkup(plan,"cs");
  assert.match(html,/data-budget-completeness="partial"/);
  assert.match(html,/Součet známých cen dostupných položek/);
  assert.match(html,/5\/6 kategorií/);
  assert.match(html,/1 chybí/);
  assert.match(html,/1 bez ověřitelné ceny/);
  assert.ok(!html.includes("Orientační součet vybraných produktů"));
});

test("PL prices in PLN and EUR stay separated; USD or no price never becomes a fake local total",()=>{
  const plan=build("PLN",100);
  plan.rows[0]=ready("battery","EUR",200);
  plan.rows[3]=ready("inverter","USD",500);
  plan.complete=true;
  const html=featuredCaravanBasketBudgetMarkup(plan,"pl");
  const totals=caravanBasketPriceSummary(plan,"pl");
  assert.equal(totals.unpriced,1);
  assert.equal(totals.complete,false);
  assert.match(html,/data-budget-completeness="partial"/);
  assert.match(html,/PLN/);
  assert.match(html,/EUR|€/);
  assert.match(html,/bez sprawdzonej ceny/);
  assert.ok(!html.includes("USD"));
  assert.equal(featuredCaravanBasketBudgetMarkup({rows:[{category:"battery",ready:false,product:null}],complete:false},"pl"),"");
  assert.equal(featuredCaravanBasketBudgetMarkup(plan,"xx"),"");
});

test("result-first budget UI is present only in CZ SK PL and versioned in both markup and imports",async()=>{
  for(const [app,htmlPath,locale] of [
    ["app.js","index.html","cs"],["app-sk.js","sk/index.html","sk"],["app-pl.js","pl/index.html","pl"]]){
    const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
    const [script,html]=await Promise.all([read("src/"+app),read(htmlPath)]);
    assert.ok(script.includes('featuredCaravanBasketBudgetMarkup(buyerPlan, "'+locale+'")'),app);
    assert.ok(script.includes('caravan-featured-basket-budget.js?v=20261122-budget-preview1'),app);
    assert.ok(html.includes('caravan-featured-basket-budget.css?v=20261122-budget-preview1'),htmlPath);
    assert.ok(html.includes(app+'?v=20261122-shore-mca1-result-scroll1-cz-mca1-superpack-cz1-orion-cz1-mppt-cz1-featured6-budget-preview1'),htmlPath);
  }
});
