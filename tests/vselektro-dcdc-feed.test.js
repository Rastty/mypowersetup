import test from "node:test";
import assert from "node:assert/strict";
import {parseVselektroVerifiedFeed} from "../src/vselektro-feed.js";
import {recommendProducts} from "../src/products.js";

const entries=[
 {id:"orion18",path:"/nabijecka-dc-dc-orion-tr-smart-12-12-18a/",title:"Nabíječka DC-DC Orion-Tr Smart 12-12/18A, izolovaná",amps:18,isolated:true},
 {id:"orion30i",path:"/nabijecka-dc-dc-orion-tr-smart-12-12-30a/",title:"Nabíječka DC-DC Orion-Tr Smart 12-12/30A, izolovaná",amps:30,isolated:true},
 {id:"orion30n",path:"/nabijecka-dc-dc-orion-tr-smart-12-12-30a-neizolovana/",title:"Nabíječka DC-DC Orion-Tr Smart 12-12/30A, neizolovaná",amps:30,isolated:false},
 {id:"orion50",path:"/nabijecka-dc-dc-orion-xs-smart-12-12-50a-neizolovana/",title:"Nabíječka DC-DC Orion XS Smart 12-12/50A, neizolovaná",amps:50,isolated:false},
];
const shop=a=>"<SHOP>"+a.join("")+"</SHOP>";
function offer(e,{title=e.title,price="5999",availability="0",path=e.path,description="Victron Energy Orion Smart: 12V alternator charger for LiFePO4 and lead-acid batteries"}={}){
 return "<SHOPITEM><ITEM_ID>"+e.id+"</ITEM_ID><PRODUCTNAME>"+title+"</PRODUCTNAME><DESCRIPTION>"+description+"</DESCRIPTION><CATEGORYTEXT>Nabíječky baterií</CATEGORYTEXT><URL>https://www.vselektro.eu"+path+"</URL><PRICE_VAT>"+price+"</PRICE_VAT><DELIVERY_DATE>"+availability+"</DELIVERY_DATE></SHOPITEM>";
}
function setup(overrides={}){
 return {locale:"cs",systemVoltage:12,batteryType:"lifepo4",batteryAh:100,solarWatts:200,controllerAmps:20,inverterWatts:0,
  charging:{starterVoltage:12,dcDc:{enabled:true,suggestedCurrentAmps:20}}, ...overrides};
}
test("four exact Orion charger SKUs have evidence-backed charge current, chemistry, source and isolation",()=>{
 const results=parseVselektroVerifiedFeed(shop(entries.map(x=>offer(x))));
 assert.equal(results.length,4);
 for(let i=0;i<entries.length;i++){
  const p=results[i],e=entries[i];
  assert.equal(p.category,"dc_charger");
  assert.equal(p.specs.currentA,e.amps);
  assert.equal(p.specs.isolated,e.isolated);
  assert.deepEqual(p.specs.chargingVoltagesV,[12]);
  assert.deepEqual(p.specs.chargingInputVoltagesV,[12]);
  assert.deepEqual(p.specs.chargingBatteryTypes,["lifepo4","lead"]);
  assert.equal(p.specs.smartAlternatorCompatible,true);
  assert.equal(p.available,true);
  assert.equal(new URL(p.affiliateUrl).searchParams.get("desturl"),p.productUrl);
 }
});

test("alternator charge current, house chemistry and input/output voltage gate recommendations",()=>{
 const results=parseVselektroVerifiedFeed(shop(entries.map(x=>offer(x))));
 const medium=recommendProducts(results,setup()).dc_charger;
 assert.ok(medium.some(x=>x.product.specs.currentA===30));
 assert.ok(!medium.some(x=>x.product.specs.currentA===18));
 const high=recommendProducts(results,setup({charging:{starterVoltage:12,dcDc:{suggestedCurrentAmps:50}}})).dc_charger;
 assert.equal(high.length,1);
 assert.equal(high[0].product.specs.currentA,50);
 assert.equal(recommendProducts(results,setup({batteryType:"lead"})).dc_charger.length>0,true);
 assert.equal(recommendProducts(results,setup({systemVoltage:24})).dc_charger.length,0);
 assert.equal(recommendProducts(results,setup({charging:{starterVoltage:24,dcDc:{suggestedCurrentAmps:20}}})).dc_charger.length,0);
});

test("DC/DC converters, mislabelled isolation, wrong model and backorders never enter matching",()=>{
 const wrong=[
  [entries[0],{title:"DC/DC měnič napětí Orion-Tr Smart 12-12/18A, izolovaná"}],
  [entries[0],{title:"Nabíječka DC-DC Orion-Tr Smart 12-12/30A, izolovaná"}],
  [entries[1],{title:"Nabíječka DC-DC Orion-Tr Smart 12-12/30A, neizolovaná"}],
  [entries[2],{title:"Nabíječka DC-DC Orion-Tr Smart 12-12/30A, izolovaná"}],
  [entries[3],{title:"Nabíječka DC-DC Orion-Tr Smart 12-12/50A, neizolovaná"}],
  [entries[2],{title:"Nabíječka DC-DC Orion-Tr Smart 24-12/30A, neizolovaná"}],
  [entries[3],{path:"/dc-dc-menic-12-24-50a/"}],
  [entries[3],{availability:"4"}],
  [entries[3],{price:"0"}],
 ];
 for (const [entry,variant] of wrong){
  assert.equal(parseVselektroVerifiedFeed(shop([offer(entry,variant)])).length,0,JSON.stringify(variant));
 }
});

test("duplicated products fail closed even if one row appears in stock",()=>{
 for(const entry of entries) {
  assert.equal(parseVselektroVerifiedFeed(shop([offer(entry),offer(entry,{availability:"4"})])).length,0,entry.id);
 }
});
