import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { projectDcdcGuideOffers } from "../src/calculator-offer-catalog.js";
import { acceptDcdcGuideSnapshot } from "../src/verified-offer-catalog-fetch.js";
import { selectGuideOffers } from "../src/guide-verified-offers.js";

const time="2026-11-10T12:00:00Z";
const now=Date.parse(time);
const skus=[
 ["victron-orion-tr-12-12-18-isolated","/nabijecka-dc-dc-orion-tr-smart-12-12-18a/",18,true],
 ["victron-orion-tr-12-12-30-isolated","/nabijecka-dc-dc-orion-tr-smart-12-12-30a/",30,true],
 ["victron-orion-tr-12-12-30-nonisolated","/nabijecka-dc-dc-orion-tr-smart-12-12-30a-neizolovana/",30,false],
 ["victron-orion-xs-12-12-50-nonisolated","/nabijecka-dc-dc-orion-xs-smart-12-12-50a-neizolovana/",50,false],
];
function offer([id,path,currentA,isolated],i) {
 const productUrl="https://www.vselektro.eu"+path;
 const affiliateUrl=new URL("https://ehub.cz/system/scripts/click.php");
 affiliateUrl.searchParams.set("a_aid","f34c86c8");
 affiliateUrl.searchParams.set("a_bid","f897865f");
 affiliateUrl.searchParams.set("desturl",productUrl);
 return {
   id:"vselektro:"+id,merchant:"vselektro",category:"dc_charger",
   name:"Victron Orion model "+id,description:"internal merchant data not needed",
   available:true,staleSource:false,priceCurrency:"CZK",priceCzk:2600+i*600,
   productUrl,affiliateUrl:affiliateUrl.href,verifiedAt:"2026-10-13",
   offerObservedAt:time,
   specs:{currentA,isolated,chargingVoltagesV:[12],chargingInputVoltagesV:[12],
     chargingBatteryTypes:["lifepo4","lead"],smartAlternatorCompatible:true},
 };
}
const approved=skus.map(offer);
const full=(products=approved,status="ok",at=time)=>({
 generatedAt:at,sources:{vselektro:{status},secretFeedUrl:"SECRET_CREDENTIAL"},
 products:[...products,{id:"reslshop:unreviewed",merchant:"reslshop",category:"dc_charger",
   description:"DO_NOT_COPY_THIS_UNTRUSTED_PRODUCT",name:"Unknown item"}],
});

test("four independently verified DC-DC Orion SKUs fit a tiny reversible projection",()=>{
 const view=projectDcdcGuideOffers(full(),now);
 assert.equal(view.schemaVersion,1);
 assert.equal(view.projection,"dc_charger");
 assert.equal(view.generatedAt,time);
 assert.deepEqual(view.sources,{vselektro:{status:"ok"}});
 assert.deepEqual(view.products.map(x=>x.id),skus.map(x=>"vselektro:"+x[0]));
 assert.deepEqual(selectGuideOffers(view,"dc_charger",now).map(x=>x.id),view.products.map(x=>x.id));
 assert.ok(acceptDcdcGuideSnapshot(view));
 const json=JSON.stringify(view);
 assert.ok(Buffer.byteLength(json)<6000);
 for(const forbidden of ["SECRET_CREDENTIAL","DO_NOT_COPY_THIS_UNTRUSTED_PRODUCT","reslshop","internal merchant data"])
   assert.ok(!json.includes(forbidden),forbidden);
 assert.ok(view.products.every(x=>!("description" in x) && !("specs" in x)));
});

test("unverified redirects, duplicates, missing stock and failed merchant evidence remain ineligible",()=>{
 for(const invalid of [
  {...approved[0],available:false},
  {...approved[0],affiliateUrl:"https://example.com"},
  {...approved[0],productUrl:"https://www.vselektro.eu/other-product/"},
  {...approved[0],offerObservedAt:"2026-10-01T00:00:00Z"},
 ]){
  const view=projectDcdcGuideOffers(full([invalid]),now);
  assert.equal(view.products.length,0);
 }
 const repeated=projectDcdcGuideOffers(full([approved[0],approved[0]]),now);
 assert.equal(repeated.products.length,0,"duplicate exact SKU is not a price source");
 const stale=projectDcdcGuideOffers(full(approved,"stale"),now);
 assert.equal(stale.products.length,0);
 assert.equal(stale.sources.vselektro.status,"stale");
 assert.ok(acceptDcdcGuideSnapshot(stale));
 const old=projectDcdcGuideOffers(full(approved,"ok","2026-10-01T00:00:00Z"),now);
 assert.equal(old.products.length,0);
});

test("candidate-only artifacts never pass DC-DC compact schema gate",()=>{
 const base=projectDcdcGuideOffers(full(),now);
 for(const bad of [
  {...base,schemaVersion:2},
  {...base,projection:"battery"},
  {...base,products:[...base.products,base.products[0]]},
  {...base,products:[{...base.products[0],category:"controller"}]},
  {...base,products:[{...base.products[0],id:"reslshop:unapproved"}]},
  {...base,sources:{vselektro:null}},
 ]){
  assert.equal(acceptDcdcGuideSnapshot(bad),false);
 }
});

test("existing source sync writes and CI validates DC-DC view before publication",async()=>{
 const [sync,workflow,checker,fetcher]=await Promise.all([
   readFile("scripts/sync-products.mjs","utf8"),
   readFile(".github/workflows/sync-products.yml","utf8"),
   readFile("scripts/check-dcdc-guide-offers-cz.mjs","utf8"),
   readFile("src/verified-offer-catalog-fetch.js","utf8"),
 ]);
 assert.match(sync,/projectDcdcGuideOffers\(fullCatalog/);
 assert.match(sync,/data\/dcdc-guide-offers-cz\.json/);
 assert.match(workflow,/node scripts\/check-dcdc-guide-offers-cz\.mjs/);
 assert.match(workflow,/actions: read/,"the job needs only read permission to inspect Pages");
 assert.match(workflow,/export GITHUB_SHA="\$\(git rev-parse HEAD\)"/,
   "the release barrier must prove the new data commit, not the initiating source SHA");
 assert.match(workflow,/node scripts\/wait-for-pages-deployment\.mjs/);
 assert.match(workflow,/node scripts\/verify-buyer-paths-live\.mjs/);
 assert.ok(workflow.indexOf("name: Prove the exact published buyer catalog after this feed sync") >
   workflow.indexOf("name: Commit refreshed catalog"),"public buyer readback runs only after data push");

 assert.match(workflow,/data\/calculator-offers-cz\.json data\/dcdc-guide-offers-cz\.json/);
 assert.match(checker,/DCDC_GUIDE_SOURCE_DRIFT/);
 assert.match(fetcher,/DCDC_GUIDE_CATALOG_PATH/);
});
