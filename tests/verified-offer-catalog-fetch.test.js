import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { loadGuideCatalog, LIGHTWEIGHT_CATALOG_PATH, FULL_CATALOG_PATH } from "../src/verified-offer-catalog-fetch.js";

const payload = { schemaVersion: 1, generatedAt: "2026-11-10T06:00:00Z", sources: { vselektro: { status: "ok" } }, products: [] };
const root = category => ({dataset:{guideCategory:category}});
function harness(compact={ok:true,status:200,json:async()=>payload}) {
  const requests=[];
  const fetchImpl=async(path,options)=>{
    requests.push({path,options});
    return path===LIGHTWEIGHT_CATALOG_PATH
      ? compact
      : {ok:true,status:200,json:async()=>({full:true})};
  };
  return {requests,fetchImpl};
}

test("battery and MPPT editorial pages request only the compact six-SKU artifact",async()=>{
  for(const roots of [[root("battery")],[root("controller")],[root("battery"),root("controller")]]){
    const h=harness();
    assert.deepEqual(await loadGuideCatalog(roots,h.fetchImpl),payload);
    assert.deepEqual(h.requests.map(r=>r.path),[LIGHTWEIGHT_CATALOG_PATH]);
    assert.equal(h.requests[0].options.cache,"no-store");
    assert.equal(h.requests[0].options.redirect,"error");
    assert.ok(h.requests[0].options.signal);
  }
});

test("DC-DC and mixed/unknown guides preserve full catalog access",async()=>{
  for(const roots of [[root("dc_charger")],[root("battery"),root("dc_charger")],[root("unknown")]]){
    const h=harness();
    assert.deepEqual(await loadGuideCatalog(roots,h.fetchImpl),{full:true});
    assert.deepEqual(h.requests.map(r=>r.path),[FULL_CATALOG_PATH]);
  }
});

test("only 404/410 allow transitional legacy fallback; malformed and failed snapshots never do",async()=>{
  for(const status of [404,410]){
    const h=harness({ok:false,status});
    assert.deepEqual(await loadGuideCatalog([root("battery")],h.fetchImpl),{full:true});
    assert.deepEqual(h.requests.map(r=>r.path),[LIGHTWEIGHT_CATALOG_PATH,FULL_CATALOG_PATH]);
  }
  for(const compact of [{ok:false,status:503},{ok:true,status:200,json:async()=>({bad:true})}]){
    const h=harness(compact);
    assert.equal(await loadGuideCatalog([root("controller")],h.fetchImpl),null);
    assert.deepEqual(h.requests.map(r=>r.path),[LIGHTWEIGHT_CATALOG_PATH]);
  }
  assert.equal(await loadGuideCatalog([],async()=>{throw Error("should not request")}),null);
  assert.equal(await loadGuideCatalog([root("battery")],async()=>{throw Error("offline")}),null);
});

test("shared loader is independent from UI module initialization",async()=>{
  const [guide,calculator,loader]=await Promise.all([
    readFile("src/guide-verified-offers.js","utf8"),
    readFile("src/calculator-offer-catalog.js","utf8"),
    readFile("src/verified-offer-catalog-fetch.js","utf8"),
  ]);
  assert.ok(guide.includes("loadGuideCatalog(roots, fetchImpl, timeoutMs)"));
  assert.ok(calculator.includes('from "./verified-offer-catalog-fetch.js"'));
  assert.ok(!loader.includes('from "./guide-verified-offers.js"'));
});
