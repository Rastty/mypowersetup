const COPY = {
  cs: {
    solar: "Solární panely",
    controller: "MPPT regulátor",
    battery: "Baterie",
    protection: "DC jištění a odpojení",
    dcLoads: "DC spotřebiče",
    dcCheck: "Ověřit napětí",
    dcConverter: "Spotřebiče pouze na 12 V vyžadují samostatně navržený regulovaný převodník 24→12 V a jištění. Převodník není v nákupním seznamu.",
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
    dcLoads: "DC spotrebiče",
    dcCheck: "Overiť napätie",
    dcConverter: "Spotrebiče len na 12 V vyžadujú samostatne navrhnutý regulovaný prevodník 24→12 V a istenie. Prevodník nie je v nákupnom zozname.",
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
    dcLoads: "Odbiorniki DC",
    dcCheck: "Sprawdź napięcie",
    dcConverter: "Odbiorniki działające tylko na 12 V wymagają osobno zaprojektowanej, stabilizowanej przetwornicy 24→12 V i zabezpieczeń. Przetwornica nie jest na liście zakupowej.",
    inverter: "Przetwornica z czystym sinusem",
    acLoads: "Odbiorniki 230 V",
    verify: "Typ i wartość zabezpieczenia dobierz do przewodu, urządzenia i warunków instalacji.",
    noInverter: "W tym zestawie nie wybrano odbiorników 230 V, dlatego przetwornica nie jest potrzebna.",
  },
  hu: {
    solar: "Napelemek",
    controller: "MPPT töltésszabályozó",
    battery: "Akkumulátor",
    protection: "DC védelem és leválasztás",
    dcLoads: "DC fogyasztók",
    dcCheck: "Feszültségellenőrzés",
    dcConverter: "A csak 12 V-os készülékekhez külön megtervezett, szabályozott 24→12 V-os átalakító és védelem szükséges. Az átalakító nincs a bevásárlólistán.",
    inverter: "Tiszta szinuszos inverter",
    acLoads: "230 V-os fogyasztók",
    verify: "A védelem típusát és névleges értékét a kábel, a készülék és a telepítési feltételek alapján kell meghatározni.",
    noInverter: "Ehhez a rendszerhez nincs kiválasztva 230 V-os fogyasztó, ezért külön inverterág nem szükséges.",
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
  // Show real selected DC loads even when an AC inverter is also required.
  // Older diagram fixtures without appliance rows retain their original
  // DC-only fallback, while production engine results carry the exact rows.
  const hasDcLoads = Array.isArray(result.applianceRows)
    ? result.applianceRows.some((item) => !item.ac) : !hasInverter;
  const requiresVoltageCheck = voltage === 24 && hasDcLoads;

  if (![voltage, solarWatts, controllerAmps, batteryAh].every(Number.isFinite)) return "";

  const node = (kind, label, value) => `
    <div class="diagram-node diagram-node-${kind}">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>`;

  return `
    <div class="system-diagram" role="img" aria-label="${copy.solar}, ${copy.controller}, ${copy.battery}, ${copy.protection}${hasDcLoads ? `, ${copy.dcLoads}` : ""}${hasInverter ? `, ${copy.inverter}, ${copy.acLoads}` : ""}${requiresVoltageCheck ? `, ${copy.dcCheck}` : ""}">
      <div class="diagram-path diagram-path-source">
        ${node("solar", copy.solar, `${solarWatts} Wp`)}
        <span class="diagram-arrow" aria-hidden="true">→</span>
        ${node("controller", copy.controller, `${controllerAmps} A`)}
        <span class="diagram-arrow" aria-hidden="true">→</span>
        ${node("battery", copy.battery, `${batteryAh} Ah · ${voltage} V`)}
      </div>
      ${hasDcLoads ? `<div class="diagram-path diagram-path-loads diagram-path-dc">
        ${node("protection", copy.protection, "⚠")}
        <span class="diagram-arrow" aria-hidden="true">→</span>
        ${node("dc", copy.dcLoads, requiresVoltageCheck ? copy.dcCheck : `${voltage} V`)}
      </div>` : ""}
      ${hasInverter ? `<div class="diagram-path diagram-path-loads diagram-path-ac">
        ${node("protection", copy.protection, "⚠")}
        <span class="diagram-arrow" aria-hidden="true">→</span>
        ${node("inverter", copy.inverter, `${inverterWatts} W`)}
        <span class="diagram-arrow" aria-hidden="true">→</span>
        ${node("ac", copy.acLoads, "230 V")}
      </div>` : ""}
    </div>
    <p class="diagram-safety-note">${copy.verify}</p>
    ${requiresVoltageCheck ? `<p class="diagram-context-note">${copy.dcConverter}</p>` : ""}
    ${hasInverter ? "" : `<p class="diagram-context-note">${copy.noInverter}</p>`}
  `;
}
