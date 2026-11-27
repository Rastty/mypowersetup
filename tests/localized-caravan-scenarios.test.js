import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeSetupQuery } from "../src/setup-url.js";
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
