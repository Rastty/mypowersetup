import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { refreshCatalogProduct, recommendProducts } from "../src/products.js";
import { addVerifiedDometicMcaShoreProfile } from "../src/dometic-mca-shore-profiles.js";

const pdf="https://media.dometic.com/externalassets/08-0802-080209-080209011_9620017572_119810.pdf";
const models=[
  ["24087_26040","MCA 1215",12,15,30,120],
  ["24087_26042","MCA 1235",12,35,70,280],
  ["24088_26048","MCA 2440",24,40,80,320],
];
const markets=["cs","sk","pl"];
const merchant=(market)=>market==="cs"?"svetkaravanu":"padabo_"+market;
async function catalog(market){
 return JSON.parse(await readFile(new URL("../data/"+(market==="cs"?"products.json":"products-"+market+".json"),import.meta.url),"utf8"));
}
function setup(market,voltage,Ah,current,chem="lifepo4"){
 return {
  locale:market, systemVoltage:voltage,batteryAh:Ah,batteryType:chem,
  solarWatts:250,inverterWatts:0,controllerAmps:20,
  charging:{shore:{suggestedCurrentAmps:current},dcDc:{}},
 };
}
test("nine exact stocked Dometic shore chargers gain manufacturer LiFePO4 and 230V input evidence",async()=>{
 for(const market of markets){
  const data=await catalog(market);
  assert.equal(data.sources[merchant(market)]?.status,"ok");
  for(const [sku,model,voltage,amp,min,max] of models){
   const raw=data.products.find(p=>p.id===merchant(market)+":"+sku);
   assert.ok(raw,market+":"+sku);
   assert.equal(raw.category,"shore_charger");
   assert.equal(raw.available,true);
   assert.equal(raw.priceCurrency,market==="cs"?"CZK":market==="sk"?"EUR":"PLN");
   const result=refreshCatalogProduct(raw);
   assert.equal(result.specs.chargingManufacturerModel,model);
   assert.equal(result.specs.chargingProfileEvidenceUrl,pdf);
   assert.deepEqual(result.specs.chargingBatteryTypes,["lifepo4","lead"]);
   assert.deepEqual(result.specs.chargingAcInputRangeV,[100,240]);
   assert.deepEqual(result.specs.chargingInputVoltagesV,[230]);
   assert.equal(result.specs.chargingCapacityMinAh,min);
   assert.equal(result.specs.chargingCapacityMaxAh,max);
   assert.equal(result.specs.currentA,amp);
   const customer=setup(market,voltage,Math.max(min,100),amp);
   assert.equal(recommendProducts([raw],customer,3,data.sources).shore_charger?.[0]?.product.id,raw.id);
   assert.deepEqual(recommendProducts([raw],setup(market,voltage,min-1,amp),3,data.sources).shore_charger,[]);
   assert.deepEqual(recommendProducts([raw],setup(market,voltage,max+1,amp),3,data.sources).shore_charger,[]);
   assert.deepEqual(recommendProducts([raw],customer,3,{[raw.merchant]:{status:"stale"}}).shore_charger,[]);
  }
 }
});

test("exact shore manufacturer profile fails closed on wrong variant, URL, campaign, currency, voltage, current or stock",async()=>{
 for(const market of markets){
  const data=await catalog(market);
  for(const [sku,,voltage,amp] of models){
   const raw=data.products.find(p=>p.id===merchant(market)+":"+sku);
   const bad=[
    {...raw,id:raw.id+"-unknown"},
    {...raw,name:raw.name+" EX"},
    {...raw,productUrl:raw.productUrl+"other"},
    {...raw,affiliateUrl:raw.affiliateUrl.replace("f34c86c8","bad")},
    {...raw,affiliateUrl:raw.affiliateUrl.replace("a_bid","other")},
    {...raw,affiliateUrl:raw.affiliateUrl.replace("desturl","bad_desturl")},
    {...raw,merchant:"other"},
    {...raw,priceCurrency:"USD"},
    {...raw,available:null},
    {...raw,available:false},
    {...raw,staleSource:true},
    {...raw,priceCzk:0},
    {...raw,category:"dc_charger"},
    {...raw,specs:{...raw.specs,voltageV:voltage===12?24:12}},
    {...raw,specs:{...raw.specs,currentA:amp+1}},
    {...raw,specs:{...raw.specs,chargingVoltagesV:[voltage===12?24:12]}},
   ];
   for(const product of bad){
    const result=addVerifiedDometicMcaShoreProfile(product,product.specs);
    assert.equal(result.chargingProfileEvidenceUrl,undefined,raw.id+":"+product.name);
   }
  }
 }
});

test("the existing lead-only interpretation is not silently widened for unreviewed products",async()=>{
 const sk=await catalog("sk");
 const raw=sk.products.find(p=>p.id==="padabo_sk:24087_26040");
 assert.ok(raw);
 const product=refreshCatalogProduct({...raw,id:"padabo_sk:unlisted-1215"});
 assert.equal(product.specs.chargingProfileEvidenceUrl,undefined);
 assert.notDeepEqual(product.specs.chargingBatteryTypes,["lifepo4","lead"]);
});

test("SK PL and CZ served entrypoints use new source-backed charger importer",async()=>{
 const products=await readFile(new URL("../src/products.js",import.meta.url),"utf8");
 assert.ok(products.includes("dometic-mca-shore-profiles.js?v=20261122-shore-mca-cz1"));
 for(const locale of ["cs","sk","pl"]){
  const p=locale==="cs"?"index.html":locale+"/index.html";
  const a=locale==="cs"?"src/app.js":"src/app-"+locale+".js";
  const html=await readFile(new URL("../"+p,import.meta.url),"utf8");
  const app=await readFile(new URL("../"+a,import.meta.url),"utf8");
  assert.ok(html.includes((locale==="cs"?"app.js":"app-"+locale+".js")+"?v=20261122-shore-mca1-result-scroll1-cz-mca1-superpack-cz1-orion-cz1-mppt-cz1-featured6"));
  assert.ok(app.includes("products.js?v=20261122-mppt-cz1"));
 }
});

test("Czech MCA source proof is variant-specific despite shared parent product URLs",async()=>{
 const data=await catalog("cs");
 for(const [sku,model,voltage,amp,min,max] of models){
  const raw=data.products.find(p=>p.id==="svetkaravanu:"+sku);
  assert.ok(raw,"Missing real CZ feed variant "+sku);
  assert.ok(raw.productUrl.startsWith("https://www.svetkaravanu.cz/"));
  assert.ok(raw.affiliateUrl.includes("a_bid=38137ac4"));
  assert.ok(raw.affiliateUrl.includes("a_aid=f34c86c8"));
  const verified=refreshCatalogProduct(raw);
  assert.equal(verified.specs.chargingManufacturerModel,model);
  assert.equal(verified.specs.currentA,amp);
  assert.deepEqual(verified.specs.chargingInputVoltagesV,[230]);
  assert.deepEqual(verified.specs.chargingBatteryTypes,["lifepo4","lead"]);
  assert.equal(verified.specs.chargingCapacityMinAh,min);
  assert.equal(verified.specs.chargingCapacityMaxAh,max);
  const other=models.find(([id])=>id!==sku);
  assert.ok(other);
  const impostor={...raw,name:data.products.find(p=>p.id==="svetkaravanu:"+other[0]).name};
  assert.equal(addVerifiedDometicMcaShoreProfile(impostor,impostor.specs).chargingManufacturerModel,undefined);
 }
});
