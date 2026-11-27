import { shoreVariantNote } from "./carbest-shore-profiles.js?v=20261127-carbest1";
import { caravanBasketPriceMarkup, caravanLinePrice, formatCaravanPrice } from "./caravan-basket-pricing.js?v=20261121-merchant1";
// Shared, translated purchase-plan UI for the existing SK and PL Builders.
// Catalog eligibility and affiliate-link click guards remain with each Builder.
const COPY = Object.freeze({
  sk: {
    kicker: "Nákup podľa vášho výpočtu",
    manufacturerEvidence: "Overiť nabíjací profil LiFePO4 u výrobcu",
    inverterVariant: (model, w, v) => `Pri nákupe vyberte presne variant ${model}: trvalý výkon ${w} W, vstup ${v} V. Spoločná stránka obchodu nevyberá variant automaticky.`,
    complete: "Nákupný plán: všetky produktové kategórie pokryté",
    partial: "Nákupný plán: čo môžete kúpiť a čo ešte chýba",
    unavailable: "Nákupný plán: zatiaľ bez overených produktov",
    count: (n, all) => `${n} z ${all} overených kategórií`,
    fullNote: "Máme overenú produktovú zhodu pre každú vypočítanú kategóriu. Ide o jednotlivé nákupy, nie hotový elektroprojekt. Kabeláž, istenie, montáž a konečnú kompatibilitu overte s odborníkom.",
    partialNote: "Toto NIE JE kompletná zostava. Overené produkty môžete vyberať jednotlivo. Chýbajúce súčasti nekupujte naslepo; kabeláž, istenie a montáž treba samostatne navrhnúť.",
    missing: "Chýba overený vhodný produkt — pred nákupom overiť individuálne",
    unconfirmed: "Vhodný produkt existuje, ale skladová dostupnosť nie je potvrdená — zatiaľ nenakupovať",
    pvNominal: (actual, nominal) => `Vybrané panely ${actual} Wp presahujú menovitý FV výkon regulátora ${nominal} Wp. Povolené predimenzovanie a vstupné limity musí potvrdiť výrobca.`,
    pvElectrical: "Pre vybrané panely nemáme potvrdené bezpečné zapojenie k dostupnému MPPT. Overte zimné Voc, Isc, počet panelov v sérii/paralelne a štartovacie napätie.",
    pvWire: (r) => `Kontrola limitov: ${r.series} v sérii × ${r.parallel} paralelná vetva; pri ${r.coldAmbientC} °C Voc ≈ ${r.coldVocV} V, pri ${r.hotCellC} °C Isc ≈ ${r.hotIscA} A. Montáž, kabeláž, konektory a skutočné teploty musí posúdiť odborník.`,
    pvProof: (name) => `Technické údaje panelu ${name}`,
    manual: "Pozor: niektorý spôsob nabíjania vyžaduje individuálny návrh a nie je súčasťou kompletnej zostavy.",
    disclaimer: "Niektoré odkazy sú partnerské. Aktuálnu dostupnosť, parametre, menu a dopravu si potvrďte u predajcu.",
    labels: {battery:"Batéria",solar_panel:"Solárny panel",controller:"Regulátor MPPT",inverter:"Menič 230 V",dc_charger:"DC–DC nabíjačka",shore_charger:"Nabíjačka 230 V"},
  },
  pl: {
    kicker: "Zakupy według Twoich obliczeń",
    manufacturerEvidence: "Sprawdź profil ładowania LiFePO4 u producenta",
    inverterVariant: (model, w, v) => `W sklepie wybierz dokładnie wariant ${model}: moc ciągła ${w} W, wejście ${v} V. Wspólna strona produktu nie wybiera wariantu automatycznie.`,
    complete: "Lista zakupów: wszystkie kategorie produktów dostępne",
    partial: "Lista zakupów: co można kupić, a czego jeszcze brakuje",
    unavailable: "Lista zakupów: brak zweryfikowanych produktów",
    count: (n, all) => `${n} z ${all} zweryfikowanych kategorii`,
    fullNote: "Dla każdej obliczonej kategorii mamy zweryfikowany produkt. To osobne zakupy, nie projekt instalacji. Przewody, zabezpieczenia, montaż i końcową zgodność sprawdź ze specjalistą.",
    partialNote: "To NIE JEST kompletny zestaw. Możesz osobno wybrać jedynie zweryfikowane produkty. Brakujących elementów nie kupuj w ciemno; przewody, zabezpieczenia i montaż wymagają osobnego projektu.",
    missing: "Brak zweryfikowanego odpowiedniego produktu — sprawdź indywidualnie przed zakupem",
    unconfirmed: "Odpowiedni produkt istnieje, lecz dostępność nie jest potwierdzona — na razie nie kupuj",
    pvNominal: (actual, nominal) => `Wybrane panele ${actual} Wp przekraczają nominalną moc PV regulatora ${nominal} Wp. Dopuszczalne przewymiarowanie i parametry wejścia potwierdź u producenta.`,
    pvElectrical: "Dla tych paneli nie ma potwierdzonego bezpiecznego połączenia z dostępnym MPPT. Sprawdź zimowe Voc, Isc, liczbę modułów w szeregu/równolegle i napięcie startowe.",
    pvWire: (r) => `Kontrola limitów: ${r.series} szeregowo × ${r.parallel} równolegle; Voc przy ${r.coldAmbientC} °C ≈ ${r.coldVocV} V, Isc przy ${r.hotCellC} °C ≈ ${r.hotIscA} A. Montaż, okablowanie, złącza i rzeczywiste temperatury musi ocenić specjalista.`,
    pvProof: (name) => `Dokumentacja panelu ${name}`,
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
  const rows = plan.rows.map(({ category, product, ready, quantity = 1, requirement, missingReason, installedPvWp, nominalPvWp, pvWiringReview }) => {
    // Do not print a buy action when product identity or exact affiliate URI
    // is missing, even if its technical category is otherwise covered.
    const url = ready && product?.id && product?.affiliateUrl ? purchaseUrl(product, category) : "";
    const buyable = Boolean(url && /^https:\/\//i.test(url));
    const proof = buyable ? manufacturerProofUrl(product) : null;
    const linePrice = buyable ? caravanLinePrice({ ready: true, product, quantity }, locale) : null;
    const inverterVariant = buyable && category === "inverter" && product.specs?.inverterVariantMustBeSelected
      ? t.inverterVariant(product.specs.inverterManufacturerModel, product.specs.powerW, product.specs.voltageV) : null;
    const shoreVariant=buyable?shoreVariantNote(product,locale):null;
    return `<li data-buying-category="${escape(category)}" data-shopping-quantity="${buyable ? quantity : 0}" class="${buyable ? "is-ready" : "is-missing"}">
      <span class="caravan-buying-plan-mark" aria-hidden="true">${buyable ? "✓" : "!"}</span>
      <div class="caravan-buying-plan-item"><strong>${escape(t.labels[category] || category)}</strong>
      <span>${buyable ? `${quantity} ${locale === "pl" ? "szt." : "ks"} · ${escape(product.name)}` : missingReason === "stock_unconfirmed" ? t.unconfirmed : missingReason === "pv_nominal_review" ? t.pvNominal(installedPvWp, nominalPvWp) : missingReason === "pv_electrical_review" ? t.pvElectrical : t.missing}</span>
      ${requirement ? `<small class="caravan-item-requirement">${escape(requirement)}</small>` : ""}
      ${inverterVariant ? `<small class="caravan-item-requirement" data-inverter-variant-selection>${escape(inverterVariant)}</small>` : ""}
      ${shoreVariant ? `<small class="caravan-item-requirement" data-shore-variant-selection>${escape(shoreVariant)}</small>` : ""}
      ${pvWiringReview ? `<small class="caravan-item-requirement" data-pv-wiring-review>${escape(t.pvWire(pvWiringReview))} <a href="${escape(pvWiringReview.manufacturerUrl)}" target="_blank" rel="noopener noreferrer" data-manufacturer-pv-proof>${escape(t.pvProof(pvWiringReview.manufacturerName))}</a></small>` : ""}</div>
      ${buyable ? `<a class="caravan-buying-plan-link" href="${escape(url)}" target="_blank" rel="sponsored noopener" data-affiliate-click data-source="caravan-plan" data-recommendation-role="recommended" data-product-id="${escape(product.id)}" data-merchant="${escape(product.merchant)}" data-category="${escape(category)}">${escape(purchaseCta(locale, merchantLabel(product.merchant)))}</a>` : ""}
      ${linePrice ? `<span class="caravan-line-amount">${escape(formatCaravanPrice(linePrice.amount, linePrice.currency, locale))} / ${quantity} ${locale === "pl" ? "szt." : "ks"}</span>` : ""}
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
    ${caravanBasketPriceMarkup(plan, locale, merchantLabel)}
    <p class="caravan-buying-plan-disclosure">${t.disclaimer}</p></section>`;
  trackEvent?.("caravan_buying_plan_rendered", {
    locale, state: complete ? "complete" : readyCount ? "partial" : "unavailable",
    verified_categories: readyCount, required_categories: plan.requiredCount,
  });
}
