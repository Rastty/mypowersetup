import { HU_UI_COPY as copy } from "./ui-copy-hu.js";

export function renderHungarianPrivatePage() {
  return `<!doctype html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="theme-color" content="#10261f">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="description" content="${copy.meta.description}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <title>${copy.meta.title}</title>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="#top" aria-label="MyPowerSetup kezdőlap"><span class="brand-mark" aria-hidden="true">ϟ</span><span>MyPowerSetup</span></a>
    <nav class="header-nav" aria-label="Fő navigáció">
      <a class="header-link" href="/hu/utmutatok/">${copy.navigation.guides}</a>
      <a class="header-link" href="#modszer">${copy.navigation.method}</a>
      <a class="header-link language-switch" href="/pl/" lang="pl" hreflang="pl-PL">PL</a>
      <a class="header-link language-switch" href="/sk/" lang="sk" hreflang="sk-SK">SK</a>
      <a class="header-link language-switch" href="/" lang="cs" hreflang="cs-CZ">CZ</a>
    </nav>
  </header>
  <main id="top">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">${copy.hero.eyebrow}</p>
        <h1 id="hero-title">${copy.hero.title}</h1>
        <p class="hero-lead">${copy.hero.lead}</p>
        <div class="trust-row"><span><b>✓</b> ${copy.hero.noRegistration}</span><span><b>✓</b> ${copy.hero.transparent}</span><span><b>✓</b> ${copy.hero.free}</span></div>
        <a class="button button-primary hero-button" href="#kalkulator">${copy.hero.action}</a>
      </div>
      <div class="hero-visual" aria-hidden="true"><div class="energy-card battery-card"><span>${copy.result.battery}</span><strong>200 Ah</strong><i><em style="width:76%"></em></i></div><div class="power-path"><span class="sun">☀</span><span class="path-line"></span><span class="bolt">ϟ</span></div><div class="energy-card solar-card"><span>${copy.result.solar}</span><strong>400 Wp</strong><small>nyári szezon</small></div></div>
    </section>

    <section class="calculator-section" id="kalkulator" aria-labelledby="calculator-title">
      <div class="section-heading"><p class="eyebrow">Kalkulátor</p><h2 id="calculator-title">${copy.calculator.title}</h2><p>${copy.calculator.intro}</p></div>
      <div class="calculator-shell">
        <nav class="steps" aria-label="A kalkulátor lépései">${copy.calculator.steps.map((label, index) => `<button class="step ${index === 0 ? "is-active" : ""}" type="button" data-step-target="${index + 1}" ${index ? "disabled" : ""}><span>${index + 1}</span><small>${label}</small></button>${index < 2 ? "<i></i>" : ""}`).join("")}</nav>
        <p class="calculator-error" id="calculator-error" role="alert" hidden></p>
        <form id="setup-form" novalidate>
          <section class="form-step is-visible" data-step="1">
            <div class="step-heading"><span class="step-kicker">1 / 3</span><h3>${copy.calculator.usageTitle}</h3><p>${copy.calculator.usageIntro}</p></div>
            <fieldset><legend>${copy.calculator.autonomy}</legend><div class="choice-grid choice-grid-days">
              ${[[1,"Egy éjszaka"],[2,"Hétvége hálózat nélkül"],[3,"Hosszabb függetlenség"],[5,"Nagy energiatartalék"]].map(([days, note]) => `<label class="choice-card ${days === 2 ? "is-selected" : ""}"><input type="radio" name="autonomyDays" value="${days}" ${days === 2 ? "checked" : ""}><span><strong>${days} nap</strong><small>${note}</small></span></label>`).join("")}
            </div></fieldset>
            <fieldset><legend>${copy.calculator.season}</legend><div class="choice-grid choice-grid-season">
              <label class="choice-card is-selected"><input type="radio" name="season" value="summer" checked><span class="choice-icon">☀️</span><span><strong>Nyár</strong><small>A legtöbb napsütés</small></span></label>
              <label class="choice-card"><input type="radio" name="season" value="shoulder"><span class="choice-icon">⛅</span><span><strong>Tavasz / ősz</strong><small>Változó termelés</small></span></label>
              <label class="choice-card"><input type="radio" name="season" value="winter"><span class="choice-icon">❄️</span><span><strong>Tél</strong><small>Jelentősen kevesebb napsütés</small></span></label>
            </div></fieldset>
            <div class="step-actions step-actions-end"><button class="button button-primary" type="button" data-next>Fogyasztók kiválasztása →</button></div>
          </section>

          <section class="form-step" data-step="2" hidden>
            <div class="step-heading"><span class="step-kicker">2 / 3</span><h3>${copy.calculator.appliancesTitle}</h3><p>${copy.calculator.appliancesIntro}</p></div>
            <section class="usage-profiles" id="usage-profiles" aria-label="Gyors használati profilok"></section>
            <div class="appliance-summary" aria-live="polite"><span>${copy.calculator.selected}: <strong id="selected-count">0</strong></span><span>${copy.calculator.dailyEstimate}: <strong id="live-consumption">0 Wh</strong></span></div>
            <div class="appliance-grid" id="appliance-grid"></div>
            <p class="form-error" id="appliance-error" role="alert" hidden>${copy.calculator.selectAtLeastOne}</p>
            <details class="advanced-settings"><summary>${copy.calculator.advanced}</summary><div class="advanced-grid">
              <label>${copy.advanced.batteryType}<select name="batteryType"><option value="lifepo4">LiFePO₄</option><option value="lead">AGM / ólom-savas</option></select></label>
              <label>${copy.advanced.voltage}<select name="systemVoltage"><option value="auto">${copy.advanced.automatic}</option><option value="12">12 V</option><option value="24">24 V</option></select></label>
              <label>${copy.advanced.inverterCable}<input type="number" name="inverterCableLength" min="0.2" max="10" step="0.1" value="1.5" inputmode="decimal"></label>
              <label>${copy.advanced.driveHours}<input type="number" name="driveHoursPerDay" min="0" max="12" step="0.5" value="2" inputmode="decimal"></label>
              <label>${copy.advanced.starterVoltage}<select name="starterVoltage"><option value="12">12 V</option><option value="24">24 V</option></select></label>
              <label>${copy.advanced.dcDcCable}<input type="number" name="dcDcInputCableLength" min="0.2" max="15" step="0.1" value="4" inputmode="decimal"></label>
              <label>${copy.advanced.shoreHours}<input type="number" name="shoreChargeHours" min="0" max="24" step="0.5" value="8" inputmode="decimal"></label>
              <label>${copy.advanced.roofLength}<input type="number" name="roofLength" min="0.5" max="12" step="0.01" placeholder="${copy.advanced.optional}" inputmode="decimal"></label>
              <label>${copy.advanced.roofWidth}<input type="number" name="roofWidth" min="0.5" max="4" step="0.01" placeholder="${copy.advanced.optional}" inputmode="decimal"></label>
            </div></details>
            <div class="step-actions"><button class="button button-secondary" type="button" data-back>← ${copy.calculator.back}</button><button class="button button-primary" type="submit">${copy.calculator.calculate} →</button></div>
          </section>

          <section class="form-step result-step" data-step="3" hidden>
            <div class="result-heading"><span class="result-check">✓</span><div><span class="step-kicker">${copy.result.kicker}</span><h3>${copy.result.title}</h3><p id="result-intro"></p></div></div>
            <p class="result-verdict" id="result-verdict"></p><div class="result-grid" id="result-grid"></div>
            <section class="result-next-card" id="result-next" hidden><div><span class="step-kicker">${copy.result.next}</span><h4>${copy.result.compatibleComponents}</h4><p id="result-product-count"></p></div><a class="button button-primary" id="result-products-link" href="#product-recommendations">${copy.result.showProducts}</a></section>
            <section class="existing-setup-check" id="existing-setup-check" aria-label="Meglévő rendszer ellenőrzése"></section>
            <section class="result-share-card"><div><span class="step-kicker">${copy.result.save}</span><h4>${copy.result.shareTitle}</h4></div><div class="result-share-actions"><button class="button button-primary" type="button" id="result-share">${copy.result.share}</button><button class="button button-secondary" type="button" id="result-copy">${copy.result.copy}</button><button class="button button-secondary" type="button" id="result-print">${copy.result.print}</button></div><p id="result-share-status" role="status" aria-live="polite"></p></section>
            <section class="next-step-card" id="product-recommendations"><div><span class="step-kicker">${copy.products.verifiedMatch}</span><h4 id="product-heading">${copy.products.preparing}</h4><p id="product-intro">${copy.products.intro}</p></div><div id="package-variants"></div><div id="recommendation-groups"></div><p class="affiliate-note">${copy.products.affiliate}</p></section>
            <details class="decision-panel"><summary><span class="step-kicker">Átlátható számítás</span><h4>${copy.result.why}</h4></summary><div class="decision-grid" id="result-reasons"></div></details>
            <div class="result-columns"><section class="result-panel"><h4>${copy.result.consumption}</h4><div id="consumption-breakdown"></div></section><section class="result-panel"><h4>${copy.result.preflight}</h4><ul class="check-list" id="result-notes"></ul></section></div>
            <section class="diagram-panel"><h4>${copy.result.diagram}</h4><div id="system-diagram"></div></section>
            <section class="charging-panel"><h4>${copy.result.charging}</h4><div class="charging-grid" id="charging-options"></div></section>
            <section class="roof-panel"><h4>${copy.result.roof}</h4><div id="roof-fit"></div></section>
            <section class="installation-panel"><h4>${copy.result.installation}</h4><div class="installation-list" id="installation-plan"></div></section>
            <section class="charging-panel"><h4>${copy.result.powerStationComparison}</h4><div class="charging-grid" id="power-station-profile"></div></section>
            <div class="step-actions"><button class="button button-secondary" type="button" data-back>← ${copy.result.change}</button><button class="text-button" type="button" id="start-over">${copy.result.restart}</button></div>
          </section>
        </form>
      </div>
    </section>

    <section class="guide-preview" aria-labelledby="hu-guide-preview-title">
      <div class="section-heading">
        <p class="eyebrow">Gyakorlati útmutatók</p>
        <h2 id="hu-guide-preview-title">Előbb értsd meg. Utána vásárolj.</h2>
        <p>A számítás mögötti döntéseket magyar lakóautós helyzetekkel, képletekkel és ellenőrzési pontokkal magyarázzuk el.</p>
      </div>
      <div class="guide-preview-grid">
        <a href="/hu/utmutatok/lakoauto-akkumulator-kapacitas/">
          <span>Akkumulátor · 8 perc</span><h3>Hány Ah akkumulátor kell?</h3><p>Napi fogyasztásból, autonómiából és akkumulátortípusból számolva.</p>
        </a>
        <a href="/hu/utmutatok/agm-vagy-lifepo4-lakoautohoz/">
          <span>Döntés · 10 perc</span><h3>AGM vagy LiFePO₄?</h3><p>Használható energia, tömeg, hideg, töltők és a teljes átépítés alapján.</p>
        </a>
        <a href="/hu/utmutatok/dc-dc-tolto-kivalasztasa/">
          <span>Töltés menet közben · 11 perc</span><h3>Mekkora DC–DC töltő kell?</h3><p>Menetidő, intelligens alternátor, BMS, bemeneti áram és kábelezés együtt.</p>
        </a>
      </div>
      <p class="guide-preview-action"><a class="button button-secondary" href="/hu/utmutatok/">Minden útmutató →</a></p>
    </section>

    <section class="method-section" id="modszer"><div class="section-heading section-heading-light"><p class="eyebrow">Átlátható módszertan</p><h2>${copy.method.title}</h2></div><div class="method-grid"><article><span>01</span><h3>${copy.method.consumption}</h3></article><article><span>02</span><h3>${copy.method.losses}</h3></article><article><span>03</span><h3>${copy.method.surge}</h3></article></div></section>
    <section class="safety-note"><strong>${copy.safety.title}</strong><p>${copy.safety.text}</p></section>
  </main>
  <footer><a class="brand brand-footer" href="#top">ϟ MyPowerSetup</a><nav class="footer-links"><a href="/hu/utmutatok/">${copy.navigation.guides}</a><a href="/hu/a-projektrol/">${copy.footer.about}</a><a href="/hu/modszertan/">${copy.footer.methodology}</a><a href="/hu/partnerkapcsolatok/">${copy.footer.affiliate}</a><a href="/hu/adatvedelem/">${copy.footer.privacy}</a></nav><small>© <span id="year"></span> MyPowerSetup</small></footer>
  <script type="module" src="/src/app-hu-browser.js?v=20260902-product-impressions1"></script>
  <script type="module" src="/src/analytics.js"></script>
</body>
</html>`;
}
