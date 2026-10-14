import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { czechProductDecisionFacts, czechProductRequirement, czechPackageFitSummary } from "../src/product-decision-facts.js";

const setup = {
  systemVoltage:12,batteryAh:140,batteryType:"lifepo4",
  solarWatts:350,controllerAmps:30,inverterWatts:900,
  charging:{starterVoltage:12,dcDc:{suggestedCurrentAmps:25},shore:{suggestedCurrentAmps:15}},
};
const battery=(capacity,more={})=>({merchant:"vselektro",category:"battery",specs:{
  voltageV:12,capacityAh:capacity,bmsContinuousCurrentA:200,...more
}});
const mppt=(amps,pv)=>({merchant:"vselektro",category:"controller",specs:{
  currentA:amps,systemVoltagesV:[12,24],maxPvWattsBySystemVoltage:{12:pv,24:pv*2},maxPvVocV:100
}});
const charger=(amps,isolated)=>({merchant:"vselektro",category:"dc_charger",specs:{
  currentA:amps,chargingVoltagesV:[12],chargingInputVoltagesV:[12],isolated,
}});

test("battery displays capacity vs calculated Ah and BMS, not fabricated usable energy",()=>{
  const facts=czechProductDecisionFacts(battery(200,{formFactor:"under_seat"}),setup);
  assert.deepEqual(facts,[
    {label:"Kapacita výrobku",value:"200 Ah"},
    {label:"Rezerva proti výpočtu",value:"+60 Ah"},
    {label:"Trvalý proud BMS",value:"200 A"},
    {label:"Provedení",value:"Nízké pod sedadlo; rozměry ověřte"},
  ]);
  assert.match(czechProductRequirement("battery",setup),/140 Ah při 12 V/);
  assert.match(czechPackageFitSummary(battery(200,{formFactor:"under_seat"}),setup),/BMS 200 A/);
});

test("MPPT distinguishes current from battery-specific PV rating and requires cold-weather Voc check",()=>{
  const product=mppt(30,440);
  const facts=czechProductDecisionFacts(product,setup);
  assert.deepEqual(facts,[
    {label:"Nabíjecí proud",value:"30 A"},
    {label:"Jmenovitý FV výkon při 12 V",value:"440 Wp"},
    {label:"Rezerva FV výkonu",value:"+90 Wp"},
    {label:"Mez napětí panelů Voc",value:"100 V; ověřte mráz"},
  ]);
  assert.match(czechPackageFitSummary(product,setup),/440 Wp při 12 V/);
  const for24=czechProductDecisionFacts(product,{...setup,systemVoltage:24});
  assert.ok(for24.some(({value})=>value==="880 Wp"));
  assert.ok(!czechProductDecisionFacts(product,{...setup,systemVoltage:48}).some(x=>x.label.startsWith("Jmenovitý FV")));
  assert.match(czechProductRequirement("controller",setup),/Voc\/Isc/);
});

test("DC–DC purchase differences explicitly state isolation and excess charging amps",()=>{
  assert.deepEqual(czechProductDecisionFacts(charger(30,true),setup),[
    {label:"Nabíjecí proud",value:"30 A"},
    {label:"Rezerva nabíjecího proudu",value:"+5 A"},
    {label:"Zapojení",value:"Galvanicky oddělené vstupní a výstupní mínus"},
  ]);
  assert.match(czechPackageFitSummary(charger(30,false),setup),/neizolovaná/);
  assert.match(czechProductRequirement("dc_charger",setup),/25 A z 12V vozidla/);
});

test("sparse catalog data never creates made-up differences or compatibility claims",()=>{
  assert.deepEqual(czechProductDecisionFacts({category:"battery",specs:{}},setup),[]);
  assert.deepEqual(czechProductDecisionFacts({category:"controller",specs:{currentA:20}},{}),[{label:"Nabíjecí proud",value:"20 A"}]);
  assert.equal(czechProductRequirement("battery",{}),null);
  assert.equal(czechPackageFitSummary({merchant:"other",category:"battery",specs:{capacityAh:100}},setup),null);
  assert.equal(czechPackageFitSummary({merchant:"vselektro",category:"other"},setup),null);
});

test("CZ Builder renders the explanation in package and comparison but preserves affiliate tracking",async()=>{
  const [js,css,html]=await Promise.all([
    readFile("src/app.js","utf8"),
    readFile("styles.css","utf8"),
    readFile("index.html","utf8"),
  ]);
  assert.match(js,/vselektro: "VšeElektro.eu"/);
  assert.match(js,/czechProductRequirement\(category, result\)/);
  assert.match(js,/czechProductDecisionFacts\(product, setup\)/);
  assert.match(js,/czechPackageFitSummary\(product, latestResult\)/);
  assert.match(js,/class="product-decision-facts"/);
  assert.match(js,/class="package-product-decision"/);
  assert.match(js,/data-affiliate-click data-source="product-card"/);
  assert.match(js,/data-affiliate-click data-source="package"/);
  assert.match(css,/\.product-decision-facts/);
  assert.match(css,/\.product-requirement/);
  assert.match(css,/\.package-product-decision/);
  assert.match(html,/styles\.css\?v=20261014-purchase-steps1/);
  assert.match(html,/app\.js\?v=20261014-purchase-steps1/);
});
