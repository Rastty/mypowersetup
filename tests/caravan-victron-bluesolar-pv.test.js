import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { addVerifiedVictronBlueSolar190PvSpecs } from "../src/victron-bluesolar-pv-profiles.js";
import { refreshCatalogProduct, recommendProducts } from "../src/products.js";
import { reviewCaravanPvString } from "../src/caravan-pv-string-review.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { renderLocalizedCaravanBuyerPlan } from "../src/caravan-buyer-plan-localized.js";
const records=[
["svetkaravanu","Solární panel Victron Energy BlueSolar 190 Wp Mono 12 V","www.svetkaravanu.cz","solarni-panel-victron-energy-bluesolar-190-wp-mono-12-v_z109069/","CZK","38137ac4"],
["padabo_sk","Solárny panel Victron Energy BlueSolar 190 Wp Mono 12 V","www.padabo.sk","solarny-panel-victron-energy-bluesolar-190-wp-mono-12-v_z109069/","EUR","7aed5c13"],
["padabo_pl","Panel słoneczny Victron Energy BlueSolar 190 Wp Mono 12 V","www.padabo.pl","panel-sloneczny-victron-energy-bluesolar-190-wp-mono-12-v_z109069/","PLN","95d61abf"],
];
const doc="https://www.victronenergy.com/upload/documents/Datasheet-BlueSolar-Monocrystalline-Panels-current-models-EN-.pdf";
const controllerDoc="https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/configuration-and-settings.html";
const offer=(r,qty=2)=>{
 const [merchant,name,host,slug,currency,bid]=r;
 const productUrl="https://"+host+"/"+slug;
 const uri=new URL("https://ehub.cz/system/scripts/click.php");
 uri.searchParams.set("a_aid","f34c86c8");
 uri.searchParams.set("a_bid",bid);
 uri.searchParams.set("desturl",productUrl);
 return {id:merchant+":109069",merchant,name,category:"solar_panel",
  categoryPath:"Solární panely a příslušenství",
  priceCzk:2600,priceCurrency:currency,available:true,
  recommendedQuantity:qty,productUrl,affiliateUrl:uri.href,
  specs:{powerW:190,voltageV:12}};
};
const makeController=(amps,locale="sk")=>({
 id:"padabo_"+locale+":"+(amps===30?"24828":"101985"),
 merchant:"padabo_"+locale,name:"Victron SmartSolar MPPT 100/"+amps,category:"controller",available:true,
 priceCzk:5000,priceCurrency:locale==="sk"?"EUR":"PLN",
 affiliateUrl:offer(records[locale==="sk"?1:2]).affiliateUrl,
 specs:{currentA:amps,chargingProfileEvidenceUrl:controllerDoc,maxPvVocV:100,
  maxPvIscA:amps===30?35:60,systemVoltagesV:[12,24],
  maxPvWattsBySystemVoltage:amps===30?{12:440,24:880}:{12:700,24:1400}}
});
const ctrl30=makeController(30),ctrl50=makeController(50);
const battery={id:"padabo_sk:battery",merchant:"padabo_sk",category:"battery",available:true,
 name:"12V 200Ah LiFePO4",affiliateUrl:offer(records[1]).affiliateUrl,priceCurrency:"EUR",
 specs:{voltageV:12,capacityAh:200,batteryType:"lifepo4"}};
const setup={locale:"sk",systemVoltage:12,batteryType:"lifepo4",batteryAh:100,solarWatts:380,controllerAmps:30,inverterWatts:0,charging:{}};
const rank=(product)=>({product,score:100,fit:1});
function makePlan(qty=2,controllers=[ctrl30]){
 const panel=refreshCatalogProduct(offer(records[1],qty));
 return buildCaravanBuyerChecklist({
  setup:{...setup,solarWatts:190*qty,controllerAmps:qty===3?50:30},
  coverage:{required:["battery","solar_panel","controller"],manualDesignCharging:[]},
  packages:[], recommendations:{battery:[rank(battery)],solar_panel:[rank(panel)],controller:controllers.map(rank)}
 });
}
test("all 3 exact 190Wp BlueSolar approved offers inherit only manufacturer-confirmed electrical specs",()=>{
 for(const rec of records){
   const p=offer(rec),e=addVerifiedVictronBlueSolar190PvSpecs(p,p.specs);
   assert.equal(e.pvModel,"SPM041903903",p.id);
   assert.equal(e.powerW,190,p.id);
   assert.equal(e.pvVocV,25.5,p.id);
   assert.equal(e.pvIscA,9.17,p.id);
   assert.equal(e.pvVmpV,21.8,p.id);
   assert.equal(e.pvVocTempCoefficientPctPerC,-0.35,p.id);
   assert.equal(e.pvIscTempCoefficientPctPerC,0.04,p.id);
   assert.equal(e.pvElectricalEvidenceUrl,doc,p.id);
   assert.equal(refreshCatalogProduct(p).specs.pvModel,"SPM041903903",p.id);
 }
});
test("shared Victron variant pages, spoofed country/affiliate and wrong voltage never inherit proof",()=>{
 const p=offer(records[1]);
 const bad=[
  {...p,id:"padabo_sk:26939_32735"},
  {...p,name:p.name+" 185 W"},
  {...p,merchant:"padabo_pl"},
  {...p,priceCurrency:"PLN"},
  {...p,productUrl:"https://www.padabo.sk/solarny-panel-victron-energy_z26939/"},
  {...p,affiliateUrl:p.affiliateUrl.replace("7aed5c13","95d61abf")},
  {...p,affiliateUrl:p.affiliateUrl+"&desturl=https%3A%2F%2Fwww.padabo.sk%2F"},
  {...p,specs:{...p.specs,voltageV:24}},
  {...p,specs:{...p.specs,pvIscA:5}},
  {...p,specs:{...p.specs,powerW:175}},
 ];
 for(const b of bad)assert.equal(addVerifiedVictronBlueSolar190PvSpecs(b,b.specs),b.specs,b.id);
});
test("190Wp strings use model-specific cold Voc and Isc, with 2S2P for four on 24V",()=>{
 const p=refreshCatalogProduct(offer(records[1]));
 const two=reviewCaravanPvString({product:p,quantity:2},ctrl30,12);
 assert.equal(two.status,"within_reviewed_limits");
 assert.deepEqual([two.series,two.parallel],[2,1]);
 assert.equal(two.actualWp,380);
 assert.ok(two.coldVocV>=59&&two.coldVocV<60);
 assert.ok(two.hotIscA>9&&two.hotIscA<10);
 assert.equal(two.manufacturerName,"Victron Energy");
 assert.equal(two.manufacturerUrl,doc);
 const three=reviewCaravanPvString({product:p,quantity:3},ctrl50,12);
 assert.deepEqual([three.series,three.parallel],[3,1]);
 const four24=reviewCaravanPvString({product:p,quantity:4},ctrl50,24);
 assert.deepEqual([four24.series,four24.parallel],[2,2]);
 assert.equal(four24.actualWp,760);
 assert.equal(reviewCaravanPvString({product:p,quantity:4},ctrl50,12).reason,"pv_nominal_exceeded");
 assert.equal(reviewCaravanPvString({product:p,quantity:1},ctrl50,24).reason,"no_screened_layout");
 assert.equal(reviewCaravanPvString({product:{...p,id:"padabo_sk:imposter"}},ctrl50,12),null);
 assert.equal(reviewCaravanPvString({product:{...p,specs:{...p.specs,pvModel:"__proto__"}}},ctrl50,12),null);
});
test("buyer checklist selects a reviewed BlueSolar/Victron pairing and discloses manufacturer, not EcoFlow",()=>{
 const valid=makePlan();
 assert.equal(valid.complete,true);
 const r=valid.rows.find(x=>x.category==="controller");
 assert.deepEqual([r.pvWiringReview.series,r.pvWiringReview.parallel],[2,1]);
 assert.equal(r.pvWiringReview.manufacturerName,"Victron Energy");
 const target={innerHTML:""};
 for(const locale of ["sk","pl"]){
  renderLocalizedCaravanBuyerPlan({target,plan:valid,locale,
    purchaseUrl:(product)=>product.affiliateUrl,purchaseCta:()=>"Kúpiť",merchantLabel:()=>"shop",trackEvent:()=>{}});
  assert.match(target.innerHTML,/data-manufacturer-pv-proof/);
  assert.match(target.innerHTML,/Victron Energy/);
  assert.match(target.innerHTML,/SPM041903903|Datasheet-BlueSolar/);
  assert.doesNotMatch(target.innerHTML,/Technické údaje panelu EcoFlow|Dokumentacja panelu EcoFlow/);
 }
 const rejected=makePlan(2,[{...ctrl30,id:"padabo_sk:unknown",specs:{currentA:30}}]);
 assert.equal(rejected.complete,false);
 assert.equal(rejected.rows.find(x=>x.category==="controller").missingReason,"pv_electrical_review");
});
test("stock/source safety still applies to exact BlueSolar and market assets stay version-matched",async()=>{
 const p=offer(records[1]);
 assert.equal(recommendProducts([p],setup,3,{padabo_sk:{status:"ok"}}).solar_panel[0].product.specs.pvModel,"SPM041903903");
 assert.deepEqual(recommendProducts([p],setup,3,{padabo_sk:{status:"stale"}}).solar_panel,[]);
 assert.deepEqual(recommendProducts([{...p,available:false}],setup,3,{padabo_sk:{status:"ok"}}).solar_panel,[]);
 const src=await readFile(new URL("../src/app.js",import.meta.url),"utf8");
 assert.match(src,/pvWiringReview.manufacturerName/);
 for(const [page,script] of [["index.html","app.js"],["sk/index.html","app-sk.js"],["pl/index.html","app-pl.js"]]){
   const html=await readFile(new URL("../"+page,import.meta.url),"utf8");
   const app=await readFile(new URL("../src/"+script,import.meta.url),"utf8");
   assert.ok(html.includes(page === "index.html" ? "20261122-shore-mca1" : "20261122-shore-mca1"));
   assert.ok(app.includes("products.js?v=" + (page === "index.html" ? "20261122-superpack-cz1" : "20261122-superpack-cz1")));
   assert.match(app,/caravan-buyer-checklist\.js\?v=20261122-bms-alternatives1/);
 }
});
