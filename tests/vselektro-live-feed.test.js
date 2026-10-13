import test from "node:test";
import assert from "node:assert/strict";
import { parseVselektroVerifiedFeed, VSELEKTRO_VERIFIED_PATHS } from "../src/vselektro-feed.js";
import { recommendProducts, buildAffiliateUrl } from "../src/products.js";

const base="https://www.vselektro.eu";
const p100="/lifepo4-baterie-12v-100ah-sunstone-power-slpo12-100n/";
const p200="/lifepo4-baterie-12v-200ah-slpo12-200n-hc200a-sunstone-power/";
const p150="/lifepo4-baterie-12v-150ah-slpo12-150n-hc150a-sunstone-power/";
const p200m="/lifepo4-baterie-12v-200ah-slpo12-200m-hc200a-sunstone-power/";
const p300="/lifepo4-baterie-12v-300ah-slpo12-300n-hc200a-sunstone-power/";
function item({id="100",path=p100,name="Sunstone Power LiFePO4 baterie 12,8 V 100Ah",
  price="12990",available="0",category="LiFePO4 baterie"}={}) {
  return "<SHOPITEM><ITEM_ID>"+id+"</ITEM_ID><PRODUCTNAME>"+name+"</PRODUCTNAME><URL>"+base+path+"</URL><CATEGORYTEXT>"+category+"</CATEGORYTEXT><DESCRIPTION>Sunstone baterie s BMS Bluetooth</DESCRIPTION><PRICE_VAT>"+price+"</PRICE_VAT><DELIVERY_DATE>"+available+"</DELIVERY_DATE></SHOPITEM>";
}
const shop=items=>'<?xml version="1.0" encoding="utf-8"?><SHOP>'+items.join("")+"</SHOP>";
const setup = (overrides={})=>({
  locale:"cs",batteryAh:90,batteryType:"lifepo4",systemVoltage:12,
  inverterWatts:800,solarWatts:200,controllerAmps:20,charging:{},
  ...overrides
});

test("only independently verified 12V battery SKUs are eligible from Heureka feed", () => {
  assert.equal(VSELEKTRO_VERIFIED_PATHS.filter(path=>path.startsWith("/lifepo4-baterie-")).length,5);
  assert.equal(VSELEKTRO_VERIFIED_PATHS.length,13);
  const xml=shop([
    item(),item({id:"200",path:p200,name:"Sunstone Power LiFePO4 baterie 12,8 V 200Ah",price:"21990"}),
    item({id:"kit",path:"/solarni-sestava-hybrid-i/",name:"Solární sestava hybrid 3500W LiFePO4 100Ah",price:"80000"})
  ]);
  const products=parseVselektroVerifiedFeed(xml);
  assert.equal(products.length,2);
  assert.deepEqual(products.map(p=>p.specs.capacityAh).sort((a,b)=>a-b),[100,200]);
  assert.ok(products.every(p=>p.category==="battery" && p.merchant==="vselektro" && p.available===true));
  assert.deepEqual(products.map(p=>p.priceCzk),[12990,21990]);
  assert.ok(products.every(p=>p.priceCurrency==="CZK"));
  assert.equal(products[0].specs.bmsContinuousCurrentA,100);
  assert.equal(products[1].specs.bmsContinuousCurrentA,200);
  assert.ok(products.every(p=>new URL(p.affiliateUrl).searchParams.get("a_bid")==="f897865f"));
});

test("missing availability, zero or missing price and foreign currency do not become recommendations",()=>{
  for(const update of [{available:""},{available:"-1"},{available:"4"},{available:"1"},{price:""},{price:"0"},{price:"129 EUR"}]) {
    assert.equal(parseVselektroVerifiedFeed(shop([item(update)])).length,0,JSON.stringify(update));
  }
});

test("misleading names, wrong technical specs, duplicates and unrelated PV systems fail closed",()=>{
  const bad=[
    item({name:"Sunstone Power LiFePO4 startovací baterie do auta 12V 100Ah"}),
    item({name:"Sunstone Power LiFePO4 baterie 24V 100Ah"}),
    item({name:"Sunstone Power LiFePO4 baterie 12V 200Ah"}),
    item({name:"Sunstone Power LiFePO4 sestava 12V 100Ah"}),
    item({path:"/solarni-sestava-hybrid-i/",name:"Sunstone Power LiFePO4 baterie 12V 100Ah"}),
    item({path:"/lifepo4-baterie-12v-100ah-sunstone-power-slpo12-100n-extra/"}),
  ];
  for(const xml of bad) assert.equal(parseVselektroVerifiedFeed(shop([xml])).length,0,xml);
  assert.equal(parseVselektroVerifiedFeed(shop([item(),item({id:"duplicate"})])).length,0);
});

test("merchant source cannot accidentally accept non-Heureka XML or an empty feed",()=>{
  for(const xml of ["", "<html>Login required</html>", "<rss><item>n/a</item></rss>", "<SHOP></SHOP>"]) {
    assert.deepEqual(parseVselektroVerifiedFeed(xml),[]);
  }
});

test("BMS current protects 12V 100Ah battery from high-inverter demand",()=>{
  const products=parseVselektroVerifiedFeed(shop([item(),item({id:"200",path:p200,name:"Sunstone Power LiFePO4 baterie 12,8 V 200Ah",price:"21990"})]));
  assert.equal(recommendProducts(products,setup()).battery.length,2);
  const high = recommendProducts(products,setup({batteryAh:90,inverterWatts:1800})).battery;
  assert.equal(high.length,1);
  assert.equal(high[0].product.specs.capacityAh,200);
  assert.equal(recommendProducts(products,setup({batteryAh:90,inverterWatts:3500})).battery.length,0);
  assert.equal(recommendProducts(products,setup({batteryAh:200,inverterWatts:800})).battery.length,1);
  assert.equal(recommendProducts(products,setup({batteryType:"lead"})).battery.length,0);
});

test("affiliate URLs stay anchored to approved eHub campaign",()=>{
  const url=new URL(buildAffiliateUrl("vselektro",base+p100));
  assert.equal(url.origin,"https://ehub.cz");
  assert.equal(url.searchParams.get("a_aid"),"f34c86c8");
  assert.equal(url.searchParams.get("a_bid"),"f897865f");
  assert.equal(url.searchParams.get("desturl"),base+p100);
});

test("150 Ah intermediate and 200 Ah under-seat / 300 Ah batteries have correct verified BMS limits", () => {
  const xml=shop([
    item({id:"150",path:p150,name:"Sunstone Power LiFePO4 Baterie 12V/150Ah SLPO12-150N HC150A",price:"16480",available:"0"}),
    item({id:"200m",path:p200m,name:"Sunstone Power LiFePO4 Baterie 12V/200Ah SLPO12-200M HC200A",price:"19439",available:"0"}),
    item({id:"300",path:p300,name:"Sunstone Power LiFePO4 Baterie 12V/300Ah SLPO12-300N HC200A",price:"26965",available:"0"}),
  ]);
  const parsed=parseVselektroVerifiedFeed(xml);
  assert.equal(parsed.length,3);
  assert.deepEqual(parsed.map(p=>p.specs.capacityAh),[150,200,300]);
  assert.deepEqual(parsed.map(p=>p.specs.bmsContinuousCurrentA),[150,200,200]);
  assert.equal(parsed[1].specs.formFactor,"under_seat");
  const mid=recommendProducts(parsed,setup({batteryAh:140,inverterWatts:1000})).battery;
  assert.ok(mid.some(p=>p.product.specs.capacityAh===150));
  const large=recommendProducts(parsed,setup({batteryAh:250,inverterWatts:2000})).battery;
  assert.equal(large.length,1);
  assert.equal(large[0].product.specs.capacityAh,300);
  assert.equal(recommendProducts(parsed,setup({batteryAh:250,inverterWatts:2800})).battery.length,0);
});

test("150 Ah temporarily unavailable in live Heureka XML must never appear despite being in allowlist", () => {
  const unavailable=item({id:"150",path:p150,name:"Sunstone Power LiFePO4 Baterie 12V/150Ah SLPO12-150N HC150A",price:"16480",available:"4"});
  const inStock=item({id:"200",path:p200,name:"Sunstone Power LiFePO4 Baterie 12V/200Ah SLPO12-200N HC200A",price:"19439",available:"0"});
  const parsed=parseVselektroVerifiedFeed(shop([unavailable,inStock]));
  assert.equal(parsed.length,1);
  assert.equal(parsed[0].specs.capacityAh,200);
});

test("missing or malformed explicit DELIVERY_DATE never silently turns into in-stock",()=>{
  const available=item();
  assert.equal(parseVselektroVerifiedFeed(shop([available.replace("<DELIVERY_DATE>0</DELIVERY_DATE>","")])).length,0);
  assert.equal(parseVselektroVerifiedFeed(shop([available.replace("<DELIVERY_DATE>0</DELIVERY_DATE>","<DELIVERY_DATE>4</DELIVERY_DATE>")])).length,0);
});

test("Heureka CDATA stock signal is parsed consistently with the generic feed reader",()=>{
  const xml=shop([item().replace("<DELIVERY_DATE>0</DELIVERY_DATE>","<DELIVERY_DATE><![CDATA[0]]></DELIVERY_DATE>")]);
  const parsed=parseVselektroVerifiedFeed(xml);
  assert.equal(parsed.length,1);
  assert.equal(parsed[0].available,true);
  const stockText=shop([item().replace("<DELIVERY_DATE>0</DELIVERY_DATE>","<DELIVERY_DATE>skladem</DELIVERY_DATE>")]);
  assert.equal(parseVselektroVerifiedFeed(stockText).length,1);
  const delayed=shop([item().replace("<DELIVERY_DATE>0</DELIVERY_DATE>","<DELIVERY_DATE><![CDATA[4]]></DELIVERY_DATE>")]);
  assert.equal(parseVselektroVerifiedFeed(delayed).length,0);
});
