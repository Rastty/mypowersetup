const COPY = {
  cs: {
    solar: "Solární panely",
    controller: "MPPT regulátor",
    battery: "Baterie",
    protection: "DC jištění a odpojení",
    dcLoads: "12/24V spotřebiče",
    inverter: "Měnič s čistým sinusem",
    acLoads: "230V spotřebiče",
    verify: "Typ a hodnotu jištění určete podle kabelu, zařízení a podmínek instalace.",
    noInverter: "Tato sestava nemá vybrané 230V spotřebiče, proto větev měniče není potřeba.",
  },
  sk: {
    solar: "Solárne panely",
    controller: "MPPT regulátor",
    battery: "Batéria",
    protection: "DC istenie a odpojenie",
    dcLoads: "12/24V spotrebiče",
    inverter: "Menič s čistým sínusom",
    acLoads: "230V spotrebiče",
    verify: "Typ a hodnotu istenia určite podľa kábla, zariadenia a podmienok inštalácie.",
    noInverter: "Táto zostava nemá vybrané 230V spotrebiče, preto vetva meniča nie je potrebná.",
  },
  pl: {
    solar: "Panele fotowoltaiczne",
    controller: "Regulator MPPT",
    battery: "Akumulator",
    protection: "Zabezpieczenie i odłączanie DC",
    dcLoads: "Odbiorniki 12/24 V",
    inverter: "Przetwornica z czystym sinusem",
    acLoads: "Odbiorniki 230 V",
    verify: "Typ i wartość zabezpieczenia dobierz do przewodu, urządzenia i warunków instalacji.",
    noInverter: "W tym zestawie nie wybrano odbiorników 230 V, dlatego przetwornica nie jest potrzebna.",
  },
};

export function buildSystemDiagram(result, locale = "cs") {
  const copy = COPY[locale] || COPY.cs;
  const voltage = Number(result.systemVoltage);
  const solarWatts = Number(result.solarWatts);
  const controllerAmps = Number(result.controllerAmps);
  const batteryAh = Number(result.batteryAh);
  const inverterWatts = Number(result.inverterWatts);
  const hasInverter = Number.isFinite(inverterWatts) && inverterWatts > 0;

  if (![voltage, solarWatts, controllerAmps, batteryAh].every(Number.isFinite)) return "";

  const node = (kind, label, value) => `
    <div class="diagram-node diagram-node-${kind}">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>`;

  return `
    <div class="system-diagram" role="img" aria-label="${copy.solar}, ${copy.controller}, ${copy.battery}, ${copy.protection}${hasInverter ? `, ${copy.inverter}, ${copy.acLoads}` : `, ${copy.dcLoads}`}">
      <div class="diagram-path diagram-path-source">
        ${node("solar", copy.solar, `${solarWatts} Wp`)}
        <span class="diagram-arrow" aria-hidden="true">→</span>
        ${node("controller", copy.controller, `${controllerAmps} A`)}
        <span class="diagram-arrow" aria-hidden="true">→</span>
        ${node("battery", copy.battery, `${batteryAh} Ah · ${voltage} V`)}
      </div>
      <div class="diagram-path diagram-path-loads">
        ${node("protection", copy.protection, "⚠")}
        <span class="diagram-arrow" aria-hidden="true">→</span>
        ${node("dc", copy.dcLoads, `${voltage} V`)}
        ${hasInverter ? `
          <span class="diagram-branch" aria-hidden="true">+</span>
          ${node("inverter", copy.inverter, `${inverterWatts} W`)}
          <span class="diagram-arrow" aria-hidden="true">→</span>
          ${node("ac", copy.acLoads, "230 V")}
        ` : ""}
      </div>
    </div>
    <p class="diagram-safety-note">${copy.verify}</p>
    ${hasInverter ? "" : `<p class="diagram-context-note">${copy.noInverter}</p>`}
  `;
}
