export const PUBLIC_LOCALES = Object.freeze({
  cs: "cs-CZ",
  sk: "sk-SK",
  pl: "pl-PL",
  hu: "hu-HU",
  pt: "pt-PT",
  si: "sl-SI",
  ro: "ro-RO",
});

const EXPANSION_HREFLANG_ROUTES = Object.freeze({
  home: Object.freeze({ pt: "/pt/", si: "/si/", ro: "/ro/" }),
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
  voltage: Object.freeze({ pt: "/pt/guias/sistema-12v-ou-24v-autocaravana/", si: "/si/vodici/12v-ali-24v-sistem-avtodom/", ro: "/ro/ghiduri/sistem-12v-sau-24v-autorulota/" }),
  powerStation: Object.freeze({ pt: "/pt/guias/power-station-ou-instalacao-fixa-autocaravana/", si: "/si/vodici/prenosna-elektrarna-ali-fiksna-instalacija-avtodom/", ro: "/ro/ghiduri/statie-portabila-sau-instalatie-fixa-autorulota/" }),
});

const MATURE_HREFLANG_GROUPS = Object.freeze({
  home: Object.freeze({ cs: "/", sk: "/sk/", pl: "/pl/", hu: "/hu/" }),
  guides: Object.freeze({ cs: "/pruvodce/", sk: "/sk/sprievodca/", pl: "/pl/poradnik/", hu: "/hu/utmutatok/" }),
  battery: Object.freeze({ cs: "/pruvodce/kapacita-baterie-do-karavanu/", sk: "/sk/sprievodca/kapacita-baterie-do-karavanu/", pl: "/pl/poradnik/pojemnosc-akumulatora-do-kampera/", hu: "/hu/utmutatok/lakoauto-akkumulator-kapacitas/" }),
  chemistry: Object.freeze({ cs: "/pruvodce/agm-vs-lifepo4/", sk: "/sk/sprievodca/agm-vs-lifepo4/", pl: "/pl/poradnik/agm-czy-lifepo4/", hu: "/hu/utmutatok/agm-vagy-lifepo4-lakoautohoz/" }),
  solar: Object.freeze({ cs: "/pruvodce/kolik-w-solarnich-panelu/", sk: "/sk/sprievodca/kolko-w-solarnych-panelov/", pl: "/pl/poradnik/ile-wat-paneli-solarnych-do-kampera/", hu: "/hu/utmutatok/hany-watt-napelem-lakoautohoz/" }),
  mppt: Object.freeze({ cs: "/pruvodce/jak-vybrat-mppt-regulator/", sk: "/sk/sprievodca/ako-vybrat-mppt-regulator/", pl: "/pl/poradnik/jak-dobrac-regulator-mppt/", hu: "/hu/utmutatok/mppt-szabalyozo-kivalasztasa/" }),
  dcDc: Object.freeze({ cs: "/pruvodce/jak-vybrat-dc-dc-nabijecku/", sk: "/sk/sprievodca/ako-vybrat-dc-dc-nabijacku/", pl: "/pl/poradnik/jak-dobrac-ladowarke-dc-dc/", hu: "/hu/utmutatok/dc-dc-tolto-kivalasztasa/" }),
  shore: Object.freeze({ cs: "/pruvodce/jak-vybrat-nabijecku-230-v/", sk: "/sk/sprievodca/ako-vybrat-nabijacku-230-v/", pl: "/pl/poradnik/jak-dobrac-ladowarke-230-v/", hu: "/hu/utmutatok/230-v-os-tolto-kivalasztasa/" }),
  inverter: Object.freeze({ cs: "/pruvodce/jak-velky-menic-do-karavanu/", sk: "/sk/sprievodca/aky-velky-menic-do-karavanu/", pl: "/pl/poradnik/jak-dobrac-przetwornice-do-kampera/", hu: "/hu/utmutatok/lakoauto-inverter-kivalasztasa/" }),
  wiring: Object.freeze({ cs: "/pruvodce/kabely-a-pojistky-12-v/", sk: "/sk/sprievodca/kable-a-poistky-12-v/", pl: "/pl/poradnik/przewody-i-bezpieczniki-12-v/", hu: "/hu/utmutatok/12-v-vezetekek-es-biztositekok/" }),
  fridge: Object.freeze({ cs: "/pruvodce/spotreba-kompresorove-lednice/", sk: "/sk/sprievodca/spotreba-kompresorovej-chladnicky/", pl: "/pl/poradnik/zuzycie-lodowki-kompresorowej/", hu: "/hu/utmutatok/kompresszoros-hutoszekreny-fogyasztasa/" }),
  system: Object.freeze({ cs: "/pruvodce/schema-elektroinstalace-karavanu/", sk: "/sk/sprievodca/schema-elektroinstalacie-karavanu/", pl: "/pl/poradnik/schemat-instalacji-elektrycznej-kampera/", hu: "/hu/utmutatok/lakoauto-elektromos-rendszer-kapcsolasi-rajz/" }),
  voltage: Object.freeze({ cs: "/pruvodce/12-v-nebo-24-v-karavan/", sk: "/sk/sprievodca/12-v-alebo-24-v-karavan/", pl: "/pl/poradnik/12-v-czy-24-v-kamper/", hu: "/hu/utmutatok/12-v-vagy-24-v-lakoauto/" }),
  powerStation: Object.freeze({ cs: "/pruvodce/power-station-nebo-pevna-instalace-karavan/", sk: "/sk/sprievodca/power-station-alebo-pevna-instalacia-karavan/", pl: "/pl/poradnik/power-station-czy-stala-instalacja-kamper/", hu: "/hu/utmutatok/power-station-vagy-beepitett-rendszer-lakoauto/" }),
  about: Object.freeze({ cs: "/o-projektu/", sk: "/sk/o-projekte/", pl: "/pl/o-projekcie/", hu: "/hu/a-projektrol/" }),
  methodology: Object.freeze({ cs: "/metodika/", sk: "/sk/metodika/", pl: "/pl/metodologia/", hu: "/hu/modszertan/" }),
  affiliate: Object.freeze({ cs: "/affiliate/", sk: "/sk/affiliate/", pl: "/pl/afiliacja/", hu: "/hu/partnerkapcsolatok/" }),
  privacy: Object.freeze({ cs: "/soukromi/", sk: "/sk/sukromie/", pl: "/pl/prywatnosc/", hu: "/hu/adatvedelem/" }),
});

export const PUBLIC_HREFLANG_GROUPS = Object.freeze(Object.fromEntries(
  Object.entries(MATURE_HREFLANG_GROUPS).map(([topic, routes]) => [topic, Object.freeze({ ...routes, ...(EXPANSION_HREFLANG_ROUTES[topic] || {}) })]),
));

export function routeToPublicFile(route) {
  if (route === "/") return "index.html";
  if (!/^\/[a-z0-9/-]+\/$/.test(route)) throw new Error(`PUBLIC_ROUTE_INVALID:${route}`);
  return `${route.slice(1)}index.html`;
}

export function buildHreflangTags(group) {
  if (!group || !group.cs) throw new Error("PUBLIC_HREFLANG_GROUP_INVALID");
  const tags = Object.entries(PUBLIC_LOCALES).filter(([market]) => group[market]).map(([market, locale]) => `<link rel="alternate" hreflang="${locale}" href="https://mypowersetup.com${group[market]}">`);
  tags.push(`<link rel="alternate" hreflang="x-default" href="https://mypowersetup.com${group.cs}">`);
  return tags;
}
