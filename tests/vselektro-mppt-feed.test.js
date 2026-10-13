import test from "node:test";
import assert from "node:assert/strict";
import {parseVselektroVerifiedFeed} from "../src/vselektro-feed.js";
import {recommendProducts} from "../src/products.js";

const rows=[
  {key:"victron-20",path:"/solarni-regulator-victron-energy-mppt-smartsolar-100v-20a/",title:"Solární regulátor Victron Energy MPPT SmartSolar 100V/20A",amps:20,pv12:290,sys:[12,24,48]},
  {key:"victron-30",path:"/solarni-regulator-victron-energy-smartsolar-30a/",title:"Solární regulátor Victron Energy MPPT SmartSolar 100V/30A",amps:30,pv12:440,sys:[12,24]},
  {key:"victron-50",path:"/solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/",title:"Solární regulátor Victron Energy MPPT SmartSolar 100V/50A",amps:50,pv12:700,sys:[12,24]},
  {key:"srne-30",path:"/solarni-regulator-sr-ml2430-30a/",title:"Solární regulátor SRNE MPPT SR-ML2430 30A",amps:30,pv12:400,sys:[12,24]},
];
function offer(row,{title=row.title,path=row.path,delivery="0",price="2500",description="MPPT charge controller"}={}) {
  return "<SHOPITEM><ITEM_ID>"+row.key+"</ITEM_ID><PRODUCTNAME>"+title+"</PRODUCTNAME><DESCRIPTION>"+description+"</DESCRIPTION><URL>https://www.vselektro.eu"+path+"</URL><CATEGORYTEXT>Solární regulátory</CATEGORYTEXT><PRICE_VAT>"+price+"</PRICE_VAT><DELIVERY_DATE><![CDATA["+delivery+"]]></DELIVERY_DATE></SHOPITEM>";
}
const xml=(arr)=>"<SHOP>"+arr.join("")+"</SHOP>";
function setup(extra={}){
  return {locale:"cs",systemVoltage:12,batteryType:"lifepo4",batteryAh:100,
    solarWatts:240,controllerAmps:20,inverterWatts:0,charging:{},...extra};
}

test("strict exact-URL MPPT import: 4 verified models with real PV limits and tracking",()=>{
  const products=parseVselektroVerifiedFeed(xml(rows.map(r=>offer(r))));
  assert.equal(products.length,4);
  for(let i=0;i<rows.length;i++){
    const p=products[i],r=rows[i];
    assert.equal(p.category,"controller");
    assert.equal(p.specs.currentA,r.amps);
    assert.equal(p.specs.maxPvVocV,100);
    assert.equal(p.specs.maxPvWattsBySystemVoltage[12],r.pv12);
    assert.deepEqual(p.specs.systemVoltagesV,r.sys);
    const tracking=new URL(p.affiliateUrl);
    assert.equal(tracking.hostname,"ehub.cz");
    assert.equal(tracking.searchParams.get("a_bid"),"f897865f");
    assert.equal(tracking.searchParams.get("desturl"),p.productUrl);
  }
});

test("controller recommendations check charge current, battery voltage and nominal PV power",()=>{
  const products=parseVselektroVerifiedFeed(xml(rows.map(r=>offer(r))));
  const small=recommendProducts(products,setup()).controller.map(x=>x.product.id);
  assert.ok(small.includes("vselektro:victron-smartsolar-100-20"));
  const at350=recommendProducts(products,setup({solarWatts:350,controllerAmps:20})).controller.map(x=>x.product.id);
  assert.ok(!at350.includes("vselektro:victron-smartsolar-100-20"));
  assert.ok(at350.includes("vselektro:victron-smartsolar-100-30"));
  const at450=recommendProducts(products,setup({solarWatts:450,controllerAmps:30})).controller.map(x=>x.product.id);
  assert.ok(!at450.includes("vselektro:victron-smartsolar-100-30"));
  assert.ok(at450.includes("vselektro:victron-smartsolar-100-50"));
  const at24=recommendProducts(products,setup({systemVoltage:24,solarWatts:480,controllerAmps:20})).controller.map(x=>x.product.id);
  assert.ok(at24.includes("vselektro:victron-smartsolar-100-20"));
  const at48=recommendProducts(products,setup({systemVoltage:48,solarWatts:700,controllerAmps:20})).controller.map(x=>x.product.id);
  assert.deepEqual(at48,["vselektro:victron-smartsolar-100-20"]);
});

test("false MPPT claims and wrong names cannot turn home PV or DC converter into solar controller",()=>{
  for (const [row,changed] of [
    [rows[0],{title:"Měnič DC/DC Victron Energy SmartSolar 100V/20A"}],
    [rows[0],{title:"Solární regulátor Victron MPPT SmartSolar 100V/50A"}],
    [rows[1],{title:"Solární regulátor Victron MPPT SmartSolar 100V/50A"}],
    [rows[2],{title:"Solární sestava Victron Energy MPPT SmartSolar 100V/50A"}],
    [rows[3],{title:"Solární regulátor SRNE PWM SR-ML2430 30A"}],
    [rows[3],{path:"/solarni-sestava-hybrid-i/"}],
    [rows[1],{delivery:"4"}],
    [rows[0],{delivery:""}],
    [rows[2],{price:"0"}],
  ]){
    assert.equal(parseVselektroVerifiedFeed(xml([offer(row,changed)])).length,0,
      JSON.stringify(changed));
  }
});

test("all four MPPT SKUs fail closed when the live feed repeats a product URL",()=>{
  for(const row of rows){
    assert.equal(parseVselektroVerifiedFeed(xml([offer(row),offer(row)])).length,0,row.key);
  }
});
