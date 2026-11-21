// Bounded manufacturer-backed PV pairing for the EXACT EcoFlow rigid
// 175 W panel and verified Victron SmartSolar 100/30 or 100/50 controllers.
// No broad or inferred panel compatibility: absent electrical documents
// require individual review rather than an invented wiring diagram.
import { selectedSolarArrayWatts } from "./caravan-pv-array-review.js?v=20261121-actual-pv1";

const PANEL_DOC = "https://websiteoss.ecoflow.com/cms/upload/2024/5/30/EcoFlow%20175W%20Rigid%20Solar%20Panel-Safety%20Instructions%20V1.0_1717050133698.pdf";
const CONTROLLER_DOC = "https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/configuration-and-settings.html";
const CONTROLLERS = Object.freeze({
  "vselektro:victron-smartsolar-100-30":30,
  "vselektro:victron-smartsolar-100-50":50,
  "padabo_sk:24828":30, "padabo_sk:101985":50,
  "padabo_pl:24828":30, "padabo_pl:101985":50,
});
const COLD_AMBIENT_C=-20;
const HOT_CELL_C=85;
const round=(number)=>Math.round(number*10)/10;

export function reviewCaravanPvString(panelRow, controllerProduct, systemVoltage) {
  const panel=panelRow?.product||panelRow;
  const spec=panel?.specs;
  if (spec?.pvModel!=="EF-SG-M175-01" || spec.pvElectricalEvidenceUrl!==PANEL_DOC
    || spec.powerW!==175 || spec.pvVocV!==25.5 || spec.pvIscA!==8.3
    || spec.pvVmpV!==21.9 || spec.pvVocTempCoefficientPctPerC!==-0.25
    || spec.pvIscTempCoefficientPctPerC!==0.045) return null;
  const quantity=panelRow?.quantity??panel?.recommendedQuantity??1;
  const actualWp=selectedSolarArrayWatts(panelRow);
  const manual=(reason)=>Object.freeze({
    status:"manual_review",reason,quantity,actualWp,manufacturerUrl:PANEL_DOC,
  });
  if (!Number.isSafeInteger(quantity)||quantity<1||quantity>4||actualWp!==175*quantity
    || ![12,24].includes(Number(systemVoltage))) return manual("unknown_array");
  const modelCurrent=CONTROLLERS[controllerProduct?.id];
  const mppt=controllerProduct?.specs||{};
  const nominalWp=mppt.maxPvWattsBySystemVoltage?.[systemVoltage];
  const expectNominal=modelCurrent===30?systemVoltage===12?440:880:modelCurrent===50?systemVoltage===12?700:1400:null;
  const maxIsc=modelCurrent===30?35:modelCurrent===50?60:null;
  if (!modelCurrent
    || mppt.chargingProfileEvidenceUrl!==CONTROLLER_DOC
    || mppt.maxPvVocV!==100 || mppt.maxPvIscA!==maxIsc
    || nominalWp!==expectNominal || mppt.currentA!==modelCurrent
    || !mppt.systemVoltagesV?.includes(systemVoltage)) return manual("controller_unverified");
  if (actualWp>nominalWp) return manual("pv_nominal_exceeded");

  const coldVocPanel=spec.pvVocV*(1+(spec.pvVocTempCoefficientPctPerC/100)*(COLD_AMBIENT_C-25));
  const hotIscPanel=spec.pvIscA*(1+(spec.pvIscTempCoefficientPctPerC/100)*(HOT_CELL_C-25));
  // Victron requires PV voltage > Vbat + 5V to start. 14.4/28.8V
  // are nominal absorption values, NOT a live battery voltage.
  // Vmp at STC is only a first screening threshold, not a guarantee
  // of hot-weather startup or charging at every battery voltage.
  const startMinV=(systemVoltage===12?14.4:28.8)+5;
  const candidates=[];
  for(let series=1;series<=quantity;series++){
    if(quantity%series!==0)continue;
    const parallel=quantity/series;
    const coldVoc=coldVocPanel*series;
    const hotIsc=hotIscPanel*parallel;
    if(coldVoc>=mppt.maxPvVocV || hotIsc>=mppt.maxPvIscA
      || spec.pvVmpV*series<=startMinV)continue;
    candidates.push({series,parallel,coldVoc,hotIsc});
  }
  if(!candidates.length)return manual("no_screened_layout");
  // Prefer fewer parallel strings (less aggregate fault current) among
  // simple equal-panel topologies; final design remains installer-owned.
  candidates.sort((a,b)=>a.parallel-b.parallel||a.coldVoc-b.coldVoc);
  const best=candidates[0];
  return Object.freeze({
    status:"within_reviewed_limits",
    series:best.series,parallel:best.parallel,quantity,
    actualWp,
    coldVocV:round(best.coldVoc),
    hotIscA:round(best.hotIsc),
    coldAmbientC:COLD_AMBIENT_C,
    hotCellC:HOT_CELL_C,
    manufacturerUrl:PANEL_DOC,
    controllerUrl:"https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/technical-specifications.html",
  });
}
