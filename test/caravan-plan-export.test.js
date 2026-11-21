import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatCaravanShoppingList, currentCaravanSetupLink } from "../src/caravan-plan-export.js";

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
  assert.match(html,/src\/caravan-plan-export\.js\?v=20261121-technical1/);
  assert.match(html,/id="caravan-buyer-checklist"/);
 }
 const script=readFileSync(new URL("../src/caravan-plan-export.js",import.meta.url),"utf8");
 assert.match(script,/data-caravan-copy-plan/);
 assert.doesNotMatch(script,/affiliateUrl|attributedAwinUrl|product\.price/);
});

test("live setup link returns to the exact locale and keeps only sizing inputs", () => {
  for (const [locale,path] of [["cs","/"],["sk","/sk/"],["pl","/pl/"]]) {
    const source=`https://mypowersetup.com${path}?loads=fridge%3A8%3A1&days=2&season=summer&battery=lifepo4&voltage=12&utm_source=campaign&fbclid=bad#kalkulator`;
    const result=currentCaravanSetupLink({href:source},locale);
    assert.ok(result?.startsWith(`https://mypowersetup.com${path}?loads=`));
    assert.match(result,/days=2/);
    assert.doesNotMatch(result,/utm_source|fbclid|affiliate|desturl/);
    const list=formatCaravanShoppingList({locale,rows,setupUrl:result});
    assert.match(list,/loads=/);
    assert.match(list,/LiFePO4 100 Ah/);
    assert.doesNotMatch(list,/utm_source|fbclid/);
  }
});
test("save link refuses missing loads, duplicated sizing parameters, other locale and HTTP",() => {
  for (const href of [
    "https://mypowersetup.com/?days=2",
    "https://mypowersetup.com/?loads=x&loads=y",
    "https://mypowersetup.com/sk/?loads=fridge:8:1",
    "http://mypowersetup.com/?loads=fridge:8:1",
  ]) assert.equal(currentCaravanSetupLink({href},"cs"),null);
});
test("save and copy CTA mount on the existing buyer plan, no secondary calculator", () => {
 const script=readFileSync(new URL("../src/caravan-plan-export.js",import.meta.url),"utf8");
 assert.match(script,/dataset\.caravanSaveSetup/);
 assert.match(script,/new MutationObserver\(refresh\)/);
 assert.match(script,/currentPlanData\(section\)/);
 assert.doesNotMatch(script,/localStorage|sessionStorage/);
});
