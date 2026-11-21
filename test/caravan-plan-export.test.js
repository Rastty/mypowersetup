import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatCaravanShoppingList } from "../src/caravan-plan-export.js";

const rows = [
  {category:"battery",label:"Baterie",ready:true,name:"LiFePO4 100 Ah"},
  {category:"controller",label:"Regulátor MPPT",ready:false,name:""},
];

test("copy plan preserves selected items and missing categories without checkout links or prices",()=>{
  const text=formatCaravanShoppingList({locale:"cs",rows,manualDesign:true,complete:false});
  assert.match(text,/LiFePO4 100 Ah/);
  assert.match(text,/Regulátor MPPT: Chybí ověřený produkt/);
  assert.match(text,/individuální návrh/);
  assert.doesNotMatch(text,/https?:\/\//);
  assert.doesNotMatch(text,/CZK|Kč|PLN|EUR|utm_/);
});
test("copy plan is natively localized for three existing markets",()=>{
  for(const [locale,label] of [["cs","Kopírovat"],["sk","Pokrytie"],["pl","Pokrycie"]]){
    const text=formatCaravanShoppingList({locale,rows,complete:true});
    assert.ok(text.includes(label==="Kopírovat"?"Moje":label)||text.includes(locale==="cs"?"Můj":label));
    assert.match(text,/LiFePO4 100 Ah/);
  }
});
test("all three caravan homepage documents use one shared copy-only module",()=>{
 for(const path of ["index.html","sk/index.html","pl/index.html"]){
  const html=readFileSync(new URL("../"+path,import.meta.url),"utf8");
  assert.match(html,/src\/caravan-plan-export\.js\?v=20261121-1/);
  assert.match(html,/id="caravan-buyer-checklist"/);
 }
 const script=readFileSync(new URL("../src/caravan-plan-export.js",import.meta.url),"utf8");
 assert.match(script,/data-caravan-copy-plan/);
 assert.doesNotMatch(script,/affiliateUrl|attributedAwinUrl|product\.price/);
});
