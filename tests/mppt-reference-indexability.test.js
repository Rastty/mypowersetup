import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateControllerSizing } from "../src/engine.js";
import { calculateLanding } from "../src/calculator-landing.js";

const PAGE="kalkulacky/mppt-regulator/index.html";
const URL="https://mypowersetup.com/kalkulacky/mppt-regulator/";

test("six public MPPT examples match canonical engine, not invented current classes",async()=>{
  const html=await readFile(PAGE,"utf8");
  const examples=[...html.matchAll(/<tr data-mppt-example data-panel-watts="(\d+)" data-system-voltage="(\d+)" data-battery-type="(lifepo4|lead)">[\s\S]*?<strong data-expected-amps="(\d+)">\d+ A<\/strong>/g)];
  assert.equal(examples.length,6,"three panel sizes x two system voltages");
  const combos=new Set();
  for(const match of examples){
    const [,watts,voltage,batteryType,expectedAmps]=match;
    const key=`${watts}:${voltage}:${batteryType}`;
    assert.ok(!combos.has(key),"duplicate scenario: "+key);
    combos.add(key);
    const reference=calculateControllerSizing({solarWatts:Number(watts),systemVoltage:Number(voltage),batteryType});
    const live=calculateLanding("mppt-sizing",{panelWatts:Number(watts),systemVoltage:Number(voltage),batteryType},"cs").result;
    assert.equal(Number(expectedAmps),reference.controllerAmps,key);
    assert.equal(Number(expectedAmps),live.controllerAmps,key);
    assert.equal(reference.controllerMarginPercent,25,key);
    assert.equal(reference.controllerAmps%10,0,key);
  }
  assert.deepEqual([...combos].sort(),[
    "200:12:lifepo4","200:24:lifepo4","400:12:lifepo4",
    "400:24:lifepo4","600:12:lifepo4","600:24:lifepo4",
  ].sort());
});

test("reference explains safety gates instead of selling 12/24 V example rows as verified SKUs",async()=>{
  const html=await readFile(PAGE,"utf8");
  assert.match(html,/id="mppt-priklady"/);
  assert.match(html,/aria-label="Srovnání minimální proudové třídy MPPT/);
  assert.match(html,/<caption>Modelové výsledky pro LiFePO₄/);
  for(const term of ["25 %","14,6 V","29,2 V","Voc","Isc","12 V","24 V","nabíjecího proudu"])assert.ok(html.includes(term),term);
  assert.match(html,/nikoli doporučení konkrétního výrobku/);
  assert.match(html,/Bez skutečných parametrů panelů nelze konkrétní MPPT potvrdit jako kompatibilní/);
  assert.match(html,/https:\/\/www\.victronenergy\.com\/media\/pg\/Manual_SmartSolar_MPPT_100-30__100-50\/en\/introduction\.html/);
  assert.match(html,/href="\/pruvodce\/victron-mppt-100-20-vs-100-30-vs-100-50\/"/);
  assert.doesNotMatch(html,/<tr data-mppt-example[^>]*data-affiliate-click/);
});

test("published MPPT sizing tool remains the primary working experience and crawlable",async()=>{
  const html=await readFile(PAGE,"utf8");
  assert.match(html,/<link rel="canonical" href="https:\/\/mypowersetup\.com\/kalkulacky\/mppt-regulator\/"/);
  assert.match(html,/<link rel="alternate" hreflang="cs-CZ"/);
  assert.match(html,/data-calculator-intent="mppt-sizing"/);
  assert.match(html,/name="panelWatts"/);
  assert.match(html,/name="systemVoltage"/);
  assert.match(html,/name="batteryType"/);
  assert.match(html,/src="\/src\/calculator-landing-browser\.js\?v=20261109-mppt-buyer1"/);
  assert.match(html,/id="mppt-priklady"/);
  assert.ok(html.indexOf("data-calculator-landing") < html.indexOf('id="mppt-priklady"'),"tool before additional content");
  assert.doesNotMatch(html,/<meta name="robots" content="[^"]*noindex/i);
  const json=html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/)?.[1];
  assert.ok(json,"valid readable WebApplication structured data");
  const graph=JSON.parse(json)["@graph"];
  assert.equal(graph.find(node=>node["@type"]==="WebApplication").dateModified,"2026-11-08");
});

test("published sitemap dates reflect real change for this URL only",async()=>{
  for(const filename of ["sitemap.xml","sitemap-calculators.xml"]){
    const xml=await readFile(filename,"utf8");
    const item=xml.match(/<url><loc>https:\/\/mypowersetup\.com\/kalkulacky\/mppt-regulator\/<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g);
    assert.equal(item?.length,1,filename);
    assert.ok(item[0].includes("<lastmod>2026-11-08</lastmod>"),filename);
  }
});

test("MPPT reference is scrollable on narrow screens without modifying other calculators",async()=>{
  const html=await readFile(PAGE,"utf8");
  const css=await readFile("kalkulacky/calculator.css","utf8");
  assert.match(html,/href="\/kalkulacky\/calculator\.css\?v=20261108-mppt-reference1"/);
  assert.match(html,/class="calculator-table-scroll"/);
  assert.match(css,/\.calculator-table-scroll\s*\{[^}]*overflow-x: auto/s);
  assert.match(css,/\.calculator-reference-table\s*\{[^}]*border-collapse: collapse/s);
});
