import test from "node:test";
import assert from "node:assert/strict";
import {estimateSolarCharge} from "../src/solar-charge-estimator.js";
import {buildCalculatorHandoffUrl,applyCalculatorHandoffPrefill} from "../src/calculator-handoff.js";
const defaults={capacityAh:100,systemVoltage:12,batteryType:"lifepo4",from:50,to:100,panelWp:200,sunHours:4,efficiency:75,dailyWh:550,targetDays:2};
test("solar charge estimator matches article, handles deficit and rounds target upward",()=>{
 const a=estimateSolarCharge(defaults);
 assert.deepEqual([a.missingWh,a.productionWh,a.surplusWh,a.days,a.minimumWp,a.additionalWp],[640,600,50,12.8,290,90]);
 const b=estimateSolarCharge({...defaults,sunHours:2});assert.equal(b.days,null);assert.equal(b.surplusWh,-250);
 assert.equal(estimateSolarCharge({...defaults,dailyWh:600}).days,null);
 const c=estimateSolarCharge({...defaults,systemVoltage:24,capacityAh:200,batteryType:"lead",dailyWh:0});
 assert.equal(c.missingWh,2400);assert.equal(c.minimumWp,400);
 for(const input of [{to:50},{panelWp:205},{sunHours:0},{systemVoltage:36},{dailyWh:""},{efficiency:100}])assert.equal(estimateSolarCharge({...defaults,...input}),null);
 const big=estimateSolarCharge({...defaults,capacityAh:1000,targetDays:.5,sunHours:.5,dailyWh:20000});assert.ok(big.minimumWp>5000);
 for(const [locale,pathname] of [["cs","/kalkulacky/mppt-regulator/"],["sk","/sk/kalkulacky/mppt-regulator/"],["pl","/pl/kalkulatory/regulator-mppt/"]]){
  const href=buildCalculatorHandoffUrl({intent:"solar-sizing",locale,result:{solarWatts:a.minimumWp,systemVoltage:a.systemVoltage},inputs:{batteryType:a.batteryType}});
  const fields={panelWatts:{value:""},systemVoltage:{value:""},batteryType:{value:""}};
  assert.ok(applyCalculatorHandoffPrefill({form:{elements:{namedItem:k=>fields[k]}},intent:"mppt-sizing",locale,pathname,search:new URL(href,"https://mypowersetup.com").search}));
  assert.equal(fields.panelWatts.value,"290");
 }
});
