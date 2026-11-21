import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { addVerifiedEcoFlowRigid175PvSpecs } from "../src/ecoflow-rigid-pv-profiles.js";
import { reviewCaravanPvString } from "../src/caravan-pv-string-review.js";
import { refreshCatalogProduct, recommendProducts } from "../src/products.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";
import { renderLocalizedCaravanBuyerPlan } from "../src/caravan-buyer-plan-localized.js";

const rows=[
  ["svetkaravanu","Solární panel EcoFlow 175 W","www.svetkaravanu.cz","solarni-panel-ecoflow-175-w_z105298/","CZK","38137ac4"],
  ["padabo_sk","Solárny panel EcoFlow 175 W","www.padabo.sk","solarny-panel-ecoflow-175-w_z105298/","EUR","7aed5c13"],
  ["padabo_pl","Panel słoneczny EcoFlow 175 W","www.padabo.pl","panel-sloneczny-ecoflow-175-w_z105298/","PLN","95d61abf"],
];
const manufacturerPdf="https://websiteoss.ecoflow.com/cms/upload/2024/5/30/EcoFlow%20175W%20Rigid%20Solar%20Panel-Safety%20Instructions%20V1.0_1717050133698.pdf";
const victronDoc="https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/configuration-and-settings.html";
function panel([merchant,name,host,slug,currency,bid],quantity=4){
  const productUrl="https://"+host+"/"+slug;
  const u=new URL("https://ehub.cz/system/scripts/click.php");
  u.searchParams.set("a_aid","f34c86c8");u.searchParams.set("a_bid",bid);u.searchParams.set("desturl",productUrl);
  return {
    id:merchant+":105298",merchant,name,category:"solar_panel",
    categoryPath:"Solární panely / photovoltaics",
    priceCzk:3800,priceCurrency:currency,available:true,
    productUrl,affiliateUrl:u.href,recommendedQuantity:quantity,
    specs:{powerW:175,voltageV:48},
  };
}
function controller(id,current,locale="sk"){
  const merchant=locale==="cs"?"vselektro":"padabo_"+locale;
  return {
    id:merchant+":"+id,merchant,category:"controller",available:true,name:"Victron Energy SmartSolar 100/"+current+" MPPT",
    priceCurrency:locale==="cs"?"CZK":locale==="sk"?"EUR":"PLN",priceCzk:6500,
    productUrl:"https://www.padabo.sk/solarny-regulator-mppt-victron-energy-smartsolar-100-50_z101985/",
    affiliateUrl:"https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=7aed5c13&desturl=https%3A%2F%2Fwww.padabo.sk%2Fsolarny-regulator-mppt-victron-energy-smartsolar-100-50_z101985%2F",
    specs:{
      currentA:current,chargingProfileEvidenceUrl:victronDoc,
      maxPvVocV:100,maxPvIscA:current===30?35:60,
      maxPvWattsBySystemVoltage:current===30?{12:440,24:880}:{12:700,24:1400},
      systemVoltagesV:[12,24],
    }
  };
}
const ctrl50=controller("101985",50);
const ctrl30=controller("24828",30);
const unknown={...ctrl50,id:"padabo_sk:unreviewed",specs:{currentA:50}};
const battery={
  id:"padabo_sk:battery",merchant:"padabo_sk",category:"battery",name:"Reviewed 12V battery",
  available:true,priceCzk:200,priceCurrency:"EUR",affiliateUrl:ctrl50.affiliateUrl,
  specs:{voltageV:12,capacityAh:200,batteryType:"lifepo4"}
};
const setup={locale:"sk",systemVoltage:12,batteryType:"lifepo4",batteryAh:100,solarWatts:700,controllerAmps:50,inverterWatts:0,charging:{}};
const offer=(product)=>({product,score:100,fit:1.0});
const basket=(quantity=4,controllers=[ctrl50])=>{
  const p=refreshCatalogProduct(panel(rows[1],quantity));
  return {
    coverage:{required:["battery","solar_panel","controller"],manualDesignCharging:[]},
    setup:{...setup,solarWatts:175*quantity},
    recommendations:{battery:[offer(battery)],solar_panel:[offer(p)],controller:controllers.map(offer)},
    packages:[],
  };
};
const variant=(id,p,reg)=>({
 id,requiredCategoryCount:3,
 items:[{category:"battery",product:battery},{category:"solar_panel",product:p},{category:"controller",product:reg}]
});
test("exact approved CZ SK PL 175W rigid listings inherit manufacturer Voc Isc Vmp and temperature evidence",()=>{
 for(const r of rows){
   const p=panel(r);
   const specs=addVerifiedEcoFlowRigid175PvSpecs(p,p.specs);
   assert.equal(specs.powerW,175);
   assert.equal(specs.pvModel,"EF-SG-M175-01");
   assert.equal(specs.pvVocV,25.5);
   assert.equal(specs.pvIscA,8.3);
   assert.equal(specs.pvVmpV,21.9);
   assert.equal(specs.pvVocTempCoefficientPctPerC,-0.25);
   assert.equal(specs.pvIscTempCoefficientPctPerC,0.045);
   assert.equal(specs.pvElectricalEvidenceUrl,manufacturerPdf);
   assert.equal(refreshCatalogProduct(p).specs.pvVocV,25.5);
 }
});
test("merchant/SKU/locale/affiliate/voltage metadata cannot launder manufacturer proof",()=>{
 const p=panel(rows[1]);
 const invalid=[
   {...p,id:"padabo_sk:105299"},{...p,name:p.name+" II"},
   {...p,merchant:"padabo_pl"},{...p,priceCurrency:"PLN"},
   {...p,productUrl:"https://www.padabo.sk/solarne-panely-a-prislusenstvo/"},
   {...p,affiliateUrl:p.affiliateUrl.replace("7aed5c13","95d61abf")},
   {...p,affiliateUrl:p.affiliateUrl+"&a_bid=7aed5c13"},
   {...p,category:"solar_controller"},
   {...p,specs:{...p.specs,powerW:200}},
   {...p,specs:{...p.specs,pvVocV:29}},
 ];
 for(const other of invalid){
   assert.equal(addVerifiedEcoFlowRigid175PvSpecs(other,other.specs),other.specs,other.id);
 }
});
test("conservative -20C cold Voc / +85C Isc permits actual 2S2P on 4 EcoFlow panels, not 4S1P",()=>{
 const p=refreshCatalogProduct(panel(rows[1]));
 const review=reviewCaravanPvString({product:p,quantity:4},ctrl50,12);
 assert.equal(review.status,"within_reviewed_limits");
 assert.deepEqual([review.series,review.parallel],[2,2]);
 assert.equal(review.quantity,4);
 assert.equal(review.actualWp,700);
 assert.ok(review.coldVocV>56&&review.coldVocV<57);
 assert.equal(review.hotIscA,17);
 assert.equal(review.manufacturerUrl,manufacturerPdf);
 assert.equal(review.coldAmbientC,-20);
 assert.equal(review.hotCellC,85);
 const three=reviewCaravanPvString({product:p,quantity:3},ctrl50,12);
 assert.deepEqual([three.series,three.parallel],[3,1]);
 const two24=reviewCaravanPvString({product:p,quantity:2},ctrl30,24);
 assert.deepEqual([two24.series,two24.parallel],[2,1]);
 assert.equal(reviewCaravanPvString({product:p,quantity:1},ctrl50,24).status,"manual_review");
 assert.equal(reviewCaravanPvString({product:p,quantity:4},ctrl30,12).reason,"pv_nominal_exceeded");
 assert.equal(reviewCaravanPvString({product:p,quantity:4},unknown,12).reason,"controller_unverified");
 assert.equal(reviewCaravanPvString({product:{...p,specs:{powerW:175}}},ctrl50,12),null);
});
test("stock-approved buyer checklist auto-selects documented MPPT instead of an unknown controller",()=>{
 const input=basket(4,[unknown,ctrl50]);
 const plan=buildCaravanBuyerChecklist(input);
 assert.equal(plan.complete,true);
 assert.equal(plan.status,"complete");
 assert.equal(plan.readyCount,3);
 const selected=plan.rows.find(x=>x.category==="controller");
 assert.equal(selected.product.id,ctrl50.id);
 assert.deepEqual([selected.pvWiringReview.series,selected.pvWiringReview.parallel],[2,2]);
 const p=input.recommendations.solar_panel[0].product;
 assert.deepEqual(purchaseReadyCaravanPackages([
   variant("recommended",p,unknown),variant("economy",p,ctrl50)
 ],plan).map(x=>x.id),["economy"]);
});
test("without manufacturer-reviewed MPPT, only controller is held; battery and panel purchase actions survive",()=>{
 const input=basket(4,[unknown]);
 const plan=buildCaravanBuyerChecklist(input);
 assert.equal(plan.complete,false);
 assert.equal(plan.readyCount,2);
 const row=plan.rows.find(x=>x.category==="controller");
 assert.equal(row.ready,false);
 assert.equal(row.product,null);
 assert.equal(row.missingReason,"pv_electrical_review");
 assert.equal(row.installedPvWp,700);
 assert.equal(plan.rows.find(x=>x.category==="solar_panel").ready,true);
 assert.equal(plan.rows.find(x=>x.category==="battery").ready,true);
 assert.deepEqual(purchaseReadyCaravanPackages([
   variant("recommended",input.recommendations.solar_panel[0].product,unknown)
 ],plan),[]);
});
test("Czech/Slovak/Polish buyer UI exposes PV wiring review and manufacturer source with no invented affiliate",async()=>{
 for(const locale of ["sk","pl"]){
   const plan=buildCaravanBuyerChecklist(basket(4,[ctrl50]));
   const target={innerHTML:""};
   renderLocalizedCaravanBuyerPlan({target,plan,locale,
     purchaseUrl:(p)=>p.affiliateUrl,purchaseCta:()=>"Kúpiť",merchantLabel:()=>"Padabo",trackEvent:()=>{}});
   assert.match(target.innerHTML,/data-pv-wiring-review/);
   assert.match(target.innerHTML,/data-manufacturer-pv-proof/);
   assert.match(target.innerHTML,/2 .* 2/);
   assert.match(target.innerHTML,/700/);
   assert.match(target.innerHTML,/data-buying-category="controller"/);
   const blocked=buildCaravanBuyerChecklist(basket(4,[unknown]));
   renderLocalizedCaravanBuyerPlan({target,plan:blocked,locale,
     purchaseUrl:(p)=>p.affiliateUrl,purchaseCta:()=>"Kúpiť",merchantLabel:()=>"Padabo",trackEvent:()=>{}});
   assert.match(target.innerHTML,locale==="sk"?/potvrdené bezpečné zapojenie/:/potwierdzonego bezpiecznego połączenia/);
   assert.doesNotMatch(target.innerHTML,/data-manufacturer-pv-proof/);
 }
 const cs=await readFile(new URL("../src/app.js",import.meta.url),"utf8");
 assert.match(cs,/data-pv-wiring-review/);
 assert.match(cs,/data-manufacturer-pv-proof/);
 for(const [html,app] of [["index.html","app.js"],["sk/index.html","app-sk.js"],["pl/index.html","app-pl.js"]]){
   const page=await readFile(new URL("../"+html,import.meta.url),"utf8");
   const source=await readFile(new URL("../src/"+app,import.meta.url),"utf8");
   assert.match(page,/20261121-ecoflow-pv1/,html);
   assert.match(source,/products\.js\?v=20261121-ecoflow-pv1/,app);
   assert.match(source,/caravan-buyer-checklist\.js\?v=20261121-ecoflow-pv1/,app);
 }
});
