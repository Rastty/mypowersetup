import { buildMarketHomeSearchSurface } from "./search-surface.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

const CALCULATOR_COPY = Object.freeze({
  ro: Object.freeze({ title: "Trei pași către sistemul tău", intro: "Folosește valori realiste pentru consumatorii pe care îi vei alimenta zilnic.", steps: ["Utilizare", "Consumatori", "Rezultat"], step1: "Câte zile vrei autonomie și în ce sezon călătorești?", days: "Zile fără încărcare", season: "Sezon pentru dimensionarea solarului", seasons: ["Vară", "Primăvară / toamnă", "Iarnă"], next: "Alege consumatorii", step2: "Ce vrei să alimentezi în fiecare zi?", profileAria: "Profiluri rapide de utilizare", appliances: ["Frigider cu compresor", "Iluminat LED", "Telefoane și tabletă", "Pompă de apă", "Laptop", "Televizor", "Espressor"], battery: "Tip baterie", batteryLead: "AGM / plumb-acid", voltage: "Tensiune sistem", voltageAuto: "Auto", hoursPerDay: "h/zi", back: "Înapoi", calculate: "Calculează sistemul", step3: "Estimarea sistemului tău", private: "Previzualizare privată pentru România — rezultatele nu sunt încă publicate sau indexate." }),
  pt: Object.freeze({ title: "Três passos para o teu sistema", intro: "Usa valores realistas para os equipamentos que pretendes alimentar todos os dias.", steps: ["Utilização", "Equipamentos", "Resultado"], step1: "Quantos dias de autonomia queres e em que época viajas?", days: "Dias sem carregamento", season: "Época para dimensionar o solar", seasons: ["Verão", "Primavera / outono", "Inverno"], next: "Escolher equipamentos", step2: "O que queres alimentar todos os dias?", profileAria: "Perfis rápidos de utilização", appliances: ["Frigorífico de compressor", "Iluminação LED", "Telemóveis e tablet", "Bomba de água", "Portátil", "Televisão", "Máquina de café"], battery: "Tipo de bateria", batteryLead: "AGM / chumbo-ácido", voltage: "Tensão do sistema", voltageAuto: "Automático", hoursPerDay: "h/dia", back: "Voltar", calculate: "Calcular o sistema", step3: "Estimativa do teu sistema", private: "Pré-visualização privada para Portugal — os resultados ainda não são publicados nem indexados." }),
  si: Object.freeze({ title: "Trije koraki do tvojega sistema", intro: "Uporabi realne vrednosti za porabnike, ki jih želiš napajati vsak dan.", steps: ["Uporaba", "Porabniki", "Rezultat"], step1: "Koliko dni avtonomije želiš in v katerem letnem času potuješ?", days: "Dnevi brez polnjenja", season: "Obdobje za dimenzioniranje solarnega sistema", seasons: ["Poletje", "Pomlad / jesen", "Zima"], next: "Izberi porabnike", step2: "Kaj želiš napajati vsak dan?", profileAria: "Hitri profili uporabe", appliances: ["Kompresorski hladilnik", "LED razsvetljava", "Telefoni in tablični računalnik", "Vodna črpalka", "Prenosnik", "Televizor", "Kavni aparat"], battery: "Vrsta baterije", batteryLead: "AGM / svinčeno-kislinski", voltage: "Napetost sistema", voltageAuto: "Samodejno", hoursPerDay: "h/dan", back: "Nazaj", calculate: "Izračunaj sistem", step3: "Ocena tvojega sistema", private: "Zasebni predogled za Slovenijo — rezultati še niso javno objavljeni ali indeksirani." }),
});

const PRIVATE_NAV = Object.freeze({
  pt: Object.freeze([
    ["Guias", "/pt/guias/"], ["Metodologia", "/pt/metodologia/"], ["Sobre", "/pt/sobre-o-projeto/"], ["Afiliados", "/pt/afiliacao/"], ["Privacidade", "/pt/privacidade/"],
  ]),
  ro: Object.freeze([
    ["Ghiduri", "/ro/ghiduri/"], ["Metodologie", "/ro/metodologie/"], ["Despre", "/ro/despre-proiect/"], ["Afiliere", "/ro/afiliere/"], ["Confidențialitate", "/ro/confidentialitate/"],
  ]),
  si: Object.freeze([
    ["Vodniki", "/si/vodici/"], ["Metodologija", "/si/metodologija/"], ["O projektu", "/si/o-projektu/"], ["Affiliate", "/si/affiliate/"], ["Zasebnost", "/si/zasebnost/"],
  ]),
});

export const EXPANSION_APPLIANCES = Object.freeze([
  { id: "fridge", watts: 45, hours: 10, ac: false, surge: 1 },
  { id: "lights", watts: 18, hours: 5, ac: false, surge: 1 },
  { id: "phones", watts: 20, hours: 3, ac: false, surge: 1 },
  { id: "pump", watts: 60, hours: 0.5, ac: false, surge: 2 },
  { id: "laptop", watts: 65, hours: 4, ac: true, surge: 1 },
  { id: "tv", watts: 55, hours: 2, ac: true, surge: 1 },
  { id: "coffee", watts: 1400, hours: 0.15, ac: true, surge: 1.2 },
]);

export function renderPrivateMarketSeedPage(seed) {
  const copy = seed.copy;
  const calculator = CALCULATOR_COPY[seed.key];
  if (!calculator) throw new Error(`PRIVATE_CALCULATOR_COPY_MISSING:${seed.key}`);
  const navItems = PRIVATE_NAV[seed.key] || [];
  const navHtml = navItems.slice(0, 3).map(([label, href]) => `<a class="header-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join("");
  const footerHtml = navItems.length ? `<footer class="expansion-footer"><nav aria-label="Trust and guides">${navItems.map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join(" ")}</nav></footer>` : "";

  const stepNavigationHtml = calculator.steps
    .map((label, index) => `<button class="step${index === 0 ? " is-active" : ""}" type="button" data-step-target="${index + 1}"${index ? " disabled" : ""}><span>${index + 1}</span><small>${escapeHtml(label)}</small></button>${index < 2 ? "<i></i>" : ""}`)
    .join("");
  const autonomyChoicesHtml = [1, 2, 3, 5].map((days) => `<label class="choice-card"><input type="radio" name="autonomyDays" value="${days}"${days === 2 ? " checked" : ""}><span><strong>${days}</strong></span></label>`).join("");
  const seasonChoicesHtml = ["summer", "shoulder", "winter"].map((season, index) => `<label class="choice-card"><input type="radio" name="season" value="${season}"${index === 0 ? " checked" : ""}><span><strong>${escapeHtml(calculator.seasons[index])}</strong></span></label>`).join("");
  const applianceChoicesHtml = EXPANSION_APPLIANCES.map((item, index) => `<label class="choice-card"><input type="checkbox" name="appliance" value="${escapeHtml(item.id)}" data-appliance data-appliance-id="${escapeHtml(item.id)}" data-name="${escapeHtml(calculator.appliances[index])}" data-watts="${item.watts}" data-hours="${item.hours}" data-ac="${item.ac}" data-surge="${item.surge}"${index < 3 ? " checked" : ""}><span><strong>${escapeHtml(calculator.appliances[index])}</strong><small>${item.watts} W · ${item.hours} ${escapeHtml(calculator.hoursPerDay)}</small></span></label>`).join("");

  return `<!doctype html>
<html lang="${escapeHtml(seed.locale.split("-")[0])}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="${escapeHtml(seed.robots)}">
  <meta name="description" content="${escapeHtml(copy.description)}">
  ${buildMarketHomeSearchSurface(seed)}
  <link rel="stylesheet" href="/styles.css">
  <title>${escapeHtml(copy.title)}</title>
</head>
<body>
  <header class="site-header"><a class="brand" href="${escapeHtml(seed.route)}">ϟ MyPowerSetup</a>${navItems.length ? `<nav class="expansion-nav" aria-label="Primary">${navHtml}</nav>` : ""}</header>
  <main id="top">
    <section class="hero" aria-labelledby="market-title"><div class="hero-copy"><p class="eyebrow">${escapeHtml(copy.eyebrow)}</p><h1 id="market-title">${escapeHtml(copy.heading)}</h1><p class="hero-lead">${escapeHtml(copy.lead)}</p><a class="button button-primary hero-button" href="#calculator-preview">${escapeHtml(copy.action)}</a></div></section>
    <section class="calculator-section" id="calculator-preview" data-expansion-calculator data-market="${escapeHtml(seed.key)}" aria-labelledby="calculator-title">
      <div class="section-heading"><p class="eyebrow">${escapeHtml(copy.privateNote)}</p><h2 id="calculator-title">${escapeHtml(calculator.title)}</h2><p>${escapeHtml(calculator.intro)}</p></div>
      <div class="calculator-shell">
        <nav class="steps" aria-label="Calculator steps">${stepNavigationHtml}</nav>
        <p class="calculator-error" data-calculator-error role="alert" hidden></p>
        <form id="setup-form" novalidate>
          <section class="form-step is-visible" data-form-step="1"><div class="step-heading"><span class="step-kicker">1 / 3</span><h3>${escapeHtml(calculator.step1)}</h3></div><fieldset><legend>${escapeHtml(calculator.days)}</legend><div class="choice-grid choice-grid-days">${autonomyChoicesHtml}</div></fieldset><fieldset><legend>${escapeHtml(calculator.season)}</legend><div class="choice-grid choice-grid-season">${seasonChoicesHtml}</div></fieldset><div class="step-actions step-actions-end"><button class="button button-primary" type="button" data-next>${escapeHtml(calculator.next)} →</button></div></section>
          <section class="form-step" data-form-step="2" hidden><div class="step-heading"><span class="step-kicker">2 / 3</span><h3>${escapeHtml(calculator.step2)}</h3></div><section class="usage-profiles" id="usage-profiles" aria-label="${escapeHtml(calculator.profileAria)}"></section><div class="appliance-grid">${applianceChoicesHtml}</div><div class="advanced-grid"><label>${escapeHtml(calculator.battery)}<select name="batteryType"><option value="lifepo4">LiFePO₄</option><option value="lead">${escapeHtml(calculator.batteryLead)}</option></select></label><label>${escapeHtml(calculator.voltage)}<select name="systemVoltage"><option value="auto">${escapeHtml(calculator.voltageAuto)}</option><option value="12">12 V</option><option value="24">24 V</option></select></label></div><div class="step-actions"><button class="button button-secondary" type="button" data-back>← ${escapeHtml(calculator.back)}</button><button class="button button-primary" type="submit">${escapeHtml(calculator.calculate)}</button></div></section>
          <section class="form-step" data-form-step="3" hidden><div class="step-heading"><span class="step-kicker">3 / 3</span><h3>${escapeHtml(calculator.step3)}</h3><p>${escapeHtml(calculator.private)}</p></div><div data-result></div></section>
        </form>
      </div>
    </section>
  </main>
  ${footerHtml}
  <script type="module" src="/src/analytics.js"></script>
  <script type="module" src="/src/expansion-calculator-browser.js?v=20260902-product-impressions1"></script>
</body>
</html>`;
}
