import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { eligibleGuideOffer, guideCatalogFresh, selectGuideOffers } from "../src/guide-verified-offers.js";
import { parseVselektroVerifiedFeed } from "../src/vselektro-feed.js";

const now=Date.parse("2026-10-14T11:00:00Z");
function offer(id="vselektro:victron-smartsolar-100-50",category="controller"){
 const productUrl="https://www.vselektro.eu/solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/";
 const tracking=new URL("https://ehub.cz/system/scripts/click.php");
 tracking.searchParams.set("a_aid","f34c86c8");
 tracking.searchParams.set("a_bid","f897865f");
 tracking.searchParams.set("desturl",productUrl);
 return {id,category,merchant:"vselektro",productUrl,affiliateUrl:tracking.href,
   name:"Victron SmartSolar 100/50",priceCzk:4946,priceCurrency:"CZK",
   available:true,verifiedAt:"2026-10-13",staleSource:false};
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
