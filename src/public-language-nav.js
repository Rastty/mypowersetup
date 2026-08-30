export const PUBLIC_HOME_MARKETS = Object.freeze([
  Object.freeze({ key: "cs", label: "CZ", path: "/", hreflang: "cs-CZ", lang: "cs", name: "Čeština" }),
  Object.freeze({ key: "sk", label: "SK", path: "/sk/", hreflang: "sk-SK", lang: "sk", name: "Slovenčina" }),
  Object.freeze({ key: "pl", label: "PL", path: "/pl/", hreflang: "pl-PL", lang: "pl", name: "Polski" }),
  Object.freeze({ key: "hu", label: "HU", path: "/hu/", hreflang: "hu-HU", lang: "hu", name: "Magyar" }),
  Object.freeze({ key: "pt", label: "PT", path: "/pt/", hreflang: "pt-PT", lang: "pt", name: "Português" }),
  Object.freeze({ key: "si", label: "SI", path: "/si/", hreflang: "sl-SI", lang: "sl", name: "Slovenščina" }),
  Object.freeze({ key: "ro", label: "RO", path: "/ro/", hreflang: "ro-RO", lang: "ro", name: "Română" }),
]);

const NAV_PATTERN = /<nav\b([^>]*class="[^"]*(?:header-nav|expansion-nav)[^"]*"[^>]*)>([\s\S]*?)<\/nav>/i;
const LANGUAGE_LINK_PATTERN = /\s*<a\b[^>]*class="[^"]*\blanguage-switch\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi;

export function syncPublicHomepageLanguageNav(html, currentMarket) {
  if (typeof html !== "string") throw new TypeError("PUBLIC_LANGUAGE_NAV_HTML_REQUIRED");
  if (!PUBLIC_HOME_MARKETS.some(({ key }) => key === currentMarket)) throw new Error(`PUBLIC_LANGUAGE_NAV_MARKET_UNKNOWN:${currentMarket}`);
  const match = html.match(NAV_PATTERN);
  if (!match) throw new Error(`PUBLIC_LANGUAGE_NAV_CONTAINER_MISSING:${currentMarket}`);

  const originalInner = match[2];
  const cleanedInner = originalInner.replace(LANGUAGE_LINK_PATTERN, "").trimEnd();
  const multiline = originalInner.includes("\n");
  const separator = multiline ? "\n      " : "";
  const closingIndent = multiline ? "\n    " : "";
  const links = PUBLIC_HOME_MARKETS.map((market) => languageLink(market, currentMarket)).join(separator);
  const spacer = cleanedInner && !/\s$/.test(cleanedInner) && !multiline ? "" : "";
  const inner = `${cleanedInner}${cleanedInner ? separator : ""}${spacer}${links}${closingIndent}`;
  const replacement = `<nav${match[1]}>${inner}</nav>`;
  return html.replace(match[0], replacement);
}

export function missingStaticHomepageLanguageLinks(html) {
  if (typeof html !== "string") return PUBLIC_HOME_MARKETS.map(({ key }) => key);
  const match = html.match(NAV_PATTERN);
  if (!match) return PUBLIC_HOME_MARKETS.map(({ key }) => key);
  const nav = match[0];
  return PUBLIC_HOME_MARKETS.filter(({ path, hreflang }) => !nav.includes(`href="${path}"`) || !nav.includes(`hreflang="${hreflang}"`)).map(({ key }) => key);
}

function languageLink(market, currentMarket) {
  const current = market.key === currentMarket ? ' aria-current="page"' : "";
  return `<a class="header-link language-switch" href="${market.path}" hreflang="${market.hreflang}" lang="${market.lang}" aria-label="${market.name}"${current}>${market.label}</a>`;
}
