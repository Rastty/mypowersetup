import { minimumBatteryDischargeAmps } from "./battery-discharge-safety.js?v=20261121-bms-evidence1";

// Exact per-category minimums from the same calculator result used to
// generate the vetted product choices. Only finite positive values appear.
const COPY = Object.freeze({
  cs: {min:"Požadavek výpočtu", battery:"alespoň", solar:"alespoň", controller:"nabíjecí proud alespoň", inverter:"trvalý výkon alespoň", dc:"DC–DC proud alespoň", shore:"nabíjecí proud alespoň", at:"při", input:"vstup", bms:(amps)=>`trvalý vybíjecí proud BMS nejméně ${amps} A (ověřit u výrobce)`},
  sk: {min:"Požiadavka výpočtu", battery:"najmenej", solar:"najmenej", controller:"nabíjací prúd najmenej", inverter:"trvalý výkon najmenej", dc:"DC–DC prúd najmenej", shore:"nabíjací prúd najmenej", at:"pri", input:"vstup", bms:(amps)=>`trvalý vybíjací prúd BMS aspoň ${amps} A (overiť u výrobcu)`},
  pl: {min:"Wymagania obliczeń", battery:"co najmniej", solar:"co najmniej", controller:"prąd ładowania co najmniej", inverter:"moc ciągła co najmniej", dc:"prąd DC–DC co najmniej", shore:"prąd ładowania co najmniej", at:"przy", input:"wejście", bms:(amps)=>`ciągły prąd rozładowania BMS co najmniej ${amps} A (potwierdź u producenta)`},
});
const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const fmt = (value) => Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);

export function caravanComponentRequirement(setup, category, locale = "cs") {
  if (!setup) return null;
  const t = COPY[locale] || COPY.cs;
  const voltage = positive(setup.systemVoltage);
  const battery = positive(setup.batteryAh);
  const solar = positive(setup.solarWatts);
  const controller = positive(setup.controllerAmps);
  const inverter = positive(setup.inverterWatts);
  const dc = positive(setup.charging?.dcDc?.suggestedCurrentAmps);
  const shore = positive(setup.charging?.shore?.suggestedCurrentAmps);
  const starter = positive(setup.charging?.starterVoltage);
  const atVoltage = voltage ? ` ${t.at} ${fmt(voltage)} V` : "";
  let requirement = null;
  switch (category) {
    case "battery":
      if (battery) {
        requirement = `${t.battery} ${fmt(battery)} Ah${atVoltage}`;
        const discharge = minimumBatteryDischargeAmps(setup);
        if (discharge !== null) requirement += `; ${t.bms(discharge)}`;
      }
      break;
    case "solar_panel":
      if (solar) requirement = `${t.solar} ${fmt(solar)} Wp`;
      break;
    case "controller":
      if (controller) requirement = `${t.controller} ${fmt(controller)} A${atVoltage}`;
      break;
    case "inverter":
      if (inverter) requirement = `${t.inverter} ${fmt(inverter)} W${atVoltage}`;
      break;
    case "dc_charger":
      if (dc) requirement = `${t.dc} ${fmt(dc)} A${atVoltage}${starter ? `, ${t.input} ${fmt(starter)} V` : ""}`;
      break;
    case "shore_charger":
      if (shore) requirement = `${t.shore} ${fmt(shore)} A${atVoltage}`;
      break;
  }
  return requirement ? `${t.min}: ${requirement}` : null;
}
