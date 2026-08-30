const MARKET_LINKS = Object.freeze({
  pt: Object.freeze({
    "/pt/guias/capacidade-bateria-autocaravana/": Object.freeze([
      ["LiFePO₄ ou AGM: qual faz mais sentido?", "/pt/guias/lifepo4-vs-agm-autocaravana/"],
      ["Quantos Wp de solar precisas?", "/pt/guias/quantos-watts-paineis-solares-autocaravana/"],
      ["Ver o sistema elétrico completo", "/pt/guias/sistema-eletrico-completo-autocaravana/"],
    ]),
    "/pt/guias/lifepo4-vs-agm-autocaravana/": Object.freeze([
      ["Calcular a capacidade da bateria", "/pt/guias/capacidade-bateria-autocaravana/"],
      ["Dimensionar carregamento DC-DC", "/pt/guias/carregador-dc-dc-autocaravana/"],
      ["Ver o sistema elétrico completo", "/pt/guias/sistema-eletrico-completo-autocaravana/"],
    ]),
    "/pt/guias/quantos-watts-paineis-solares-autocaravana/": Object.freeze([
      ["Dimensionar o controlador MPPT", "/pt/guias/como-escolher-controlador-mppt/"],
      ["Calcular a capacidade da bateria", "/pt/guias/capacidade-bateria-autocaravana/"],
      ["Ver o sistema elétrico completo", "/pt/guias/sistema-eletrico-completo-autocaravana/"],
    ]),
    "/pt/guias/como-escolher-controlador-mppt/": Object.freeze([
      ["Calcular os Wp de painéis solares", "/pt/guias/quantos-watts-paineis-solares-autocaravana/"],
      ["Calcular a capacidade da bateria", "/pt/guias/capacidade-bateria-autocaravana/"],
      ["Ver cabos e proteção 12/24 V", "/pt/guias/cabos-fusiveis-12v-autocaravana/"],
    ]),
    "/pt/guias/inversor-autocaravana-potencia/": Object.freeze([
      ["Calcular a capacidade da bateria", "/pt/guias/capacidade-bateria-autocaravana/"],
      ["Ver cabos e proteção 12/24 V", "/pt/guias/cabos-fusiveis-12v-autocaravana/"],
      ["Ver o sistema elétrico completo", "/pt/guias/sistema-eletrico-completo-autocaravana/"],
    ]),
  }),
  ro: Object.freeze({
    "/ro/ghiduri/capacitate-baterie-autorulota/": Object.freeze([
      ["LiFePO₄ sau AGM pentru autorulotă?", "/ro/ghiduri/lifepo4-sau-agm-autorulota/"],
      ["Calculează puterea panourilor solare", "/ro/ghiduri/cate-panouri-solare-autorulota/"],
      ["Vezi sistemul electric complet", "/ro/ghiduri/sistem-electric-complet-autorulota/"],
    ]),
    "/ro/ghiduri/lifepo4-sau-agm-autorulota/": Object.freeze([
      ["Calculează capacitatea bateriei", "/ro/ghiduri/capacitate-baterie-autorulota/"],
      ["Dimensionează încărcătorul DC-DC", "/ro/ghiduri/incarcator-dc-dc-autorulota/"],
      ["Vezi sistemul electric complet", "/ro/ghiduri/sistem-electric-complet-autorulota/"],
    ]),
    "/ro/ghiduri/cate-panouri-solare-autorulota/": Object.freeze([
      ["Alege regulatorul MPPT", "/ro/ghiduri/regulator-mppt-autorulota/"],
      ["Calculează capacitatea bateriei", "/ro/ghiduri/capacitate-baterie-autorulota/"],
      ["Vezi sistemul electric complet", "/ro/ghiduri/sistem-electric-complet-autorulota/"],
    ]),
    "/ro/ghiduri/regulator-mppt-autorulota/": Object.freeze([
      ["Calculează puterea panourilor solare", "/ro/ghiduri/cate-panouri-solare-autorulota/"],
      ["Calculează capacitatea bateriei", "/ro/ghiduri/capacitate-baterie-autorulota/"],
      ["Vezi cabluri și siguranțe 12/24 V", "/ro/ghiduri/cabluri-sigurante-12v-autorulota/"],
    ]),
    "/ro/ghiduri/invertor-autorulota-putere/": Object.freeze([
      ["Calculează capacitatea bateriei", "/ro/ghiduri/capacitate-baterie-autorulota/"],
      ["Vezi cabluri și siguranțe 12/24 V", "/ro/ghiduri/cabluri-sigurante-12v-autorulota/"],
      ["Vezi sistemul electric complet", "/ro/ghiduri/sistem-electric-complet-autorulota/"],
    ]),
  }),
});

const MARKET_HEADINGS = Object.freeze({
  pt: "Continua a dimensionar o sistema",
  ro: "Continuă dimensionarea sistemului",
});

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[char]);
}

export function contextualGrowthLinks(market, route) {
  return MARKET_LINKS[market]?.[route] || Object.freeze([]);
}

export function addContextualGrowthLinks(html, market, route) {
  if (typeof html !== "string") return html;
  const links = contextualGrowthLinks(market, route);
  if (!links.length || html.includes("data-contextual-growth-links")) return html;
  if (!html.includes('<aside class="cta">')) return html;

  const heading = MARKET_HEADINGS[market] || "Continue sizing the system";
  const block = `<aside class="related" data-contextual-growth-links><h2>${escapeHtml(heading)}</h2><ul>${links
    .map(([label, href]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`)
    .join("")}</ul></aside>`;
  return html.replace('<aside class="cta">', `${block}<aside class="cta">`);
}
