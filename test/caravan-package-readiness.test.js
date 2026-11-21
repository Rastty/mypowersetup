import test from "node:test";
import assert from "node:assert/strict";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";

const product=(id,stock=true)=>({
  id,merchant:"vselektro",available:stock,
  affiliateUrl:`https://ehub.cz/system/scripts/click.php?sku=${id}`,
});
const variant=(id,battery,mppt)=>({
  id,requiredCategoryCount:2,
  items:[{category:"battery",product:battery},{category:"controller",product:mppt}],
});
const plan={complete:true,rows:[
 {category:"battery",ready:true,product:product("battery")},
 {category:"controller",ready:true,product:product("mppt")},
]};
test("only exact recommended package and independently stocked alternative have purchase checkouts",()=>{
 const packages=[
  variant("recommended",product("battery"),product("mppt")),
  variant("economy",product("battery-budget"),product("mppt-budget")),
 ];
 assert.deepEqual(purchaseReadyCaravanPackages(packages,plan).map(x=>x.id),["recommended","economy"]);
});
test("unknown or false stock cannot be sold through alternate package CTA",()=>{
 const packages=[
  variant("recommended",product("battery",null),product("mppt")),
  variant("economy",product("battery-budget",true),product("mppt-budget",false)),
  variant("reserve",product("battery"),product("mppt")),
 ];
 assert.deepEqual(purchaseReadyCaravanPackages(packages,plan).map(x=>x.id),["reserve"]);
});
test("recommended package mismatching buyer's confirmed SKU is not presented as recommendation",()=>{
 const packages=[
  variant("recommended",product("old-battery"),product("mppt")),
  variant("economy",product("battery"),product("mppt")),
 ];
 assert.deepEqual(purchaseReadyCaravanPackages(packages,plan).map(x=>x.id),["economy"]);
});
test("partial plans, unknown affiliate link and manual charging block complete package CTA",()=>{
 const complete=variant("recommended",product("battery"),product("mppt"));
 assert.deepEqual(purchaseReadyCaravanPackages([complete],{...plan,complete:false}),[]);
 const withoutLink=variant("economy",product("battery"),{...product("mppt"),affiliateUrl:""});
 assert.deepEqual(purchaseReadyCaravanPackages([withoutLink],plan),[]);
 const duplicated={...complete,items:[...complete.items.slice(0,1),{category:"battery",product:product("another")}]};
 assert.deepEqual(purchaseReadyCaravanPackages([duplicated],plan),[]);
});
