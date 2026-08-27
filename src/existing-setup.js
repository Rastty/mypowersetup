const USABLE_DEPTH = { lifepo4: 0.8, lead: 0.5 };
const PRODUCT_CATEGORY_BY_COMPONENT = { battery: "battery", solar: "solar_panel", inverter: "inverter", controller: "controller" };

const COPY = {
  cs: {
    kicker: "Už něco máte?",
    title: "Zkontrolovat stávající sestavu",
    intro: "Zadejte jen hodnoty, které znáte. Ukážeme, co už stačí, kde je úzké místo a jaký je nejmenší smysluplný upgrade.",
    batteryType: "Typ baterie",
    lifepo4: "LiFePO₄",
    lead: "AGM / olovo",
    voltage: "Napětí baterie / systému",
    battery: "Kapacita baterie",
    solar: "Solární panely",
    inverter: "Trvalý výkon měniče",
    controller: "Jmenovitý proud MPPT",
    optional: "Nepovinné",
    submit: "Porovnat s návrhem",
    upgradeProducts: "Zobrazit vhodné produkty pro tento upgrade ↓",
    statuses: { sufficient: "Stačí", close: "Téměř stačí", insufficient: "Nestačí", unknown: "Nezadáno", incompatible: "Jiné napětí" },
    component: { battery: "Baterie", solar: "Solár", inverter: "Měnič", controller: "MPPT", voltage: "Napětí systému" },
    compared: (current, required) => `${current} z doporučených ${required}`,
    noInverter: "Pro vybrané spotřebiče není samostatný měnič potřeba.",
    allGood: "Zadané hlavní parametry odpovídají návrhu. Před montáží ještě ověřte kompatibilitu a bezpečnostní limity.",
    unknownOnly: "Zadané parametry vypadají dostatečně. Doplňte chybějící hodnoty pro úplnou kontrolu.",
    voltageMismatch: (current, required) => `Nejdřív vyřešte napětí: stávající ${current}V prvky nelze přímo kombinovat s navrženou ${required}V sestavou.`,
    upgrade: {
      battery: (target, voltage, type) => `Nejmenší smysluplný krok je zvýšit baterii přibližně na ${target} Ah při ${voltage} V (${type}).`,
      solar: (target) => `Největší omezení je solár. Zvyšte instalovaný výkon alespoň přibližně na ${target} Wp.`,
      inverter: (target) => `Největší omezení je měnič. Hledejte čistý sinus s trvalým výkonem alespoň ${target} W a ověřenou rozběhovou špičkou.`,
      controller: (target) => `Největší omezení je MPPT. Pro tento návrh počítejte alespoň s ${target} A a samostatně ověřte Voc a Isc panelů.`
    },
    safety: "Orientační kontrola výkonu, ne potvrzení kompatibility. Ověřte BMS, průřezy a jištění, DC vypínací schopnost, rozběhové proudy a u panelů Voc/Isc za chladu."
  },
  sk: {
    kicker: "Už niečo máte?",
    title: "Skontrolovať existujúcu zostavu",
    intro: "Zadajte iba hodnoty, ktoré poznáte. Ukážeme, čo už stačí, kde je úzke miesto a aký je najmenší zmysluplný upgrade.",
    batteryType: "Typ batérie",
    lifepo4: "LiFePO₄",
    lead: "AGM / olovo",
    voltage: "Napätie batérie / systému",
    battery: "Kapacita batérie",
    solar: "Solárne panely",
    inverter: "Trvalý výkon meniča",
    controller: "Menovitý prúd MPPT",
    optional: "Nepovinné",
    submit: "Porovnať s návrhom",
    upgradeProducts: "Zobraziť vhodné produkty pre tento upgrade ↓",
    statuses: { sufficient: "Stačí", close: "Takmer stačí", insufficient: "Nestačí", unknown: "Nezadané", incompatible: "Iné napätie" },
    component: { battery: "Batéria", solar: "Solár", inverter: "Menič", controller: "MPPT", voltage: "Napätie systému" },
    compared: (current, required) => `${current} z odporúčaných ${required}`,
    noInverter: "Pre vybrané spotrebiče nie je samostatný menič potrebný.",
    allGood: "Zadané hlavné parametre zodpovedajú návrhu. Pred montážou ešte overte kompatibilitu a bezpečnostné limity.",
    unknownOnly: "Zadané parametre vyzerajú dostatočne. Doplňte chýbajúce hodnoty pre úplnú kontrolu.",
    voltageMismatch: (current, required) => `Najprv vyriešte napätie: existujúce ${current}V prvky nemožno priamo kombinovať s navrhnutou ${required}V zostavou.`,
    upgrade: {
      battery: (target, voltage, type) => `Najmenší zmysluplný krok je zvýšiť batériu približne na ${target} Ah pri ${voltage} V (${type}).`,
      solar: (target) => `Najväčšie obmedzenie je solár. Zvýšte inštalovaný výkon aspoň približne na ${target} Wp.`,
      inverter: (target) => `Najväčšie obmedzenie je menič. Hľadajte čistý sínus s trvalým výkonom aspoň ${target} W a overenou rozbehovou špičkou.`,
      controller: (target) => `Najväčšie obmedzenie je MPPT. Pre tento návrh počítajte aspoň s ${target} A a samostatne overte Voc a Isc panelov.`
    },
    safety: "Orientačná kontrola výkonu, nie potvrdenie kompatibility. Overte BMS, prierezy a istenie, DC vypínaciu schopnosť, rozbehové prúdy a pri paneloch Voc/Isc v chlade."
  },
  pl: {
    kicker: "Masz już instalację?",
    title: "Sprawdź obecny zestaw",
    intro: "Wpisz tylko znane wartości. Pokażemy, co wystarczy, gdzie jest wąskie gardło i jaka jest najmniejsza sensowna modernizacja.",
    batteryType: "Typ akumulatora",
    lifepo4: "LiFePO₄",
    lead: "AGM / kwasowo-ołowiowy",
    voltage: "Napięcie akumulatora / systemu",
    battery: "Pojemność akumulatora",
    solar: "Panele słoneczne",
    inverter: "Moc ciągła przetwornicy",
    controller: "Prąd znamionowy MPPT",
    optional: "Opcjonalnie",
    submit: "Porównaj z wynikiem",
    upgradeProducts: "Pokaż odpowiednie produkty do tej modernizacji ↓",
    statuses: { sufficient: "Wystarczy", close: "Prawie wystarczy", insufficient: "Za mało", unknown: "Brak danych", incompatible: "Inne napięcie" },
    component: { battery: "Akumulator", solar: "Panele", inverter: "Przetwornica", controller: "MPPT", voltage: "Napięcie systemu" },
    compared: (current, required) => `${current} z zalecanych ${required}`,
    noInverter: "Dla wybranych odbiorników osobna przetwornica nie jest potrzebna.",
    allGood: "Podane główne parametry odpowiadają wynikowi. Przed montażem sprawdź jeszcze zgodność i limity bezpieczeństwa.",
    unknownOnly: "Podane parametry wyglądają wystarczająco. Uzupełnij brakujące wartości, aby dokończyć kontrolę.",
    voltageMismatch: (current, required) => `Najpierw rozwiąż kwestię napięcia: elementów ${current} V nie można bezpośrednio łączyć z zalecanym systemem ${required} V.`,
    upgrade: {
      battery: (target, voltage, type) => `Najmniejszy sensowny krok to zwiększenie akumulatora do około ${target} Ah przy ${voltage} V (${type}).`,
      solar: (target) => `Największym ograniczeniem są panele. Zwiększ ich łączną moc przynajmniej do około ${target} Wp.`,
      inverter: (target) => `Największym ograniczeniem jest przetwornica. Wybierz czystą sinusoidę o mocy ciągłej co najmniej ${target} W i sprawdzonym udźwigu rozruchowym.`,
      controller: (target) => `Największym ograniczeniem jest MPPT. Przyjmij co najmniej ${target} A i osobno sprawdź Voc oraz Isc paneli.`
    },
    safety: "To orientacyjna kontrola mocy, a nie potwierdzenie zgodności. Sprawdź BMS, przewody i zabezpieczenia, zdolność wyłączania DC, prądy rozruchowe oraz Voc/Isc paneli w niskiej temperaturze."
  }
};

function optionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function statusFor(current, required) {
  if (required <= 0) return "sufficient";
  if (current === null) return "unknown";
  if (current >= required) return "sufficient";
  if (current >= required * 0.8) return "close";
  return "insufficient";
}

function roundUp(value, step) {
  return Math.ceil(value / step) * step;
}

export function assessExistingSetup(result, input, locale = result?.locale || "cs") {
  if (!result) throw new Error("RESULT_REQUIRED");
  const text = COPY[locale] || COPY.cs;
  const batteryType = Object.hasOwn(USABLE_DEPTH, input.batteryType) ? input.batteryType : "lifepo4";
  const voltage = optionalNumber(input.systemVoltage) || result.systemVoltage;
  const batteryAh = optionalNumber(input.batteryAh);
  const solarWatts = optionalNumber(input.solarWatts);
  const inverterWatts = optionalNumber(input.inverterWatts);
  const controllerAmps = optionalNumber(input.controllerAmps);
  const voltageMismatch = voltage !== result.systemVoltage;
  const requiredBatteryWh = (result.calculation.dailyWhRaw * result.autonomyDays * 1.15) / USABLE_DEPTH[batteryType];
  const requiredBatteryAh = roundUp(requiredBatteryWh / voltage, 10);

  const items = [
    {
      id: "battery",
      current: batteryAh,
      required: requiredBatteryAh,
      unit: "Ah",
      status: voltageMismatch && batteryAh !== null ? "incompatible" : statusFor(batteryAh, requiredBatteryAh)
    },
    { id: "solar", current: solarWatts, required: result.solarWatts, unit: "Wp", status: statusFor(solarWatts, result.solarWatts) },
    { id: "inverter", current: inverterWatts, required: result.inverterWatts, unit: "W", status: statusFor(inverterWatts, result.inverterWatts) },
    { id: "controller", current: controllerAmps, required: result.controllerAmps, unit: "A", status: statusFor(controllerAmps, result.controllerAmps) }
  ];

  let primaryBottleneck = null;
  let summary;
  if (voltageMismatch) {
    primaryBottleneck = "voltage";
    summary = text.voltageMismatch(voltage, result.systemVoltage);
  } else {
    const limiting = items
      .filter((item) => item.current !== null && item.required > 0 && item.status !== "sufficient")
      .sort((a, b) => (a.current / a.required) - (b.current / b.required))[0];
    primaryBottleneck = limiting?.id || null;
    if (limiting) {
      const batteryLabel = batteryType === "lead" ? text.lead : text.lifepo4;
      summary = limiting.id === "battery"
        ? text.upgrade.battery(requiredBatteryAh, voltage, batteryLabel)
        : text.upgrade[limiting.id](limiting.required);
    } else {
      summary = items.some((item) => item.status === "unknown") ? text.unknownOnly : text.allGood;
    }
  }

  return { locale, voltage, batteryType, requiredBatteryAh, items, primaryBottleneck, summary };
}

export function productCategoryForBottleneck(component) {
  return PRODUCT_CATEGORY_BY_COMPONENT[component] || null;
}

function renderItem(item, text) {
  const current = item.current === null ? "—" : `${item.current} ${item.unit}`;
  const comparison = item.id === "inverter" && item.required === 0
    ? text.noInverter
    : item.current === null
      ? text.optional
      : text.compared(`${item.current} ${item.unit}`, `${item.required} ${item.unit}`);
  return `<article class="existing-setup-item is-${item.status}">
    <div><strong>${text.component[item.id]}</strong><span class="setup-status">${text.statuses[item.status]}</span></div>
    <b>${current}</b><small>${comparison}</small>
  </article>`;
}

export function mountExistingSetupCheck({ target, locale = "cs", getResult, hasProductCategory, onAssessed, onUpgradeOpen }) {
  if (!target) return { setResult() {} };
  const text = COPY[locale] || COPY.cs;
  target.innerHTML = `<details class="existing-setup-details">
    <summary><span><small>${text.kicker}</small><strong>${text.title}</strong><em>${text.intro}</em></span></summary>
    <div class="existing-setup-form">
      <div class="existing-setup-fields">
        <label>${text.batteryType}<select name="batteryType"><option value="lifepo4">${text.lifepo4}</option><option value="lead">${text.lead}</option></select></label>
        <label>${text.voltage}<select name="systemVoltage"><option value="12">12 V</option><option value="24">24 V</option></select></label>
        <label>${text.battery}<span><input name="batteryAh" type="number" min="1" max="5000" step="1" inputmode="decimal" placeholder="${text.optional}" /> Ah</span></label>
        <label>${text.solar}<span><input name="solarWatts" type="number" min="0" max="20000" step="10" inputmode="decimal" placeholder="${text.optional}" /> Wp</span></label>
        <label>${text.inverter}<span><input name="inverterWatts" type="number" min="0" max="20000" step="10" inputmode="decimal" placeholder="${text.optional}" /> W</span></label>
        <label>${text.controller}<span><input name="controllerAmps" type="number" min="0" max="500" step="1" inputmode="decimal" placeholder="${text.optional}" /> A</span></label>
      </div>
      <button class="button button-primary" type="button" data-assess-existing>${text.submit}</button>
    </div>
    <div class="existing-setup-output" hidden aria-live="polite"></div>
    <p class="existing-setup-safety">${text.safety}</p>
  </details>`;

  const form = target.querySelector(".existing-setup-form");
  const output = target.querySelector(".existing-setup-output");
  form.querySelector("[data-assess-existing]").addEventListener("click", () => {
    const result = getResult?.();
    if (!result) return;
    const values = Object.fromEntries([...form.querySelectorAll("[name]")].map((field) => [field.name, field.value]));
    const assessment = assessExistingSetup(result, values, locale);
    const productCategory = productCategoryForBottleneck(assessment.primaryBottleneck);
    const upgradeAction = productCategory && hasProductCategory?.(productCategory)
      ? `<p class="existing-setup-action"><a class="button button-primary" data-existing-upgrade-link href="#product-group-${productCategory}">${text.upgradeProducts}</a></p>`
      : "";
    output.innerHTML = `<p class="existing-setup-summary">${assessment.summary}</p><div class="existing-setup-grid">${assessment.items.map((item) => renderItem(item, text)).join("")}</div>${upgradeAction}`;
    output.hidden = false;
    output.querySelector("[data-existing-upgrade-link]")?.addEventListener("click", () => onUpgradeOpen?.(productCategory));
    onAssessed?.(assessment);
  });

  return {
    setResult(result) {
      form.querySelector('[name="systemVoltage"]').value = String(result.systemVoltage);
      output.hidden = true;
      output.innerHTML = "";
    }
  };
}
