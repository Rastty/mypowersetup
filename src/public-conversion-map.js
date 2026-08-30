import { PUBLIC_HREFLANG_GROUPS } from "./public-hreflang-map.js";

const CONVERSION_TOPICS = Object.freeze([
  "guides", "battery", "chemistry", "solar", "mppt", "dcDc", "shore", "inverter", "wiring", "fridge", "system", "voltage", "powerStation",
]);

const EXPANSION_ROUTES = Object.freeze({
  guides: Object.freeze({ pt: "/pt/guias/", si: "/si/vodici/", ro: "/ro/ghiduri/" }),
  battery: Object.freeze({ pt: "/pt/guias/capacidade-bateria-autocaravana/", si: "/si/vodici/kapaciteta-baterije-avtodom/", ro: "/ro/ghiduri/capacitate-baterie-autorulota/" }),
  chemistry: Object.freeze({ pt: "/pt/guias/lifepo4-vs-agm-autocaravana/", si: "/si/vodici/lifepo4-ali-agm-avtodom/", ro: "/ro/ghiduri/lifepo4-sau-agm-autorulota/" }),
  solar: Object.freeze({ pt: "/pt/guias/quantos-watts-paineis-solares-autocaravana/", si: "/si/vodici/koliko-soncnih-panelov-avtodom/", ro: "/ro/ghiduri/cate-panouri-solare-autorulota/" }),
  mppt: Object.freeze({ pt: "/pt/guias/como-escolher-controlador-mppt/", si: "/si/vodici/mppt-regulator-avtodom/", ro: "/ro/ghiduri/regulator-mppt-autorulota/" }),
  dcDc: Object.freeze({ pt: "/pt/guias/carregador-dc-dc-autocaravana/", si: "/si/vodici/dc-dc-polnilnik-avtodom/", ro: "/ro/ghiduri/incarcator-dc-dc-autorulota/" }),
  shore: Object.freeze({ pt: "/pt/guias/carregador-230v-bateria-autocaravana/", si: "/si/vodici/230v-polnilnik-baterije-avtodom/", ro: "/ro/ghiduri/incarcator-230v-baterie-autorulota/" }),
  inverter: Object.freeze({ pt: "/pt/guias/inversor-autocaravana-potencia/", si: "/si/vodici/inverter-avtodom-moc/", ro: "/ro/ghiduri/invertor-autorulota-putere/" }),
  wiring: Object.freeze({ pt: "/pt/guias/cabos-fusiveis-12v-autocaravana/", si: "/si/vodici/kabli-varovalke-12v-avtodom/", ro: "/ro/ghiduri/cabluri-sigurante-12v-autorulota/" }),
  fridge: Object.freeze({ pt: "/pt/guias/consumo-frigorifico-compressor-autocaravana/", si: "/si/vodici/poraba-kompresorski-hladilnik-avtodom/", ro: "/ro/ghiduri/consum-frigider-compresor-autorulota/" }),
  system: Object.freeze({ pt: "/pt/guias/sistema-eletrico-completo-autocaravana/", si: "/si/vodici/elektricni-sistem-avtodom/", ro: "/ro/ghiduri/sistem-electric-complet-autorulota/" }),
});

export const PUBLIC_CONVERSION_ROUTES = Object.freeze(Object.fromEntries(
  CONVERSION_TOPICS.map((topic) => [
    topic,
    Object.freeze({
      ...(PUBLIC_HREFLANG_GROUPS[topic] || {}),
      ...(EXPANSION_ROUTES[topic] || {}),
    }),
  ]),
));

export function conversionRouteFor(topic, market) {
  return PUBLIC_CONVERSION_ROUTES[topic]?.[market] || null;
}

export function conversionRouteCount() {
  return Object.values(PUBLIC_CONVERSION_ROUTES).reduce((sum, routes) => sum + Object.keys(routes).length, 0);
}
