import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";

const product = (id) => ({ id, name: id, merchant: "vselektro", available: true, affiliateUrl: `https://ehub.cz/system/scripts/click.php?sku=${id}` });
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
  assert.deepEqual(plan.rows.map(row => row.quantity), [1,1,1]);
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
  assert.match(html,/caravan-buyer-checklist\.css\?v=20261121-requirements1/);
});

test("required multi-piece solar quantity follows vetted product rather than assuming one panel", () => {
  const coverage={required:["solar_panel"],manualDesignCharging:[]};
  const product={id:"solar-two",name:"200 W panel",merchant:"vselektro",affiliateUrl:"https://ehub.cz/system/scripts/click.php?sku=solar-two",available:true,recommendedQuantity:2};
  const plan=buildCaravanBuyerChecklist({
    coverage, recommendations:{solar_panel:[{product,available:true}]}
  });
  assert.equal(plan.rows[0].quantity,2);
  assert.equal(plan.rows[0].product.id,"solar-two");
});


test("partial buyer chooses the same affordable vetted solar option as a complete recommended package", () => {
  const recommendations = {
    solar_panel: [
      { score: 96, fit: 1, product: {id:"expensive-one",merchant:"vselektro",name:"Expensive 1x",available:true,affiliateUrl:"https://example.test/a",priceCzk:12000,priceCurrency:"CZK",recommendedQuantity:1} },
      { score: 89, fit: 1.2, product: {id:"value-two",merchant:"vselektro",name:"Value 2x",available:true,affiliateUrl:"https://example.test/b",priceCzk:1700,priceCurrency:"CZK",recommendedQuantity:2} },
    ],
    battery: [{score:96,fit:1,product:{id:"battery",name:"Battery",merchant:"vselektro",available:true,affiliateUrl:"https://example.test/c",priceCzk:5000,priceCurrency:"CZK"}}],
    controller: [],
  };
  const partial = buildCaravanBuyerChecklist({
    coverage:{required:["battery","solar_panel","controller"],manualDesignCharging:[]},
    packages:[], recommendations,
  });
  assert.equal(partial.status,"partial");
  assert.equal(partial.rows[1].product.id,"value-two");
  assert.equal(partial.rows[1].quantity,2);
  assert.equal(partial.rows[2].ready,false);
});

test("stale package choice never hides a still-eligible category alternative", () => {
  const plan = buildCaravanBuyerChecklist({
    coverage:{required:["solar_panel"],manualDesignCharging:[]},
    packages:[{id:"recommended",items:[{category:"solar_panel",product:{id:"stale",name:"old"}}]}],
    recommendations:{solar_panel:[
      {score:94,fit:1,product:{id:"stale",name:"old",available:false},available:false},
      {score:88,fit:1.15,product:{id:"new",name:"new",merchant:"vselektro",available:true,affiliateUrl:"https://example.test/new",priceCzk:1200,priceCurrency:"CZK",recommendedQuantity:2}},
    ]},
  });
  assert.equal(plan.rows[0].product.id,"new");
  assert.equal(plan.rows[0].quantity,2);
});

test("technically suitable unlinked SKU is not sold as purchasable; linked alternative is selected", () => {
 const coverage={required:["battery","controller"],manualDesignCharging:[]};
 const recommendations={
  battery:[
   {score:99,fit:1,product:{id:"unlinked",name:"Unlinked",merchant:"vselektro",available:true,affiliateUrl:""}},
   {score:90,fit:1.1,product:{id:"buyable",name:"Buyable",merchant:"vselektro",available:true,affiliateUrl:"https://ehub.cz/system/scripts/click.php?sku=buyable"}},
  ],
  controller:[{score:92,fit:1,product:{id:"no-link",name:"MPPT",merchant:"vselektro",available:true,affiliateUrl:"javascript:alert(1)"}}],
 };
 const plan=buildCaravanBuyerChecklist({coverage,recommendations,packages:[]});
 assert.equal(plan.status,"partial");
 assert.equal(plan.readyCount,1);
 assert.equal(plan.rows[0].product.id,"buyable");
 assert.equal(plan.rows[1].ready,false);
 assert.equal(plan.rows[1].product,null);
});

test("stale recommended package with dead link reselects actually buyable candidate", () => {
 const coverage={required:["battery"],manualDesignCharging:[]};
 const p=product("valid");
 const plan=buildCaravanBuyerChecklist({
  coverage,
  packages:[{id:"recommended",items:[{category:"battery",product:{id:"dead",merchant:"vselektro",affiliateUrl:""}}]}],
  recommendations:{battery:[{score:99,product:{id:"dead",merchant:"vselektro",affiliateUrl:"",available:true}},{score:90,product:p}]},
 });
 assert.equal(plan.rows[0].product.id,"valid");
 assert.equal(plan.complete,true);
});
