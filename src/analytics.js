import { buildAnalyticsContext } from "./analytics-context.js";
import { classifyGuideCalculatorLink, classifyGuideClickZone } from "./analytics-links.js";

const MEASUREMENT_ID = "G-TDNRBM2V2J";
const CONSENT_KEY = "mypowersetup_analytics_consent";
const VALID_CHOICES = new Set(["granted", "denied"]);
const ONCE_PER_PAGE_EVENTS = new Set(["calculator_started"]);
const trackedOnce = new Set();

const COPY = {
  cs: {
    label: "Volba analytiky",
    title: "Pomůžete nám zlepšovat kalkulátor?",
    text: "Po vašem souhlasu použijeme Google Analytics k anonymnímu měření návštěvnosti a používání funkcí. Bez souhlasu se analytika nenačte.",
    accept: "Povolit analytiku",
    reject: "Odmítnout",
    details: "Více o soukromí",
    detailsUrl: "/soukromi/",
  },
  sk: {
    label: "Voľba analytiky",
    title: "Pomôžete nám zlepšovať kalkulačku?",
    text: "Po vašom súhlase použijeme Google Analytics na anonymné meranie návštevnosti a používania funkcií. Bez súhlasu sa analytika nenačíta.",
    accept: "Povoliť analytiku",
    reject: "Odmietnuť",
    details: "Viac o súkromí",
    detailsUrl: "/sk/sukromie/",
  },
  pl: {
    label: "Wybór analityki",
    title: "Pomożesz nam ulepszać kalkulator?",
    text: "Za Twoją zgodą użyjemy Google Analytics do anonimowego pomiaru odwiedzin i użycia funkcji. Bez zgody analityka nie zostanie załadowana.",
    accept: "Zezwól na analitykę",
    reject: "Odrzuć",
    details: "Więcej o prywatności",
    detailsUrl: "/pl/prywatnosc/",
  },
  hu: {
    label: "Analitikai beállítás",
    title: "Segítesz fejleszteni a kalkulátort?",
    text: "Hozzájárulásod után a Google Analytics segítségével névtelenül mérjük a látogatásokat és a funkciók használatát. Hozzájárulás nélkül az analitika nem töltődik be.",
    accept: "Analitika engedélyezése",
    reject: "Elutasítás",
    details: "További információ az adatvédelemről",
    detailsUrl: "/hu/adatvedelem/",
  },
};

let choice = readChoice();
let tagLoaded = false;

function readChoice() {
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    return VALID_CHOICES.has(stored) ? stored : null;
  } catch {
    return null;
  }
}

function saveChoice(value) {
  choice = value;
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // The current page can still honor the choice when storage is unavailable.
  }
}

function loadGoogleTag() {
  if (tagLoaded || choice !== "granted") return;
  tagLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.append(script);
}

function currentContext() {
  return buildAnalyticsContext({
    lang: document.documentElement.lang,
    pathname: window.location.pathname,
    hasCalculator: Boolean(document.querySelector("#setup-form")),
  });
}

function track(event, parameters = {}) {
  if (choice !== "granted" || typeof window.gtag !== "function") return false;
  if (ONCE_PER_PAGE_EVENTS.has(event) && trackedOnce.has(event)) return true;
  const payload = { ...parameters, ...currentContext() };
  window.gtag("event", event, payload);
  if (ONCE_PER_PAGE_EVENTS.has(event)) trackedOnce.add(event);
  return true;
}

function removeDialog() {
  document.querySelector("[data-analytics-consent]")?.remove();
}

function setConsent(value) {
  saveChoice(value);
  removeDialog();
  if (value === "granted") loadGoogleTag();
}

function renderDialog() {
  removeDialog();
  const locale = Object.hasOwn(COPY, document.documentElement.lang) ? document.documentElement.lang : "cs";
  const copy = COPY[locale];
  const dialog = document.createElement("aside");
  dialog.className = "analytics-consent";
  dialog.dataset.analyticsConsent = "";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-label", copy.label);
  dialog.innerHTML = `
    <div><strong>${copy.title}</strong><p>${copy.text}</p><a href="${copy.detailsUrl}">${copy.details}</a></div>
    <div class="analytics-consent-actions">
      <button type="button" data-analytics-reject>${copy.reject}</button>
      <button type="button" class="is-primary" data-analytics-accept>${copy.accept}</button>
    </div>`;
  dialog.querySelector("[data-analytics-accept]").addEventListener("click", () => setConsent("granted"));
  dialog.querySelector("[data-analytics-reject]").addEventListener("click", () => setConsent("denied"));
  document.body.append(dialog);
}

function openSettings() {
  renderDialog();
  document.querySelector("[data-analytics-consent] button")?.focus();
}

function trackGuideCalculatorClick(event) {
  const link = event.target.closest?.("a[href]");
  if (!link) return;
  const context = currentContext();
  if (context.page_type !== "guide") return;

  const destination = classifyGuideCalculatorLink(link.getAttribute("href"), { origin: window.location.origin });
  if (!destination) return;

  track("guide_to_calculator_click", {
    ...destination,
    source_zone: classifyGuideClickZone({
      inPrimaryCta: Boolean(link.closest(".cta")),
      inRelated: Boolean(link.closest(".related")),
      inHeader: Boolean(link.closest(".article-header")),
    }),
  });
}

function init() {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/analytics.css?v=20260824-1";
  document.head.append(stylesheet);
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-analytics-settings]");
    if (trigger) {
      event.preventDefault();
      openSettings();
      return;
    }
    trackGuideCalculatorClick(event);
  });
  if (choice === "granted") loadGoogleTag();
  else if (choice === null) renderDialog();
}

window.MyPowerSetupAnalytics = { track, openSettings, measurementId: MEASUREMENT_ID, context: currentContext };
init();
