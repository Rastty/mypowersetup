import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { eligibleGuideOffer, guideCatalogFresh, selectGuideOffers, mountGuideOffers, refreshGuideOffers, guideOffersExpireAt } from "../src/guide-verified-offers.js";
import { parseVselektroVerifiedFeed } from "../src/vselektro-feed.js";

const now=Date.parse("2026-10-14T11:00:00Z");
function offer(id="vselektro:victron-smartsolar-100-50",category="controller"){
 const path=id==="vselektro:victron-smartsolar-100-30"
  ? "/solarni-regulator-victron-energy-smartsolar-30a/"
  : "/solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/";
 const productUrl="https://www.vselektro.eu"+path;
 const tracking=new URL("https://ehub.cz/system/scripts/click.php");
 tracking.searchParams.set("a_aid","f34c86c8");
 tracking.searchParams.set("a_bid","f897865f");
 tracking.searchParams.set("desturl",productUrl);
 return {id,category,merchant:"vselektro",productUrl,affiliateUrl:tracking.href,
   name:"Victron SmartSolar 100/50",priceCzk:4946,priceCurrency:"CZK",
   available:true,verifiedAt:"2026-10-13",offerObservedAt:"2026-10-14T10:00:00Z",staleSource:false};
}
function payload(products=[offer()],at=now){return {generatedAt:new Date(at).toISOString(),sources:{vselektro:{status:"ok"}},products};}

test("editorial offers require current successful source and in-stock verified exact catalog SKU",()=>{
 assert.equal(guideCatalogFresh(payload(),now),true);
 assert.equal(selectGuideOffers(payload(),"controller",now).length,1);
 assert.equal(selectGuideOffers(payload(),"battery",now).length,0);
 assert.equal(selectGuideOffers(payload(),"dc_charger",now).length,0);
 assert.equal(selectGuideOffers({...payload(),sources:{vselektro:{status:"stale"}}},"controller",now).length,0);
 assert.equal(selectGuideOffers(payload([offer()],now-4*24*60*60*1000),"controller",now).length,0);
 assert.equal(selectGuideOffers(payload([offer()],now+1000),"controller",now).length,0);
});

test("fresh catalog cannot re-date a stale or unobserved merchant offer",()=>{
 const valid=offer();
 assert.equal(selectGuideOffers(payload([valid]),"controller",now).length,1);
 for(const offerObservedAt of ["2026-10-01", "2026-10-15", "invalid-date", "", undefined]) {
  const stale={...offer(),offerObservedAt};
  assert.equal(eligibleGuideOffer(stale,"controller",now),false,String(offerObservedAt));
  assert.equal(selectGuideOffers(payload([stale]),"controller",now).length,0,String(offerObservedAt));
 }
 // Technical evidence remains separately dated and must not be fabricated.
 for(const verifiedAt of ["2026-10-15", "invalid-date", ""]) {
  assert.equal(eligibleGuideOffer({...valid,verifiedAt},"controller",now),false,verifiedAt);
 }
 // A historic technical review can coexist with a genuinely fresh price fetch.
 assert.equal(eligibleGuideOffer({...valid,verifiedAt:"2026-09-20"},"controller",now),true);
});

test("visible verified offers expire at the earliest feed or per-product observation deadline", async () => {
 const hour=60*60*1000;
 const valid=offer();
 const current=payload([valid],now);
 assert.equal(guideOffersExpireAt(current,["controller"],now),
   Date.parse(valid.offerObservedAt)+72*hour+1);
 assert.equal(guideOffersExpireAt(current,["battery"],now),null);
 assert.equal(guideOffersExpireAt({...current,sources:{vselektro:{status:"stale"}}},["controller"],now),null);
 const later={...valid,offerObservedAt:new Date(now).toISOString()};
 assert.equal(guideOffersExpireAt(payload([later],now),["controller"],now),now+72*hour+1);
 // The actual browser must schedule invalidation and remove old links before
 // refetch; an hourly refresh alone can leave a stale price visible.
 const script=await readFile(new URL("../src/guide-verified-offers.js",import.meta.url),"utf8");
 assert.match(script,/expiryTimer = window\.setTimeout/);
 assert.match(script,/for \(const root of roots\) mountGuideOffers\(root, null, Date\.now\(\)\)/);
});

test("duplicate approved SKU rows fail closed even if one appears valid",()=>{
 const valid=offer();
 const duplicate={...valid,priceCzk:9999};
 assert.equal(selectGuideOffers(payload([valid,duplicate]),"controller",now).length,0);
 assert.equal(selectGuideOffers(payload([valid,{...valid,available:false}]),"controller",now).length,0);
 const other=offer("vselektro:victron-smartsolar-100-30");
 assert.equal(selectGuideOffers(payload([valid,other]),"controller",now).length,2);
 assert.equal(selectGuideOffers(payload([valid,valid,other]),"controller",now).length,1);
});

test("affiliate URL, exact approved SKU, nonzero feed price and origin cannot be substituted",()=>{
 const original=offer();
 assert.equal(eligibleGuideOffer(original,"controller",now),true);
 for (const modified of [
   {id:"vselektro:unknown"},
   {merchant:"unverified-merchant"},
   {priceCzk:null},
   {priceCzk:0},
   {priceCurrency:"EUR"},
   {staleSource:true},
   {available:false},
   {verifiedAt:null},
   {productUrl:"https://example.com/solar/"},
   {affiliateUrl:"https://attacker.example/"},
   {affiliateUrl:"https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=f897865f&desturl=https%3A%2F%2Fevil.example%2F"},
 ]) assert.equal(eligibleGuideOffer({...original,...modified},"controller",now),false,JSON.stringify(modified));
});


test("approved SKU cannot silently route a purchase to another merchant product", () => {
 const valid=offer();
 assert.equal(eligibleGuideOffer(valid,"controller",now),true);
 const wrongProductUrl="https://www.vselektro.eu/solarni-regulator-victron-energy-smartsolar-30a/";
 const tracked=new URL(valid.affiliateUrl);
 tracked.searchParams.set("desturl",wrongProductUrl);
 assert.equal(eligibleGuideOffer({...valid,productUrl:wrongProductUrl,affiliateUrl:tracked.href},"controller",now),false);
 // A generic storefront route is not evidence of the approved exact product.
 tracked.searchParams.set("desturl","https://www.vselektro.eu/");
 assert.equal(eligibleGuideOffer({...valid,productUrl:"https://www.vselektro.eu/",affiliateUrl:tracked.href},"controller",now),false);
 assert.equal(eligibleGuideOffer(offer("vselektro:victron-smartsolar-100-30"),"controller",now),true);
});

test("ambiguous duplicate affiliate tracking parameters never create a purchase recommendation", () => {
 const valid = offer();
 assert.equal(eligibleGuideOffer(valid, "controller", now), true);
 for (const [key, value] of [
   ["desturl", "https://unapproved.example/"],
   ["a_aid", "different-publisher"],
   ["a_bid", "different-campaign"],
 ]) {
   const link = new URL(valid.affiliateUrl);
   link.searchParams.append(key, value);
   assert.equal(eligibleGuideOffer({...valid, affiliateUrl: link.href}, "controller", now), false, key);
 }
});

test("unreviewed eHUB redirect parameters and fragments cannot masquerade as verified purchase routes", () => {
 const valid = offer();
 for (const change of [
  (url) => url.searchParams.set("redirect", "https://example.com/"),
  (url) => url.searchParams.set("desturl2", "https://example.com/"),
  (url) => { url.hash = "#redirect"; },
 ]) {
  const url = new URL(valid.affiliateUrl);
  change(url);
  assert.equal(eligibleGuideOffer({...valid, affiliateUrl:url.href}, "controller", now), false);
 }
 assert.equal(eligibleGuideOffer(valid, "controller", now), true);
});

test("approved guide routes reject alternate HTTPS ports and URL credentials", () => {
 const valid = offer();
 for (const productUrl of [
   valid.productUrl.replace("https://www.vselektro.eu/", "https://www.vselektro.eu:8443/"),
   valid.productUrl.replace("https://www.vselektro.eu/", "https://user:pass@www.vselektro.eu/"),
 ]) {
   const tracked = new URL(valid.affiliateUrl);
   tracked.searchParams.set("desturl", productUrl);
   assert.equal(eligibleGuideOffer({...valid, productUrl, affiliateUrl: tracked.href}, "controller", now), false, productUrl);
 }
 for (const affiliateUrl of [
   valid.affiliateUrl.replace("https://ehub.cz/", "https://ehub.cz:8443/"),
   valid.affiliateUrl.replace("https://ehub.cz/", "https://user:pass@ehub.cz/"),
 ]) {
   assert.equal(eligibleGuideOffer({...valid, affiliateUrl}, "controller", now), false, affiliateUrl);
 }
 assert.equal(eligibleGuideOffer(valid, "controller", now), true, "approved canonical route must remain eligible");
});

test("a stale guide feed removes prior tracked offers and restores the honest calculator fallback", async () => {
 const previousDocument = globalThis.document;
 const element = (tagName = "div") => ({
   tagName, className: "", children: [], dataset: {}, hidden: false, listeners: {},
   append(child) { child.parent = this; this.children.push(child); },
   addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
   dispatch(type) {
     const event = {
       defaultPrevented: false, propagationStopped: false,
       preventDefault() { this.defaultPrevented = true; },
       stopPropagation() { this.propagationStopped = true; },
     };
     for (const handler of this.listeners[type] || []) handler(event);
     return event;
   },
   remove() {
     if (this.parent) this.parent.children = this.parent.children.filter((item) => item !== this);
     this.parent = null;
   },
   querySelector(selector) {
     if (selector === ".guide-offer-list") return this.children.find((child) => child.className === "guide-offer-list") || null;
     if (selector === ".guide-offer-fallback") return this.children.find((child) => child.className === "guide-offer-fallback") || null;
     return null;
   },
 });
 const root = element();
 root.dataset.guideCategory = "controller";
 const fallback = element("p");
 fallback.className = "guide-offer-fallback";
 root.append(fallback);
 globalThis.document = { createElement: element };
 try {
   assert.equal(mountGuideOffers(root, payload(), now, () => now), 1);
   assert.equal(root.dataset.liveOffers, "1");
   assert.equal(fallback.hidden, true);
   assert.equal(root.children.filter((child) => child.className === "guide-offer-list").length, 1);
   const currentLink = root.querySelector(".guide-offer-list").children[0].children.find((child) => child.tagName === "a");
   assert.equal(currentLink.dispatch("click").defaultPrevented, false, "fresh link remains usable");
   // The page may remain visible across a feed expiry without a visibility event.
   // A click on an old price must not navigate or bubble as a tracked sale.
   assert.equal(mountGuideOffers(root, payload(), now, () => now + 73 * 60 * 60 * 1000), 1);
   const expiredLink = root.querySelector(".guide-offer-list").children[0].children.find((child) => child.tagName === "a");
   const blocked = expiredLink.dispatch("auxclick");
   assert.equal(blocked.defaultPrevented, true);
   assert.equal(blocked.propagationStopped, true);
   assert.equal(root.querySelector(".guide-offer-list"), null);
   assert.equal(root.dataset.liveOffers, "0");
   assert.equal(fallback.hidden, false);
   const stale = { ...payload(), sources: { vselektro: { status: "stale" } } };
   assert.equal(mountGuideOffers(root, stale, now), 0);
   assert.equal(root.dataset.liveOffers, "0");
   assert.equal(fallback.hidden, false);
   assert.equal(root.querySelector(".guide-offer-list"), null);
   assert.equal(mountGuideOffers(root, payload(), now), 1);
   assert.equal(root.children.filter((child) => child.className === "guide-offer-list").length, 1);
   assert.equal(fallback.hidden, true);
   // A later HTTP failure, invalid JSON, or expired catalog must not retain
   // the earlier price and tracked purchase link in a long-lived browser tab.
   // An unresolved refresh must remove the old tracked link BEFORE fetch resolves.
   let releaseFetch;
   const pending = refreshGuideOffers([root], () => new Promise((resolve) => {
     releaseFetch = resolve;
   }), now);
   assert.equal(root.querySelector(".guide-offer-list"), null);
   assert.equal(root.dataset.liveOffers, "0");
   assert.equal(fallback.hidden, false);
   releaseFetch({ ok: true, json: async () => payload() });
   await pending;
   assert.equal(root.dataset.liveOffers, "1");
   // A tab can be suspended while its feed request is in flight. The catalog
   // was valid when the request started, but is no longer valid at response.
   let virtualNow = now;
   let finishSlowFetch;
   const slow = refreshGuideOffers([root], () => new Promise((resolve) => {
     finishSlowFetch = resolve;
   }), () => virtualNow);
   assert.equal(root.dataset.liveOffers, "0");
   virtualNow = now + 73 * 60 * 60 * 1000;
   finishSlowFetch({ ok: true, json: async () => payload() });
   await slow;
   assert.equal(root.dataset.liveOffers, "0", "expired offer cannot return after a delayed fetch");
   assert.equal(root.querySelector(".guide-offer-list"), null);
   assert.equal(fallback.hidden, false);
   await refreshGuideOffers([root], async () => ({ ok: false }), now);
   assert.equal(root.querySelector(".guide-offer-list"), null);
   assert.equal(root.dataset.liveOffers, "0");
   assert.equal(fallback.hidden, false);
   await refreshGuideOffers([root], async () => ({ ok: true, json: async () => payload() }), now);
   assert.equal(root.dataset.liveOffers, "1");
   await refreshGuideOffers([root], async () => { throw new Error("offline"); }, now);
   assert.equal(root.dataset.liveOffers, "0");
   await refreshGuideOffers([root], async () => ({ ok: true, json: async () => { throw new Error("bad JSON"); } }), now);
   assert.equal(root.querySelector(".guide-offer-list"), null);
   await refreshGuideOffers([root], async () => ({ ok: true, json: async () => payload() }), now + 73 * 60 * 60 * 1000);
   assert.equal(root.dataset.liveOffers, "0");
   assert.equal(fallback.hidden, false);
   // A permanently stalled feed request must time out, keep purchase links
   // disabled, and allow the next visibility/focus refresh to recover.
   let stalledSignal;
   const keepEventLoopAlive = setTimeout(() => {}, 70);
   try {
     await refreshGuideOffers([root], (_url, options) => new Promise((_resolve, reject) => {
       stalledSignal = options.signal;
       options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
     }), now, 20);
   } finally {
     clearTimeout(keepEventLoopAlive);
   }
   assert.equal(stalledSignal.aborted, true);
   assert.equal(root.dataset.liveOffers, "0");
   assert.equal(root.querySelector(".guide-offer-list"), null);
   assert.equal(fallback.hidden, false);
   await refreshGuideOffers([root], async () => ({ ok: true, json: async () => payload() }), now);
   assert.equal(root.dataset.liveOffers, "1");
 } finally {
   if (previousDocument === undefined) delete globalThis.document;
   else globalThis.document = previousDocument;
 }
});

test("verified SmartSolar 100/50 PV input Isc is exactly 60 A per Victron data sheet",()=>{
 const title="Solární regulátor Victron Energy MPPT SmartSolar 100V/50A";
 const xml='<SHOP><SHOPITEM><ITEM_ID>victron-50</ITEM_ID><PRODUCTNAME>'+title+'</PRODUCTNAME>'+
 '<DESCRIPTION>MPPT charge controller</DESCRIPTION><URL>https://www.vselektro.eu/solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/</URL>'+
 '<CATEGORYTEXT>Solární regulátory</CATEGORYTEXT><PRICE_VAT>4946</PRICE_VAT><DELIVERY_DATE>0</DELIVERY_DATE></SHOPITEM></SHOP>';
 const [item]=parseVselektroVerifiedFeed(xml);
 assert.equal(item.specs.maxPvIscA,60);
 assert.equal(item.specs.maxPvVocV,100);
 assert.equal(item.specs.maxPvWattsBySystemVoltage[12],700);
});

const pages=[
["lifepo4-100ah-nebo-200ah-karavan","battery","kapacita-baterie-do-karavanu"],
["victron-mppt-100-20-vs-100-30-vs-100-50","controller","jak-vybrat-mppt-regulator"],
["dc-dc-nabijecka-18a-vs-30a-vs-50a-karavan","dc_charger","jak-vybrat-dc-dc-nabijecku"],
];
test("three distinct high-intent original pages have canonical, full static answer and contextual links", async()=>{
 const sitemap=await readFile("sitemap.xml","utf8");
 const guideHub=await readFile("pruvodce/index.html","utf8");
 const routes=new Set();
 for(const [slug,category,existing] of pages){
  const html=await readFile("pruvodce/"+slug+"/index.html","utf8");
  const canonical="https://mypowersetup.com/pruvodce/"+slug+"/";
  routes.add(canonical);
  assert.ok(html.includes('rel="canonical" href="'+canonical+'"'));
  assert.ok(html.includes('name="description"'));
  assert.ok(html.includes('data-guide-category="'+category+'"'));
  assert.ok(html.includes('href="/pruvodce/'+existing+'/'));
  assert.ok(html.includes('href="/#kalkulator"')||html.includes('href="/kalkulacky/dc-dc-nabijecka/"'));
  assert.ok(html.includes('src="/src/guide-verified-offers.js?v=20261014-1"'));
  assert.ok(html.includes('"@type":"Article"'));
  assert.ok(html.includes('"@type":"BreadcrumbList"'));
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('<ol>'));
  assert.ok(!/itemprop="price"|priceCurrency.+CZK/.test(html),"no fixed price markup");
  assert.equal(sitemap.split("<loc>"+canonical+"</loc>").length-1,1);
  assert.ok(guideHub.includes('href="/pruvodce/'+slug+'/">'));
  const parent=await readFile("pruvodce/"+existing+"/index.html","utf8");
  assert.ok(parent.includes('href="/pruvodce/'+slug+'/">'));
 }
 assert.equal(routes.size,3);
 assert.ok(guideHub.includes('"numberOfItems":15'));
});
test("manufacturer spec citations and companion styles are present",async()=>{
 const mppt=await readFile("pruvodce/victron-mppt-100-20-vs-100-30-vs-100-50/index.html","utf8");
 assert.match(mppt,/60 A/);
 assert.match(mppt,/35 A/);
 assert.match(mppt,/Voc/i);
 assert.match(mppt,/victronenergy\.com\/media\/pg/);
 const charging=await readFile("pruvodce/dc-dc-nabijecka-18a-vs-30a-vs-50a-karavan/index.html","utf8");
 assert.match(charging,/Alternátor|alternátoru/);
 assert.match(charging,/izolovan/);
 const css=await readFile("guide-comparison.css","utf8");
 assert.match(css,/\.guide-offer-link:focus-visible/);
 assert.match(css,/@media \(max-width: 640px\)/);
});

test("calculator result connects three distinct sourced purchase comparisons without new affiliate routes", async () => {
 const html=await readFile("index.html","utf8");
 const css=await readFile("styles.css","utf8");
 const section=html.split('<section class="next-step-card" id="product-recommendations">')[1]?.split('</section>')[0];
 assert.ok(section, "calculator purchase result missing");
 assert.match(section, /aria-label="Porovnat komponenty před nákupem"/);
 for(const [slug] of pages){
  assert.equal(section.split('href="/pruvodce/'+slug+'/"').length-1,1,slug+" missing or duplicated");
 }
 assert.ok(section.indexOf('class="component-comparison-links"')>section.indexOf('id="recommendation-groups"'));
 assert.match(section,/srovnání nejsou cenovou ani skladovou nabídkou/);
 assert.doesNotMatch(section,/ehub[.]cz|go[.]dognet[.]com|a_aid=|a_bid=/);
 assert.ok(css.includes('.component-comparison-links a:focus-visible'));
});
