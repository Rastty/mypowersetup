// Exact approved current merchant offers, independently checked against
// Renogy RNG-DCC1212-60-EU and Victron product documentation.
// Rated output is a ceiling, not a recommendation to draw that current
// from an arbitrary alternator or charge a battery at that current.
const RENOGY="https://eu.renogy.com/collections/battery-charger/products/12v-60a-dc-to-dc-on-board-battery-charger";
const XS="https://www.victronenergy.com/media/pg/Orion_XS_12-12-50A_DC-DC_battery_charger/en/technical-data.html";
const ISOLATED="https://www.victronenergy.com/media/pg/Orion-Tr_Smart_DC-DC_Charger_-_Isolated/en/specifications.html";
const NONISOLATED="https://www.victronenergy.com/media/pg/Orion-Tr_Smart_DC-DC_Charger_-_Non-Isolated/en/specifications--non-isolated-.html";
const SELLERS=Object.freeze({
 svetkaravanu:{bid:"38137ac4",currency:"CZK",host:"https://www.svetkaravanu.cz"},
 padabo_sk:{bid:"7aed5c13",currency:"EUR",host:"https://www.padabo.sk"},
 padabo_pl:{bid:"95d61abf",currency:"PLN",host:"https://www.padabo.pl"},
 solarimport:{bid:"35cb7fb0",currency:"CZK",host:"https://www.solar-import.cz"},
 batterycz:{bid:"7095cb16",currency:"CZK",host:"https://www.battery.cz"},
});
const MODELS=Object.freeze({
 renogy:{input:12,output:12,amps:60,watts:750,model:"Renogy RNG-DCC1212-60",source:RENOGY,isolated:true,feedNominal:12,kind:"renogy"},
 xs:{input:12,output:12,amps:50,watts:700,model:"Orion XS 12/12-50A",source:XS,isolated:false,feedNominal:null,kind:"xs"},
 tr30:{input:24,output:12,amps:30,watts:360,model:"Orion-Tr Smart 24/12-30A",source:NONISOLATED,isolated:false,feedNominal:null},
 tr20:{input:24,output:12,amps:20,watts:240,model:"Orion-Tr Smart 24/12-20A",source:ISOLATED,isolated:true,feedNominal:null},
 tr10:{input:12,output:24,amps:10,watts:240,model:"Orion-Tr Smart 12/24-10A",source:ISOLATED,isolated:true,feedNominal:null},
});
const OFFERS=Object.freeze({
 "svetkaravanu:106299":["renogy","Nabíječka baterií Renogy DC-DC, 12V/60A","/nabijecka-baterii-renogy-dc-dc-12v-60a_z106299/"],
 "padabo_sk:106299":["renogy","Nabíjačka batérií Renogy DC-DC, 12V/60A","/nabijacka-baterii-renogy-dc-dc-12v-60a_z106299/"],
 "padabo_pl:106299":["renogy","Ładowarka akumulatorów DC-DC Renogy, 12V/60A","/ladowarka-akumulatorow-dc-dc-renogy-12v-60a_z106299/"],
 "svetkaravanu:101357":["xs","DC-DC neizolovaná nabíječka Victron Energy Orion XS 12/12-50 A","/dc-dc-neizolovana-nabijecka-victron-energy-orion-xs-12-12-50-a_z101357/"],
 "solarimport:E7477":["tr30","Victron Energy DC-DC nabíječka Orion-Tr Smart 24/12-30A (360W)","/nabijecky-baterii/victron-energy-nabijecka-dc-dc-orion-tr-smart-24-12-30a--360w-neizolovana/"],
 "batterycz:E7477":["tr30","Victron Energy DC-DC nabíječka Orion-Tr Smart 24/12-30A (360W)","/victron-nabijecka-dc-dc-orion-tr-smart-24-12-30a--360w-neizolovana/"],
 "solarimport:E8959":["tr20","Victron Energy DC-DC nabíječka Orion-Tr Smart 24/12-20A (240W) izolovaná","/nabijecky-dc-dc/victron-energy-nabijecka-dc-dc-orion-tr-smart-24-12-20a--240w-izolovana/"],
 "batterycz:E8959":["tr20","Victron Energy DC-DC nabíječka Orion-Tr Smart 24/12-20A (240W) izolovaná","/victron-energy-nabijecka-dc-dc-orion-tr-smart-24-12-20a--240w-izolovana/"],
 "batterycz:E7487":["tr10","Victron Energy DC-DC nabíječka Orion-Tr Smart 12/24-10A (240W) izolovaná","/victron-nabijecka-dc-dc-orion-tr-smart-12-24-10a--240w-izolovana/"],
});
const only=(value,expected)=>Array.isArray(value)&&value.length===1&&value[0]===expected;
function exact(p,specs,m,seller,name,path){
 const dest=seller.host+path;
 if(p.category!=="dc_charger"||p.id.split(":")[0]!==p.merchant||p.name!==name
   ||p.productUrl!==dest||p.available!==true||p.staleSource===true||p.marketEligible===false
   ||p.priceCurrency!==seller.currency||!Number.isFinite(p.priceCzk)||p.priceCzk<=0)return false;
 const raw=p.specs||{};
 for(const s of [raw,specs]){
  if(s.currentA!==m.amps||!only(s.chargingInputVoltagesV,m.input)||!only(s.chargingVoltagesV,m.output)
    ||(s.voltageV!=null&&s.voltageV!==m.output)
    ||(s.powerW!=null&&s.powerW!==m.watts))return false;
 }
 try{
  const a=new URL(p.affiliateUrl);
  return a.origin==="https://ehub.cz"&&a.pathname==="/system/scripts/click.php"
    &&!a.username&&!a.password&&!a.hash&&a.searchParams.size===3
    &&["a_aid","a_bid","desturl"].every(k=>a.searchParams.getAll(k).length===1)
    &&a.searchParams.get("a_aid")==="f34c86c8"&&a.searchParams.get("a_bid")===seller.bid
    &&a.searchParams.get("desturl")===dest;
 }catch{return false;}
}
export function addReviewedDcdcValueProfile(product,specs){
 if(!Object.hasOwn(OFFERS,product?.id))return specs;
 const [key,name,path]=OFFERS[product.id],m=MODELS[key],seller=SELLERS[product.id.split(":")[0]];
 if(!exact(product,specs,m,seller,name,path))return {...specs,currentA:null,chargingVoltagesV:[],chargingProfileEvidenceUrl:null};
 return {...specs,voltageV:m.output,currentA:m.amps,powerW:m.watts,
  chargingInputVoltagesV:[m.input],chargingVoltagesV:[m.output],
  chargingBatteryTypes:["lifepo4","lead"],isolated:m.isolated,smartAlternatorCompatible:true,
  chargingManufacturerModel:m.model,chargingProfileEvidenceUrl:m.source,
  reviewedDcdcKind:m.kind||"tr"};
}
export function dcdcValueNote(product,locale){
 const s=product?.specs;if(product?.category!=="dc_charger"||!s?.reviewedDcdcKind)return null;
 const direction=s.chargingInputVoltagesV?.[0]+" → "+s.chargingVoltagesV?.[0]+" V";
 const amps=s.currentA+" A",renogy=s.reviewedDcdcKind==="renogy";
 return ({
  cs:`${direction}, jmenovitě ${amps}. ${renogy?"Vyžaduje signál D+ a správně nastavený nabíjecí režim; D+ kabel není součástí balení. ":""}Před nákupem ověřte rezervu alternátoru, součet nabíjecích proudů a limit baterie/BMS.`,
  sk:`${direction}, menovite ${amps}. ${renogy?"Vyžaduje signál D+ a správny režim nabíjania; kábel D+ nie je súčasťou balenia. ":""}Pred nákupom overte rezervu alternátora, súčet nabíjacích prúdov a limit batérie/BMS.`,
  pl:`${direction}, znamionowo ${amps}. ${renogy?"Wymaga sygnału D+ i właściwego trybu ładowania; przewodu D+ nie ma w zestawie. ":""}Przed zakupem sprawdź rezerwę alternatora, sumę prądów ładowania i limit akumulatora/BMS.`,
 })[locale]||null;
}
