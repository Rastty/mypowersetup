import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";

const product = (id) => ({ id, name: id, merchant: "vselektro", available: true });
const candidate = (id) => ({ product: product(id), available: true });

test("complete caravan shopping plan uses vetted package products in required order", () => {
  const coverage = { required: ["battery","solar_panel","controller"], manualDesignCharging: [] };
  const recommendations = { battery:[candidate("b")], solar_panel:[candidate("p")], controller:[candidate("c")] };
  const packages = [{ id:"recommended", items:[
    {category:"battery",product:product("b")},{category:"solar_panel",product:product("p")},{category:"controller",product:product("c")}
  ]}];
  const plan = buildCaravanBuyerChecklist({ coverage, packages, recommendations });
  assert.equal(plan.status,"complete");
  assert.equal(plan.readyCount,3);
  assert.deepEqual(plan.rows.map(({ category,product })=>[category,product.id]),[
    ["battery","b"],["solar_panel","p"],["controller","c"]
  ]);
});

test("partial shopping plan offers only vetted products and names missing components", () => {
  const coverage = { required:["battery","solar_panel","controller","inverter"], manualDesignCharging:[] };
  const recommendations = {
    battery: [candidate("b")],
    solar_panel: [{product:product("bad-panel"), available:false, staleSource:true}],
    controller: [candidate("mppt")],
    inverter: []
  };
  const plan = buildCaravanBuyerChecklist({ coverage, recommendations });
  assert.equal(plan.status,"partial");
  assert.equal(plan.readyCount,2);
  assert.deepEqual(plan.rows.filter(({ready})=>!ready).map(({category})=>category),["solar_panel","inverter"]);
});

test("manual charger design is never presented as complete ready-to-install system", () => {
  const coverage = {required:["battery","solar_panel","controller"],manualDesignCharging:["dc_charger"]};
  const recommendations = {battery:[candidate("b")],solar_panel:[candidate("p")],controller:[candidate("c")]};
  const plan = buildCaravanBuyerChecklist({ coverage, recommendations });
  assert.equal(plan.readyCount,3);
  assert.equal(plan.complete,false);
  assert.equal(plan.status,"partial");
  assert.equal(plan.manualDesign,true);
});

test("Czech result renders buying plan before system metrics, preserving tracked item links", () => {
  const html = readFileSync(new URL("../index.html",import.meta.url),"utf8");
  const app = readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
  assert.ok(html.indexOf('id="caravan-buyer-checklist"') > html.indexOf('id="featured-recommendations"'));
  assert.ok(html.indexOf('id="caravan-buyer-checklist"') < html.indexOf('id="result-grid"'));
  assert.match(app,/renderCaravanBuyerChecklist\(buildCaravanBuyerChecklist\(/);
  assert.match(app,/data-affiliate-click data-source="caravan-plan"/);
  assert.match(app,/attributedAwinUrl\(product, category, "recommended", "caravan-plan"\)/);
  assert.match(html,/caravan-buyer-checklist\.css\?v=20261121-2/);
});
