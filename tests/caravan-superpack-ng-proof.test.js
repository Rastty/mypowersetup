import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { refreshCatalogProduct, recommendProducts } from "../src/products.js";
import { documentedBatteryContinuousBmsAmps, batteryDischargeBuyerCheck } from "../src/caravan-bms-buyer-evidence.js";
import { minimumBatteryDischargeAmps } from "../src/battery-discharge-safety.js";

const FIXTURES = [
  ["sk","data/products-sk.json", "padabo_sk:107356_32721",12],
  ["sk","data/products-sk.json", "padabo_sk:107358",24],
  ["pl","data/products-pl.json", "padabo_pl:107356_32721",12],
  ["pl","data/products-pl.json", "padabo_pl:107358",24],
];
const sourceUrl = "https://www.victronenergy.com/media/pg/Lithium_SuperPack_NG/en/technical-data.html";
const loaded=new Map();
async function marketFile(path) {
  if (!loaded.has(path)) loaded.set(path,JSON.parse(await readFile(new URL("../"+path,import.meta.url),"utf8")));
  return loaded.get(path);
}
test("exact Padabo SK PL SuperPack NG 100 Ah local offers receive conservative 50 A documented operating recommendation",async()=>{
  for(const [market,path,id,voltage] of FIXTURES){
    const catalog=await marketFile(path);
    const original=catalog.products.find(p=>p.id===id);
    assert.ok(original,market+" "+id);
    assert.equal(original.available,true);
    assert.equal(catalog.sources[original.merchant]?.status,"ok");
    const p=refreshCatalogProduct(original);
    assert.equal(p.specs.voltageV,voltage,id);
    assert.equal(p.specs.capacityAh,100,id);
    assert.equal(p.specs.bmsContinuousCurrentA,50,id);
    assert.equal(p.specs.bmsEvidenceKind,"manufacturer_recommended_sustained",id);
    assert.equal(p.specs.bmsManufacturerEvidenceUrl,sourceUrl,id);
    assert.equal(documentedBatteryContinuousBmsAmps(p),50,id);
    const setup={systemVoltage:voltage,batteryAh:100,batteryType:"lifepo4",inverterWatts:Math.floor(voltage*0.85*40),locale:market};
    assert.ok(minimumBatteryDischargeAmps(setup)<=50);
    const offers=recommendProducts([original],setup,3,catalog.sources).battery;
    assert.equal(offers.length,1,id);
    assert.equal(offers[0].product.id,id);
    assert.match(batteryDischargeBuyerCheck(p,setup,market),market==="sk"?/Výrobca odporúča na trvalú prevádzku 50 A/:/Producent zaleca do pracy ciągłej 50 A/);
    assert.deepEqual(recommendProducts([original],setup,3,{[original.merchant]:{status:"stale"}}).battery,[]);
    // Sustained 0.5C recommendations are not a 2C uninterrupted inverter guarantee.
    const excessive={...setup,inverterWatts:Math.ceil(voltage*.85*90)};
    assert.deepEqual(recommendProducts([original],excessive,3,catalog.sources).battery,[],id);
  }
});
test("exact product identity, currency, affiliate tracking and voltage are mandatory, without trusted feed metadata",async()=>{
  for(const [,path,id] of FIXTURES){
    const catalog=await marketFile(path);
    const original=catalog.products.find(p=>p.id===id);
    const altered=[
      {...original,name:original.name+" unrelated"},
      {...original,priceCurrency:"USD"},
      {...original,merchant:"unknown"},
      {...original,available:false},
      {...original,productUrl:"https://elsewhere.invalid/"},
      {...original,affiliateUrl:"https://ehub.cz/system/scripts/click.php?a_aid=other&a_bid=95d61abf&desturl="+encodeURIComponent(original.productUrl)},
      {...original,id:id+"_other_variant"},
      {...original,specs:{...original.specs,voltageV:48}},
    ];
    for(const product of altered) {
      const refreshed=refreshCatalogProduct(product);
      assert.equal(documentedBatteryContinuousBmsAmps(refreshed),null,id+" "+product.name);
    }
  }
});
