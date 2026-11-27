// Exact approved Czech offers with manufacturer-reviewed electrical limits.
// ROGERELE REP1500 and REP2000: rated, not peak, pure sine AC output;
// the merchant's exact 24V SKU and 230V/50Hz description disambiguate the family.
// NOCO: 24V charging current is HALF the headline 6/12V amperage.
// https://no.co/geniuspro25/specs
// https://no.co/geniuspro50/specs
const INVERTERS=Object.freeze({
  "solarimport:E7934":{watts:1500,peak:3000,url:"https://www.solar-import.cz/off-grid/rogerele-sinusovy-menic-napeti-rep1500-24--1500w/",evidence:"https://www.rogerele.com/productdetail/1500w-pure-sine-wave-inverter.html"},
  "solarimport:E7935":{watts:2000,peak:4000,url:"https://www.solar-import.cz/off-grid/rogerele-sinusovy-menic-napeti-rep2000-24--2000w/",evidence:"https://www.rogerele.com/productdetail/2000w-pure-sine-wave-inverter.html"},
});
const CHARGERS=Object.freeze({
  "batterycz:E8066":{model:"GENIUSPRO25",amps12:25,amps24:12.5,url:"https://www.battery.cz/nabijecka-noco-geniuspro25--6-12-24v-25a/",evidence:"https://no.co/geniuspro25/specs"},
  "batterycz:E8067":{model:"GENIUSPRO50",amps12:50,amps24:25,url:"https://www.battery.cz/nabijecka-noco-geniuspro50--6-12-24v-50a/",evidence:"https://no.co/geniuspro50/specs"},
});
function exactOffer(p,merchant,bid,url){
  if(p.merchant!==merchant||p.productUrl!==url||p.priceCurrency!=="CZK"
    ||p.available!==true||p.staleSource===true||p.marketEligible===false
    ||!Number.isFinite(p.priceCzk)||p.priceCzk<=0)return false;
  try {
    const a=new URL(p.affiliateUrl);
    return a.origin==="https://ehub.cz"&&a.pathname==="/system/scripts/click.php"
      &&!a.username&&!a.password&&!a.hash&&a.searchParams.size===3
      &&["a_aid","a_bid","desturl"].every(k=>a.searchParams.getAll(k).length===1)
      &&a.searchParams.get("a_aid")==="f34c86c8"&&a.searchParams.get("a_bid")===bid
      &&a.searchParams.get("desturl")===url;
  }catch{return false;}
}
export function addCzechReviewedPowerSpecs(product,specs){
  if(Object.hasOwn(INVERTERS,product?.id)){
    const m=INVERTERS[product.id];
    if(!exactOffer(product,"solarimport","35cb7fb0",m.url)
      ||product.category!=="inverter"||product.name!==`ROGERELE Sinusový měnič napětí REP${m.watts}-24 ${m.watts}W`
      ||!/230V\/50Hz/i.test(product.description||"")
      ||product.specs?.voltageV!==24||product.specs?.powerW!==m.watts||product.specs?.pureSine!==true
      ||specs.voltageV!==24||specs.powerW!==m.watts||specs.pureSine!==true)
      return {...specs,powerW:null,pureSine:null};
    return {...specs,powerW:m.watts,pureSine:true,inverterPeakPowerW:m.peak,
      inverterManufacturerModel:`REP${m.watts}-24`,inverterManufacturerEvidenceUrl:m.evidence};
  }
  if(Object.hasOwn(CHARGERS,product?.id)){
    const m=CHARGERS[product.id],raw=product.specs||{};
    const expectedDescription=`6V-${m.amps12}A / 12V-${m.amps12}A / 24V-${m.amps24}A`;
    if(!exactOffer(product,"batterycz","7095cb16",m.url)||product.category!=="shore_charger"
      ||product.name!==`Nabíječka NOCO ${m.model}, 6/12/24V ${m.amps12}A`
      ||!String(product.description||"").includes(expectedDescription)
      ||raw.voltageV!==24||raw.currentA!==m.amps12
      ||!raw.chargingBatteryTypes?.includes("lifepo4")||!specs.chargingBatteryTypes?.includes("lifepo4")
      ||specs.currentA!==m.amps12)
      return {...specs,currentA:null,chargingVoltagesV:[],chargingCurrentABySystemVoltage:null};
    return {...specs,currentA:m.amps12,chargingVoltagesV:[12,24],chargingInputVoltagesV:[],
      chargingCurrentABySystemVoltage:{12:m.amps12,24:m.amps24},
      chargingProfileEvidenceUrl:m.evidence,chargingManufacturerModel:m.model};
  }
  return specs;
}
