// A calculated minimum Ah is not the installed SKU capacity. Compare each
// basket's actual selected battery against the manufacturer's documented
// recommended capacity range; this is a sizing guard, NOT an electrical
// installation approval. Do not infer the series/parallel topology of packs.
export function reviewShoreBatteryCapacity(battery,charger) {
 const s=charger?.specs;
 if(s?.chargingCapacityRangeChemistry!=="lifepo4")return null;
 const min=s.chargingCapacityMinAh,max=s.chargingCapacityMaxAh;
 if(!Number.isFinite(min)||!Number.isFinite(max)||min<=0||max<min)
  return {status:"manual_review",actualAh:null};
 if(battery?.specs?.batteryType && battery.specs.batteryType!=="lifepo4")return null;
 const ah=battery?.specs?.capacityAh;
 const qty=battery?.recommendedQuantity??1;
 if(!Number.isFinite(ah)||ah<=0||qty!==1||battery?.specs?.batteryType!=="lifepo4")
  return {status:"manual_review",actualAh:null,minAh:min,maxAh:max};
 return {status:ah>=min&&ah<=max?"within_reviewed_range":"manual_review",actualAh:ah,minAh:min,maxAh:max};
}
// If a reviewed charger is outside the actual battery range, a replacement
// must positively fit a documented range. An unknown range is not evidence.
export function replaceReviewedShoreMismatch(candidates,selected,battery,choose) {
 if(!selected||!battery||reviewShoreBatteryCapacity(battery,selected.product)?.status!=="manual_review")return selected;
 const proven=candidates.filter(({product})=>reviewShoreBatteryCapacity(battery,product)?.status==="within_reviewed_range");
 return proven.length?choose(proven):null;
}
