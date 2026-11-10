import test from "node:test";
import assert from "node:assert/strict";
import {
  EDITORIAL_BUYER_PATHS, ga4EditorialBuyerDimensionState, ga4EditorialBuyerFilter,
  editorialBuyerFromGa4RunReport,
} from "../src/ga4-editorial-buyer-evidence.js";

const PAGE = "/pruvodce/kapacita-baterie-do-karavanu/";
const MPPT = "/pruvodce/jak-vybrat-mppt-regulator/";
const meta = (...fields) => ({
  dimensions: ["eventName","pagePath","hostName",...fields].map(apiName=>({apiName})),
});
const source = ["customEvent:source","customEvent:merchant"];
const withSku = [...source,"customEvent:productId"];
const event = (name,path,count,attributes={}) => ({
  eventName:name,pagePath:path,hostName:"mypowersetup.com",eventCount:String(count),...attributes,
});
function report(rows, dimensionFields = []) {
  const dimensions = ["eventName","pagePath","hostName",...dimensionFields];
  return {
    rowCount:rows.length,dimensionHeaders:dimensions.map(name=>({name})),
    metricHeaders:[{name:"eventCount"}],
    rows:rows.map(row=>({
      dimensionValues:dimensions.map(key=>({value:row[key]??"(not set)"})),
      metricValues:[{value:row.eventCount}],
    })),
  };
}

test("six reviewed commercial guides only, with exact built-in hostname/page/event filters", () => {
  assert.equal(EDITORIAL_BUYER_PATHS.length,6);
  assert.equal(new Set(EDITORIAL_BUYER_PATHS).size,6);
  assert.ok(EDITORIAL_BUYER_PATHS.every(p=>p.startsWith("/pruvodce/")&&p.endsWith("/")));
  const filter=ga4EditorialBuyerFilter().andGroup.expressions;
  assert.equal(filter[0].filter.fieldName,"hostName");
  assert.deepEqual(filter[1].filter.inListFilter.values,EDITORIAL_BUYER_PATHS);
  assert.deepEqual(filter[2].filter.inListFilter.values,["page_view","product_choice_impression","affiliate_click"]);
  assert.throws(()=>ga4EditorialBuyerFilter("untrusted.example"),/GA4_EDITORIAL_TARGET_HOST_INVALID/);
});

test("missing custom dimensions retain honest page-level attribution, not false VseElektro sales", () => {
  const state=ga4EditorialBuyerDimensionState(meta());
  assert.equal(state.ready,true);
  assert.equal(state.offerAttribution,"page_only_all_merchants");
  assert.equal(state.skuAttribution,"not_measured");
  const rows=[event("page_view",PAGE,20),event("product_choice_impression",PAGE,6),
    event("affiliate_click",PAGE,2),event("affiliate_click",MPPT,1)];
  const summary=editorialBuyerFromGa4RunReport(report(rows),state);
  assert.equal(summary.status,"ready");
  assert.equal(summary.rows.length,6);
  assert.deepEqual(summary.rows[0],{path:PAGE,pageViews:20,productImpressions:6,affiliateClicks:2});
  assert.equal(summary.rows.find(row=>row.path===MPPT).affiliateClicks,1);
  assert.ok(summary.rows.some(row=>row.pageViews===0&&row.affiliateClicks===0));
  assert.deepEqual(summary.productEvents,[]);
  assert.equal(summary.revenueMeasured,false);
  assert.equal(summary.merchantConversionsMeasured,false);
  assert.equal(summary.metricUnit,"consented_event_count");
});

test("source+merchant both must be registered before events may count as verified reviewed offers", () => {
  const partial=ga4EditorialBuyerDimensionState(meta("customEvent:source"));
  assert.equal(partial.offerAttribution,"page_only_all_merchants");
  assert.deepEqual(partial.dimensions,["eventName","pagePath","hostName"]);

  const state=ga4EditorialBuyerDimensionState(meta(...source));
  assert.equal(state.offerAttribution,"merchant_and_source");
  const rows=[
    event("page_view",PAGE,20),
    event("product_choice_impression",PAGE,9,{
      "customEvent:source":"editorial-comparison","customEvent:merchant":"vselektro"}),
    event("product_choice_impression",PAGE,4,{
      "customEvent:source":"other-source","customEvent:merchant":"vselektro"}),
    event("affiliate_click",PAGE,3,{
      "customEvent:source":"editorial-comparison","customEvent:merchant":"vselektro"}),
    event("affiliate_click",PAGE,8,{
      "customEvent:source":"editorial-comparison","customEvent:merchant":"different-merchant"}),
  ];
  const summary=editorialBuyerFromGa4RunReport(report(rows,source),state);
  assert.deepEqual(summary.rows[0],{path:PAGE,pageViews:20,productImpressions:9,affiliateClicks:3});
  assert.equal(summary.attribution,"merchant_and_source");
  assert.equal(summary.skuAttribution,"not_measured");
});

test("product-level client event evidence stays distinct from actual commissions", () => {
  const state=ga4EditorialBuyerDimensionState(meta(...withSku));
  const product="vselektro:sunstone-slpo12-100n";
  const attrs={"customEvent:source":"editorial-comparison","customEvent:merchant":"vselektro",
    "customEvent:productId":product};
  const rows=[
    event("page_view",PAGE,30),
    event("product_choice_impression",PAGE,12,attrs),
    event("affiliate_click",PAGE,2,attrs),
    event("affiliate_click",PAGE,9,{...attrs,"customEvent:productId":"unreviewed"}),
  ];
  const summary=editorialBuyerFromGa4RunReport(report(rows,withSku),state);
  assert.equal(summary.rows[0].affiliateClicks,11,"event totals are recorded regardless of missing product dimension");
  assert.deepEqual(summary.productEvents,[{path:PAGE,productId:product,impressionEvents:12,clickEvents:2}]);
  assert.equal(summary.skuAttribution,"ga4_product_event");
  assert.equal(summary.revenueMeasured,false);
});

test("no report rows is an OBSERVED empty GA4 result, not a fabricated visitor count", () => {
  const state=ga4EditorialBuyerDimensionState(meta());
  const summary=editorialBuyerFromGa4RunReport(report([]),state);
  assert.equal(summary.rows.length,6);
  assert.ok(summary.rows.every(row=>row.pageViews===0&&row.affiliateClicks===0));
  assert.equal(summary.status,"ready");
});

test("missing dimensions, wrong property data and incomplete responses fail closed", () => {
  const state=ga4EditorialBuyerDimensionState(meta());
  assert.throws(()=>editorialBuyerFromGa4RunReport(report([]),ga4EditorialBuyerDimensionState({})),/GA4_EDITORIAL_REQUIRED_DIMENSIONS_MISSING/);
  const wrong=event("affiliate_click","/other-route/",2);
  assert.throws(()=>editorialBuyerFromGa4RunReport(report([wrong]),state),/GA4_EDITORIAL_UNEXPECTED_HOST_PAGE_OR_EVENT/);
  assert.throws(()=>editorialBuyerFromGa4RunReport(report([event("affiliate_click",PAGE,1,{hostName:"evil.example"})]),state),
    /GA4_EDITORIAL_UNEXPECTED_HOST_PAGE_OR_EVENT/);
  assert.throws(()=>editorialBuyerFromGa4RunReport({...report([]),rowCount:2},state),/GA4_REPORT_ROWS_INCOMPLETE/);
  assert.throws(()=>editorialBuyerFromGa4RunReport({...report([]),dimensionHeaders:[{name:"eventName"}]},state),
    /GA4_EDITORIAL_REPORT_HEADERS_INCOMPLETE/);
  const verified=ga4EditorialBuyerDimensionState(meta(...source));
  assert.throws(()=>editorialBuyerFromGa4RunReport(report([]),verified),/GA4_EDITORIAL_REPORT_HEADERS_INCOMPLETE/);
});

test("missing, fractional, overflow and negative event counts are never invented as successful clicks", () => {
  const state=ga4EditorialBuyerDimensionState(meta());
  for(const n of ["",null,undefined,"-1","1.4","9007199254740993","Infinity"]){
    const sample=report([event("affiliate_click",PAGE,3)]);
    sample.rows[0].metricValues[0].value=n;
    assert.throws(()=>editorialBuyerFromGa4RunReport(sample,state),/GA4_EDITORIAL_EVENT_COUNT_(?:MISSING|INVALID)/);
  }
  assert.equal(editorialBuyerFromGa4RunReport(report([event("affiliate_click",PAGE,0)]),state).rows[0].affiliateClicks,0);
});
