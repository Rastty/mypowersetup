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
  assert.ok(html.includes("5/6 kategorií"));
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
  assert.match(html,/zł/);
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
    assert.ok(script.includes('featuredCaravanBasketBudgetMarkup(buyerPlan, "'+locale+'", merchantLabel)'),app);
    assert.ok(script.includes('caravan-featured-basket-budget.js?v=20261122-merchant-preview1'),app);
    assert.ok(html.includes('caravan-featured-basket-budget.css?v=20261122-merchant-preview1'),htmlPath);
    assert.ok(html.includes(app+'?v=20261122-shore-mca1-result-scroll1-cz-mca1-superpack-cz1-orion-cz1-mppt-cz1-featured6-budget-preview1-legacy70a-ehubsrc1-merchant-count1-unpriced1-bmslabels1-shopbreakdown1'),htmlPath);
  }
});


test("upfront checkout transparency counts only eligible merchant groups without altering price or stock truth", () => {
  const plan=build("CZK",500);
  plan.rows[0].product.merchant="shop-a";
  plan.rows[1].product.merchant="shop-a";
  plan.rows[2].product.merchant="shop-b";
  plan.rows[4].product.merchant="shop-a";
  plan.rows[5].product.merchant="shop-a";
  plan.rows[3].ready=false;
  plan.rows[3].product=null;
  plan.complete=false;
  const total=caravanBasketPriceSummary(plan,"cs");
  assert.equal(total.unavailable,1);
  assert.equal(total.subtotals[0].amount,3000);
  const html=featuredCaravanBasketBudgetMarkup(plan,"cs");
  assert.match(html,/2 obchody pro vybrané položky/);
  assert.match(html,/samostatné nákupy/);
  assert.ok(html.includes("5/6 kategorií"));
  assert.match(html,/data-budget-completeness="partial"/);
  assert.ok(!html.includes("shop-a") && !html.includes("shop-b"),"no raw merchant tracking IDs appear in preview");
  const sk=build("EUR",100);
  sk.rows[0].product.merchant="shop-b";
  assert.match(featuredCaravanBasketBudgetMarkup(sk,"sk"),/2 obchody pre vybrané položky/);
  const pl=build("PLN",100);
  pl.rows[0].product.merchant="shop-b";
  assert.match(featuredCaravanBasketBudgetMarkup(pl,"pl"),/2 sklepy z wybranymi produktami/);
});

test("buyers see a purchase-ready fallback when all local prices are unknown, never a fake subtotal", () => {
  for (const [locale,currency,copy] of [
    ["cs","CZK","Ceny ověřte v obchodech"],
    ["sk","EUR","Ceny overte v obchodoch"],
    ["pl","PLN","Sprawdź ceny w sklepach"],
  ]) {
    const plan=build(currency,null);
    plan.rows[0].product.merchant="shop-a";
    const html=featuredCaravanBasketBudgetMarkup(plan,locale);
    assert.match(html,/data-budget-completeness="unpriced"/);
    assert.ok(html.includes(copy),locale);
    assert.ok(html.includes("6/6"),locale);
    assert.ok(!html.includes("NaN"),locale);
    assert.ok(!html.includes("0,00"),locale);
    assert.ok(!html.includes("selected-products"),locale);
    assert.ok(!html.includes("Součet známých cen"),locale);
    assert.ok(html.includes(locale==="pl"?"2 sklepy":locale==="sk"?"2 obchody":"2 obchody"),locale);
  }
});

test("unpriced fallback keeps partial/missing distinction and rejects rows without checkout routes", () => {
  const plan=build("PLN",null);
  plan.rows[2]={category:"controller",ready:false,product:null};
  plan.rows[3].product.priceCurrency="USD";
  plan.complete=false;
  const html=featuredCaravanBasketBudgetMarkup(plan,"pl");
  assert.match(html,/data-budget-completeness="unpriced"/);
  assert.match(html,/5\/6 kategorii/);
  assert.match(html,/1 brakujących/);
  assert.match(html,/5 bez sprawdzonej ceny/);
  assert.ok(!html.includes("USD") && !html.includes("0,00 zł"));
  const broken=build("CZK",null);
  for (const row of broken.rows) row.product.affiliateUrl="";
  assert.equal(featuredCaravanBasketBudgetMarkup(broken,"cs"),"");
  assert.equal(featuredCaravanBasketBudgetMarkup(broken,"invalid"),"");
});

test("result-first multi-merchant checkout preview reuses verified store subtotals and never mixes currencies", () => {
  const plan=build("PLN",100);
  plan.rows[0].product.merchant="verified-a";
  plan.rows[1].product.merchant="verified-a";
  plan.rows[1].quantity=2;
  plan.rows[2].product.merchant="verified-b";
  plan.rows[2].product.priceCurrency="EUR";
  plan.rows[2].product.priceCzk=80;
  plan.rows[3].product.merchant="verified-b";
  plan.rows[3].product.priceCzk=null;
  const labels=(id)=>({"verified-a":"Sklep A","verified-b":"Sklep B"})[id]||id;
  const html=featuredCaravanBasketBudgetMarkup(plan,"pl",labels);
  assert.match(html,/featured-basket-merchants/);
  assert.match(html,/Sklep A/);
  assert.match(html,/Sklep B/);
  assert.match(html,/2 produkty/);
  assert.match(html,/zł/);
  assert.match(html,/EUR|€/);
  assert.match(html,/1 bez ceny/);
  assert.ok(!html.includes("verified-a") && !html.includes("verified-b"));
  assert.ok(!html.includes("NaN") && !html.includes("USD"));
  assert.equal((html.match(/role="listitem"/g)||[]).length,2);
  assert.equal(caravanBasketPriceSummary(plan,"pl").subtotals.length,2);
});

test("one-store offer remains concise, unknown store IDs are masked, and translated labels escape HTML", () => {
  const single=build("CZK",1000);
  assert.doesNotMatch(featuredCaravanBasketBudgetMarkup(single,"cs"),/featured-basket-merchants/);
  const plan=build("EUR",null);
  plan.rows[0].product.merchant="unknown-shop";
  const html=featuredCaravanBasketBudgetMarkup(plan,"sk",(id)=>id);
  assert.match(html,/Obchod 1/);
  assert.match(html,/2 obchody/);
  assert.doesNotMatch(html,/unknown-shop/);
  assert.match(html,/cena u predajcu/);
  assert.ok(!html.includes("0,00"));
  const named=featuredCaravanBasketBudgetMarkup(plan,"sk",
    (id)=>id==="unknown-shop" ? '<img src=x onerror=alert(1)>' : "Overený obchod");
  assert.ok(named.includes("&lt;img"));
  assert.ok(!named.includes("<img"));
});
