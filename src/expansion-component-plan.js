const CONFIG = Object.freeze({
  pt: Object.freeze({
    title: "Lista de compra calculada",
    intro: "Usa estes valores como alvos técnicos mínimos ao comparar componentes. Não substituem a validação da instalação.",
    guide: "Como escolher",
    routes: Object.freeze({
      battery: "/pt/guias/capacidade-bateria-autocaravana/",
      solar: "/pt/guias/quantos-watts-paineis-solares-autocaravana/",
      mppt: "/pt/guias/como-escolher-controlador-mppt/",
      inverter: "/pt/guias/inversor-autocaravana-potencia/",
    }),
    labels: Object.freeze({ battery: "Bateria de serviço", solar: "Painéis solares", mppt: "Controlador MPPT", inverter: "Inversor" }),
    specs: Object.freeze({
      battery: (value) => `${value.batteryAh} Ah / ${value.batteryWh} Wh · ${value.batteryLabel} · sistema ${value.systemVoltage} V`,
      solar: (value) => `${value.solarWatts} Wp no total`,
      mppt: (value) => `pelo menos ${value.controllerAmps} A para um sistema de ${value.systemVoltage} V`,
      inverter: (value) => `pelo menos ${value.inverterWatts} W de potência calculada`,
      inverterNone: "Não é necessário um inversor separado para as cargas DC selecionadas.",
    }),
    notice: "Dimensiona cabos e fusíveis apenas depois de conhecer o comprimento do percurso, o método de instalação e os limites do fabricante.",
  }),
  ro: Object.freeze({
    title: "Lista de cumpărături calculată",
    intro: "Folosește aceste valori ca cerințe tehnice minime când compari componentele. Ele nu înlocuiesc verificarea instalației.",
    guide: "Cum alegi",
    routes: Object.freeze({
      battery: "/ro/ghiduri/capacitate-baterie-autorulota/",
      solar: "/ro/ghiduri/cate-panouri-solare-autorulota/",
      mppt: "/ro/ghiduri/regulator-mppt-autorulota/",
      inverter: "/ro/ghiduri/invertor-autorulota-putere/",
    }),
    labels: Object.freeze({ battery: "Baterie de servicii", solar: "Panouri solare", mppt: "Regulator MPPT", inverter: "Invertor" }),
    specs: Object.freeze({
      battery: (value) => `${value.batteryAh} Ah / ${value.batteryWh} Wh · ${value.batteryLabel} · sistem ${value.systemVoltage} V`,
      solar: (value) => `${value.solarWatts} Wp în total`,
      mppt: (value) => `cel puțin ${value.controllerAmps} A pentru un sistem de ${value.systemVoltage} V`,
      inverter: (value) => `cel puțin ${value.inverterWatts} W putere calculată`,
      inverterNone: "Nu este necesar un invertor separat pentru consumatorii DC selectați.",
    }),
    notice: "Dimensionează cablurile și siguranțele numai după ce cunoști lungimea traseului, metoda de instalare și limitele producătorului.",
  }),
  si: Object.freeze({
    title: "Izračunani nakupovalni seznam",
    intro: "Te vrednosti uporabi kot minimalne tehnične zahteve pri primerjavi komponent. Ne nadomeščajo preverjanja namestitve.",
    guide: "Kako izbrati",
    routes: Object.freeze({
      battery: "/si/vodici/kapaciteta-baterije-avtodom/",
      solar: "/si/vodici/koliko-soncnih-panelov-avtodom/",
      mppt: "/si/vodici/mppt-regulator-avtodom/",
      inverter: "/si/vodici/inverter-avtodom-moc/",
    }),
    labels: Object.freeze({ battery: "Bivalna baterija", solar: "Solarni paneli", mppt: "Regulator MPPT", inverter: "Inverter" }),
    specs: Object.freeze({
      battery: (value) => `${value.batteryAh} Ah / ${value.batteryWh} Wh · ${value.batteryLabel} · sistem ${value.systemVoltage} V`,
      solar: (value) => `skupaj ${value.solarWatts} Wp`,
      mppt: (value) => `najmanj ${value.controllerAmps} A za sistem ${value.systemVoltage} V`,
      inverter: (value) => `najmanj ${value.inverterWatts} W izračunane moči`,
      inverterNone: "Za izbrane DC porabnike ločen inverter ni potreben.",
    }),
    notice: "Kable in varovalke dimenzioniraj šele, ko poznaš dolžino trase, način namestitve in omejitve proizvajalca.",
  }),
});

export function expansionComponentPlan(market, result) {
  const config = CONFIG[market];
  if (!config) throw new Error(`EXPANSION_COMPONENT_PLAN_MARKET_INVALID:${market || "missing"}`);
  validateResult(result);

  const items = ["battery", "solar", "mppt", "inverter"].map((topic) => Object.freeze({
    topic,
    label: config.labels[topic],
    spec: topic === "inverter" && result.inverterWatts === 0 ? config.specs.inverterNone : config.specs[topic](result),
    required: topic !== "inverter" || result.inverterWatts > 0,
    href: config.routes[topic],
    guideLabel: config.guide,
  }));

  return Object.freeze({
    title: config.title,
    intro: config.intro,
    notice: config.notice,
    items: Object.freeze(items),
  });
}

function validateResult(value) {
  for (const key of ["batteryAh", "batteryWh", "solarWatts", "controllerAmps", "systemVoltage", "inverterWatts"]) {
    if (!Number.isFinite(value?.[key]) || value[key] < 0) throw new Error(`EXPANSION_COMPONENT_PLAN_RESULT_INVALID:${key}`);
  }
  if (!(value.batteryAh > 0 && value.batteryWh > 0 && value.solarWatts > 0 && value.controllerAmps > 0 && value.systemVoltage > 0)) {
    throw new Error("EXPANSION_COMPONENT_PLAN_RESULT_INCOMPLETE");
  }
  if (!value.batteryLabel) throw new Error("EXPANSION_COMPONENT_PLAN_BATTERY_LABEL_MISSING");
}
