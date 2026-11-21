// A battery's Ah rating describes stored energy, not its ability to sustain an
// inverter's DC input current. 85% is a conservative *sizing assumption*, not
// a claim about the efficiency of any particular inverter.
const SIZING_EFFICIENCY = 0.85;

export function minimumBatteryDischargeAmps(setup) {
  const watts = Number(setup?.inverterWatts);
  const voltage = Number(setup?.systemVoltage);
  if (!Number.isFinite(watts) || watts <= 0 || !Number.isFinite(voltage) || voltage <= 0) return null;
  return Math.ceil(watts / (voltage * SIZING_EFFICIENCY));
}

// Use only an *explicitly named* BMS current rating. A generic currentA field
// may be a starting surge, charging current, connector rating or even a value
// from another component in the merchant's description.
export function advertisedBatteryBmsAmps(product) {
  if (product?.category !== "battery") return null;
  const name = String(product.name || "");
  const match = name.match(/\b(\d{2,4}(?:[.,]\d+)?)\s*A\s*BMS\b/i);
  if (!match) return null;
  const amps = Number(match[1].replace(",", "."));
  return Number.isFinite(amps) && amps > 0 ? amps : null;
}

// Unlike an '100 A BMS' marketing label, this field is explicitly a
// continuous-discharge rating. Treat it as evidence only for reviewed rows,
// and never infer it from battery Ah, a generic currentA, or battery chemistry.
export function documentedBatteryContinuousBmsAmps(product) {
  if (product?.category !== "battery" || !product.verifiedAt) return null;
  const raw = product.specs?.bmsContinuousCurrentA;
  const amps = typeof raw === "number" ? raw : null;
  return amps !== null && Number.isFinite(amps) && amps > 0 ? amps : null;
}

export function batteryBmsLoadWithinAdvertisedLimit(product, setup) {
  const minimum = minimumBatteryDischargeAmps(setup);
  if (minimum === null) return true;
  const advertised = advertisedBatteryBmsAmps(product);
  const specified = product?.category === "battery" ? product.specs?.bmsContinuousCurrentA : null;
  // Even an unreviewed explicitly named continuous rating BELOW the needed
  // current is adverse evidence. But do not count an unreviewed rating as
  // affirmative proof when ranking otherwise eligible battery offers.
  if (typeof specified === "number" && Number.isFinite(specified)
    && specified > 0 && specified < minimum) return false;
  // Missing ratings remain usable as technical candidates, but never gain
  // the evidence priority of reviewed specifications or named BMS values.
  return advertised === null || advertised >= minimum;
}

// When the user actually needs AC inverter power, put batteries with an
// explicit, adequate discharge rating before otherwise similar unknown-BMS
// products. '100 A BMS' in a title is weaker evidence than a reviewed
// continuous-discharge specification and NEVER proves continuous capability.
export function batteryDischargeEvidenceTier(product, setup) {
  const minimum = minimumBatteryDischargeAmps(setup);
  if (minimum === null || !batteryBmsLoadWithinAdvertisedLimit(product, setup)) return 0;
  const documented = documentedBatteryContinuousBmsAmps(product);
  if (documented !== null && documented >= minimum) return 2;
  const advertised = advertisedBatteryBmsAmps(product);
  return advertised !== null && advertised >= minimum ? 1 : 0;
}

const BUYER_COPY = Object.freeze({
  cs: {
    documented: (a, required) => `Specifikace uvádí trvalý limit BMS ${a} A (potřeba ≥ ${required} A). Potvrďte v datasheetu.`,
    advertised: (a, required) => `Název uvádí BMS ${a} A, ale trvalý výboj není doložen. Ověřte nejméně ${required} A.`,
    unknown: (required) => `Trvalý vybíjecí proud BMS není doložen. Ověřte nejméně ${required} A v datasheetu.`,
  },
  sk: {
    documented: (a, required) => `Špecifikácia uvádza trvalý limit BMS ${a} A (potreba ≥ ${required} A). Potvrďte v dokumentácii.`,
    advertised: (a, required) => `Názov uvádza BMS ${a} A, no trvalé vybíjanie nie je doložené. Overte aspoň ${required} A.`,
    unknown: (required) => `Trvalý vybíjací prúd BMS nie je doložený. Overte aspoň ${required} A v dokumentácii.`,
  },
  pl: {
    documented: (a, required) => `Specyfikacja podaje prąd ciągły BMS ${a} A (wymagane ≥ ${required} A). Potwierdź w karcie producenta.`,
    advertised: (a, required) => `Nazwa podaje BMS ${a} A, lecz prąd ciągły nie jest potwierdzony. Sprawdź co najmniej ${required} A.`,
    unknown: (required) => `Brak potwierdzonego prądu ciągłego BMS. Sprawdź co najmniej ${required} A w karcie producenta.`,
  },
});

export function batteryDischargeBuyerCheck(product, setup, locale = setup?.locale || "cs") {
  const minimum = minimumBatteryDischargeAmps(setup);
  if (minimum === null) return null;
  const t = BUYER_COPY[locale] || BUYER_COPY.cs;
  const continuous = documentedBatteryContinuousBmsAmps(product);
  if (continuous !== null) return t.documented(continuous, minimum);
  const named = advertisedBatteryBmsAmps(product);
  return named !== null ? t.advertised(named, minimum) : t.unknown(minimum);
}

const EXPANSION_COPY = Object.freeze({
  pt: Object.freeze({
    title: "Verificar a corrente de descarga do BMS",
    label: "Ver guia da bateria",
    message: (amps, watts, voltage) => `Para um inversor de ${watts} W num sistema de ${voltage} V, considera pelo menos cerca de ${amps} A de descarga contínua da bateria (estimativa com 85% de eficiência). Confirma o limite contínuo real do BMS, o pico de arranque e os cabos no fabricante. A capacidade em Ah não prova que a bateria suporta esta carga.`,
    href: "/pt/guias/capacidade-bateria-autocaravana/",
  }),
  ro: Object.freeze({
    title: "Verifică curentul continuu de descărcare al BMS",
    label: "Vezi ghidul pentru baterie",
    message: (amps, watts, voltage) => `Pentru un invertor de ${watts} W într-un sistem de ${voltage} V, estimează cel puțin aproximativ ${amps} A de descărcare continuă din baterie (calcul la randament de 85%). Confirmă limita continuă reală a BMS, vârful de pornire și cablurile la producător. Capacitatea în Ah nu dovedește că bateria suportă această sarcină.`,
    href: "/ro/ghiduri/capacitate-baterie-autorulota/",
  }),
  si: Object.freeze({
    title: "Preveri trajni razelektritveni tok BMS",
    label: "Preveri vodnik za baterijo",
    message: (amps, watts, voltage) => `Za inverter z močjo ${watts} W v sistemu ${voltage} V predvidi vsaj približno ${amps} A trajnega praznjenja baterije (ocena pri 85-odstotnem izkoristku). Pri proizvajalcu preveri dejansko trajno omejitev BMS, zagonski sunek in kable. Kapaciteta v Ah ne dokazuje, da baterija prenese to obremenitev.`,
    href: "/si/vodici/kapaciteta-baterije-avtodom/",
  }),
});

export function expansionBatteryDischargeNotice(market, products, setup) {
  const copy = EXPANSION_COPY[market];
  if (!copy) throw new Error(`EXPANSION_BATTERY_DISCHARGE_MARKET_INVALID:${market || "missing"}`);
  if (!Array.isArray(products) || !products.some((item) => item?.category === "battery")) return null;
  const amps = minimumBatteryDischargeAmps(setup);
  if (amps === null) return null;
  return Object.freeze({
    title: copy.title,
    label: copy.label,
    message: copy.message(amps, setup.inverterWatts, setup.systemVoltage),
    href: copy.href,
    requiredAmps: amps,
  });
}
