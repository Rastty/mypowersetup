import { estimateSolarCharge } from "./solar-charge-estimator.js?v=20261128-1";
import { buildCalculatorHandoffUrl } from "./calculator-handoff.js?v=20261127-fridge-estimate1";
const root=document.querySelector("[data-solar-charge-estimator]");
if(root){
  const form=root.querySelector("form"),result=root.querySelector("[data-charge-result]"),error=root.querySelector("[data-charge-error]");
  const current=root.querySelector("[data-charge-current]"),upgrade=root.querySelector("[data-charge-upgrade]"),limit=root.querySelector("[data-charge-limit]");
  const format=new Intl.NumberFormat(root.dataset.locale,{maximumFractionDigits:2});
  const fmt=(n,unit)=>format.format(n)+" "+unit;
  function clear(){
    result.hidden=true;error.hidden=true;limit.hidden=true;
    for(const a of [current,upgrade]){a.hidden=true;a.removeAttribute("href");}
  }
  function showLink(link,watts,estimate){
    // Use the existing solar sizing -> MPPT validated handoff, not a new
    // receiving route. Only Wp, nominal system voltage and chemistry transfer.
    const href=buildCalculatorHandoffUrl({intent:"solar-sizing",locale:root.dataset.locale,result:{solarWatts:watts,systemVoltage:estimate.systemVoltage},inputs:{batteryType:estimate.batteryType}});
    if(href){link.href=href;link.querySelector("span").textContent=fmt(watts,"Wp");link.hidden=false;}
    return Boolean(href);
  }
  function write(key,value){root.querySelector('[data-charge-value="'+key+'"]').textContent=value;}
  form.addEventListener("input",clear);form.addEventListener("change",clear);
  form.addEventListener("submit",event=>{
    event.preventDefault();clear();
    const e=estimateSolarCharge(Object.fromEntries(new FormData(form)));
    if(!e){error.hidden=false;return;}
    write("missing",fmt(e.missingWh,"Wh"));write("production",fmt(e.productionWh,"Wh"));
    write("surplus",(e.surplusWh>0?"+":"")+fmt(e.surplusWh,"Wh"));
    write("days",e.days===null?root.dataset.noCharge:e.days<.01?"< 0,01 "+root.dataset.dayUnit:fmt(e.days,root.dataset.dayUnit));
    write("minimum",fmt(e.minimumWp,"Wp"));write("additional",fmt(e.additionalWp,"Wp"));
    showLink(current,e.panelWp,e);
    if(e.additionalWp>0&&!showLink(upgrade,e.minimumWp,e))limit.hidden=false;
    result.hidden=false;
  });
  form.hidden=false;
}
