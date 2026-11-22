import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { selectFeaturedOffers } from "../src/featured-core-offers.js";

const CATEGORIES = ["battery","solar_panel","controller","inverter","dc_charger","shore_charger"];
function setup() {
  const recommendations = Object.fromEntries(CATEGORIES.map(category => [
    category, [{
      product: {
        id:"approved:"+category, merchant:"approved", available:true,
        category, priceCurrency:"CZK", priceCzk:1000,
        affiliateUrl:"https://ehub.cz/system/scripts/click.php?a_aid=approved&a_bid=verified&desturl="+encodeURIComponent("https://seller.example/"+category)
      },
      score:90,fit:1,
    }],
  ]));
  const rows=CATEGORIES.map(category => ({
    category,product:recommendations[category][0].product,ready:true,
  }));
  return { recommendations, buyerPlan:{rows,complete:true,readyCount:6} };
}

test("result-first offer grid includes both requested charging sources after the four core components", () => {
  const {recommendations,buyerPlan}=setup();
  const shown=selectFeaturedOffers(recommendations,[],6,buyerPlan);
  assert.equal(shown.length,6);
  assert.deepEqual(shown.map(x=>x.category),CATEGORIES);
  assert.deepEqual(shown.map(x=>x.product.id),CATEGORIES.map(x=>"approved:"+x));
  assert.equal(selectFeaturedOffers(recommendations,[],4,buyerPlan).length,4,
    "presentation expansion is opt-in; existing consumers keep original default");
});

test("extra charging offers are never showcased without an actually buyable confirmed-stock buyer row",()=>{
  const {recommendations,buyerPlan}=setup();
  buyerPlan.rows.find(r=>r.category==="dc_charger").ready=false;
  buyerPlan.rows.find(r=>r.category==="dc_charger").product=null;
  assert.deepEqual(selectFeaturedOffers(recommendations,[],6,buyerPlan).map(x=>x.category),
    ["battery","solar_panel","controller","inverter","shore_charger"]);

  const shore=recommendations.shore_charger[0];
  shore.product.available=false;
  assert.equal(selectFeaturedOffers(recommendations,[],6,buyerPlan).length,4);
  shore.product.available=true;shore.staleSource=true;
  assert.equal(selectFeaturedOffers(recommendations,[],6,buyerPlan).length,4);
});

test("CZ SK PL calculators display all six when required and cache-bust only their frontend entrypoints",async()=>{
  for(const [app,page,call] of [
    ["app.js","index.html","featuredCzechProducts(recommendations, packages, 6, buyerPlan)"],
    ["app-sk.js","sk/index.html","selectFeaturedOffers(recommendations, packages, 6, buyerPlan)"],
    ["app-pl.js","pl/index.html","selectFeaturedOffers(recommendations, packages, 6, buyerPlan)"],
  ]){
    const js=await readFile(new URL("../src/"+app,import.meta.url),"utf8");
    const html=await readFile(new URL("../"+page,import.meta.url),"utf8");
    assert.ok(js.includes(call),app);
    assert.ok(html.includes("/src/"+app+"?v=20261122-shore-mca1-result-scroll1-cz-mca1-superpack-cz1-orion-cz1-mppt-cz1-featured6-budget-preview1-legacy70a-ehubsrc1"),page);
    assert.ok(js.includes('data-source="result-featured"'),app);
  }
});
