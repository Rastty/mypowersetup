import test from "node:test";
import assert from "node:assert/strict";
import { renderLocalizedCaravanBuyerPlan } from "../src/caravan-buyer-plan-localized.js";

const data = (withLink = true) => ({
  requiredCount: 4,
  manualDesign: false,
  rows: [
    {category:"battery", ready:true, product:{id:"battery1",name:"LiFePO4 100Ah",merchant:"approved",affiliateUrl:withLink ? "https://example.test/track" : null}},
    {category:"solar_panel", ready:true, product:{id:"panel1",name:"Panel 200Wp",merchant:"approved",affiliateUrl:"https://example.test/track"}},
    {category:"controller", ready:false, product:null},
    {category:"inverter", ready:false, product:null},
  ],
});
const render = (locale, plan) => {
  const target={innerHTML:""};
  let event=null;
  renderLocalizedCaravanBuyerPlan({
    target, plan, locale,
    purchaseUrl:(p)=>p.affiliateUrl,
    purchaseCta:(_,merchant)=>"Zobrazit "+merchant,
    merchantLabel:(m)=>m,
    trackEvent:(name,props)=>event={name,props}
  });
  return {html:target.innerHTML,event};
};

test("SK and PL show honestly partial component baskets with locally tracked merchant CTAs", () => {
  for (const locale of ["sk","pl"]) {
    const {html,event}=render(locale,data());
    assert.match(html, /data-buying-plan-state="partial"/);
    assert.equal((html.match(/data-affiliate-click/g)||[]).length,2);
    assert.match(html, /data-source="caravan-plan"/);
    assert.match(html,/rel="sponsored noopener"/);
    assert.match(html,/data-buying-category="controller" data-shopping-quantity="0" class="is-missing"/);
    assert.match(html,/data-buying-category="inverter" data-shopping-quantity="0" class="is-missing"/);
    assert.ok(event && event.props.locale===locale && event.props.verified_categories===2);
    assert.match(html,locale==="sk"?/Toto NIE JE kompletná zostava/:/To NIE JEST kompletny zestaw/);
  }
});

test("missing tracked link hides purchase action and does not claim complete coverage",() => {
  const out=render("pl",data(false));
  assert.equal((out.html.match(/data-affiliate-click/g)||[]).length,1);
  assert.match(out.html,/1 z 4 zweryfikowanych kategorii/);
  assert.doesNotMatch(out.html,/href="null"/);
});

test("manual charging design keeps otherwise covered SK basket partial",() => {
 const plan={requiredCount:1,rows:[{category:"battery",ready:true,product:{id:"a",name:"a",merchant:"approved",affiliateUrl:"https://example.test"}}],manualDesign:true};
 const {html}=render("sk",plan);
 assert.match(html,/data-buying-plan-state="partial"/);
 assert.match(html,/individuálny návrh/);
});
