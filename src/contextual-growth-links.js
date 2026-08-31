const TOPIC_GRAPH = Object.freeze({
  battery: Object.freeze(["chemistry", "solar", "system"]),
  chemistry: Object.freeze(["battery", "dcdc", "system"]),
  solar: Object.freeze(["mppt", "battery", "system"]),
  mppt: Object.freeze(["solar", "battery", "wiring"]),
  inverter: Object.freeze(["battery", "wiring", "system"]),
  dcdc: Object.freeze(["battery", "chemistry", "system"]),
  shore: Object.freeze(["chemistry", "battery", "system"]),
  wiring: Object.freeze(["inverter", "mppt", "system"]),
  fridge: Object.freeze(["battery", "solar", "system"]),
  system: Object.freeze(["battery", "solar", "inverter"]),
});

const MARKET_CONFIG = Object.freeze({
  pt: Object.freeze({
    heading: "Continua a dimensionar o sistema",
    routes: Object.freeze({
      battery: "/pt/guias/capacidade-bateria-autocaravana/",
      chemistry: "/pt/guias/lifepo4-vs-agm-autocaravana/",
      solar: "/pt/guias/quantos-watts-paineis-solares-autocaravana/",
      mppt: "/pt/guias/como-escolher-controlador-mppt/",
      inverter: "/pt/guias/inversor-autocaravana-potencia/",
      dcdc: "/pt/guias/carregador-dc-dc-autocaravana/",
      shore: "/pt/guias/carregador-230v-bateria-autocaravana/",
      wiring: "/pt/guias/cabos-fusiveis-12v-autocaravana/",
      fridge: "/pt/guias/consumo-frigorifico-compressor-autocaravana/",
      system: "/pt/guias/sistema-eletrico-completo-autocaravana/",
    }),
    labels: Object.freeze({
      battery: "Calcular a capacidade da bateria",
      chemistry: "LiFePO₄ ou AGM: qual faz mais sentido?",
      solar: "Calcular os Wp de painéis solares",
      mppt: "Dimensionar o controlador MPPT",
      inverter: "Dimensionar o inversor",
      dcdc: "Dimensionar o carregador DC-DC",
      shore: "Escolher o carregador de 230 V",
      wiring: "Ver cabos e proteção 12/24 V",
      fridge: "Estimar o consumo do frigorífico",
      system: "Ver o sistema elétrico completo",
    }),
  }),
  ro: Object.freeze({
    heading: "Continuă dimensionarea sistemului",
    routes: Object.freeze({
      battery: "/ro/ghiduri/capacitate-baterie-autorulota/",
      chemistry: "/ro/ghiduri/lifepo4-sau-agm-autorulota/",
      solar: "/ro/ghiduri/cate-panouri-solare-autorulota/",
      mppt: "/ro/ghiduri/regulator-mppt-autorulota/",
      inverter: "/ro/ghiduri/invertor-autorulota-putere/",
      dcdc: "/ro/ghiduri/incarcator-dc-dc-autorulota/",
      shore: "/ro/ghiduri/incarcator-230v-baterie-autorulota/",
      wiring: "/ro/ghiduri/cabluri-sigurante-12v-autorulota/",
      fridge: "/ro/ghiduri/consum-frigider-compresor-autorulota/",
      system: "/ro/ghiduri/sistem-electric-complet-autorulota/",
    }),
    labels: Object.freeze({
      battery: "Calculează capacitatea bateriei",
      chemistry: "LiFePO₄ sau AGM pentru autorulotă?",
      solar: "Calculează puterea panourilor solare",
      mppt: "Alege regulatorul MPPT",
      inverter: "Dimensionează invertorul",
      dcdc: "Dimensionează încărcătorul DC-DC",
      shore: "Alege încărcătorul de 230 V",
      wiring: "Vezi cabluri și siguranțe 12/24 V",
      fridge: "Estimează consumul frigiderului",
      system: "Vezi sistemul electric complet",
    }),
  }),
  si: Object.freeze({
    heading: "Nadaljuj z dimenzioniranjem sistema",
    routes: Object.freeze({
      battery: "/si/vodici/kapaciteta-baterije-avtodom/",
      chemistry: "/si/vodici/lifepo4-ali-agm-avtodom/",
      solar: "/si/vodici/koliko-soncnih-panelov-avtodom/",
      mppt: "/si/vodici/mppt-regulator-avtodom/",
      inverter: "/si/vodici/inverter-avtodom-moc/",
      dcdc: "/si/vodici/dc-dc-polnilnik-avtodom/",
      shore: "/si/vodici/230v-polnilnik-baterije-avtodom/",
      wiring: "/si/vodici/kabli-varovalke-12v-avtodom/",
      fridge: "/si/vodici/poraba-kompresorski-hladilnik-avtodom/",
      system: "/si/vodici/elektricni-sistem-avtodom/",
    }),
    labels: Object.freeze({
      battery: "Izračunaj kapaciteto baterije",
      chemistry: "LiFePO₄ ali AGM za avtodom?",
      solar: "Izračunaj potrebno solarno moč",
      mppt: "Izberi MPPT regulator",
      inverter: "Dimenzioniraj inverter",
      dcdc: "Izberi DC-DC polnilnik",
      shore: "Izberi 230 V polnilnik",
      wiring: "Preveri kable in varovalke",
      fridge: "Oceni porabo hladilnika",
      system: "Poglej celoten električni sistem",
    }),
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
  const config = MARKET_CONFIG[market];
  if (!config) return Object.freeze([]);
  const topic = Object.entries(config.routes).find(([, candidate]) => candidate === route)?.[0];
  if (!topic) return Object.freeze([]);
  return Object.freeze(TOPIC_GRAPH[topic].map((target) => Object.freeze([config.labels[target], config.routes[target]])));
}

export function addContextualGrowthLinks(html, market, route) {
  if (typeof html !== "string") return html;
  const config = MARKET_CONFIG[market];
  const links = contextualGrowthLinks(market, route);
  if (!config || !links.length || html.includes("data-contextual-growth-links")) return html;
  if (!html.includes('<aside class="cta">')) return html;

  const block = `<aside class="related" data-contextual-growth-links><h2>${escapeHtml(config.heading)}</h2><ul>${links
    .map(([label, href]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`)
    .join("")}</ul></aside>`;
  return html.replace('<aside class="cta">', `${block}<aside class="cta">`);
}
