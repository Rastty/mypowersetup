import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { refreshCatalogProduct, recommendProducts } from "../src/products.js";
import { documentedBatteryContinuousBmsAmps, batteryDischargeEvidenceTier } from "../src/caravan-bms-buyer-evidence.js";
import { minimumBatteryDischargeAmps } from "../src/battery-discharge-safety.js";
const id="vselektro:sunstone-slpo12-200n";
const source="https://www.sunstonepower.com/LiFePO4_Battery/137.html";
async function offer(){
 const catalog=JSON.parse(await readFile(new URL("../data/calculator-offers-cz.json",import.meta.url),"utf8"));
 const raw=catalog.products.find(p=>p.id===id);
 assert.ok(raw,"CZ reviewed VSelektro SKU must be in local lightweight catalog");
 return {raw,catalog};
}
test("manufacturer's exact 200A Sunstone N variant becomes documented, purchasable for an actual 12V inverter load",async()=>{
 const {raw,catalog}=await offer();
 assert.equal(raw.available,true);
 assert.equal(raw.priceCurrency,"CZK");
 assert.equal(catalog.sources.vselektro.status,"ok");
 const p=refreshCatalogProduct(raw);
 assert.equal(p.specs.bmsContinuousCurrentA,200);
 assert.equal(p.specs.bmsManufacturerEvidenceUrl,source);
 assert.equal(p.specs.bmsManufacturerModel,"SLPO12-200N(200A) HC200A");
 assert.equal(documentedBatteryContinuousBmsAmps(p),200);
 const setup={locale:"cs",systemVoltage:12,batteryType:"lifepo4",batteryAh:200,inverterWatts:1600,solarWatts:300,controllerAmps:30,charging:{dcDc:{},shore:{}}};
 assert.equal(minimumBatteryDischargeAmps(setup),157);
 assert.equal(batteryDischargeEvidenceTier(p,setup),2);
 const options=recommendProducts([raw],setup,3,catalog.sources);
 assert.equal(options.battery[0]?.product.id,id);
 assert.deepEqual(recommendProducts([raw],setup,3,{vselektro:{status:"stale"}}).battery,[]);
 assert.deepEqual(recommendProducts([raw],{...setup,inverterWatts:2500},3,catalog.sources).battery,[]);
});
test("other HC variant, name, URL, tracking, currency, current, chemistry or stock never inherit manufacturer evidence",async()=>{
 const {raw}=await offer();
 const forged=[
  {...raw,id:"vselektro:sunstone-slpo12-200m-hc200a"},
  {...raw,id:"vselektro:sunstone-slpo12-200"},
  {...raw,name:raw.name.replace("HC200A","")},
  {...raw,merchant:"other"},
  {...raw,productUrl:"https://www.vselektro.eu/other-battery/"},
  {...raw,affiliateUrl:raw.affiliateUrl.replace("f34c86c8","fake")},
  {...raw,affiliateUrl:raw.affiliateUrl.replace("f897865f","fake")},
  {...raw,priceCurrency:"EUR"},
  {...raw,available:false},
  {...raw,specs:{...raw.specs,capacityAh:100}},
  {...raw,specs:{...raw.specs,voltageV:24}},
  {...raw,specs:{...raw.specs,bmsContinuousCurrentA:100}},
  {...raw,specs:{...raw.specs,batteryType:"lead"}},
 ];
 for(const x of forged){
  const p=refreshCatalogProduct(x);
  assert.equal(documentedBatteryContinuousBmsAmps(p),null,JSON.stringify({id:x.id,name:x.name,merchant:x.merchant}));
 }
});
