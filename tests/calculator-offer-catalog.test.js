import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  LIGHTWEIGHT_CATALOG_PATH, FULL_CATALOG_PATH,
  acceptCalculatorOffersSnapshot, projectCalculatorOffers, loadCalculatorOffers,
} from "../src/calculator-offer-catalog.js";
import { selectBatteryCalculatorOffers } from "../src/battery-calculator-offers.js";
import { selectMpptCalculatorOffers } from "../src/mppt-calculator-offers.js";
import { calculateLanding } from "../src/calculator-landing.js";

const at = "2026-11-09T19:00:00Z";
const now = Date.parse("2026-11-09T20:00:00Z");
const catalog = {
  generatedAt: at,
  sources: { vselektro: { status:"ok", feedUrl:"https://private.example/feed?key=SECRET" },
    reslshop: { status:"ok" } },
  products: [],
};
const specs = [
  ["battery","sunstone-slpo12-100n","/lifepo4-baterie-12v-100ah-sunstone-power-slpo12-100n/",
    {voltageV:12,batteryType:"lifepo4",capacityAh:100,bmsContinuousCurrentA:100}],
  ["battery","sunstone-slpo12-200n","/lifepo4-baterie-12v-200ah-slpo12-200n-hc200a-sunstone-power/",
    {voltageV:12,batteryType:"lifepo4",capacityAh:200,bmsContinuousCurrentA:200}],
  ["controller","victron-smartsolar-100-50","/solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/",
    {currentA:50,maxPvVocV:100,maxPvIscA:60,systemVoltagesV:[12,24],maxPvWattsBySystemVoltage:{12:700,24:1400}}],
];
function item([category,suffix,path,technical],index) {
  const productUrl = "https://www.vselektro.eu" + path;
  const click = new URL("https://ehub.cz/system/scripts/click.php");
  click.searchParams.set("a_aid", "f34c86c8");
  click.searchParams.set("a_bid", "f897865f");
  click.searchParams.set("desturl", productUrl);
  return {
    id:"vselektro:"+suffix, name:"Povolené SKU "+suffix, description:"VERY-LONG-INTERNAL-DESCRIPTION ".repeat(40),
    productUrl, affiliateUrl: click.href,
    merchant:"vselektro",category,available:true,staleSource:false,
    priceCzk:5900+index*2200,priceCurrency:"CZK",verifiedAt:"2026-10-13",offerObservedAt:at,
    specs:technical,
  };
}
catalog.products = [
  ...specs.map(item),
  ...Array.from({length:450},(_,i)=>({
    id:"reslshop:unapproved-"+i,merchant:"reslshop",description:"PRIVATE_DESCRIPTION ".repeat(100),
    category:"controller",name:"Unrelated SKU "+i,
  })),
];

test("snapshot projects ONLY currently eligible exact VSelektro SKU with no feed credential or unrelated product", () => {
  const compact = projectCalculatorOffers(catalog,now);
  assert.equal(compact.schemaVersion,1);
  assert.equal(compact.generatedAt,at);
  assert.deepEqual(compact.sources, {vselektro:{status:"ok"}});
  assert.deepEqual(compact.products.map(x=>x.id),specs.map(x=>"vselektro:"+x[1]));
  const bytes = Buffer.byteLength(JSON.stringify(compact));
  assert.ok(bytes < 6000,bytes+"B lightweight payload");
  assert.ok(bytes*30 < Buffer.byteLength(JSON.stringify(catalog)),"avoid bulk 1.6MB-style transfer");
  const serialized = JSON.stringify(compact);
  for(const secret of ["SECRET","PRIVATE_DESCRIPTION","VERY-LONG-INTERNAL-DESCRIPTION","private.example","reslshop"])
    assert.ok(!serialized.includes(secret),secret);
  assert.ok(acceptCalculatorOffersSnapshot(compact));
  const capacity = calculateLanding("battery-capacity", {
    dailyWh:300,autonomyDays:2,batteryType:"lifepo4",systemVoltage:"12",
  },"cs").result;
  assert.equal(capacity.batteryAh,80);
  assert.equal(selectBatteryCalculatorOffers(compact,capacity,now).length,2);
  const mppt = calculateLanding("mppt-sizing", {
    panelWatts:400,systemVoltage:"12",batteryType:"lifepo4",
  },"cs").result;
  assert.equal(selectMpptCalculatorOffers(compact,mppt,now).length,1);
});

test("stale feed or outdated catalog never refreshes offers by writing a fresh snapshot timestamp", () => {
  const yesterday = {...catalog,generatedAt:"2026-11-01T19:00:00Z"};
  const stale = projectCalculatorOffers(yesterday,now);
  assert.equal(stale.generatedAt,yesterday.generatedAt);
  assert.equal(stale.sources.vselektro.status,"stale");
  assert.equal(stale.products.length,0);
  const feedUnavailable = projectCalculatorOffers({
    ...catalog,sources:{...catalog.sources,vselektro:{status:"error"}},
  },now);
  assert.equal(feedUnavailable.products.length,0);
  const changedProduct = projectCalculatorOffers({
    ...catalog,
    products:catalog.products.map(p=>p.id==="vselektro:sunstone-slpo12-100n"
      ? {...p,available:false}:p),
  },now);
  assert.equal(changedProduct.products.length,2);
  const duplicates = projectCalculatorOffers({
    ...catalog,
    products:[...catalog.products,catalog.products[0]],
  },now);
  assert.ok(!duplicates.products.some(x=>x.id===catalog.products[0].id));
});

test("loader uses tiny snapshot without ever downloading full catalog on success", async () => {
  const compact = projectCalculatorOffers(catalog,now);
  const calls=[];
  const fetchImpl=async(path,options)=>{
    calls.push({path,options});
    if(path!==LIGHTWEIGHT_CATALOG_PATH)throw Error("full catalog requested");
    return {ok:true,status:200,json:async()=>compact};
  };
  assert.deepEqual(await loadCalculatorOffers(fetchImpl),compact);
  assert.deepEqual(calls.map(x=>x.path),[LIGHTWEIGHT_CATALOG_PATH]);
  assert.equal(calls[0].options.cache,"no-store");
  assert.equal(calls[0].options.redirect,"error");
  assert.ok(calls[0].options.signal);
});

test("404 or 410 only: safely allow legacy full catalog until scheduled sync publishes first snapshot", async () => {
  for(const status of [404,410]) {
    const calls=[];
    const loaded=await loadCalculatorOffers(async path=>{
      calls.push(path);
      return path===LIGHTWEIGHT_CATALOG_PATH
        ? {ok:false,status}
        : {ok:true,status:200,json:async()=>catalog};
    });
    assert.equal(loaded,catalog);
    assert.deepEqual(calls,[LIGHTWEIGHT_CATALOG_PATH,FULL_CATALOG_PATH]);
  }
});

test("no fallback to heavy or untrusted catalog for malformed, stale, denied, redirect or network failure", async () => {
  for(const invalid of [
    null,{},{"schemaVersion":2,generatedAt:at,sources:{vselektro:{status:"ok"}},products:[]},
    {"schemaVersion":1,generatedAt:at,sources:{vselektro:{status:"ok"}},products:[{id:"malicious",category:"battery"}]},
    {"schemaVersion":1,generatedAt:at,sources:{vselektro:{status:"ok"}},products:Array.from({length:7},()=>({id:"x"}))},
  ]) {
    const calls=[];
    const result=await loadCalculatorOffers(async path=>{
      calls.push(path);
      return {ok:true,status:200,json:async()=>invalid};
    });
    assert.equal(result,null);
    assert.deepEqual(calls,[LIGHTWEIGHT_CATALOG_PATH]);
  }
  for(const status of [400,401,403,429,500,503]) {
    let count=0;
    const outcome=await loadCalculatorOffers(async()=>{count++;return {ok:false,status};});
    assert.equal(outcome,null);
    assert.equal(count,1);
  }
  assert.equal(await loadCalculatorOffers(async()=>{throw Error("no network");}),null);
});

test("release wiring shares the compact loader and generates it in existing daily affiliate sync", async () => {
  const [mppt,battery,sync,workflow,checker,mpptHtml,batteryHtml]=await Promise.all([
    readFile("src/mppt-calculator-offers-browser.js","utf8"),
    readFile("src/battery-calculator-offers-browser.js","utf8"),
    readFile("scripts/sync-products.mjs","utf8"),
    readFile(".github/workflows/sync-products.yml","utf8"),
    readFile("scripts/check-calculator-offers-cz.mjs","utf8"),
    readFile("kalkulacky/mppt-regulator/index.html","utf8"),
    readFile("kalkulacky/kapacita-baterie/index.html","utf8"),
  ]);
  for(const source of [mppt,battery]){
    assert.match(source,/loadCalculatorOffers\(fetchImpl\)/);
    assert.doesNotMatch(source,/fetchImpl\("\/data\/products\.json"/);
    assert.match(source,/calculator-offer-catalog\.js\?v=20261109-lightweight-cz1/);
  }
  assert.match(mpptHtml,/calculator-landing-browser\.js\?v=20261110-attributed-mppt-specialist1/);
  assert.match(batteryHtml,/calculator-landing-browser\.js\?v=20261110-attributed-buyer1/);
  assert.match(sync,/projectCalculatorOffers\(fullCatalog/);
  assert.match(sync,/data\/calculator-offers-cz\.json/);
  assert.match(workflow,/FILES="data\/products\.json data\/calculator-offers-cz\.json/);
  assert.match(workflow,/node scripts\/check-calculator-offers-cz\.mjs/);
  assert.match(checker,/CALCULATOR_OFFERS_SOURCE_DRIFT/);
});
