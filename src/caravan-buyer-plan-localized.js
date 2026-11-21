// Shared, translated purchase-plan UI for the existing SK and PL Builders.
// Catalog eligibility and affiliate-link click guards remain with each Builder.
const COPY = Object.freeze({
  sk: {
    kicker: "Nákup podľa vášho výpočtu",
    manufacturerEvidence: "Overiť nabíjací profil LiFePO4 u výrobcu",
    complete: "Nákupný plán: všetky produktové kategórie pokryté",
    partial: "Nákupný plán: čo môžete kúpiť a čo ešte chýba",
    unavailable: "Nákupný plán: zatiaľ bez overených produktov",
    count: (n, all) => `${n} z ${all} overených kategórií`,
    fullNote: "Máme overenú produktovú zhodu pre každú vypočítanú kategóriu. Ide o jednotlivé nákupy, nie hotový elektroprojekt. Kabeláž, istenie, montáž a konečnú kompatibilitu overte s odborníkom.",
    partialNote: "Toto NIE JE kompletná zostava. Overené produkty môžete vyberať jednotlivo. Chýbajúce súčasti nekupujte naslepo; kabeláž, istenie a montáž treba samostatne navrhnúť.",
    missing: "Chýba overený vhodný produkt — pred nákupom overiť individuálne",
    manual: "Pozor: niektorý spôsob nabíjania vyžaduje individuálny návrh a nie je súčasťou kompletnej zostavy.",
    disclaimer: "Niektoré odkazy sú partnerské. Aktuálnu dostupnosť, parametre, menu a dopravu si potvrďte u predajcu.",
    labels: {battery:"Batéria",solar_panel:"Solárny panel",controller:"Regulátor MPPT",inverter:"Menič 230 V",dc_charger:"DC–DC nabíjačka",shore_charger:"Nabíjačka 230 V"},
  },
  pl: {
    kicker: "Zakupy według Twoich obliczeń",
    manufacturerEvidence: "Sprawdź profil ładowania LiFePO4 u producenta",
    complete: "Lista zakupów: wszystkie kategorie produktów dostępne",
    partial: "Lista zakupów: co można kupić, a czego jeszcze brakuje",
    unavailable: "Lista zakupów: brak zweryfikowanych produktów",
    count: (n, all) => `${n} z ${all} zweryfikowanych kategorii`,
    fullNote: "Dla każdej obliczonej kategorii mamy zweryfikowany produkt. To osobne zakupy, nie projekt instalacji. Przewody, zabezpieczenia, montaż i końcową zgodność sprawdź ze specjalistą.",
    partialNote: "To NIE JEST kompletny zestaw. Możesz osobno wybrać jedynie zweryfikowane produkty. Brakujących elementów nie kupuj w ciemno; przewody, zabezpieczenia i montaż wymagają osobnego projektu.",
    missing: "Brak zweryfikowanego odpowiedniego produktu — sprawdź indywidualnie przed zakupem",
    manual: "Uwaga: co najmniej jeden sposób ładowania wymaga indywidualnego projektu i nie należy do kompletnego zestawu.",
    disclaimer: "Niektóre odnośniki są partnerskie. Aktualną dostępność, parametry, walutę i dostawę potwierdź w sklepie.",
    labels: {battery:"Akumulator",solar_panel:"Panel słoneczny",controller:"Regulator MPPT",inverter:"Przetwornica 230 V",dc_charger:"Ładowarka DC–DC",shore_charger:"Ładowarka 230 V"},
  }
});
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);

// Only show the manufacturer's technical documentation when the exact SKU
// has a model-backed evidence URL supplied by the approved-product gate.
function manufacturerProofUrl(product) {
  const value = product?.specs?.chargingProfileEvidenceUrl;
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "www.victronenergy.com" ? url.href : null;
  } catch { return null; }
}

export function renderLocalizedCaravanBuyerPlan({
  target, plan, locale, purchaseUrl, purchaseCta, merchantLabel, trackEvent,
} = {}) {
  if (!target || !plan || !COPY[locale]) return;
  const t = COPY[locale];
  const title = plan.complete ? t.complete : plan.status === "partial" ? t.partial : t.unavailable;
  const rows = plan.rows.map(({ category, product, ready, quantity = 1 }) => {
    // Do not print a buy action when product identity or exact affiliate URI
    // is missing, even if its technical category is otherwise covered.
    const url = ready && product?.id && product?.affiliateUrl ? purchaseUrl(product, category) : "";
    const buyable = Boolean(url && /^https:\/\//i.test(url));
    const proof = buyable ? manufacturerProofUrl(product) : null;
    return `<li data-buying-category="${escape(category)}" data-shopping-quantity="${buyable ? quantity : 0}" class="${buyable ? "is-ready" : "is-missing"}">
      <span class="caravan-buying-plan-mark" aria-hidden="true">${buyable ? "✓" : "!"}</span>
      <div class="caravan-buying-plan-item"><strong>${escape(t.labels[category] || category)}</strong>
      <span>${buyable ? `${quantity} ${locale === "pl" ? "szt." : "ks"} · ${escape(product.name)}` : t.missing}</span></div>
      ${buyable ? `<a class="caravan-buying-plan-link" href="${escape(url)}" target="_blank" rel="sponsored noopener" data-affiliate-click data-source="caravan-plan" data-recommendation-role="recommended" data-product-id="${escape(product.id)}" data-merchant="${escape(product.merchant)}" data-category="${escape(category)}">${escape(purchaseCta(locale, merchantLabel(product.merchant)))}</a>` : ""}
      ${proof ? `<a class="caravan-manufacturer-proof" href="${escape(proof)}" target="_blank" rel="noopener noreferrer" data-manufacturer-charging-proof>${escape(t.manufacturerEvidence)}</a>` : ""}
    </li>`;
  }).join("");
  // Purchase readiness may be stricter than technical compatibility.
  const readyCount = (rows.match(/class="is-ready"/g) || []).length;
  const complete = readyCount === plan.requiredCount && !plan.manualDesign && plan.requiredCount > 0;
  const displayedTitle = complete ? t.complete : readyCount ? t.partial : t.unavailable;
  target.innerHTML = `<section class="caravan-buying-plan" data-buying-plan-state="${complete ? "complete" : readyCount ? "partial" : "unavailable"}" aria-labelledby="caravan-buying-plan-title">
    <div class="caravan-buying-plan-heading"><div><span class="step-kicker">${t.kicker}</span><h4 id="caravan-buying-plan-title">${displayedTitle}</h4></div>
    <strong class="caravan-buying-plan-count">${t.count(readyCount, plan.requiredCount)}</strong></div>
    <p class="caravan-buying-plan-note">${complete ? t.fullNote : t.partialNote}</p>
    <ol class="caravan-buying-plan-rows">${rows}</ol>
    ${plan.manualDesign ? `<p class="caravan-buying-plan-manual">${t.manual}</p>` : ""}
    <p class="caravan-buying-plan-disclosure">${t.disclaimer}</p></section>`;
  trackEvent?.("caravan_buying_plan_rendered", {
    locale, state: complete ? "complete" : readyCount ? "partial" : "unavailable",
    verified_categories: readyCount, required_categories: plan.requiredCount,
  });
}
