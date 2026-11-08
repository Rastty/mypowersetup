import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BUILDER_OFFER_MAX_AGE_MS,
  parseBuilderOfferTime,
  buildBuilderOfferEvidence,
  builderAffiliateHrefMatches,
  isCurrentBuilderOffer,
  bindBuilderOfferClickGuard,
  showExpiredBuilderOfferNotice,
} from "../src/builder-offer-click-guard.js";

const generatedAt = "2026-11-07T10:49:10.224Z";
const eHub = "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=f897865f&desturl=https%3A%2F%2Fwww.vselektro.eu%2Fproduct-a%2F";
const awin = "https://www.awin1.com/cread.php?awinmid=38934&awinaffid=3044971&ued=https%3A%2F%2Fiallpowers.eu%2Fproducts%2Fa";
const goodMs = Date.parse(generatedAt);
const payload = (products, date=generatedAt, status="ok") => ({
  generatedAt:date,
  sources: { vselektro:{status}, allpowers_eu:{status} },
  products,
});
const product = (id="vselektro:a", url=eHub, merchant="vselektro", available=true) => ({
  id,merchant,affiliateUrl:url,available,
});
const link = (item, href=item.affiliateUrl) => ({
  dataset:{productId:item.id,merchant:item.merchant},href,
});
test("current exact product and legitimate eHub/Awin market attribution stay clickable within 72h",()=>{
  const a=product();
  const b=product("allpowers_eu:ps",awin,"allpowers_eu");
  const evidence=buildBuilderOfferEvidence([payload([a,b])]);
  assert.equal(evidence.size,2);
  assert.equal(isCurrentBuilderOffer(link(a),evidence,goodMs),true);
  assert.equal(isCurrentBuilderOffer(link(a,eHub+"&data1=mps_cs_battery"),evidence,goodMs+BUILDER_OFFER_MAX_AGE_MS),true);
  assert.equal(isCurrentBuilderOffer(link(b,awin+"&clickref=mps_hu_power_station&clickref2=role_recommended"),evidence,goodMs+1000),true);
  assert.equal(isCurrentBuilderOffer(link(a),evidence,goodMs+BUILDER_OFFER_MAX_AGE_MS+1),false);
  assert.equal(isCurrentBuilderOffer(link(a),evidence,goodMs-1),false);
});

test("missing, invalid, future or ambiguous generation timestamps never invent fresh stock",()=>{
  for(const at of [
    "2026-11-07","2026-11-07T10:49:10",
    "2026-02-30T10:00:00Z","2026-11-07T10:49:10+01:00",
    "2026-11-07T25:49:10Z",null,
  ]) {
    assert.equal(Number.isFinite(parseBuilderOfferTime(at)),false,String(at));
    assert.equal(isCurrentBuilderOffer(link(product()),buildBuilderOfferEvidence([payload([product()],at)]),goodMs),false,String(at));
  }
  assert.equal(parseBuilderOfferTime(generatedAt),goodMs);
});

test("unavailable, unknown-stock, stale, failed or duplicate source records block purchases",()=>{
  const good=product();
  const absent=product("vselektro:not-stocked",eHub,"vselektro",false);
  const unknown=product("vselektro:unknown",eHub,"vselektro",null);
  const evidence=buildBuilderOfferEvidence([payload([good,absent,unknown])]);
  assert.equal(isCurrentBuilderOffer(link(absent),evidence,goodMs+1),false);
  assert.equal(isCurrentBuilderOffer(link(unknown),evidence,goodMs+1),false);
  assert.equal(isCurrentBuilderOffer(link(good),buildBuilderOfferEvidence([payload([good],generatedAt,"stale")]),goodMs+1),false);
  assert.equal(isCurrentBuilderOffer(link(good),buildBuilderOfferEvidence([payload([good],generatedAt,"failed")]),goodMs+1),false);
  const duplicate=buildBuilderOfferEvidence([payload([good]),payload([good])]);
  assert.equal(isCurrentBuilderOffer(link(good),duplicate,goodMs+1),false);
  const triple=buildBuilderOfferEvidence([payload([good]),payload([good]),payload([good])]);
  assert.equal(isCurrentBuilderOffer(link(good),triple,goodMs+1),false);
  assert.equal(isCurrentBuilderOffer(link(good),new Map(),goodMs+1),false);
  assert.equal(isCurrentBuilderOffer({...link(good),dataset:{productId:good.id,merchant:"padabo_pl"}},evidence,goodMs+1),false);
});

test("click destination cannot switch merchant, affiliate campaign or exact product",()=>{
  assert.equal(builderAffiliateHrefMatches(eHub,eHub+"&data1=mps_cs_battery"),true);
  assert.equal(builderAffiliateHrefMatches(eHub,eHub+"&desturl=https%3A%2F%2Fwww.vselektro.eu%2Fother%2F"),false);
  assert.equal(builderAffiliateHrefMatches(eHub,eHub.replace("f897865f","wrong")),false);
  assert.equal(builderAffiliateHrefMatches(eHub,eHub.replace("ehub.cz","unsafe.example")),false);
  assert.equal(builderAffiliateHrefMatches(eHub,eHub.replace("https:","http:")),false);
  assert.equal(builderAffiliateHrefMatches(eHub,eHub+"&unsafe=1"),false);
  assert.equal(builderAffiliateHrefMatches(eHub,eHub+"&data1=bad%0Aquery"),false);
  assert.equal(builderAffiliateHrefMatches(awin,awin+"&clickref=mps_hu_battery"),true);
  assert.equal(builderAffiliateHrefMatches(awin,awin+"&ued=https%3A%2F%2Fevil.example"),false);
  assert.equal(builderAffiliateHrefMatches("https://www.dpbolvw.net/click-101869970-17110660",
    "https://www.dpbolvw.net/click-101869970-17110660"),true);
});

function syntheticGuard(record, at) {
  const listeners=new Map();
  const root={ contains: (value)=>value===record };
  const documentRoot={
    querySelector:(selector)=>selector==="#product-recommendations" ? root : null,
    addEventListener:(type,callback,capture)=>{
      assert.equal(capture,true);
      listeners.set(type,callback);
    },
  };
  const blocked=[];
  const evidence=buildBuilderOfferEvidence([payload([product()])]);
  bindBuilderOfferClickGuard({documentRoot,getEvidence:()=>evidence,now:()=>at,onBlocked:(offer)=>blocked.push(offer)});
  const fire=(type,button=0,target=record)=>{
    const flags={prevented:false,immediate:false,propagated:false};
    const event={type,button,target:{closest:()=>target},defaultPrevented:false,
      preventDefault(){flags.prevented=true;},stopImmediatePropagation(){flags.immediate=true;},
      stopPropagation(){flags.propagated=true;}};
    listeners.get(type)(event);
    return flags;
  };
  return {fire,blocked,listeners};
}

test("capture gate suppresses expired left, middle and context-menu opens before affiliate analytics",()=>{
  const e=product();
  const stale=syntheticGuard(link(e),goodMs+BUILDER_OFFER_MAX_AGE_MS+1);
  for(const [type,button] of [["click",0],["auxclick",1],["contextmenu",2]]) {
    const f=stale.fire(type,button);
    assert.deepEqual(f,{prevented:true,immediate:true,propagated:true});
  }
  assert.equal(stale.blocked.length,3);
  assert.deepEqual([...stale.listeners.keys()].sort(),["auxclick","click","contextmenu"]);
  assert.deepEqual(stale.fire("auxclick",2),{prevented:false,immediate:false,propagated:false});
  const fresh=syntheticGuard(link(e),goodMs+200);
  assert.deepEqual(fresh.fire("click"),{prevented:false,immediate:false,propagated:false});
  assert.equal(fresh.blocked.length,0);
  assert.deepEqual(fresh.fire("click",0,link(product("other"))),{prevented:false,immediate:false,propagated:false});
});

test("expired warning is localized, DOM safe, one-time and offers explicit reload",()=>{
  const props=[];
  const listeners={};
  const root={
    prepend(node){this.added=node;},
    querySelector(sel){return sel==="[data-builder-offer-expired]" && this.added ? this.added : null;},
  };
  const documentRoot={
    querySelector(sel){return sel==="#product-recommendations" ? root : null;},
    createTextNode(text){return {text};},
    createElement(type){return {type,children:[],setAttribute(key,val){this[key]=val;},
      append(value){this.children.push(value);},
      addEventListener(kind,fn){listeners[kind]=fn;}}},
  };
  let reloaded=0;
  assert.equal(showExpiredBuilderOfferNotice({documentRoot,message:"Starý katalog",refreshLabel:"Obnovit",reload:()=>reloaded++}),true);
  assert.equal(root.added.role,"alert");
  assert.equal(root.added.children[0].text,"Starý katalog ");
  assert.equal(root.added.children[1].textContent,"Obnovit");
  listeners.click();
  assert.equal(reloaded,1);
  assert.equal(showExpiredBuilderOfferNotice({documentRoot,message:"Second",refreshLabel:"Refresh"}),true);
  assert.equal(root.added.children[0].text,"Starý katalog ");
});

test("all four core Builders load market-specific evidence, install capture gate and expose refreshed scripts",async()=>{
  const paths=[
    ["src/app.js","index.html"],
    ["src/app-sk.js","sk/index.html"],
    ["src/app-pl.js","pl/index.html"],
    ["src/app-hu-browser.js","hu/index.html"],
  ];
  for(const [application,html] of paths){
    const source=await readFile(application,"utf8"),page=await readFile(html,"utf8");
    assert.match(source,/buildBuilderOfferEvidence\(/,application);
    assert.match(source,/bindBuilderOfferClickGuard\(/,application);
    assert.match(source,/getEvidence: \(\) => productOfferEvidence/,application);
    assert.match(source,/documentRoot: document/,application);
    assert.match(source,/reload: \(\) => window\.location\.reload\(\)/,application);
    assert.ok(page.includes("20261108-click-evidence-builder4"),html);
  }
});
