import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { selectedSolarArrayWatts, controllerNominalPvWatts, caravanPvNominalReview } from "../src/caravan-pv-array-review.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";
import { renderLocalizedCaravanBuyerPlan } from "../src/caravan-buyer-plan-localized.js";

const setup = {locale:"cs",systemVoltage:12,batteryAh:180,solarWatts:400,controllerAmps:35,inverterWatts:0,charging:{}};
const make = (category,id,specs,quantity=1) => ({
  id, merchant:"solarimport", category, specs, available:true,
  recommendedQuantity:quantity, name:id, priceCzk:5000, priceCurrency:"CZK",
  affiliateUrl:"https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=35cb7fb0&desturl=https%3A%2F%2Fwww.solar-import.cz%2F",
});
const panel=make("solar_panel","solarimport:panel",{powerW:200},3);
const batt=make("battery","solarimport:battery",{voltageV:12,capacityAh:200,batteryType:"lifepo4"});
const small=make("controller","solarimport:small",{currentA:40,maxPvWattsBySystemVoltage:{12:440,24:880}});
const large=make("controller","solarimport:large",{currentA:50,maxPvWattsBySystemVoltage:{12:700,24:1400}});
const unknown=make("controller","solarimport:unknown",{currentA:50});
const rec=(product,score=100)=>({product,score,fit:1.1});
const coverage={required:["battery","solar_panel","controller"],manualDesignCharging:[]};
const options=(controllers)=>({
 coverage,setup,
 recommendations:{battery:[rec(batt)],solar_panel:[rec(panel)],controller:controllers.map((p,i)=>rec(p,100-i))},
 packages: [{
   id:"recommended",requiredCategoryCount:3,
   items:[{category:"battery",product:batt},{category:"solar_panel",product:panel},{category:"controller",product:controllers[0]}],
 }],
});
function variant(id,controller){
 return {id,requiredCategoryCount:3,items:[
   {category:"battery",product:batt},
   {category:"solar_panel",product:panel},
   {category:"controller",product:controller},
 ]};
}

test("real three-panel Wp rather than just requested Wp drives the MPPT nominal review",()=>{
 assert.equal(selectedSolarArrayWatts({product:panel,quantity:3}),600);
 assert.equal(selectedSolarArrayWatts({product:panel,quantity:4}),800);
 assert.equal(selectedSolarArrayWatts({product:panel,quantity:0}),null);
 assert.equal(controllerNominalPvWatts(small,12),440);
 assert.equal(controllerNominalPvWatts(small,24),880);
 assert.equal(controllerNominalPvWatts(small,36),null);
 assert.deepEqual(caravanPvNominalReview({product:panel,quantity:3},small,12),
   {actualWp:600,nominalWp:440,needsManualReview:true});
 assert.equal(caravanPvNominalReview({product:panel,quantity:3},small,24).needsManualReview,false);
 assert.equal(caravanPvNominalReview({product:panel,quantity:3},unknown,12).needsManualReview,false);
 assert.equal(caravanPvNominalReview(null,small,12).needsManualReview,false);
});

test("confirmed-stock buyer selection replaces known 440Wp undersized nominal MPPT with a suitable 700Wp variant",()=>{
 const plan=buildCaravanBuyerChecklist(options([small,large]));
 assert.equal(plan.complete,true);
 assert.equal(plan.status,"complete");
 assert.equal(plan.readyCount,3);
 assert.equal(plan.systemVoltage,12);
 assert.equal(plan.rows.find(r=>r.category==="controller").product.id,large.id);
 const packages=purchaseReadyCaravanPackages([
   variant("recommended",small),variant("economy",large),variant("reserve",unknown)
 ],plan);
 assert.deepEqual(packages.map(p=>p.id),["economy","reserve"]);
});

test("without a nominally capable MPPT, basket remains partial with precise actual/nominal watts",()=>{
 const plan=buildCaravanBuyerChecklist(options([small]));
 assert.equal(plan.complete,false);
 assert.equal(plan.status,"partial");
 assert.equal(plan.readyCount,2);
 const row=plan.rows.find(r=>r.category==="controller");
 assert.equal(row.ready,false);
 assert.equal(row.product,null);
 assert.equal(row.missingReason,"pv_nominal_review");
 assert.equal(row.installedPvWp,600);
 assert.equal(row.nominalPvWp,440);
 assert.deepEqual(purchaseReadyCaravanPackages([variant("recommended",small)],plan),[]);
});

test("missing nominal MPPT spec stays an explicit review requirement, never fabricated as 700Wp",()=>{
 const plan=buildCaravanBuyerChecklist(options([small,unknown]));
 const row=plan.rows.find(r=>r.category==="controller");
 assert.equal(row.ready,true);
 assert.equal(row.product.id,unknown.id);
 assert.equal(controllerNominalPvWatts(row.product,12),null);
 assert.equal(plan.complete,true);
});

test("SK/PL buyer-plan copy explains overpaneling without presenting a purchase link for the held controller",()=>{
 const plan=buildCaravanBuyerChecklist(options([small]));
 for(const locale of ["sk","pl"]){
   const target={innerHTML:""};
   renderLocalizedCaravanBuyerPlan({
     target,plan,locale,purchaseUrl:(p)=>p.affiliateUrl,
     purchaseCta:()=>"Koupit",merchantLabel:()=>"shop",trackEvent:()=>{},
   });
   assert.match(target.innerHTML,/600 Wp/);
   assert.match(target.innerHTML,/440 Wp/);
   assert.match(target.innerHTML,locale==="pl"?/przewymiarowanie/:/predimenzovanie/);
   assert.doesNotMatch(target.innerHTML,/data-buying-category="controller"[^]*?data-product-id="solarimport:small"/);
 }
});

test("CZ/SK/PL browser uses one versioned shared PV review module and source-tested checklist",async()=>{
 for(const [page,app] of [["index.html","app.js"],["sk/index.html","app-sk.js"],["pl/index.html","app-pl.js"]]){
   const html=await readFile(new URL("../"+page,import.meta.url),"utf8");
   const src=await readFile(new URL("../src/"+app,import.meta.url),"utf8");
   assert.ok(html.includes(page === "index.html" ? "20261122-shore-mca1" : "20261122-shore-mca1"));
   assert.match(src,/caravan-buyer-checklist\.js\?v=20261122-mppt-cz1/);
   assert.match(src,page==="index.html" ? /caravan-package-readiness\.js\?v=20261122-legacy70a/ : /caravan-package-readiness\.js\?v=20261122-pq200a1/);
 }
});
