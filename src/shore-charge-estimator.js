// Constant-current energy model. Not a charging curve, wiring design or product approval.
const CLASSES=Object.freeze([5,10,15,20,25,30,35,40,50,60]);
function read(v,min,max,step=1){
 if(v==null||String(v).trim()==="")return null;
 const n=Number(v);
 return Number.isFinite(n)&&n>=min&&n<=max&&Math.abs(n/step-Math.round(n/step))<1e-8?n:null;
}
export function estimateShoreCharge(raw={}){
 const capacityAh=read(raw.capacityAh,20,1000),from=read(raw.from,0,99),to=read(raw.to,1,100);
 const systemVoltage=read(raw.systemVoltage,12,24,12),chargeVoltage=read(raw.chargeVoltage,12,30,.1);
 const chargerA=read(raw.chargerA,5,120),hours=read(raw.hours,.5,24,.5),dcLoadA=read(raw.dcLoadA,0,120,.5);
 const batteryMaxA=read(raw.batteryMaxA,1,400),otherChargeA=read(raw.otherChargeA,0,400,.5);
 const shoreA=read(raw.shoreA,1,32,.5),otherAcA=read(raw.otherAcA,0,32,.5),reserveA=read(raw.reserveA,0,32,.5);
 const efficiency=read(raw.efficiency,50,100),pf=read(raw.pf,.3,1,.05);
 if([capacityAh,from,to,systemVoltage,chargeVoltage,chargerA,hours,dcLoadA,batteryMaxA,otherChargeA,shoreA,otherAcA,reserveA,efficiency,pf].includes(null)||to<=from)return null;
 if(systemVoltage===12?(chargeVoltage<12||chargeVoltage>15.5):(chargeVoltage<24||chargeVoltage>30))return null;
 const missingAh=capacityAh*(to-from)/100;
 const acBudgetA=Math.max(0,shoreA-otherAcA-reserveA);
 const batteryBudgetA=Math.max(0,batteryMaxA-otherChargeA);
 // Do not credit concurrent DC loads against BMS limits: they may turn off.
 // Do not credit other charging sources toward the time target: they may stop.
 const acOutputCeiling=acBudgetA*230*pf*(efficiency/100)/chargeVoltage;
 const outputCeiling=Math.min(batteryBudgetA,acOutputCeiling);
 const requiredA=missingAh/hours+dcLoadA;
 const candidateA=CLASSES.find(a=>a>=requiredA&&a<=outputCeiling)||null;
 const inputW=chargerA*chargeVoltage/(efficiency/100);
 const inputA=inputW/(230*pf);
 const acRemainingA=shoreA-otherAcA-reserveA-inputA;
 const batteryRemainingA=batteryMaxA-otherChargeA-chargerA;
 const within=acRemainingA>=-1e-9&&batteryRemainingA>=-1e-9;
 const netA=chargerA-dcLoadA;
 const minimumHours=within&&netA>0?missingAh/netA:null;
 return Object.freeze({missingAh,requiredA,outputCeiling,candidateA,inputW,inputA,acRemainingA,batteryRemainingA,minimumHours,within,targetMet:minimumHours!==null&&minimumHours<=hours+1e-9,netA});
}
