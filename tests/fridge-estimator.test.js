import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { estimateFridgeConsumption } from "../src/fridge-estimator.js";
import { buildFridgeEstimateAutonomyUrl,applyCalculatorHandoffPrefill } from "../src/calculator-handoff.js";
import { classifyGuideCalculatorLink } from "../src/analytics-links.js";
const defaults={voltage:12,amps:5,duty:40,otherWh:100};
test("duty-cycle estimate preserves total energy and rounds transfer UP",()=>{
 assert.deepEqual(estimateFridgeConsumption(defaults),{fridgeWh:576,totalWh:676,handoffWh:680});
 assert.equal(estimateFridgeConsumption({...defaults,voltage:24}).fridgeWh,1152);
 assert.equal(estimateFridgeConsumption({voltage:12,amps:5,duty:25,otherWh:0}).handoffWh,360);
 assert.equal(estimateFridgeConsumption({...defaults,duty:0,otherWh:0}).handoffWh,null);
 assert.equal(estimateFridgeConsumption({...defaults,otherWh:20000}).handoffWh,null);
 for(const values of [{voltage:48},{amps:""},{amps:0},{amps:0.11},{duty:101},{duty:10.5},{otherWh:-1},{otherWh:0.5}])assert.equal(estimateFridgeConsumption({...defaults,...values}),null);
});
const markets=[{"l":"cs","guide":"/pruvodce/spotreba-kompresorove-lednice/","route":"/kalkulacky/vydrz-baterie/"},{"l":"sk","guide":"/sk/sprievodca/spotreba-kompresorovej-chladnicky/","route":"/sk/kalkulacky/vydrz-baterie/"},{"l":"pl","guide":"/pl/poradnik/zuzycie-lodowki-kompresorowej/","route":"/pl/kalkulatory/czas-pracy-akumulatora/"}];
test("calculated estimate links are local, Wh-only and reject unknown or injected battery data",async()=>{
 for(const {l,guide,route} of markets){
  const href=buildFridgeEstimateAutonomyUrl(680,l);
  assert.equal(href,route+"?mps_from=fridge-estimate&dailyWh=680");
  assert.equal(classifyGuideCalculatorLink(href).destination_path,route);
  const field={value:"600"},form={elements:{namedItem:key=>key==="dailyWh"?field:null}};
  const args={form,intent:"battery-autonomy",locale:l,pathname:route};
  assert.equal(applyCalculatorHandoffPrefill({...args,search:new URL(href,"https://mypowersetup.com").search})?.from,"fridge-estimate");
  assert.equal(field.value,"680");
  for(const extra of ["&batteryType=lead","&systemVoltage=24","&dailyWh=700","&utm_source=bad"]){
   field.value="600";assert.equal(applyCalculatorHandoffPrefill({...args,search:"?mps_from=fridge-estimate&dailyWh=680"+extra}),null);assert.equal(field.value,"600");
  }
  const html=await readFile(guide.slice(1)+"index.html","utf8");
  assert.ok(html.includes('data-fridge-locale="'+l+'"'));
  assert.ok(html.includes('href="'+route+'"'));
  assert.match(html,/data-fridge-form hidden/);
  assert.match(html,/data-fridge-handoff hidden/);
 }
 for(const v of [0,49,681,20010,NaN])assert.equal(buildFridgeEstimateAutonomyUrl(v,"cs"),null);
 assert.equal(buildFridgeEstimateAutonomyUrl(680,"hu"),null);
});
