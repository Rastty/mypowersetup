import { coreMoneyLinks } from "./homepage-money-routing.js";

const TOPICS = Object.freeze(["battery", "solar", "mppt", "dcdc", "shore", "inverter"]);
const COPY = Object.freeze({
  cs: Object.freeze({ kicker: "Ověření před nákupem", title: "Rozumějte každé části výsledku", intro: "Otevřete výpočet a kontrolní pravidla pro komponentu, kterou právě vybíráte." }),
  sk: Object.freeze({ kicker: "Overenie pred nákupom", title: "Rozumejte každej časti výsledku", intro: "Otvorte výpočet a kontrolné pravidlá pre komponent, ktorý práve vyberáte." }),
  pl: Object.freeze({ kicker: "Weryfikacja przed zakupem", title: "Sprawdź każdą część wyniku", intro: "Otwórz obliczenia i zasady kontroli dla komponentu, który właśnie wybierasz." }),
  hu: Object.freeze({ kicker: "Ellenőrzés vásárlás előtt", title: "Értsd a számítás minden elemét", intro: "Nyisd meg az adott komponens méretezését és ellenőrzési szabályait vásárlás előtt." }),
});

function normalizeLang(lang) {
  return String(lang || "").toLowerCase().split("-")[0];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[char]);
}

export function coreResultGuideItems(lang) {
  const locale = normalizeLang(lang);
  const links = coreMoneyLinks(locale);
  if (!COPY[locale] || links.length !== TOPICS.length) return Object.freeze([]);
  return Object.freeze(links.map((item, index) => Object.freeze({ ...item, topic: TOPICS[index] })));
}

export function enhanceCoreResultGuides({
  root = globalThis.document,
  lang = root?.documentElement?.lang,
} = {}) {
  if (!root || typeof root.createElement !== "function") return false;
  if (root.querySelector?.("[data-core-result-guides]")) return false;

  const locale = normalizeLang(lang);
  const copy = COPY[locale];
  const items = coreResultGuideItems(locale);
  const resultGrid = root.querySelector?.("#result-grid");
  if (!copy || !items.length || !resultGrid) return false;

  const section = root.createElement("section");
  section.className = "result-component-guides";
  section.dataset.coreResultGuides = "";
  section.setAttribute?.("aria-labelledby", "core-result-guides-title");
  section.innerHTML = `<div><span class="step-kicker">${escapeHtml(copy.kicker)}</span><h4 id="core-result-guides-title">${escapeHtml(copy.title)}</h4><p>${escapeHtml(copy.intro)}</p></div><div class="result-grid">${items.map((item) => `<article class="result-card" data-result-guide-topic="${escapeHtml(item.topic)}"><span>${escapeHtml(item.label)}</span><strong><a data-component-guide data-topic="${escapeHtml(item.topic)}" href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></strong><small>${escapeHtml(item.description)}</small></article>`).join("")}</div>`;

  if (typeof resultGrid.insertAdjacentElement === "function") {
    resultGrid.insertAdjacentElement("afterend", section);
  } else if (resultGrid.parentNode?.insertBefore) {
    resultGrid.parentNode.insertBefore(section, resultGrid.nextSibling || null);
  } else {
    return false;
  }
  return true;
}
