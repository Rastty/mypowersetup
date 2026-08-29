function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

const CALCULATOR_COPY = Object.freeze({
  ro: Object.freeze({
    title: "Trei pași către sistemul tău",
    intro: "Folosește valori realiste pentru consumatorii pe care îi vei alimenta zilnic.",
    steps: ["Utilizare", "Consumatori", "Rezultat"],
    step1: "Câte zile vrei autonomie și în ce sezon călătorești?",
    days: "Zile fără încărcare",
    season: "Sezon pentru dimensionarea solarului",
    seasons: ["Vară", "Primăvară / toamnă", "Iarnă"],
    next: "Alege consumatorii",
    step2: "Ce vrei să alimentezi în fiecare zi?",
    appliances: ["Frigider cu compresor", "Iluminat LED", "Pompă de apă", "Laptop", "Televizor", "Espressor"],
    battery: "Tip baterie",
    voltage: "Tensiune sistem",
    back: "Înapoi",
    calculate: "Calculează sistemul",
    step3: "Estimarea sistemului tău",
    private: "Previzualizare privată pentru România — rezultatele nu sunt încă publicate sau indexate.",
  }),
  pt: Object.freeze({
    title: "Três passos para o teu sistema",
    intro: "Usa valores realistas para os equipamentos que pretendes alimentar todos os dias.",
    steps: ["Utilização", "Equipamentos", "Resultado"],
    step1: "Quantos dias de autonomia queres e em que época viajas?",
    days: "Dias sem carregamento",
    season: "Época para dimensionar o solar",
    seasons: ["Verão", "Primavera / outono", "Inverno"],
    next: "Escolher equipamentos",
    step2: "O que queres alimentar todos os dias?",
    appliances: ["Frigorífico de compressor", "Iluminação LED", "Bomba de água", "Portátil", "Televisão", "Máquina de café"],
    battery: "Tipo de bateria",
    voltage: "Tensão do sistema",
    back: "Voltar",
    calculate: "Calcular o sistema",
    step3: "Estimativa do teu sistema",
    private: "Pré-visualização privada para Portugal — os resultados ainda não são publicados nem indexados.",
  }),
  si: Object.freeze({
    title: "Trije koraki do tvojega sistema",
    intro: "Uporabi realne vrednosti za porabnike, ki jih želiš napajati vsak dan.",
    steps: ["Uporaba", "Porabniki", "Rezultat"],
    step1: "Koliko dni avtonomije želiš in v katerem letnem času potuješ?",
    days: "Dnevi brez polnjenja",
    season: "Obdobje za dimenzioniranje solarnega sistema",
    seasons: ["Poletje", "Pomlad / jesen", "Zima"],
    next: "Izberi porabnike",
    step2: "Kaj želiš napajati vsak dan?",
    appliances: ["Kompresorski hladilnik", "LED razsvetljava", "Vodna črpalka", "Prenosnik", "Televizor", "Kavni aparat"],
    battery: "Vrsta baterije",
    voltage: "Napetost sistema",
    back: "Nazaj",
    calculate: "Izračunaj sistem",
    step3: "Ocena tvojega sistema",
    private: "Zasebni predogled za Slovenijo — rezultati še niso javno objavljeni ali indeksirani.",
  }),
});

const APPLIANCES = Object.freeze([
  { watts: 45, hours: 10, ac: false, surge: 1 },
  { watts: 18, hours: 5, ac: false, surge: 1 },
  { watts: 60, hours: 0.5, ac: false, surge: 2 },
  { watts: 65, hours: 4, ac: true, surge: 1 },
  { watts: 55, hours: 2, ac: true, surge: 1 },
  { watts: 1400, hours: 0.15, ac: true, surge: 1.2 },
]);

export function renderPrivateMarketSeedPage(seed) {
  const copy = seed.copy;
  const calculator = CALCULATOR_COPY[seed.key];
  if (!calculator) throw new Error(`PRIVATE_CALCULATOR_COPY_MISSING:${seed.key}`);
  return `<!doctype html>
<html lang="${escapeHtml(seed.locale.split("-")[0])}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="${escapeHtml(seed.robots)}">
  <meta name="description" content="${escapeHtml(copy.description)}">
  <link rel="stylesheet" href="/styles.css">
  <title>${escapeHtml(copy.title)}</title>
</head>
<body>
  <header class="site-header"><a class="brand" href="${escapeHtml(seed.route)}">ϟ MyPowerSetup</a></header>
  <main id="top">
    <section class="hero" aria-labelledby="market-title">
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h1 id="market-title">${escapeHtml(copy.heading)}</h1>
        <p class="hero-lead">${escapeHtml(copy.lead)}</p>
        <a class="button button-primary hero-button" href="#calculator-preview">${escapeHtml(copy.action)}</a>
      </div>
    </section>
    <section class="calculator-section" id="calculator-preview" data-expansion-calculator data-market="${escapeHtml(seed.key)}" aria-labelledby="calculator-title">
      <div class="section-heading"><p class="eyebrow">${escapeHtml(copy.privateNote)}</p><h2 id="calculator-title">${escapeHtml(calculator.title)}</h2><p>${escapeHtml(calculator.intro)}</p></div>
      <div class="calculator-shell">
        <nav class="steps" aria-label="Calculator steps">
          ${calculator.steps.map((label, index) => `<button class="step${index === 0 ? " is-active" : ""}" type="button" data-step-target="${index + 1}"${index ? " disabled" : ""}><span>${index + 1}</span><small>${escapeHtml(label)}</small></button>${index < 2 ? "<i></i>" : ""}`).join("")}
        </nav>
        <p class="calculator-error" data-calculator-error role="alert" hidden></p>
        <form novalidate>
          <section class="form-step is-visible" data-form-step="1">
            <div class="step-heading"><span class="step-kicker">1 / 3</span><h3>${escapeHtml(calculator.step1)}</h3></div>
            <fieldset><legend>${escapeHtml(calculator.days)}</legend><div class="choice-grid choice-grid-days">${[1,2,3,5].map((days) => `<label class="choice-card"><input type="radio" name="autonomyDays" value="${days}"${days === 2 ? " checked" : ""><span><strong>${days}</strong></span></label>`).join("")}</div></fieldset>
            <fieldset><legend>${escapeHtml(calculator.season)}</legend><div class="choice-grid choice-grid-season">${["summer","shoulder","winter"].map((season, i) => `<label class="choice-card"><input type="radio" name="season" value="${season}"${i === 0 ? " checked" : ""><span><strong>${escapeHtml(calculator.seasons[i])}</strong></span></label>`).join("")}</div></fieldset>
            <div class="step-actions step-actions-end"><button class="button button-primary" type="button" data-next>${escapeHtml(calculator.next)} →</button></div>
          </section>
          <section class="form-step" data-form-step="2" hidden>
            <div class="step-heading"><span class="step-kicker">2 / 3</span><h3>${escapeHtml(calculator.step2)}</h3></div>
            <div class="appliance-grid">${APPLIANCES.map((item, i) => `<label class="choice-card"><input type="checkbox" data-appliance data-name="${escapeHtml(calculator.appliances[i])}" data-watts="${item.watts}" data-hours="${item.hours}" data-ac="${item.ac}" data-surge="${item.surge}"${i < 3 ? " checked" : ""><span><strong>${escapeHtml(calculator.appliances[i])}</strong><small>${item.watts} W · ${item.hours} h/day</small></span></label>`).join("")}</div>
            <div class="advanced-grid"><label>${escapeHtml(calculator.battery)}<select name="batteryType"><option value="lifepo4">LiFePO₄</option><option value="lead">AGM / lead</option></select></label><label>${escapeHtml(calculator.voltage)}<select name="systemVoltage"><option value="auto">Auto</option><option value="12">12 V</option><option value="24">24 V</option></select></label></div>
            <div class="step-actions"><button class="button button-secondary" type="button" data-back>← ${escapeHtml(calculator.back)}</button><button class="button button-primary" type="submit">${escapeHtml(calculator.calculate)}</button></div>
          </section>
          <section class="form-step" data-form-step="3" hidden>
            <div class="step-heading"><span class="step-kicker">3 / 3</span><h3>${escapeHtml(calculator.step3)}</h3><p>${escapeHtml(calculator.private)}</p></div>
            <div data-result></div>
          </section>
        </form>
      </div>
    </section>
  </main>
  <script type="module" src="/src/expansion-calculator-browser.js"></script>
</body>
</html>`;
}
