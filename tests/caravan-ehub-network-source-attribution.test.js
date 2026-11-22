import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decorateAwinAffiliateUrl } from "../src/awin-attribution.js";
import { buildAffiliateClickParameters } from "../src/affiliate-analytics.js";
import { builderAffiliateHrefMatches, buildBuilderOfferEvidence, isCurrentBuilderOffer } from "../src/builder-offer-click-guard.js";

const rows=[
  ["cz","data/products.json","svetkaravanu:26965_28369","CZK","38137ac4"],
  ["sk","data/products-sk.json","padabo_sk:26965_28369","EUR","7aed5c13"],
  ["pl","data/products-pl.json","padabo_pl:26965_28369","PLN","95d61abf"],
];
const SOURCES=["result-featured","caravan-plan","package","product-card"];
const catalogs=new Map();
async function load(path){
  if(!catalogs.has(path))catalogs.set(path,JSON.parse(await readFile(new URL("../"+path,import.meta.url),"utf8")));
  return catalogs.get(path);
}
const decorate=(input,market,source,extras={})=>decorateAwinAffiliateUrl(input,{
  market,category:"battery",recommendationRole:"recommended",source,buyerFlow:"caravan-builder",...extras
});

test("exact 3 live approved merchant feeds keep publisher, seller, SKU and destination while assigning fixed result-origin subIDs",async()=>{
  for(const [market,path,id,currency,bid]of rows){
    const catalog=await load(path);
    const raw=catalog.products.find(p=>p.id===id);
    assert.ok(raw,id);
    assert.equal(raw.priceCurrency,currency);
    const healthy=catalog.sources[raw.merchant].status==="ok";
    assert.ok(healthy || catalog.sources[raw.merchant].status==="stale");
    assert.equal(raw.available,healthy);
    if(!healthy)assert.equal(raw.staleSource,true);
    assert.ok(raw.priceCzk>0);
    const original=new URL(raw.affiliateUrl);
    for(const source of SOURCES){
      const href=decorate(raw.affiliateUrl,market,source);
      const click=new URL(href);
      assert.equal(click.origin,"https://ehub.cz",market+" "+source);
      assert.equal(click.pathname,"/system/scripts/click.php");
      assert.equal(click.searchParams.get("a_aid"),"f34c86c8");
      assert.equal(click.searchParams.get("a_bid"),bid);
      assert.equal(click.searchParams.get("desturl"),raw.productUrl);
      for(const key of ["a_aid","a_bid","desturl"])assert.equal(click.searchParams.get(key),original.searchParams.get(key));
      assert.equal(click.searchParams.get("data1"),"mps_"+market+"_battery");
      assert.equal(click.searchParams.get("data2"),"source_"+source);
      assert.deepEqual([...click.searchParams.keys()].sort(),["a_aid","a_bid","data1","data2","desturl"].sort());
      assert.ok(builderAffiliateHrefMatches(raw.affiliateUrl,href));
      // A second decoration cannot change a previously assigned static origin.
      assert.equal(decorate(href,market,"product-card"),href);
      const link={href,dataset:{productId:id,merchant:raw.merchant,category:"battery",source}};
      assert.equal(buildAffiliateClickParameters(link).source,source);
      const evidence=buildBuilderOfferEvidence([{
        generatedAt:catalog.generatedAt,sources:catalog.sources,products:[raw]
      }]);
      const observed=Date.parse(catalog.generatedAt);
      assert.equal(isCurrentBuilderOffer(link,evidence,observed+60_000),healthy);
      assert.equal(isCurrentBuilderOffer(link,evidence,observed+72*60*60*1000+1),false);
    }
  }
});

test("merchant-owned data2 and existing scenario/placement priority are never overwritten",()=>{
  const base="https://ehub.cz/system/scripts/click.php?a_aid=publisher&a_bid=merchant&desturl="+encodeURIComponent("https://shop.example/sku");
  const keep=new URL(decorate(base+"&data1=original_market&data2=publisher_promo","cz","result-featured"));
  assert.equal(keep.searchParams.get("data1"),"original_market");
  assert.equal(keep.searchParams.get("data2"),"publisher_promo");
  const scenario=new URL(decorate(base,"sk","result-featured",{scenarioCampaign:"weekend"}));
  assert.equal(scenario.searchParams.get("data2"),"scenario_weekend");
  const placement=new URL(decorate(base,"pl","result-featured",{placement:"mppt_calculator"}));
  assert.equal(placement.searchParams.get("data2"),"placement_mppt_calculator");
  const invalid=new URL(decorate(base,"pl","result-featured",{placement:"bad placement"}));
  assert.equal(invalid.searchParams.has("data2"),false,"malformed explicit placement must not fall back to source");
  const missing=new URL(decorate(base,"cz","result-featured",{scenarioCampaign:"bad value"}));
  assert.equal(missing.searchParams.get("data2"),"source_result-featured");
});

test("unknown/untrusted sources and non-priority countries cannot create network source labels",()=>{
  const base="https://ehub.cz/system/scripts/click.php?a_aid=a&a_bid=b&desturl="+encodeURIComponent("https://shop.example");
  for(const source of ["caravan-plan<script>","from-id-458","personal_visitor",null,"",undefined]){
    const u=new URL(decorate(base,"cz",source));
    assert.equal(u.searchParams.has("data2"),false,String(source));
  }
  for(const market of ["hu","pt","ro","si","cz<script>"]){
    const u=new URL(decorate(base,market,"result-featured"));
    assert.equal(u.searchParams.has("data2"),false,market);
  }
  const editorial=decorate(base,"cz","product-card",{buyerFlow:undefined});
  assert.equal(new URL(editorial).searchParams.has("data2"),false,
    "same static source on an editorial guide is NOT a Builder checkout");
  const invalid="https://ehub.cz/system/scripts/click.php?a_aid=a&desturl="+encodeURIComponent("https://shop.example");
  const empty=new URL(decorate(invalid,"cz","result-featured"));
  assert.equal(empty.searchParams.has("data2"),false);
  assert.equal(new URL(decorate("https://example.com/sku","cz","result-featured")).searchParams.has("data2"),false);
});

test("Awin retains existing source role semantics and now supports the exact caravan-plan label",()=>{
  const base="https://www.awin1.com/cread.php?awinmid=12&awinaffid=34&ued="+encodeURIComponent("https://shop.example/sku");
  const u=new URL(decorate(base,"sk","caravan-plan"));
  assert.equal(u.searchParams.get("clickref"),"mps_sk_battery");
  assert.equal(u.searchParams.get("clickref2"),"role_recommended");
  assert.equal(u.searchParams.get("clickref3"),"source_caravan-plan");
  assert.equal(u.searchParams.get("awinmid"),"12");
  assert.equal(u.searchParams.get("ued"),"https://shop.example/sku");
});

test("CZ SK PL buyer UI uses the same four explicit source values in GA4 and eHub while shipping exact new attribution version",async()=>{
  for(const [app,page,market]of [["app.js","index.html","cz"],["app-sk.js","sk/index.html","sk"],["app-pl.js","pl/index.html","pl"]]){
    const js=await readFile(new URL("../src/"+app,import.meta.url),"utf8");
    const html=await readFile(new URL("../"+page,import.meta.url),"utf8");
    assert.ok(js.includes('import { decorateAwinAffiliateUrl } from "./awin-attribution.js?v=20261122-builder-source1";'));
    assert.ok(js.includes('source: "result-featured"') || js.includes('"result-featured"'),app);
    assert.ok(js.includes('"caravan-plan"'),app);
    assert.ok(js.includes('"package"'),app);
    assert.ok(js.includes('"product-card"'),app);
    assert.ok(js.includes('market: "'+market+'"'),app);
    assert.ok(js.includes('buyerFlow: "caravan-builder"'),app);
    assert.ok(html.includes(app+"?v=20261122-shore-mca1-result-scroll1-cz-mca1-superpack-cz1-orion-cz1-mppt-cz1-featured6-budget-preview1-legacy70a-ehubsrc1"),page);
    assert.ok(js.includes('data-source="result-featured"'),app);
    assert.ok(js.includes('"caravan-plan"'),app);
  }
});
