const CONFIG = Object.freeze({
  pt: Object.freeze({
    title: "Compreende e valida o resultado",
    intro: "Antes de comprar, confirma como a bateria, o solar e o sistema completo se relacionam com o teu perfil.",
    links: Object.freeze([
      Object.freeze({ topic: "battery", label: "Como validar a capacidade da bateria", href: "/pt/guias/capacidade-bateria-autocaravana/" }),
      Object.freeze({ topic: "solar", label: "Como validar os Wp de painéis solares", href: "/pt/guias/quantos-watts-paineis-solares-autocaravana/" }),
      Object.freeze({ topic: "system", label: "Ver o sistema elétrico completo", href: "/pt/guias/sistema-eletrico-completo-autocaravana/" }),
    ]),
  }),
  ro: Object.freeze({
    title: "Înțelege și verifică rezultatul",
    intro: "Înainte de cumpărare, verifică modul în care bateria, panourile solare și sistemul complet corespund profilului tău.",
    links: Object.freeze([
      Object.freeze({ topic: "battery", label: "Cum verifici capacitatea bateriei", href: "/ro/ghiduri/capacitate-baterie-autorulota/" }),
      Object.freeze({ topic: "solar", label: "Cum verifici puterea panourilor solare", href: "/ro/ghiduri/cate-panouri-solare-autorulota/" }),
      Object.freeze({ topic: "system", label: "Vezi sistemul electric complet", href: "/ro/ghiduri/sistem-electric-complet-autorulota/" }),
    ]),
  }),
  si: Object.freeze({
    title: "Razumi in preveri rezultat",
    intro: "Pred nakupom preveri, kako se baterija, solarni paneli in celoten sistem ujemajo s tvojim profilom.",
    links: Object.freeze([
      Object.freeze({ topic: "battery", label: "Kako preveriti kapaciteto baterije", href: "/si/vodici/kapaciteta-baterije-avtodom/" }),
      Object.freeze({ topic: "solar", label: "Kako preveriti potrebno solarno moč", href: "/si/vodici/koliko-soncnih-panelov-avtodom/" }),
      Object.freeze({ topic: "system", label: "Poglej celoten električni sistem", href: "/si/vodici/elektricni-sistem-avtodom/" }),
    ]),
  }),
});

export function expansionResultGuides(market) {
  const config = CONFIG[market];
  if (!config) throw new Error(`EXPANSION_RESULT_GUIDES_MARKET_INVALID:${market || "missing"}`);
  return config;
}
