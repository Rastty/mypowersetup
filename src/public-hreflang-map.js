export const PUBLIC_LOCALES = Object.freeze({
  cs: "cs-CZ",
  sk: "sk-SK",
  pl: "pl-PL",
  hu: "hu-HU",
});

export const PUBLIC_HREFLANG_GROUPS = Object.freeze({
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

export function routeToPublicFile(route) {
  if (route === "/") return "index.html";
  if (!/^\/[a-z0-9/-]+\/$/.test(route)) throw new Error(`PUBLIC_ROUTE_INVALID:${route}`);
  return `${route.slice(1)}index.html`;
}

export function buildHreflangTags(group) {
  if (!group || Object.keys(PUBLIC_LOCALES).some((market) => !group[market])) throw new Error("PUBLIC_HREFLANG_GROUP_INVALID");
  const tags = Object.entries(PUBLIC_LOCALES).map(([market, locale]) => `<link rel="alternate" hreflang="${locale}" href="https://mypowersetup.com${group[market]}">`);
  tags.push(`<link rel="alternate" hreflang="x-default" href="https://mypowersetup.com${group.cs}">`);
  return tags;
}
