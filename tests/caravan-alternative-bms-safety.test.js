import test from "node:test";
import assert from "node:assert/strict";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";

function product(id, category, specs = {}, name = id) {
  const productUrl = "https://www.padabo.sk/"+id+"/";
  return {
    id:"padabo_sk:"+id, merchant:"padabo_sk", category, name, specs, available:true,
    priceCurrency:"EUR", priceCzk:1000, productUrl,
    affiliateUrl:"https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=7aed5c13&desturl="+encodeURIComponent(productUrl),
  };
}
function packageVariant(id, battery, inverter) {
  return {id,requiredCategoryCount:2,items:[
    {category:"battery",product:battery},
    {category:"inverter",product:inverter}
  ]};
}
function makePlan(battery, inverter, watts=1000,voltage=12) {
  const setup={
    systemVoltage:voltage,inverterWatts:watts,batteryAh:100,batteryType:"lifepo4",
    charging:{dcDc:{},shore:{}}
  };
  const coverage={required:["battery","inverter"],manualDesignCharging:[]};
  const recommendations={
    battery:[{product:battery,score:90}],
    inverter:[{product:inverter,score:90}]
  };
  const plan=buildCaravanBuyerChecklist({coverage,recommendations,setup,locale:"sk"});
  assert.equal(plan.complete,true);
  assert.equal(plan.inverterWatts,watts);
  return plan;
}

test("complete buyer plan rejects an under-rated 50A alternate battery despite a safe recommended battery",()=>{
  const safe=product("safe","battery",{bmsContinuousCurrentA:200});
  const unsafe=product("superpack-ng","battery",{bmsContinuousCurrentA:50});
  const inverter=product("inverter","inverter",{powerW:1200});
  const plan=makePlan(safe,inverter,1000,12); // ceil(1000/12/0.85)=99A
  const variants=[
    packageVariant("recommended",safe,inverter),
    packageVariant("economy",unsafe,inverter),
    packageVariant("reserve",unsafe,inverter),
  ];
  assert.deepEqual(purchaseReadyCaravanPackages(variants,plan).map(v=>v.id),["recommended"]);
});
test("named advertised BMS below requirement is also rejected; unknown is not upgraded to manufacturer proof",()=>{
  const safe=product("safe","battery",{bmsContinuousCurrentA:200});
  const advertised=product("weak","battery",{},"100A BMS battery");
  const unknown=product("unknown","battery",{currentA:3000},"battery without BMS data");
  const inverter=product("inverter","inverter",{powerW:1600});
  const plan=makePlan(safe,inverter,1400,12); // 138A > advertised 100A
  const variants=[
    packageVariant("recommended",safe,inverter),
    packageVariant("economy",advertised,inverter),
    packageVariant("reserve",unknown,inverter)
  ];
  assert.deepEqual(purchaseReadyCaravanPackages(variants,plan).map(v=>v.id),["recommended","reserve"]);
});
test("uses requested load and voltage, not purchased inverter label or arbitrary capacity",()=>{
  const safe=product("safe","battery",{bmsContinuousCurrentA:100});
  const alternate=product("reviewed-50a","battery",{bmsContinuousCurrentA:50});
  const highLabelInverter=product("inverter-3000","inverter",{powerW:3000});
  const plan=makePlan(safe,highLabelInverter,900,24); // ceil(900/24/0.85)=45A
  const variants=[packageVariant("recommended",safe,highLabelInverter),packageVariant("economy",alternate,highLabelInverter)];
  assert.deepEqual(purchaseReadyCaravanPackages(variants,plan).map(v=>v.id),["recommended","economy"]);
  // Without AC load, do not disqualify batteries based on irrelevant BMS screening.
  const noAc={...plan,inverterWatts:0};
  assert.deepEqual(purchaseReadyCaravanPackages(variants,noAc).map(v=>v.id),["recommended","economy"]);
});
