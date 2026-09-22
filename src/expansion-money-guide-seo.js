const SITE_URL = "https://mypowersetup.com";
const SOCIAL_START = "<!-- mps:expansion-money-social:start -->";
const SOCIAL_END = "<!-- mps:expansion-money-social:end -->";

const ROUTES = Object.freeze([
  "/pt/guias/capacidade-bateria-autocaravana/",
  "/pt/guias/quantos-watts-paineis-solares-autocaravana/",
  "/pt/guias/como-escolher-controlador-mppt/",
  "/pt/guias/carregador-dc-dc-autocaravana/",
  "/pt/guias/carregador-230v-bateria-autocaravana/",
  "/pt/guias/inversor-autocaravana-potencia/",
  "/ro/ghiduri/capacitate-baterie-autorulota/",
  "/ro/ghiduri/cate-panouri-solare-autorulota/",
  "/ro/ghiduri/regulator-mppt-autorulota/",
  "/ro/ghiduri/incarcator-dc-dc-autorulota/",
  "/ro/ghiduri/incarcator-230v-baterie-autorulota/",
  "/ro/ghiduri/invertor-autorulota-putere/",
  "/si/vodici/kapaciteta-baterije-avtodom/",
  "/si/vodici/koliko-soncnih-panelov-avtodom/",
  "/si/vodici/mppt-regulator-avtodom/",
  "/si/vodici/dc-dc-polnilnik-avtodom/",
  "/si/vodici/230v-polnilnik-baterije-avtodom/",
  "/si/vodici/inverter-avtodom-moc/",
]);

const CONFIG = Object.freeze({
  pt: Object.freeze({ ogLocale: "pt_PT", faqHeading: "Perguntas frequentes" }),
  ro: Object.freeze({ ogLocale: "ro_RO", faqHeading: "Întrebări frecvente" }),
  si: Object.freeze({ ogLocale: "sl_SI", faqHeading: "Pogosta vprašanja" }),
});

const ROUTE_SET = new Set(ROUTES);
const SOCIAL_BLOCK = new RegExp(`\\s*${escapeRegExp(SOCIAL_START)}[\\s\\S]*?${escapeRegExp(SOCIAL_END)}\\s*`, "g");
const GENERATED_FAQ = /\s*<section\b[^>]*data-guide-faq[^>]*>[\s\S]*?<\/section>\s*/gi;

export function expansionMoneyGuideRoutes() {
  return [...ROUTES];
}

export function expansionMoneyGuidePublicPath(route) {
  if (!ROUTE_SET.has(route)) throw new Error(`EXPANSION_MONEY_GUIDE_ROUTE_INVALID:${route}`);
  return `${route.slice(1)}index.html`;
}

export function enhanceExpansionMoneyGuideSeo(html, route) {
  if (!ROUTE_SET.has(route)) throw new Error(`EXPANSION_MONEY_GUIDE_ROUTE_INVALID:${route}`);
  if (typeof html !== "string" || !html.includes("<head") || !html.includes("</head>")) {
    throw new Error(`EXPANSION_MONEY_GUIDE_HTML_INVALID:${route}`);
  }

  const config = CONFIG[marketFromRoute(route)];
  const title = decodeHtmlText(matchAttributeOrText(html, /<title>([\s\S]*?)<\/title>/i, 1));
  const description = decodeHtmlText(matchAttributeOrText(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i, 1));
  const canonical = matchAttributeOrText(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i, 1);
  if (!title || !description || canonical !== `${SITE_URL}${route}`) {
    throw new Error(`EXPANSION_MONEY_GUIDE_META_INVALID:${route}`);
  }

  const faq = extractFaq(html);
  if (!faq.length) throw new Error(`EXPANSION_MONEY_GUIDE_FAQ_SCHEMA_MISSING:${route}`);

  let output = html.replace(SOCIAL_BLOCK, "").replace(GENERATED_FAQ, "");
  output = addSocialMetadata(output, { title, description, canonical, ogLocale: config.ogLocale });

  const visibleText = bodyText(output);
  const missingFaq = faq.filter((item) => !visibleText.includes(normalizeText(item.question)));
  if (missingFaq.length) {
    const section = renderFaq(faq, config.faqHeading);
    const anchor = /<aside\b[^>]*data-contextual-growth-links[^>]*>/i;
    const cta = /<aside\b[^>]*class=["'][^"']*\bcta\b[^"']*["'][^>]*>/i;
    if (anchor.test(output)) output = output.replace(anchor, `${section}$&`);
    else if (cta.test(output)) output = output.replace(cta, `${section}$&`);
    else throw new Error(`EXPANSION_MONEY_GUIDE_FAQ_INSERTION_POINT_MISSING:${route}`);
  }

  assertExpansionMoneyGuideSeo(output, route);
  return output;
}

export function assertExpansionMoneyGuideSeo(html, route) {
  if (!ROUTE_SET.has(route)) throw new Error(`EXPANSION_MONEY_GUIDE_ROUTE_INVALID:${route}`);
  const config = CONFIG[marketFromRoute(route)];
  const faq = extractFaq(html);
  const visibleText = bodyText(html);
  const missing = faq.filter((item) => !visibleText.includes(normalizeText(item.question)));
  if (!faq.length) throw new Error(`EXPANSION_MONEY_GUIDE_FAQ_SCHEMA_MISSING:${route}`);
  if (missing.length) throw new Error(`EXPANSION_MONEY_GUIDE_FAQ_NOT_VISIBLE:${route}:${missing.map((item) => item.question).join("|")}`);

  for (const [label, pattern] of [
    ["og_title", /<meta\s+property=["']og:title["']/i],
    ["og_description", /<meta\s+property=["']og:description["']/i],
    ["og_type", /<meta\s+property=["']og:type["']\s+content=["']article["']/i],
    ["og_url", /<meta\s+property=["']og:url["']/i],
    ["og_locale", new RegExp(`<meta\\s+property=["']og:locale["']\\s+content=["']${escapeRegExp(config.ogLocale)}["']`, "i")],
    ["og_image", /<meta\s+property=["']og:image["']/i],
    ["twitter_card", /<meta\s+name=["']twitter:card["']\s+content=["']summary_large_image["']/i],
    ["twitter_title", /<meta\s+name=["']twitter:title["']/i],
    ["twitter_description", /<meta\s+name=["']twitter:description["']/i],
    ["twitter_image", /<meta\s+name=["']twitter:image["']/i],
  ]) {
    if (!pattern.test(html)) throw new Error(`EXPANSION_MONEY_GUIDE_SOCIAL_MISSING:${route}:${label}`);
  }
  return true;
}

function addSocialMetadata(html, { title, description, canonical, ogLocale }) {
  const tags = [];
  const add = (present, markup) => { if (!present.test(html)) tags.push(markup); };
  add(/<meta\s+property=["']og:title["']/i, `<meta property="og:title" content="${escapeAttr(title)}">`);
  add(/<meta\s+property=["']og:description["']/i, `<meta property="og:description" content="${escapeAttr(description)}">`);
  add(/<meta\s+property=["']og:type["']/i, '<meta property="og:type" content="article">');
  add(/<meta\s+property=["']og:url["']/i, `<meta property="og:url" content="${escapeAttr(canonical)}">`);
  add(/<meta\s+property=["']og:site_name["']/i, '<meta property="og:site_name" content="MyPowerSetup">');
  add(/<meta\s+property=["']og:locale["']/i, `<meta property="og:locale" content="${escapeAttr(ogLocale)}">`);
  add(/<meta\s+property=["']og:image["']/i, `<meta property="og:image" content="${SITE_URL}/social-card.png">`);
  add(/<meta\s+property=["']og:image:width["']/i, '<meta property="og:image:width" content="1200">');
  add(/<meta\s+property=["']og:image:height["']/i, '<meta property="og:image:height" content="630">');
  add(/<meta\s+property=["']og:image:alt["']/i, `<meta property="og:image:alt" content="${escapeAttr(title)}">`);
  add(/<meta\s+name=["']twitter:card["']/i, '<meta name="twitter:card" content="summary_large_image">');
  add(/<meta\s+name=["']twitter:title["']/i, `<meta name="twitter:title" content="${escapeAttr(title)}">`);
  add(/<meta\s+name=["']twitter:description["']/i, `<meta name="twitter:description" content="${escapeAttr(description)}">`);
  add(/<meta\s+name=["']twitter:image["']/i, `<meta name="twitter:image" content="${SITE_URL}/social-card.png">`);
  if (!tags.length) return html;
  const block = `${SOCIAL_START}\n${tags.join("\n")}\n${SOCIAL_END}\n`;
  return html.replace("</head>", `${block}</head>`);
}

function extractFaq(html) {
  for (const match of String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const json = JSON.parse(match[1]);
      const nodes = Array.isArray(json?.["@graph"]) ? json["@graph"] : [json];
      const faq = nodes.find((node) => node?.["@type"] === "FAQPage");
      if (!faq) continue;
      return (faq.mainEntity || []).map((item) => ({
        question: String(item?.name || "").trim(),
        answer: String(item?.acceptedAnswer?.text || "").trim(),
      })).filter((item) => item.question && item.answer);
    } catch {}
  }
  return [];
}

function renderFaq(items, heading) {
  return `<section class="related" data-guide-faq><h2>${escapeHtml(heading)}</h2>${items.map((item) => `<h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p>`).join("")}</section>`;
}

function bodyText(html) {
  const body = String(html).replace(/<head[\s\S]*?<\/head>/i, " ");
  return normalizeText(body.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function normalizeText(value) {
  return decodeHtmlText(String(value)).replace(/\s+/g, " ").trim();
}

function marketFromRoute(route) {
  if (route.startsWith("/pt/")) return "pt";
  if (route.startsWith("/ro/")) return "ro";
  if (route.startsWith("/si/")) return "si";
  return null;
}

function matchAttributeOrText(html, pattern, group) {
  return String(html).match(pattern)?.[group] || "";
}

function decodeHtmlText(value) {
  return String(value)
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/gi, "'").replace(/&nbsp;/gi, " ");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}

export const EXPANSION_MONEY_SOCIAL_START = SOCIAL_START;
export const EXPANSION_MONEY_SOCIAL_END = SOCIAL_END;
