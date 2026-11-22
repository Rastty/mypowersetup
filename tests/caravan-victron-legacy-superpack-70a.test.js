import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { refreshCatalogProduct, recommendProducts } from "../src/products.js";
import { documentedBatteryContinuousBmsAmps, batteryDischargeBuyerCheck } from "../src/caravan-bms-buyer-evidence.js";
import { minimumBatteryDischargeAmps } from "../src/battery-discharge-safety.js";
import { assessRecommendationCoverage } from "../src/recommendation-coverage.js";
import { buildProductPackages } from "../src/packages.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";

const PDF="https://www.victronenergy.com/upload/documents/Datasheet-12%2C8V-%26-25%2C6-Lithium-SuperPack-EN.pdf";
const variants=[
 ["cs","data/products.json","svetkaravanu:26965_28369","svetkaravanu","CZK","38137ac4",
 "Baterie Victron Energy LiFePO Lithium SuperPack 12,8 V kapacita 200 Ah",
 "https://www.svetkaravanu.cz/baterie-victron-energy-lifepo-lithium-superpack-12-8-v_z26965/"],
 ["sk","data/products-sk.json","padabo_sk:26965_28369","padabo_sk","EUR","7aed5c13",
 "Batéria Victron Energy LiFePO Lithium SuperPack 12,8 V kapacita 200 Ah",
 "https://www.padabo.sk/bateria-victron-energy-lifepo-lithium-superpack-12-8-v_z26965/"],
 ["pl","data/products-pl.json","padabo_pl:26965_28369","padabo_pl","PLN","95d61abf",
 "Bateria Victron Energy LiFePO Lithium SuperPack 12,8 V pojemność 200 Ah",
 "https://www.padabo.pl/bateria-victron-energy-lifepo-lithium-superpack-12-8-v_z26965/"],
];
const catalogCache=new Map();
async function catalog(path){
  if(!catalogCache.has(path))catalogCache.set(path,JSON.parse(await readFile(new URL("../"+path,import.meta.url),"utf8")));
  return catalogCache.get(path);
}
const setup=(locale,watts)=>({
  locale, systemVoltage:12,batteryType:"lifepo4",batteryAh:200,
  inverterWatts:watts,solarWatts:380,controllerAmps:30,
  charging:{dcDc:{enabled:false},shore:{enabled:false}},
});

test("legacy CZ SK PL Victron 12.8V/200Ah is 70A max CONTINUOUS, not 200Ah=200A or the sibling 100Ah's 100A",async()=>{
  for(const [locale,path,id,merchant,currency,bid,name,url] of variants){
    const c=await catalog(path);
    assert.equal(c.sources[merchant]?.status,"ok",id);
    const raw=c.products.find(p=>p.id===id);
    assert.ok(raw,id);
    assert.equal(raw.merchant,merchant);
    assert.equal(raw.category,"battery");
    assert.equal(raw.name,name);
    assert.equal(raw.productUrl,url);
    assert.equal(raw.available,true);
    assert.equal(raw.priceCurrency,currency);
    assert.ok(Number.isFinite(raw.priceCzk) && raw.priceCzk>0);
    const a=new URL(raw.affiliateUrl);
    assert.equal(a.origin,"https://ehub.cz");
    assert.equal(a.searchParams.get("a_aid"),"f34c86c8");
    assert.equal(a.searchParams.get("a_bid"),bid);
    assert.equal(a.searchParams.get("desturl"),url);
    const p=refreshCatalogProduct(raw);
    assert.equal(p.specs.voltageV,12);
    assert.equal(p.specs.capacityAh,200);
    assert.equal(p.specs.batteryType,"lifepo4");
    assert.equal(p.specs.bmsContinuousCurrentA,70,id);
    assert.equal(p.specs.bmsEvidenceKind,"manufacturer_max_continuous",id);
    assert.equal(p.specs.bmsManufacturerModel,"BAT512120705");
    assert.equal(p.specs.bmsManufacturerEvidenceUrl,PDF);
    assert.equal(documentedBatteryContinuousBmsAmps(p),70);
    assert.notEqual(p.specs.currentA,p.specs.bmsContinuousCurrentA,"shared seller currentA does not establish variant BMS");
    const ok=setup(locale,600);
    assert.equal(minimumBatteryDischargeAmps(ok),59);
    assert.equal(recommendProducts([raw],ok,3,c.sources).battery[0]?.product.id,id);
    assert.match(batteryDischargeBuyerCheck(p,ok,locale),locale==="cs"?/maximální trvalý vybíjecí proud 70 A/:locale==="sk"?/maximálny trvalý vybíjací prúd 70 A/:/maksymalny ciągły prąd rozładowania 70 A/);
    const tooMuch=setup(locale,750); // needs ceil(750/(12 * 0.85))=74A
    assert.equal(minimumBatteryDischargeAmps(tooMuch),74);
    assert.deepEqual(recommendProducts([raw],tooMuch,3,c.sources).battery,[],id);
    assert.deepEqual(recommendProducts([raw],ok,3,{[merchant]:{status:"stale"}}).battery,[],id);
  }
});

test("unknown, wrong variant, wrong affiliate and corrupt stock/price can never gain legacy SuperPack 70A proof",async()=>{
  for(const [,path,id,,,,,] of variants) {
    const c=await catalog(path),raw=c.products.find(p=>p.id===id);
    for(const broken of [
      {...raw,id:id.replace("28369","28368")},
      {...raw,name:raw.name.replace("200 Ah","100 Ah").replace("200Ah","100Ah")},
      {...raw,name:raw.name+" NG"},
      {...raw,merchant:"unapproved"},
      {...raw,priceCurrency:"USD"},
      {...raw,priceCzk:0},
      {...raw,priceCzk:null},
      {...raw,available:false},
      {...raw,available:null},
      {...raw,productUrl:raw.productUrl+"wrong"},
      {...raw,affiliateUrl:raw.affiliateUrl.replace("f34c86c8","other")},
      {...raw,affiliateUrl:raw.affiliateUrl.replace(new URL(raw.affiliateUrl).searchParams.get("a_bid"),"other")},
      {...raw,affiliateUrl:raw.affiliateUrl+"&extra=changed"},
      {...raw,specs:{...raw.specs,capacityAh:100}},
      {...raw,specs:{...raw.specs,voltageV:24}},
      {...raw,specs:{...raw.specs,batteryType:"lead"}},
      {...raw,specs:{...raw.specs,bmsContinuousCurrentA:100}},
    ]){
      const checked=refreshCatalogProduct(broken);
      assert.equal(documentedBatteryContinuousBmsAmps(checked),null,id+" "+broken.name);
    }
  }
});

test("actual CZ 200Ah 70A seller battery enables a six-category 12V 600W buyer basket but not a 750W promise",async()=>{
  const c=await catalog("data/products.json");
  const ids=[
    "svetkaravanu:26965_28369", // 12V/200Ah legacy 70A continuous
    "svetkaravanu:109069",       // 2 x 190Wp documented panel
    "svetkaravanu:24828",        // SmartSolar MPPT 100/30
    "svetkaravanu:104878_31000",// 12V/600W pure-sine inverter
    "svetkaravanu:26963_28360",// Orion-Tr Smart 12/12-30A DC-DC
    "svetkaravanu:24087_26042",// Dometic MCA1235 shore 35A supports 70-280Ah
  ];
  const selected=ids.map(id=>c.products.find(p=>p.id===id));
  assert.ok(selected.every(p=>p?.available===true&&p.priceCurrency==="CZK"&&p.priceCzk>0));
  const s={...setup("cs",600),charging:{
    starterVoltage:12,
    dcDc:{enabled:true,suggestedCurrentAmps:30},
    shore:{enabled:true,suggestedCurrentAmps:35}
  }};
  const rec=recommendProducts(selected,s,3,c.sources);
  const categories=["battery","solar_panel","controller","inverter","dc_charger","shore_charger"];
  for(const cat of categories)assert.equal(rec[cat].length,1,cat);
  const coverage=assessRecommendationCoverage(rec,s,"cs");
  assert.equal(coverage.complete,true);
  const packs=buildProductPackages(rec,s);
  const plan=buildCaravanBuyerChecklist({coverage,packages:packs,recommendations:rec,setup:s,locale:"cs"});
  assert.equal(plan.readyCount,6);
  assert.equal(plan.complete,true);
  assert.equal(plan.rows.find(r=>r.category==="controller").pvWiringReview?.status,"within_reviewed_limits");
  assert.equal(purchaseReadyCaravanPackages(packs,plan)[0]?.id,"recommended");
  const excess={...s,inverterWatts:750};
  assert.equal(recommendProducts(selected,excess,3,c.sources).battery.length,0);
});

test("market frontend versions load 70A proof for source checks, decision facts and buying plans",async()=>{
  const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
  const [products,evidence,facts,readiness]=await Promise.all([
    read("src/products.js"),read("src/caravan-bms-buyer-evidence.js"),
    read("src/product-decision-facts.js"),read("src/caravan-package-readiness.js")
  ]);
  assert.ok(products.includes("caravan-bms-manufacturer-proof.js?v=20261122-legacy70a"));
  assert.ok(products.includes("caravan-bms-buyer-evidence.js?v=20261122-legacy70a"));
  assert.ok(evidence.includes("caravan-bms-manufacturer-proof.js?v=20261122-legacy70a"));
  assert.ok(facts.includes("caravan-bms-buyer-evidence.js?v=20261122-legacy70a"));
  assert.ok(readiness.includes("caravan-bms-buyer-evidence.js?v=20261122-legacy70a"));
  for(const [app,page]of [["app.js","index.html"],["app-sk.js","sk/index.html"],["app-pl.js","pl/index.html"]]){
    const [js,html]=await Promise.all([read("src/"+app),read(page)]);
    assert.ok(js.includes("products.js?v=20261122-legacy70a"),app);
    assert.ok(js.includes("caravan-package-readiness.js?v=20261122-legacy70a"),app);
    assert.ok(html.includes(app+"?v=20261122-shore-mca1-result-scroll1-cz-mca1-superpack-cz1-orion-cz1-mppt-cz1-featured6-budget-preview1-legacy70a-ehubsrc1-merchant-count1-unpriced1"),page);
  }
});
