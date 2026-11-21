import test from "node:test";
import assert from "node:assert/strict";
import { caravanBasketPriceSummary, caravanLinePrice, caravanBasketPriceMarkup, caravanMerchantGroups } from "../src/caravan-basket-pricing.js";

const row=(currency,price,quantity=1)=>({
 category:"solar_panel",ready:true,quantity,
 product:{id:"merchant:p",affiliateUrl:"https://ehub.cz/system/scripts/click.php",priceCzk:price,priceCurrency:currency}
});
test("CZ prices only CZK subtotal for actually purchasable multi-item rows",()=>{
 const plan={rows:[row("CZK",2300,2),row("EUR",95),{category:"controller",ready:false}],manualDesign:false};
 const s=caravanBasketPriceSummary(plan,"cs");
 assert.deepEqual(s.subtotals,[{currency:"CZK",amount:4600}]);
 assert.equal(s.unpriced,1);
 assert.equal(s.unavailable,1);
 assert.equal(s.complete,false);
 assert.match(caravanBasketPriceMarkup(plan,"cs"),/chybějících kategorií/);
 assert.doesNotMatch(caravanBasketPriceMarkup(plan,"cs"),/95\s*€/);
});
test("PL never adds EUR to PLN and all amounts multiply per required SKU quantity",()=>{
 const s=caravanBasketPriceSummary({rows:[row("PLN",430,2),row("EUR",105,1)],manualDesign:false},"pl");
 assert.deepEqual(s.subtotals,[{currency:"PLN",amount:860},{currency:"EUR",amount:105}]);
 assert.equal(s.complete,true);
 assert.equal((caravanBasketPriceMarkup({rows:[row("PLN",430,2),row("EUR",105,1)]},"pl").match(/data-basket-currency=/g)||[]).length,2);
});
test("invalid or absent prices are unpriced, never free; stale or missing rows excluded",()=>{
 assert.equal(caravanLinePrice(row("EUR",null),"sk"),null);
 assert.equal(caravanLinePrice(row("EUR",0),"sk"),null);
 assert.equal(caravanLinePrice(row("EUR",-30),"sk"),null);
 assert.equal(caravanLinePrice(row("EUR",19,2),"cs"),null);
 assert.equal(caravanLinePrice({...row("CZK",300),ready:false},"cs"),null);
 assert.equal(caravanLinePrice({...row("CZK",300),product:{id:"x",priceCzk:300,priceCurrency:"CZK"}},"cs"),null);
});

test("same merchant products share checkout group, separate merchants never become one cart", () => {
  const a=row("PLN",190,2);a.product.merchant="padabo_pl";
  const b=row("PLN",320,1);b.product.merchant="padabo_pl";
  const c=row("EUR",65,1);c.product.merchant="powerqueen_eu";
  const missing={category:"controller",ready:false};
  const plan={rows:[a,b,c,missing],manualDesign:false};
  const groups=caravanMerchantGroups(plan,"pl");
  assert.equal(groups.length,2);
  assert.equal(groups[0].merchant,"padabo_pl");
  assert.equal(groups[0].count,2);
  assert.deepEqual(groups[0].subtotals,[{currency:"PLN",amount:700}]);
  assert.deepEqual(groups[1].subtotals,[{currency:"EUR",amount:65}]);
  const markup=caravanBasketPriceMarkup(plan,"pl",(merchant)=>merchant==="padabo_pl"?"Padabo Poland":"Power Queen");
  assert.match(markup,/Podział według sklepów \(2\)/);
  assert.match(markup,/Padabo Poland/);
  assert.match(markup,/Power Queen/);
  assert.match(markup,/2× panele słoneczne/);
  assert.match(markup,/1× panele słoneczne/);
  assert.equal((markup.match(/data-store-group=/g)||[]).length,2);
});
