import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLanding } from "../src/calculator-landing.js";
import { buildCalculatorHandoffUrl,applyCalculatorHandoffPrefill } from "../src/calculator-handoff.js";
import { getCalculatorCopy,classifyCalculatorContinuation } from "../src/calculator-copy.js";
import { classifyGuideCalculatorLink } from "../src/analytics-links.js";
const locales=[{"l":"sk","route":"/sk/kalkulacky/vydrz-baterie/","cap":"/sk/kalkulacky/kapacita-baterie/","hub":"/sk/kalkulacky/","guide":"/sk/sprievodca/kapacita-baterie-do-karavanu/","base":"/sk/"},{"l":"pl","route":"/pl/kalkulatory/czas-pracy-akumulatora/","cap":"/pl/kalkulatory/pojemnosc-akumulatora/","hub":"/pl/kalkulatory/","guide":"/pl/poradnik/pojemnosc-akumulatora-do-kampera/","base":"/pl/"}];
const origin="https://mypowersetup.com";
const file=route=>route.slice(1)+"index.html";
test("runtime calculator SK/PL exact hreflang, local next steps and numerical parity",async()=>{
 const tags=[["cs-CZ",origin+"/kalkulacky/vydrz-baterie/"],["sk-SK",origin+locales[0].route],["pl-PL",origin+locales[1].route],["x-default",origin+"/kalkulacky/vydrz-baterie/"]];
 for(const route of ["/kalkulacky/vydrz-baterie/",...locales.map(x=>x.route)]){
  const html=await readFile(file(route),"utf8");
  assert.deepEqual([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(m=>m.slice(1)),tags);
 }
 for(const d of locales){
  const html=await readFile(file(d.route),"utf8");
  assert.ok(html.includes('rel="canonical" href="'+origin+d.route+'"'));
  assert.ok(html.includes('href="'+d.base+'#kalkulator"'));
  for(const route of [d.cap,d.hub,d.guide])assert.ok((await readFile(file(route),"utf8")).includes('href="'+d.route+'"'),route);
  const fields=[...html.matchAll(/<tr data-autonomy-example data-battery-ah="(\d+)" data-battery-type="([^"]+)" data-daily-wh="(\d+)">.*?data-autonomy-days="([^"]+)".*?data-autonomy-hours="([^"]+)"/g)];
  assert.equal(fields.length,6);
  for(const [,ah,batteryType,dailyWh,days,hours] of fields){
   const result=calculateLanding("battery-autonomy",{batteryCapacityAh:+ah,batteryType,dailyWh:+dailyWh,systemVoltage:12},d.l).result;
   assert.equal(result.autonomyDays,+days);assert.equal(result.autonomyHours,+hours);
   assert.ok(getCalculatorCopy(d.l).autonomySummary({n:String,result}).includes(String(result.autonomyHours)));
  }
  const inputs={batteryCapacityAh:150,systemVoltage:24,batteryType:"lead",dailyWh:1200};
  const result=calculateLanding("battery-autonomy",inputs,d.l).result;
  const href=buildCalculatorHandoffUrl({intent:"battery-autonomy",locale:d.l,result,inputs});
  assert.equal(new URL(href,origin).pathname,d.cap);
  const fieldsByName=Object.fromEntries(["dailyWh","systemVoltage","batteryType"].map(k=>[k,{value:""}]));
  const form={elements:{namedItem:k=>fieldsByName[k]}};
  const args={form,intent:"battery-capacity",locale:d.l,pathname:d.cap,search:new URL(href,origin).search};
  assert.equal(applyCalculatorHandoffPrefill(args)?.from,"battery-autonomy");
  assert.equal(fieldsByName.dailyWh.value,"1200");assert.equal(fieldsByName.systemVoltage.value,"24");assert.equal(fieldsByName.batteryType.value,"lead");
  assert.equal(classifyCalculatorContinuation(d.cap,"",d.l),"calculator");
  assert.equal(classifyGuideCalculatorLink(d.route)?.destination_path,d.route);
 }
});
