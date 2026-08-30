import { PT_PRIVATE_CONTENT } from "./private-content-pt.js";
import { SI_PRIVATE_CONTENT } from "./private-content-si.js";
import { RO_PRIVATE_CONTENT } from "./private-content-ro.js";
import { createNativeReviewChecklist } from "./native-review-packs.js";

const CONFIG = Object.freeze({
  pt: Object.freeze({ locale: "pt-PT", prefix: "/pt/", content: PT_PRIVATE_CONTENT, homeAlternates: ["pt-PT"] }),
  si: Object.freeze({ locale: "sl-SI", prefix: "/si/", content: SI_PRIVATE_CONTENT, homeAlternates: ["sl-SI"] }),
  ro: Object.freeze({ locale: "ro-RO", prefix: "/ro/", content: RO_PRIVATE_CONTENT, homeAlternates: ["ro-RO"] }),
});

const PUBLICATION_COPY_REPLACEMENTS = Object.freeze({
  pt: Object.freeze([
    ["Falhar fechado", "Sem validação, sem recomendação"],
    ["Versão privada em validação para Portugal.", "Calculadora para Portugal."],
    ["Versão privada em validação para Portugal", "Conteúdo publicado para Portugal"],
    ["Pré-visualização privada para Portugal — os resultados ainda não são publicados nem indexados.", "Estimativa com base nos consumos e no perfil de viagem selecionados."],
  ]),
  si: Object.freeze([
    ["Affiliate politika", "Politika partnerskih povezav"],
    ["Affiliate in neodvisnost", "Partnerske povezave in neodvisnost"],
    ["affiliate monetizacije", "partnerskih provizij"],
    ["affiliate povezave", "partnerske povezave"],
    ["affiliate povezavo", "partnersko povezavo"],
    ["affiliate omrežja", "partnerske mreže"],
    ["Fail closed", "Brez preverjanja ni priporočila"],
    ["Zasebna različica v preverjanju za Slovenijo.", "Kalkulator za Slovenijo."],
    ["Zasebna različica v preverjanju za Slovenijo", "Objavljena vsebina za Slovenijo"],
    ["Zasebni predogled za Slovenijo — rezultati še niso javno objavljeni ali indeksirani.", "Ocena temelji na izbranih porabnikih in načinu potovanja."],
  ]),
  ro: Object.freeze([
    ["Calculul primul", "Calculul înaintea produsului"],
    ["Fail closed", "Fără validare, fără recomandare"],
    ["Ce capacitate de baterie are nevoie o autorulotă?", "Ce capacitate trebuie să aibă bateria unei autorulote?"],
    ["Versiune privată în validare pentru România.", "Calculator pentru România."],
    ["Versiune privată în validare pentru România", "Conținut publicat pentru România"],
    ["Previzualizare privată pentru România — rezultatele nu sunt încă publicate sau indexate.", "Estimarea folosește consumatorii aleși și modul de utilizare selectat."],
    [" h/day", " h/zi"],
    ["Dimensionează solarul", "Dimensionează sistemul solar"],
  ]),
});

export function expansionPublicationManifest(market) {
  const config = CONFIG[market];
  if (!config) throw new Error(`EXPANSION_PUBLICATION_UNKNOWN:${market}`);
  const trust = config.content.trust.map((page) => Object.freeze({ source: "content", route: `${config.prefix}${page.slug}/`, path: `${config.prefix.slice(1)}${page.slug}/index.html`, changefreq: "yearly", priority: "0.4" }));
  const guides = config.content.guides.map((page) => Object.freeze({ source: "content", route: `${config.prefix}${guideBase(market)}/${page.slug}/`, path: `${config.prefix.slice(1)}${guideBase(market)}/${page.slug}/index.html`, changefreq: "monthly", priority: "0.8" }));
  const hubRoute = `${config.prefix}${guideBase(market)}/`;
  return Object.freeze([
    Object.freeze({ source: "home", route: config.prefix, path: `${config.prefix.slice(1)}index.html`, changefreq: "weekly", priority: "0.9" }),
    Object.freeze({ source: "content", route: hubRoute, path: `${hubRoute.slice(1)}index.html`, changefreq: "weekly", priority: "0.9" }),
    ...trust,
    ...guides,
  ]);
}

export function polishExpansionPublicationCopy(html, market) {
  const replacements = PUBLICATION_COPY_REPLACEMENTS[market];
  if (!replacements || typeof html !== "string") return html;
  return replacements.reduce((output, [from, to]) => output.split(from).join(to), html);
}

export function publicizeExpansionHtml(html, market, route, { home = false } = {}) {
  const config = CONFIG[market];
  if (!config || !route?.startsWith(config.prefix)) throw new Error(`EXPANSION_PUBLICATION_ROUTE_INVALID:${market}`);
  if (typeof html !== "string" || !html.includes("<head")) throw new Error("EXPANSION_PUBLICATION_HTML_INVALID");
  let output = polishExpansionPublicationCopy(html, market).replace(/\s*<meta name="robots" content="noindex,nofollow,noarchive">\s*/g, "\n");
  const canonical = `https://mypowersetup.com${route}`;
  const additions = [];
  if (!/rel="canonical"/.test(output)) additions.push(`<link rel="canonical" href="${canonical}">`);
  if (home) {
    const alternates = [["cs-CZ", "https://mypowersetup.com/"], ["sk-SK", "https://mypowersetup.com/sk/"], ["pl-PL", "https://mypowersetup.com/pl/"], ["hu-HU", "https://mypowersetup.com/hu/"], [config.locale, canonical], ["x-default", "https://mypowersetup.com/"]];
    for (const [language, href] of alternates) if (!output.includes(`hreflang="${language}"`)) additions.push(`<link rel="alternate" hreflang="${language}" href="${href}">`);
    const marker = `__MPS_${market.toUpperCase()}_PUBLICATION__`;
    if (!output.includes(marker)) additions.push(`<script>globalThis.${marker}=true</script>`);
  }
  if (additions.length) output = output.replace("</head>", `  ${additions.join("\n  ")}\n</head>`);
  return output;
}

export function addExpansionHomeAlternate(html, market) {
  const config = CONFIG[market];
  if (!config || typeof html !== "string" || !html.includes("</head>")) throw new Error(`EXPANSION_HREFLANG_INVALID:${market}`);
  if (html.includes(`hreflang="${config.locale}"`)) return html;
  const tag = `<link rel="alternate" hreflang="${config.locale}" href="https://mypowersetup.com${config.prefix}" />`;
  const xDefault = /<link rel="alternate" hreflang="x-default"[^>]*>/;
  if (xDefault.test(html)) return html.replace(xDefault, `${tag}\n    $&`);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

export function publishedExpansionMarketsFromSitemap(xml, { exclude = null } = {}) {
  if (typeof xml !== "string") throw new TypeError("EXPANSION_SITEMAP_REQUIRED");
  return Object.freeze(Object.entries(CONFIG)
    .filter(([market, config]) => market !== exclude && xml.includes(`<loc>https://mypowersetup.com${config.prefix}</loc>`))
    .map(([market]) => market));
}

export function addExpansionRoutesToSitemap(xml, market) {
  if (typeof xml !== "string" || !xml.includes("</urlset>")) throw new Error("EXPANSION_SITEMAP_INVALID");
  const additions = expansionPublicationManifest(market)
    .filter(({ route }) => !xml.includes(`<loc>https://mypowersetup.com${route}</loc>`))
    .map(({ route, changefreq, priority }) => `  <url><loc>https://mypowersetup.com${route}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`);
  return additions.length ? xml.replace("</urlset>", `${additions.join("\n")}\n</urlset>`) : xml;
}

export function assessExpansionNativeApproval(market, evidence) {
  if (!CONFIG[market]) throw new Error(`EXPANSION_PUBLICATION_UNKNOWN:${market}`);
  const checklist = createNativeReviewChecklist(market, evidence);
  const languageReviewComplete = evidence?.languageEditorialReview === true || evidence?.nativeLanguageReview === true;
  const blockers = [
    !languageReviewComplete && "languageEditorialReview",
    evidence?.publicPublicationApproved !== true && "publicPublicationApproved",
    ...checklist.blockers,
  ].filter(Boolean);
  return Object.freeze({
    market,
    ready: blockers.length === 0,
    blockers: Object.freeze([...new Set(blockers)]),
    checklist,
  });
}

export function requireExpansionNativeApproval(market, evidence) {
  const assessment = assessExpansionNativeApproval(market, evidence);
  if (!assessment.ready) throw new Error(`EXPANSION_LANGUAGE_REVIEW_REQUIRED:${market}:${assessment.blockers.join(",")}`);
  return true;
}

function guideBase(market) {
  return market === "pt" ? "guias" : market === "si" ? "vodici" : "ghiduri";
}
