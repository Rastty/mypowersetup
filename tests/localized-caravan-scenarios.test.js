import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeSetupQuery } from "../src/setup-url.js";
import { APPLIANCES as CS } from "../src/catalog.js";
import { APPLIANCES as SK } from "../src/catalog-sk.js";
import { APPLIANCES as PL } from "../src/catalog-pl.js";
import { getUsageProfiles } from "../src/usage-profiles.js";
const models=[{"key":"weekend","wh":550,"season":"summer","sk":"/sk/sprievodca/elektrina-v-karavane-na-vikend/","pl":"/pl/poradnik/zasilanie-kampera-na-weekend/"},{"key":"family","wh":875,"season":"summer","sk":"/sk/sprievodca/elektrina-rodinna-dovolenka-karavan/","pl":"/pl/poradnik/zasilanie-kampera-rodzinny-urlop/"},{"key":"work","wh":1050,"season":"shoulder","sk":"/sk/sprievodca/praca-z-karavanu-elektrina/","pl":"/pl/poradnik/praca-z-kampera-zasilanie-laptopa/"}];
test("local scenario pages match existing appliance profiles and both sitemaps",()=>{
 const sitemap=readFileSync("sitemap.xml","utf8"),sc=readFileSync("sitemap-scenarios.xml","utf8");
 for(const [locale,appliances,hub] of [["sk",SK,"sk/sprievodca/index.html"],["pl",PL,"pl/poradnik/index.html"]]){
  const main=readFileSync(hub,"utf8"),home=readFileSync(locale+"/index.html","utf8");
  for(const m of models){
   const route=m[locale],html=readFileSync(route.slice(1)+"index.html","utf8"),profile=getUsageProfiles(locale).find(p=>p.id===m.key);
   const href=html.match(/href="(\/(?:sk|pl)\/\?loads=[^"]+#kalkulator)"/)?.[1]?.replaceAll("&amp;","&");
   assert.ok(href,route);
   const cfg=decodeSetupQuery(new URL(href,"https://mypowersetup.com").search,appliances.map(x=>x.id));
   assert.ok(cfg,route);
   assert.equal(cfg.appliances.reduce((sum,x)=>sum+appliances.find(a=>a.id===x.id).watts*x.hours*x.quantity,0),m.wh);
   assert.equal(cfg.season,profile.season);assert.equal(cfg.autonomyDays,profile.autonomyDays);
   assert.ok(main.includes('href="'+route+'"')&&home.includes('href="'+route+'"'));
   assert.ok(sitemap.includes("<loc>https://mypowersetup.com"+route+"</loc>")&&sc.includes("<loc>https://mypowersetup.com"+route+"</loc>"));
   assert.ok(html.includes('hreflang="cs-CZ"')&&html.includes('hreflang="sk-SK"')&&html.includes('hreflang="pl-PL"'));
  }
 }
});

const extended=[{"key":"comfort","wh":1395,"days":"3","season":"shoulder","routes":{"cs":"/pruvodce/modelove-sestavy/vyssi-komfort-karavan/","sk":"/sk/sprievodca/vyssi-komfort-karavan/","pl":"/pl/poradnik/zasilanie-kampera-wiekszy-komfort/"}},{"key":"winter","wh":1050,"days":"2","season":"winter","routes":{"cs":"/pruvodce/modelove-sestavy/zimni-karavan-spotreba/","sk":"/sk/sprievodca/zimny-karavan-spotreba/","pl":"/pl/poradnik/zasilanie-kampera-zima/"}}];
test("comfort and winter scenario presets preserve energy, custom heating load and discovery",()=>{
 const sitemap=readFileSync("sitemap.xml","utf8"),sc=readFileSync("sitemap-scenarios.xml","utf8");
 for(const [locale,appliances,hub,home] of [["cs",CS,"pruvodce/modelove-sestavy/index.html","index.html"],["sk",SK,"sk/sprievodca/index.html","sk/index.html"],["pl",PL,"pl/poradnik/index.html","pl/index.html"]])for(const m of extended){
  const route=m.routes[locale],html=readFileSync(route.slice(1)+"index.html","utf8");
  const href=html.match(/href="(\/(?:sk\/|pl\/)?\?loads=[^"]+#kalkulator)"/)?.[1]?.replaceAll("&amp;","&");
  assert.ok(href,route);const cfg=decodeSetupQuery(new URL(href,"https://mypowersetup.com").search,appliances.map(x=>x.id));assert.ok(cfg,route);
  assert.equal(cfg.appliances.reduce((sum,x)=>sum+(x.id==="custom"?x.watts:appliances.find(a=>a.id===x.id).watts)*x.hours*x.quantity,0),m.wh);
  assert.equal(cfg.season,m.season);assert.equal(cfg.autonomyDays,m.days);
  if(m.key==="winter"){const heater=cfg.appliances.find(x=>x.id==="custom");assert.equal(heater.watts,30);assert.equal(heater.hours,16);assert.equal(heater.ac,false);}
  assert.ok(readFileSync(hub,"utf8").includes('href="'+route+'"')&&readFileSync(home,"utf8").includes('href="'+route+'"'));
  assert.ok(sitemap.includes("<loc>https://mypowersetup.com"+route+"</loc>")&&sc.includes("<loc>https://mypowersetup.com"+route+"</loc>"));
  for(const p of Object.values(m.routes))assert.ok(html.includes('href="https://mypowersetup.com'+p+'"'));
 }
});
