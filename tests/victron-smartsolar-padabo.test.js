import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { addVerifiedSmartSolarChargingProfiles } from "../src/victron-smartsolar-charging-profiles.js";
import { recommendProducts, refreshCatalogProduct } from "../src/products.js";
import { renderLocalizedCaravanBuyerPlan } from "../src/caravan-buyer-plan-localized.js";

const rows = [
  ["sk","24828","Solárny regulátor MPPT Victron Energy SmartSolar 100/30","solarny-regulator-mppt-victron-energy-smartsolar-100-30_z24828/",30,"7aed5c13","EUR"],
  ["sk","101985","Solárny regulátor MPPT Victron Energy SmartSolar 100/50","solarny-regulator-mppt-victron-energy-smartsolar-100-50_z101985/",50,"7aed5c13","EUR"],
  ["pl","24828","MPPT regulator solarny Victron SmartSolar 100/30","mppt-regulator-solarny-victron-smartsolar-100-30_z24828/",30,"95d61abf","PLN"],
  ["pl","101985","Kontroler słoneczny MPPT Victron Energy SmartSolar 100/50","kontroler-sloneczny-mppt-victron-energy-smartsolar-100-50_z101985/",50,"95d61abf","PLN"],
];

function product([locale,id,name,slug,current,bid,currency]) {
  const url = "https://www.padabo."+locale+"/"+slug;
  const affiliateUrl = new URL("https://ehub.cz/system/scripts/click.php");
  affiliateUrl.searchParams.set("a_aid","f34c86c8");
  affiliateUrl.searchParams.set("a_bid",bid);
  affiliateUrl.searchParams.set("desturl",url);
  return {
    id:"padabo_"+locale+":"+id,merchant:"padabo_"+locale,name,
    category:"controller",categoryPath:"Solárne regulátory | Kontrolery solarne",
    priceCzk:5600,priceCurrency:currency,available:true,
    productUrl:url,affiliateUrl:affiliateUrl.href,
    specs:{currentA:current,chargingBatteryTypes:[]},
  };
}

const setup = {
  locale:"sk", batteryType:"lifepo4",batteryAh:100,systemVoltage:12,
  solarWatts:400,controllerAmps:20,inverterWatts:0,
  charging:{dcDc:{},shore:{}},
};

test("four exact Padabo SK/PL SmartSolar products get documented 12/24V PV and lithium limits", () => {
  for (const row of rows) {
    const p=product(row);
    const enriched=addVerifiedSmartSolarChargingProfiles(p,p.specs);
    assert.deepEqual(enriched.systemVoltagesV,[12,24],p.id);
    assert.equal(enriched.currentA,row[4],p.id);
    assert.equal(enriched.maxPvVocV,100,p.id);
    assert.equal(enriched.maxPvIscA,row[4]===30?35:60,p.id);
    assert.deepEqual(enriched.maxPvWattsBySystemVoltage,row[4]===30?{12:440,24:880}:{12:700,24:1400},p.id);
    assert.deepEqual(enriched.chargingBatteryTypes,["lifepo4","lead"],p.id);
    assert.match(enriched.chargingProfileEvidenceUrl,/^https:\/\/www\.victronenergy\.com\/media\/pg\/Manual_SmartSolar_MPPT_100-30__100-50\//,p.id);
    assert.equal(refreshCatalogProduct(p).specs.chargingProfileEvidenceUrl,enriched.chargingProfileEvidenceUrl,p.id);
  }
});

test("shared variant pages and fake SKU/merchant/currency/affiliate cannot inherit manufacturer proof",()=>{
  const p=product(rows[0]);
  const cases = [
    {...p,id:"padabo_sk:24827_26598"},
    {...p,merchant:"padabo_pl"},
    {...p,name:p.name+" - altered"},
    {...p,productUrl:"https://www.padabo.sk/solarne-regulatory/"},
    {...p,priceCurrency:"PLN"},
    {...p,affiliateUrl:p.affiliateUrl.replace("7aed5c13","95d61abf")},
    {...p,category:"inverter"},
    {...p,specs:{...p.specs,currentA:15}},
    {...p,specs:{...p.specs,maxPvVocV:150}},
    {...p,specs:{...p.specs,systemVoltagesV:[12,24,48]}},
    {...p,specs:{...p.specs,maxPvWattsBySystemVoltage:{12:800}}},
  ];
  for(const candidate of cases) {
    const result=addVerifiedSmartSolarChargingProfiles(candidate,candidate.specs);
    assert.equal(result,candidate.specs,candidate.id+" "+candidate.name);
  }
});

test("12V panel capacity, confirmed current and stale-source gates remain active",()=>{
  const matched=product(rows[0]);
  assert.deepEqual(recommendProducts([matched],setup,3,{padabo_sk:{status:"ok"}}).controller.map(x=>x.product.id),[matched.id]);
  assert.equal(recommendProducts([matched],{...setup,solarWatts:500},3,{padabo_sk:{status:"ok"}}).controller.length,0);
  assert.equal(recommendProducts([matched],{...setup,systemVoltage:48},3,{padabo_sk:{status:"ok"}}).controller.length,0);
  assert.equal(recommendProducts([matched],setup,3,{padabo_sk:{status:"stale"}}).controller.length,0);
});

test("SK/PL buyer plan uses existing source-backed manufacturer link only with a buyable offer",async()=>{
  for(const row of rows) {
    const locale=row[0],p=product(row),enriched=refreshCatalogProduct(p);
    const target={innerHTML:""};
    const plan={rows:[{category:"controller",ready:true,product:enriched,quantity:1}],
      complete:true,requiredCount:1,readyCount:1,manualDesign:false};
    renderLocalizedCaravanBuyerPlan({target,plan,locale,
      purchaseUrl:()=>enriched.affiliateUrl,purchaseCta:()=>"Kúpiť",merchantLabel:()=>locale,trackEvent:()=>{}});
    assert.match(target.innerHTML,/data-manufacturer-charging-proof/,enriched.id);
    assert.match(target.innerHTML,/data-affiliate-click/,enriched.id);
    const unbuyable={...plan,rows:[{...plan.rows[0],ready:false}],complete:false,readyCount:0};
    renderLocalizedCaravanBuyerPlan({target,plan:unbuyable,locale,
      purchaseUrl:()=>"",purchaseCta:()=>"Kúpiť",merchantLabel:()=>locale,trackEvent:()=>{}});
    assert.doesNotMatch(target.innerHTML,/data-manufacturer-charging-proof/,enriched.id);
  }
  const sk=await readFile(new URL("../sk/index.html",import.meta.url),"utf8");
  const pl=await readFile(new URL("../pl/index.html",import.meta.url),"utf8");
  assert.match(sk,/app-sk\.js\?v=20261122-shore-mca1/);
  assert.match(pl,/app-pl\.js\?v=20261122-shore-mca1/);
});
