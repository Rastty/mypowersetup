function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

export function renderPrivateMarketSeedPage(seed) {
  const copy = seed.copy;
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
    <section class="calculator-section" id="calculator-preview" aria-label="Private localization preview">
      <div class="section-heading"><p>${escapeHtml(copy.privateNote)}</p></div>
      <div class="calculator-shell">
        <p><strong>Private localization seed</strong></p>
        <p>Calculator engine, recommendation logic and product validation are reused from the shared core; localized UI and product feeds remain fail-closed until their market checks pass.</p>
      </div>
    </section>
  </main>
</body>
</html>`;
}
