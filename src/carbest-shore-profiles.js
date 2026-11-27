// Reimo/Carbest manual p19: 190–265 VAC / 50 Hz, 12V battery,
// 14.4V ±0.2V LiFePO4 bulk and 13.5V ±0.2V float. Max 10/15/20A,
// NOT 10/15/20A per outlet. Intersect manufacturer manual's suggested
// 15–100 / 20–150 / 25–200 Ah with dealer's narrower 50–100/150/200 Ah.
// https://www.svetkaravanu.cz/lithiova-nabijecka-carbest-12-v-se-2-vystupy_z25869/
const MANUAL="https://d2rqvrnppmk7he.cloudfront.net/pdfpool/74/8c/80286_80287_80288_80289_carbest_batterie_ladegeraete_web.pdf";
const MODELS=Object.freeze({
 "27324":{model:"80286",amps:10,maxAh:100},
 "27325":{model:"80287",amps:15,maxAh:150},
 "27326":{model:"80288",amps:20,maxAh:200},
});
const SELLERS=Object.freeze({
 svetkaravanu:{currency:"CZK",bid:"38137ac4",url:"https://www.svetkaravanu.cz/lithiova-nabijecka-carbest-12-v-se-2-vystupy_z25869/",name:a=>`Lithiová nabíječka Carbest 12 V se 2 výstupy nabíjecí proud ${a} A`},
 padabo_sk:{currency:"EUR",bid:"7aed5c13",url:"https://www.padabo.sk/litiova-nabijacka-carbest-12-v-s-2-vystupmi_z25869/",name:a=>`Lítiová nabíjačka Carbest 12 V s 2 výstupmi nabíjací prúd ${a} A`},
 padabo_pl:{currency:"PLN",bid:"95d61abf",url:"https://www.padabo.pl/ladowarka-litowa-carbest-12-v-z-2-wyjsciami_z25869/",name:a=>`Ładowarka litowa Carbest 12 V z 2 wyjściami prąd ładowania ${a} A`},
});
function exactOffer(p,merchant,seller,model,specs){
 if(p.merchant!==merchant||p.category!=="shore_charger"||p.name!==seller.name(model.amps)
   ||p.productUrl!==seller.url||p.available!==true||p.staleSource===true||p.marketEligible===false
   ||p.priceCurrency!==seller.currency||!Number.isFinite(p.priceCzk)||p.priceCzk<=0
   ||!String(p.description||"").includes("LiFePO4")
   ||p.specs?.voltageV!==12||p.specs?.currentA!==model.amps
   ||specs.voltageV!==12||specs.currentA!==model.amps
   ||specs.chargingVoltagesV?.length!==1||specs.chargingVoltagesV[0]!==12)return false;
 try{
  const a=new URL(p.affiliateUrl);
  return a.origin==="https://ehub.cz"&&a.pathname==="/system/scripts/click.php"
    &&!a.username&&!a.password&&!a.hash&&a.searchParams.size===3
    &&["a_aid","a_bid","desturl"].every(k=>a.searchParams.getAll(k).length===1)
    &&a.searchParams.get("a_aid")==="f34c86c8"&&a.searchParams.get("a_bid")===seller.bid
    &&a.searchParams.get("desturl")===seller.url;
 }catch{return false;}
}
export function addVerifiedCarbestShoreProfile(product,specs){
 const key=/^(svetkaravanu|padabo_sk|padabo_pl):25869_(27324|27325|27326)$/.exec(String(product?.id||""));
 if(!key)return specs;
 const [,merchant,variant]=key,m=MODELS[variant],seller=SELLERS[merchant];
 if(!exactOffer(product,merchant,seller,m,specs))return {...specs,currentA:null,chargingVoltagesV:[]};
 return {...specs,chargingBatteryTypes:["lifepo4","lead"],chargingInputVoltagesV:[230],
  chargingAcInputRangeV:[190,265],chargingCapacityMinAh:50,chargingCapacityMaxAh:m.maxAh,
  chargingCapacityRangeChemistry:"lifepo4",chargingProfileEvidenceUrl:MANUAL,
  chargingManufacturerModel:"Carbest "+m.model,chargingVariantMustBeSelected:true};
}
export function shoreVariantNote(product,locale){
 const s=product?.specs;
 if(product?.category!=="shore_charger"||s?.chargingVariantMustBeSelected!==true
   ||!s.chargingManufacturerModel||!Number.isFinite(s.currentA))return null;
 const model=s.chargingManufacturerModel+" · "+s.currentA+" A · "+s.voltageV+" V";
 const range=s.chargingCapacityMinAh+"–"+s.chargingCapacityMaxAh+" Ah";
 return ({
  cs:`V obchodě vyberte přesně ${model}; doporučený rozsah baterie ${range}. Zvolte režim dle typu baterie a ověřte limity BMS; proud nesčítejte za dva výstupy.`,
  sk:`V obchode vyberte presne ${model}; odporúčaný rozsah batérie ${range}. Zvoľte režim podľa typu batérie a overte limity BMS; prúd nesčítavajte za dva výstupy.`,
  pl:`W sklepie wybierz dokładnie ${model}; zalecany zakres pojemności ${range}. Wybierz tryb odpowiedni do typu akumulatora i sprawdź limity BMS; nie sumuj prądu dwóch wyjść.`,
 })[locale]||null;
}
