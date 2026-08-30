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

  const block = `<aside class="related" data-contextual-growth-links><h2>Continua a dimensionar o sistema</h2><ul>${links
    .map(([label, href]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`)
    .join("")}</ul></aside>`;
  return html.replace('<aside class="cta">', `${block}<aside class="cta">`);
}
