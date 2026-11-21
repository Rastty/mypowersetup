import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatCaravanShoppingList } from "../src/caravan-plan-export.js";

const victron="https://www.victronenergy.com/upload/documents/Datasheet-BlueSolar-Monocrystalline-Panels-current-models-EN-.pdf";
const ecoflow="https://websiteoss.ecoflow.com/cms/upload/2024/5/30/EcoFlow%20175W%20Rigid%20Solar%20Panel-Safety%20Instructions%20V1.0_1717050133698.pdf";
const rows=[
 {category:"battery",label:"Baterie",ready:true,name:"1 ks · LiFePO4 200Ah",requirement:"min. 200 Ah"},
 {category:"solar_panel",label:"Panel",ready:true,name:"3 ks · BlueSolar 190Wp",requirement:"alespoň 500 Wp"},
 {category:"controller",label:"MPPT",ready:true,name:"1 ks · Victron SmartSolar 100/50",
  requirement:"nabíjecí proud alespoň 40 A",
  pvWiringReview:"3 v sérii × 1 paralelní větev; při -20 °C Voc ≈ 88.5 V, Isc ≈ 9.4 A",
  manufacturerUrl:victron},
];
test("copied CZ/SK/PL caravan shopping lists preserve stock-selected item quantity, reviewed PV topology and public manufacturer proof",()=>{
 const labels={
  cs:["Ověřené limity zapojení panelů","Výrobní podklady"],
  sk:["Overené limity zapojenia panelov","Podklady výrobcu"],
  pl:["Zweryfikowane granice połączenia paneli","Dokumentacja producenta"],
 };
 for(const [locale,[wiring,source]] of Object.entries(labels)){
  const text=formatCaravanShoppingList({locale,rows,complete:true,manualDesign:false,setupUrl:"https://mypowersetup.com/"+(locale==="cs"?"":locale+"/")+"?loads=a#kalkulator"});
  assert.match(text,/3 ks · BlueSolar 190Wp/,locale);
  assert.match(text,/3 v sérii × 1 paralelní větev/,locale);
  assert.ok(text.includes(wiring),locale);
  assert.ok(text.includes(source),locale);
  assert.ok(text.includes(victron),locale);
  assert.ok(!text.includes("a_aid="),locale);
  assert.ok(!text.includes("a_bid="),locale);
  assert.ok(!text.includes("ehub.cz"),locale);
  assert.match(text,/Toto nie je elektroprojekt|Jde o podklad|To nie jest projekt elektryczny/);
 }
});

test("copying a blocked regulator retains the precise manual-review reason instead of generic missing only",()=>{
 const reason="Pro tyto panely chybí potvrzené zapojení k dostupnému MPPT: zkontrolujte napětí Voc za mrazu a Isc.";
 const fallback=[rows[0],rows[1],{category:"controller",label:"MPPT",ready:false,missingDetail:reason,requirement:"alespoň 50 A"}];
 for(const locale of ["cs","sk","pl"]){
  const result=formatCaravanShoppingList({locale,rows:fallback,complete:false,manualDesign:true});
  assert.ok(result.includes(reason));
  assert.ok(!result.includes("Victron SmartSolar 100/50"));
  assert.ok(!result.includes(victron));
  assert.ok(!result.includes("undefined"));
 }
});

test("manufacturer document link allowlist excludes eHub tracking, redirect spoofing, credentials and non-PDF documents",()=>{
 for(const link of [
   "https://ehub.cz/system/scripts/click.php?a_aid=secret",
   "https://www.victronenergy.com.evil.example/panel.pdf",
   "https://www.victronenergy.com@phishing.example/panel.pdf",
   "https://www.victronenergy.com/product",
   "https://www.victronenergy.com/doc.pdf?token=secret",
   "http://www.victronenergy.com/doc.pdf",
   "data:text/plain,secret",
 ]){
  const result=formatCaravanShoppingList({rows:[{...rows[2],manufacturerUrl:link}],complete:true});
  assert.ok(!result.includes(link),"must never export unapproved evidence URL "+link);
  assert.match(result,/3 v sérii/);
 }
 const eco=formatCaravanShoppingList({rows:[{...rows[2],manufacturerUrl:ecoflow}],complete:true});
 assert.ok(eco.includes(ecoflow));
});

test("copied handoff collapses whitespace and reads only current visible rows, without affiliate links or stock claims",async()=>{
 const result=formatCaravanShoppingList({
   rows:[{...rows[2],pvWiringReview:"2S2P\n  700 Wp \t Voc 56 V",missingDetail:"hidden"}],
 });
 assert.ok(result.includes("2S2P 700 Wp Voc 56 V"));
 assert.ok(!result.includes("hidden"));
 const src=await readFile(new URL("../src/caravan-plan-export.js",import.meta.url),"utf8");
 assert.match(src,/const data=currentPlanData\(section\)/);
 assert.match(src,/data-pv-wiring-review/);
 assert.match(src,/data-manufacturer-pv-proof/);
 assert.match(src,/missingDetail: ready \? null : visibleDetail/);
 assert.match(src,/pvWiringReview: ready \? item.querySelector/);
 for(const path of ["index.html","sk/index.html","pl/index.html"]){
  const html=await readFile(new URL("../"+path,import.meta.url),"utf8");
  assert.match(html,/caravan-plan-export\.js\?v=20261121-pv-handoff1/);
 }
});
