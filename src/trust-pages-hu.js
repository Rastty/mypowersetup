import { HU_TRUST_COPY } from "./trust-copy-hu.js";

export const HU_TRUST_ROUTES = Object.freeze({
  about: "/hu/a-projektrol/",
  methodology: "/hu/modszertan/",
  affiliate: "/hu/partnerkapcsolatok/",
  privacy: "/hu/adatvedelem/",
});

const pageMeta = Object.freeze({
  about: { type: "profile", description: HU_TRUST_COPY.about.metaDescription },
  methodology: { type: "article", description: HU_TRUST_COPY.methodology.metaDescription },
  affiliate: { type: "article", description: "A MyPowerSetup partnerlinkjei, finanszírozása és a műszaki termékválasztás függetlenségének szabályai." },
  privacy: { type: "article", description: HU_TRUST_COPY.privacy.metaDescription },
});

export function renderHungarianTrustPage(kind) {
  if (!Object.hasOwn(HU_TRUST_ROUTES, kind)) throw new Error(`HU_TRUST_PAGE_UNKNOWN:${kind}`);
  const copy = HU_TRUST_COPY[kind];
  const meta = pageMeta[kind];
  const route = HU_TRUST_ROUTES[kind];
  return `<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>${escapeHtml(copy.metaTitle)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <meta property="og:title" content="${escapeHtml(copy.metaTitle)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:type" content="${meta.type}">
  <meta property="og:url" content="https://mypowersetup.com${route}">
  <meta property="og:site_name" content="MyPowerSetup">
  <meta property="og:locale" content="hu_HU">
  <meta property="og:image" content="https://mypowersetup.com/social-card.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/article.css">
</head>
<body>
  ${header()}
  ${pageBody(kind)}
  ${footer()}
  <script type="module" src="/src/analytics.js"></script>
</body>
</html>`;
}

function pageBody(kind) {
  if (kind === "about") return aboutBody();
  if (kind === "methodology") return methodologyBody();
  if (kind === "affiliate") return affiliateBody();
  return privacyBody();
}

function aboutBody() {
  const c = HU_TRUST_COPY.about;
  return `${hero(c.kicker, c.title, c.lead)}
  <main class="article-layout" style="grid-template-columns:1fr"><article class="article">
    <div class="answer"><strong>Alapelv</strong>${escapeHtml(c.principle)}</div>
    <h2>Miért készült a MyPowerSetup?</h2><p>${escapeHtml(c.author)}</p>
    <h2>Tapasztalat és források</h2><p>${escapeHtml(c.sources)}</p>
    <p>Hibát vagy műszaki észrevételt a <a href="mailto:${HU_TRUST_COPY.privacy.contact}">${HU_TRUST_COPY.privacy.contact}</a> címen jelezhetsz.</p>
    <h2>Mit végez el az eszköz?</h2><ul><li>Kiszámítja a napi energiafogyasztást.</li><li>Figyelembe veszi az autonómiát, a használható akkumulátorkapacitást, a veszteségeket és a tartalékot.</li><li>Ellenőrzi az inverter szükséges teljesítményét és a becsült indítási terhelést.</li><li>Csak felismerhető kulcsparaméterekkel rendelkező termékeket illeszt a számításhoz.</li><li>Megmutatja az eredmény feltételezéseit és korlátait.</li></ul>
    <h2>Mit nem végez el?</h2><p>${escapeHtml(c.limit)}</p>
    ${safetyNote()}
    ${calculatorCta()}
  </article></main>`;
}

function methodologyBody() {
  const c = HU_TRUST_COPY.methodology;
  return `${hero(c.kicker, c.title, "A kalkulátor fő képletei, tervezési tartalékai és korlátai egy helyen.")}
  <main class="article-layout"><article class="article">
    <div class="answer"><strong>${escapeHtml(c.version)}</strong>${escapeHtml(c.deterministic)}</div>
    <h2 id="fogyasztas">Napi fogyasztás</h2>${formula(c.formulas.consumption)}<p>A kezdőértékek tájékoztató jellegűek; a készülék adattáblája, dokumentációja vagy saját mérése pontosabb.</p>
    <h2 id="akkumulator">Akkumulátor</h2>${formula(c.formulas.battery)}<p>LiFePO₄ esetén 80%, AGM/ólomakkumulátornál 50% használható kisütési mélységgel számolunk. A konkrét akkumulátor adatlapja mindig elsőbbséget élvez.</p>
    <h2 id="napelem">Napelem</h2>${formula(c.formulas.solar)}<p>A modell nyáron 4,5, tavasszal és ősszel 3, télen 1,5 teljes napsütéses órát használ. A 0,75-ös tényező tervezési rendszer-veszteséget foglal magában, nem helyi időjárás-előrejelzés.</p>
    <h2 id="kabel">Kábel</h2>${formula(c.formulas.cable)}<p>Ez csak a feszültségesés alapján becsült minimum. A végleges méretezésnél figyelembe kell venni a terhelhetőséget, hőmérsékletet, fektetési módot, szigetelést, csatlakozókat és a gyártó előírásait.</p>
    <h2 id="termekek">Termékillesztés</h2><ol>${c.productRules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ol><div class="note"><strong>Független műszaki sorrend.</strong> ${escapeHtml(c.commission)}</div>
    <h2 id="korlatok">Korlátok</h2><p>${escapeHtml(c.limitation)}</p>${safetyNote()}
  </article><aside class="toc"><strong>A módszertanban</strong><a href="#fogyasztas">Fogyasztás</a><a href="#akkumulator">Akkumulátor</a><a href="#napelem">Napelem</a><a href="#kabel">Kábel</a><a href="#termekek">Termékek</a><a href="#korlatok">Korlátok</a></aside></main>`;
}

function affiliateBody() {
  const c = HU_TRUST_COPY.affiliate;
  return `${hero("Partnerkapcsolatok", c.title, "Átláthatóan bemutatjuk, mikor kaphatunk jutalékot, és mit nem befolyásolhat a jutalék.")}
  <main class="article-layout" style="grid-template-columns:1fr"><article class="article">
    <div class="answer"><strong>Röviden</strong>${escapeHtml(c.disclosure)}</div>
    <h2>A műszaki megfelelés az első</h2><p>${escapeHtml(c.independence)}</p>
    <h2>Mit kell vásárlás előtt ellenőrizni?</h2><p>${escapeHtml(c.verification)}</p>
    <h2>A kalkulátor használata</h2><p>${escapeHtml(c.choice)}</p>
    ${safetyNote()}${calculatorCta()}
  </article></main>`;
}

function privacyBody() {
  const c = HU_TRUST_COPY.privacy;
  return `${hero(c.kicker, c.title, "A kalkulátor fiók nélkül működik, az analitika pedig csak a választásod után indulhat el.")}
  <main class="article-layout" style="grid-template-columns:1fr"><article class="article">
    <h2>Helyi adatfeldolgozás</h2><p>${escapeHtml(c.localProcessing)}</p>
    <h2>Analitika és hozzájárulás</h2><p>${escapeHtml(c.analytics)}</p><p>A választást a böngésző a <code>${escapeHtml(c.consentKey)}</code> kulcs alatt tárolja. <button type="button" data-consent-settings>Analitikai beállítások megnyitása</button></p>
    <h2>Külső képek és partnerlinkek</h2><p>${escapeHtml(c.outgoing)}</p>
    <h2>Kapcsolat</h2><p>Adatvédelmi kérdés esetén írj a <a href="mailto:${c.contact}">${c.contact}</a> címre.</p>
  </article></main>`;
}

function header() {
  return `<header class="article-header"><a class="article-brand" href="/hu/">⚡ MyPowerSetup</a><nav><a href="/hu/#kalkulator">Kalkulátor</a><a href="/" hreflang="cs-CZ" lang="cs">Česky</a><a href="/sk/" hreflang="sk-SK" lang="sk">Slovensky</a><a href="/pl/" hreflang="pl-PL" lang="pl">Polski</a></nav></header>`;
}

function hero(kicker, title, lead) {
  return `<section class="article-hero"><div class="article-hero-inner"><span class="kicker">${escapeHtml(kicker)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(lead)}</p></div></section>`;
}

function footer() {
  return `<footer class="article-footer"><a href="${HU_TRUST_ROUTES.about}">A projektről</a> · <a href="${HU_TRUST_ROUTES.methodology}">Módszertan</a> · <a href="${HU_TRUST_ROUTES.affiliate}">Partnerkapcsolatok</a> · <a href="${HU_TRUST_ROUTES.privacy}">Adatvédelem</a></footer>`;
}

function safetyNote() {
  const c = HU_TRUST_COPY.safety;
  return `<div class="note"><strong>${escapeHtml(c.title)}</strong> ${escapeHtml(c.text)}</div>`;
}

function calculatorCta() {
  return `<section class="cta"><h2>Indulj ki a saját fogyasztásodból</h2><p>A kalkulátor ingyenes és regisztráció nélkül használható.</p><a href="/hu/#kalkulator">Kalkulátor megnyitása →</a></section>`;
}

function formula(value) {
  return `<div class="formula">${escapeHtml(value)}</div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
