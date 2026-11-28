import {estimateShoreCharge} from "./shore-charge-estimator.js?v=20261128-1";
import {mountShoreBuyers} from "./shore-calculator-offers-browser.js?v=20261128-compact1";
const root=document.querySelector("[data-shore-charge-estimator]");
if(root){
 const form=root.querySelector("form"),result=root.querySelector("[data-shore-result]"),error=root.querySelector("[data-shore-error]"),status=root.querySelector("[data-shore-status]");
 const buyers=mountShoreBuyers(root);
 const f=new Intl.NumberFormat(root.dataset.locale,{maximumFractionDigits:2});
 const fmt=(n,u)=>f.format(n)+" "+u;
 const up=(n)=>Math.ceil(n*100-1e-8)/100;
 const down=(n)=>Math.floor(n*100+1e-8)/100;
 const write=(key,value)=>root.querySelector('[data-shore-value="'+key+'"]').textContent=value;
 function clear(){buyers?.clear();result.hidden=true;error.hidden=true;}
 form.addEventListener("input",clear);
 form.addEventListener("change",clear);
 form.elements.namedItem("systemVoltage").addEventListener("change",()=>{const v=form.elements.namedItem("systemVoltage").value;form.elements.namedItem("chargeVoltage").value=v==="24"?"28.8":"14.4";});
 form.addEventListener("submit",event=>{
  event.preventDefault();clear();
  const input=Object.fromEntries(new FormData(form));
  const e=estimateShoreCharge(input);
  if(!e){error.hidden=false;return;}
  write("hours",e.minimumHours===null?"—":fmt(up(e.minimumHours),"h"));
  write("missing",fmt(e.missingAh,"Ah"));
  write("required",fmt(up(e.requiredA),"A"));
  write("ceiling",fmt(down(e.outputCeiling),"A"));
  write("candidate",e.candidateA===null?root.dataset.noCandidate:fmt(e.candidateA,"A"));
  write("input",fmt(up(e.inputW),"W")+" / "+fmt(up(e.inputA),"A"));
  write("reserve",fmt(down(e.acRemainingA),"A"));
  write("battery",fmt(down(e.batteryRemainingA),"A"));
  status.textContent=!e.within?root.dataset.over:e.netA<=0?root.dataset.noCharge:e.targetMet?root.dataset.met:root.dataset.slow;
  status.classList.toggle("note",!e.targetMet);
  result.hidden=false;
  void buyers?.update(input);
 });
 form.hidden=false;
}
