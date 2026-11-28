// Daily energy balance; not a battery charging curve or weather prediction.
function number(value,min,max,step=1){
  if(value===null||value===undefined||String(value).trim()==="")return null;
  const n=Number(value);
  return Number.isFinite(n)&&n>=min&&n<=max&&Math.abs(n/step-Math.round(n/step))<1e-8?n:null;
}
export function estimateSolarCharge(input={}){
  const capacityAh=number(input.capacityAh,20,1000), voltage=number(input.systemVoltage,12,24,12);
  const chemistry=input.batteryType, from=number(input.from,0,99), to=number(input.to,1,100);
  const panelWp=number(input.panelWp,50,5000,10), sunHours=number(input.sunHours,.5,8,.5);
  const efficiency=number(input.efficiency,50,90,5), dailyWh=number(input.dailyWh,0,20000), targetDays=number(input.targetDays,.5,30,.5);
  if([capacityAh,voltage,from,to,panelWp,sunHours,efficiency,dailyWh,targetDays].includes(null)||!["lifepo4","lead"].includes(chemistry)||to<=from)return null;
  const voltageTenths=(chemistry==="lifepo4"?128:120)*(voltage/12);
  const missingMilliWh=capacityAh*voltageTenths*(to-from);
  const missingWh=missingMilliWh/1000;
  const sunHalf=sunHours*2, daysHalf=targetDays*2;
  const productionWh=panelWp*sunHalf*efficiency/200;
  const surplusWh=productionWh-dailyWh;
  // Exact integer ratio before ceiling to the receiving form's 10 Wp step.
  const minimumWp=Math.ceil((missingMilliWh*2+dailyWh*1000*daysHalf)*200/(1000*daysHalf*sunHalf*efficiency*10))*10;
  return Object.freeze({missingWh,productionWh,surplusWh,days:surplusWh>0?missingWh/surplusWh:null,minimumWp,panelWp,systemVoltage:voltage,batteryType:chemistry,additionalWp:Math.max(0,minimumWp-panelWp)});
}
