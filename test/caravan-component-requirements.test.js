import test from "node:test";
import assert from "node:assert/strict";
import { caravanComponentRequirement } from "../src/caravan-component-requirements.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";

const setup = {
 systemVoltage:12, batteryAh:150, solarWatts:420, controllerAmps:35, inverterWatts:800,
 charging:{starterVoltage:12,dcDc:{suggestedCurrentAmps:30},shore:{suggestedCurrentAmps:20}}
};
test("exact Czech requirement labels use current calculator result, not guessed SKU details",()=>{
 assert.match(caravanComponentRequirement(setup,"battery","cs"),/150 Ah.*12 V/);
 assert.match(caravanComponentRequirement(setup,"solar_panel","cs"),/420 Wp/);
 assert.match(caravanComponentRequirement(setup,"controller","cs"),/35 A.*12 V/);
 assert.match(caravanComponentRequirement(setup,"inverter","cs"),/800 W.*12 V/);
 assert.match(caravanComponentRequirement(setup,"dc_charger","cs"),/30 A.*12 V.*12 V/);
 assert.match(caravanComponentRequirement(setup,"shore_charger","cs"),/20 A.*12 V/);
});
test("missing items preserve their exact calculated requirement, without inventing product",()=>{
 const plan=buildCaravanBuyerChecklist({coverage:{required:["battery","controller"],manualDesignCharging:[]},recommendations:{},setup,locale:"cs"});
 assert.equal(plan.readyCount,0);
 assert.equal(plan.rows[0].product,null);
 assert.match(plan.rows[0].requirement,/150 Ah/);
 assert.match(plan.rows[1].requirement,/35 A/);
});
test("localized SK and PL requirements are native and absent inputs do not fabricate minimums",()=>{
 assert.match(caravanComponentRequirement(setup,"solar_panel","sk"),/Požiadavka výpočtu/);
 assert.match(caravanComponentRequirement(setup,"solar_panel","pl"),/Wymagania obliczeń/);
 assert.equal(caravanComponentRequirement({}, "battery","cs"),null);
 assert.equal(caravanComponentRequirement({systemVoltage:12,batteryAh:0},"battery","cs"),null);
 assert.equal(caravanComponentRequirement(setup,"other","cs"),null);
});
