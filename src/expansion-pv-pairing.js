// A panel's verified Wp rating alone does not establish electrical compatibility
// with a particular MPPT controller. Keep this distinction visible beside the
// component offers until Voc/Vmp/Isc and the final series/parallel layout are
// independently verified for the whole array.
const COPY = Object.freeze({
  pt: Object.freeze({
    message: "A potência total em Wp é uma estimativa de dimensionamento, não uma validação da ligação elétrica. Antes de combinar estes painéis com um MPPT, confirma Voc à temperatura mínima, Vmp, Isc, ligação em série/paralelo e os limites de tensão e corrente de entrada do controlador. Não consideres o conjunto compatível só por ter a potência indicada.",
    label: "Ver os critérios de compatibilidade MPPT",
    href: "/pt/guias/como-escolher-controlador-mppt/",
    powerCheck: "Potência Wp verificada",
  }),
  ro: Object.freeze({
    message: "Puterea totală în Wp este o estimare de dimensionare, nu o verificare a compatibilității electrice. Înainte de a conecta panourile la MPPT, verifică Voc la temperatura minimă, Vmp, Isc, conexiunile serie/paralel și limitele de tensiune și curent la intrarea regulatorului. Puterea potrivită nu garantează că ansamblul este compatibil.",
    label: "Vezi criteriile de compatibilitate MPPT",
    href: "/ro/ghiduri/regulator-mppt-autorulota/",
    powerCheck: "Putere Wp verificată",
  }),
  si: Object.freeze({
    message: "Skupna moč v Wp je ocena za dimenzioniranje, ne dokaz električne združljivosti. Pred povezavo panelov z MPPT preveri Voc pri najnižji temperaturi, Vmp, Isc, zaporedno/vzporedno vezavo ter omejitve vhodne napetosti in toka regulatorja. Ustrezna moč sama po sebi še ne pomeni, da je sistem združljiv.",
    label: "Preveri merila združljivosti z MPPT",
    href: "/si/vodici/mppt-regulator-avtodom/",
    powerCheck: "Preverjena moč Wp",
  }),
});

export function expansionPvPairingNotice(market, offers) {
  const copy = COPY[market];
  if (!copy) throw new Error(`EXPANSION_PV_PAIRING_MARKET_INVALID:${market || "missing"}`);
  if (!Array.isArray(offers) || !offers.some((item) => item?.category === "solar_panel")) return null;
  return copy;
}
