import { buildAnalyticsContext } from "./analytics-context.js";
import { classifyGuideCalculatorLink, classifyGuideClickZone, classifyGuideInternalLink } from "./analytics-links.js";
import { resolveCommunityAttribution } from "./community-attribution.js";
import { carryCommunityAttributionToUrl } from "./community-navigation.js";
import { enhanceHomepageLanguageSwitch } from "./language-switch.js";

const MEASUREMENT_ID = "G-TDNRBM2V2J";
const CONSENT_KEY = "mypowersetup_analytics_consent";
const VALID_CHOICES = new Set(["granted", "denied"]);
const ONCE_PER_PAGE_EVENTS = new Set(["calculator_started"]);
const trackedOnce = new Set();

const COPY = {
  cs: { label: "Volba analytiky", title: "Pomůžete nám zlepšovat kalkulátor?", text: "Po vašem souhlasu použijeme Google Analytics k anonymnímu měření návštěvnosti a používání funkcí. Bez souhlasu se analytika nenačte.", accept: "Povolit analytiku", reject: "Odmítnout", details: "Více o soukromí", detailsUrl: "/soukromi/" },
  sk: { label: "Voľba analytiky", title: "Pomôžete nám zlepšovať kalkulačku?", text: "Po vašom súhlase použijeme Google Analytics na anonymné meranie návštevnosti a používania funkcií. Bez súhlasu sa analytika nenačíta.", accept: "Povoliť analytiku", reject: "Odmietnuť", details: "Viac o súkromí", detailsUrl: "/sk/sukromie/" },
  pl: { label: "Wybór analityki", title: "Pomożesz nam ulepszać kalkulator?", text: "Za Twoją zgodą użyjemy Google Analytics do anonimowego pomiaru odwiedzin i użycia funkcji. Bez zgody analityka nie zostanie załadowana.", accept: "Zezwól na analitykę", reject: "Odrzuć", details: "Więcej o prywatności", detailsUrl: "/pl/prywatnosc/" },
  hu: { label: "Analitikai beállítás", title: "Segítesz fejleszteni a kalkulátort?", text: "Hozzájárulásod után a Google Analytics segítségével névtelenül mérjük a látogatásokat és a funkciók használatát. Hozzájárulás nélkül az analitika nem töltődik be.", accept: "Analitika engedélyezése", reject: "Elutasítás", details: "További információ az adatvédelemről", detailsUrl: "/hu/adatvedelem/" },
  ro: { label: "Opțiuni de analiză", title: "Ne ajuți să îmbunătățim calculatorul?", text: "Cu acordul tău folosim Google Analytics pentru măsurarea anonimă a vizitelor și utilizării funcțiilor. Fără acord, analiza nu se încarcă.", accept: "Permite analiza", reject: "Refuză", details: "Mai multe despre confidențialitate", detailsUrl: "/ro/confidentialitate/" },
  pt: { label: "Opções de análise", title: "Ajuda-nos a melhorar a calculadora?", text: "Com o teu consentimento usamos Google Analytics para medir anonimamente as visitas e a utilização das funcionalidades. Sem consentimento, a análise não é carregada.", accept: "Permitir análise", reject: "Recusar", details: "Mais sobre privacidade", detailsUrl: "/pt/privacidade/" },
  sl: { label: "Nastavitve analitike", title: "Nam pomagaš izboljšati kalkulator?", text: "Z dovoljenjem uporabljamo Google Analytics za anonimno merjenje obiskov in uporabe funkcij. Brez dovoljenja se analitika ne naloži.", accept: "Dovoli analitiko", reject: "Zavrni", details: "Več o zasebnosti", detailsUrl: "/si/zasebnost/" },
};

let choice = readChoice();
let tagLoaded = false;

function readChoice() { try { const stored = window.localStorage.getItem(CONSENT_KEY); return VALID_CHOICES.has(stored) ? stored : null; } catch { return null; } }
function saveChoice(value) { choice = value; try { window.localStorage.setItem(CONSENT_KEY, value); } catch {} }
function loadGoogleTag() {
  if (tagLoaded || choice !== "granted") return;
  tagLoaded = true;
  currentContext();
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement("script"); script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`; document.head.append(script);
}
function currentContext() {
  const page = buildAnalyticsContext({ lang: document.documentElement.lang, pathname: window.location.pathname, hasCalculator: Boolean(document.querySelector("#setup-form")) });
  const community = choice === "granted" ? resolveCommunityAttribution({ search: window.location.search, storage: window.sessionStorage }) : null;
  return Object.freeze({ ...page, ...(community || {}) });
}
function track(event, parameters = {}) {
  if (choice !== "granted" || typeof window.gtag !== "function") return false;
  if (ONCE_PER_PAGE_EVENTS.has(event) && trackedOnce.has(event)) return true;
  window.gtag("event", event, { ...parameters, ...currentContext() });
  if (ONCE_PER_PAGE_EVENTS.has(event)) trackedOnce.add(event);
  return true;
}
function removeDialog() { document.querySelector("[data-analytics-consent]")?.remove(); }
function setConsent(value) {
  saveChoice(value);
  removeDialog();
  if (value === "granted") {
    loadGoogleTag();
    document.dispatchEvent(new CustomEvent("mypowersetup:analytics-granted"));
  }
}
function renderDialog() {
  removeDialog();
  const locale = Object.hasOwn(COPY, document.documentElement.lang) ? document.documentElement.lang : "cs";
  const copy = COPY[locale];
  const dialog = document.createElement("aside");
  dialog.className = "analytics-consent"; dialog.dataset.analyticsConsent = ""; dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-label", copy.label);
  dialog.innerHTML = `<div><strong>${copy.title}</strong><p>${copy.text}</p><a href="${copy.detailsUrl}">${copy.details}</a></div><div class="analytics-consent-actions"><button type="button" data-analytics-reject>${copy.reject}</button><button type="button" class="is-primary" data-analytics-accept>${copy.accept}</button></div>`;
  dialog.querySelector("[data-analytics-accept]").addEventListener("click", () => setConsent("granted"));
  dialog.querySelector("[data-analytics-reject]").addEventListener("click", () => setConsent("denied"));
  document.body.append(dialog);
}
function openSettings() { renderDialog(); document.querySelector("[data-analytics-consent] button")?.focus(); }
function guideClickZone(link) {
  return classifyGuideClickZone({ inPrimaryCta: Boolean(link.closest(".cta")), inRelated: Boolean(link.closest(".related")), inHeader: Boolean(link.closest(".article-header")) });
}
function trackJourneyClick(event) {
  const link = event.target.closest?.("a[href]"); if (!link) return;
  const context = currentContext();
  const href = link.getAttribute("href");
  if (context.page_type === "guide") {
    const calculatorDestination = classifyGuideCalculatorLink(href, { origin: window.location.origin });
    if (calculatorDestination) {
      const carriedHref = carryCommunityAttributionToUrl(href, { search: window.location.search, pageUrl: window.location.href });
      if (carriedHref && carriedHref !== href) link.setAttribute("href", carriedHref);
      track("guide_to_calculator_click", { ...calculatorDestination, source_zone: guideClickZone(link) });
      return;
    }
    const internalDestination = classifyGuideInternalLink(href, { origin: window.location.origin, sourcePath: window.location.pathname });
    if (!internalDestination || internalDestination.destination_market !== context.market.replace("cz", "cs")) return;
    track("guide_internal_link_click", { ...internalDestination, source_zone: guideClickZone(link) });
    return;
  }
  if (context.page_type !== "calculator") return;
  const internalDestination = classifyGuideInternalLink(href, { origin: window.location.origin, sourcePath: window.location.pathname });
  if (!internalDestination || internalDestination.destination_market !== context.market.replace("cz", "cs")) return;
  track("calculator_to_guide_click", { ...internalDestination, source_zone: calculatorGuideClickZone(link) });
}
function calculatorGuideClickZone(link) {
  if (link.hasAttribute("data-component-guide")) return "result_component";
  if (link.hasAttribute("data-result-guide")) return "result_related";
  if (link.closest(".guide-preview")) return "homepage_guide_preview";
  return "inline";
}
function trackSharedCalculatorClick(event) {
  const context = currentContext(); if (context.page_type !== "calculator") return;
  if (event.target.closest?.("#result-share")) track("result_share_requested", { source: "result_action" });
  if (context.market !== "hu") return;
  if (event.target.closest?.("[data-next]")) track("calculator_started", { source: "next_button" });
  if (event.target.closest?.("#result-print")) track("result_print_requested", { source: "result_action" });
}
function trackHungarianCalculatorInput(event) {
  const context = currentContext(); if (context.market !== "hu" || context.page_type !== "calculator") return;
  if (!event.target.closest?.("#setup-form")) return;
  track("calculator_started", { source: "form_input" });
}
function init() {
  const stylesheet = document.createElement("link"); stylesheet.rel = "stylesheet"; stylesheet.href = "/analytics.css?v=20260824-1"; document.head.append(stylesheet);
  enhanceHomepageLanguageSwitch();
  document.addEventListener("click", (event) => { const trigger = event.target.closest?.("[data-analytics-settings]"); if (trigger) { event.preventDefault(); openSettings(); return; } trackJourneyClick(event); trackSharedCalculatorClick(event); });
  document.addEventListener("input", trackHungarianCalculatorInput);
  if (choice === "granted") loadGoogleTag(); else if (choice === null) renderDialog();
}
window.MyPowerSetupAnalytics = { track, openSettings, measurementId: MEASUREMENT_ID, context: currentContext };
init();
