/**
 * Buyer-facing facts computed only from published product specifications and
 * calculator output. Passing initial matching does not verify installation.
 */
function positive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function amount(value) {
  return Number(value).toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
}
const fact = (label, value) => ({label, value});

export function czechProductRequirement(category, setup = {}) {
  const volts = positive(setup.systemVoltage);
  const ah = positive(setup.batteryAh);
  const watts = positive(setup.solarWatts);
  const amps = positive(setup.controllerAmps);
  const inverter = positive(setup.inverterWatts);
  const dc = positive(setup.charging?.dcDc?.suggestedCurrentAmps);
  const shore = positive(setup.charging?.shore?.suggestedCurrentAmps);
  const starter = positive(setup.charging?.starterVoltage);
  if (category === "battery" && ah && volts)
    return "Výpočet: alespoň " + amount(ah) + " Ah při " + amount(volts) + " V. Porovnejte i trvalý proud BMS, rozměry a nabíjecí profil.";
  if (category === "controller" && amps && watts && volts)
    return "Výpočet: alespoň " + amount(amps) + " A MPPT pro " + amount(watts) + " Wp panelů a " + amount(volts) + "V baterii. Ověřte Voc/Isc a zapojení panelů.";
  if (category === "dc_charger" && dc && volts && starter)
    return "Výpočet: alespoň " + amount(dc) + " A z " + amount(starter) + "V vozidla do " + amount(volts) + "V baterie. Ověřte alternátor, kabely, BMS a oddělení mínus.";
  if (category === "solar_panel" && watts)
    return "Výpočet: nejméně " + amount(watts) + " Wp panelů celkem. Ověřte plochu střechy, Voc/Isc a zapojení do MPPT.";
  if (category === "inverter" && inverter && volts)
    return "Výpočet: měnič alespoň " + amount(inverter) + " W pro " + amount(volts) + "V sestavu. Ověřte rozběhový výkon, sinusovku a kabeláž.";
  if (category === "shore_charger" && shore && volts)
    return "Výpočet: nabíječka 230 V alespoň " + amount(shore) + " A pro " + amount(volts) + "V baterii. Ověřte profil a BMS.";
  return null;
}

export function czechProductDecisionFacts(product = {}, setup = {}) {
  const specs = product.specs || {};
  const volts = positive(setup.systemVoltage);
  const facts = [];
  if (product.category === "battery") {
    const have = positive(specs.capacityAh), need = positive(setup.batteryAh);
    if (have) facts.push(fact("Kapacita výrobku", amount(have) + " Ah"));
    if (have && need && have >= need) facts.push(fact("Rezerva proti výpočtu", "+" + amount(have - need) + " Ah"));
    if (positive(specs.bmsContinuousCurrentA))
      facts.push(fact("Trvalý proud BMS", amount(specs.bmsContinuousCurrentA) + " A"));
    if (specs.formFactor === "under_seat")
      facts.push(fact("Provedení", "Nízké pod sedadlo; rozměry ověřte"));
  }
  if (product.category === "controller") {
    if (positive(specs.currentA)) facts.push(fact("Nabíjecí proud", amount(specs.currentA) + " A"));
    const pv = volts ? positive(specs.maxPvWattsBySystemVoltage?.[volts]) : null;
    const need = positive(setup.solarWatts);
    if (pv) facts.push(fact("Jmenovitý FV výkon při " + amount(volts) + " V", amount(pv) + " Wp"));
    if (pv && need && pv >= need) facts.push(fact("Rezerva FV výkonu", "+" + amount(pv - need) + " Wp"));
    if (positive(specs.maxPvVocV))
      facts.push(fact("Mez napětí panelů Voc", amount(specs.maxPvVocV) + " V; ověřte mráz"));
  }
  if (product.category === "dc_charger") {
    const output = positive(specs.currentA), need = positive(setup.charging?.dcDc?.suggestedCurrentAmps);
    if (output) facts.push(fact("Nabíjecí proud", amount(output) + " A"));
    if (output && need && output >= need)
      facts.push(fact("Rezerva nabíjecího proudu", "+" + amount(output - need) + " A"));
    if (specs.isolated === true)
      facts.push(fact("Zapojení", "Galvanicky oddělené vstupní a výstupní mínus"));
    if (specs.isolated === false)
      facts.push(fact("Zapojení", "Neizolovaná varianta se společným mínusem"));
  }
  if (product.category === "solar_panel" && positive(specs.powerW)) {
    facts.push(fact("Výkon jednoho panelu", amount(specs.powerW) + " Wp"));
    if (positive(product.recommendedQuantity))
      facts.push(fact("Pro výpočet počítáme", amount(product.recommendedQuantity) + " ks"));
  }
  if (product.category === "inverter" && positive(specs.powerW))
    facts.push(fact("Trvalý výkon", amount(specs.powerW) + " W"));
  return facts;
}

/** Compact choice rationale displayed before opening the per-product comparison. */
export function czechPackageFitSummary(product = {}, setup = {}) {
  const specs = product.specs || {};
  if (product.merchant !== "vselektro") return null;
  if (product.category === "battery" && positive(specs.capacityAh)) {
    const bms = positive(specs.bmsContinuousCurrentA);
    return amount(specs.capacityAh) + " Ah" + (bms ? " · BMS " + amount(bms) + " A" : "")
      + (specs.formFactor === "under_seat" ? " · nízké pod sedadlo" : "");
  }
  if (product.category === "controller" && positive(specs.currentA)) {
    const voltage = positive(setup.systemVoltage);
    const pv = voltage ? positive(specs.maxPvWattsBySystemVoltage?.[voltage]) : null;
    return "MPPT " + amount(specs.currentA) + " A"
      + (pv ? " · FV " + amount(pv) + " Wp při " + amount(voltage) + " V" : "");
  }
  if (product.category === "dc_charger" && positive(specs.currentA)) {
    const isolation = specs.isolated === true ? " · izolovaná"
      : specs.isolated === false ? " · neizolovaná" : "";
    return "DC–DC nabíjení " + amount(specs.currentA) + " A" + isolation;
  }
  return null;
}
