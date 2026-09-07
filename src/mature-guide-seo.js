const SITE_URL = "https://mypowersetup.com";

const CONFIG = Object.freeze({
  cs: Object.freeze({ locale: "cs-CZ", home: "/", hub: "/pruvodce/", about: "/o-projektu/", homeLabel: "Domů", hubLabel: "Průvodce", aria: "Drobečková navigace", route: /^\/pruvodce\/.+\/$/ }),
  sk: Object.freeze({ locale: "sk-SK", home: "/sk/", hub: "/sk/sprievodca/", about: "/sk/o-projekte/", homeLabel: "Domov", hubLabel: "Sprievodca", aria: "Drobečková navigácia", route: /^\/sk\/sprievodca\/.+\/$/ }),
  pl: Object.freeze({ locale: "pl-PL", home: "/pl/", hub: "/pl/poradnik/", about: "/pl/o-projekcie/", homeLabel: "Start", hubLabel: "Poradnik", aria: "Nawigacja okruszkowa", route: /^\/pl\/poradnik\/.+\/$/ }),
  hu: Object.freeze({ locale: "hu-HU", home: "/hu/", hub: "/hu/utmutatok/", about: "/hu/a-projektrol/", homeLabel: "Kezdőlap", hubLabel: "Útmutatók", aria: "Morzsamenü", route: /^\/hu\/utmutatok\/.+\/$/ }),
});

export function matureGuideMarket(route) {
  return Object.entries(CONFIG).find(([, config]) => config.route.test(route))?.[0] || null;
}

export function matureGuideRoutesFromSitemap(xml) {
  if (typeof xml !== "string") throw new TypeError("MATURE_GUIDE_SITEMAP_REQUIRED");
  return Object.freeze([...xml.matchAll(/<loc>https:\/\/mypowersetup\.com([^<]*)<\/loc>/g)]
    .map((match) => match[1] || "/")
    .filter((route) => matureGuideMarket(route)));
}

export function matureGuidePublicPath(route) {
  if (!matureGuideMarket(route)) throw new Error(`MATURE_GUIDE_ROUTE_INVALID:${route}`);
  return `${route.slice(1)}index.html`;
}

export function enhanceMatureGuideSeo(html, route, { datePublished, dateModified } = {}) {
  const market = matureGuideMarket(route);
  const config = CONFIG[market];
  if (!config) throw new Error(`MATURE_GUIDE_ROUTE_INVALID:${route}`);
  if (typeof html !== "string" || !html.includes("<head") || !html.includes("</head>")) throw new Error("MATURE_GUIDE_HTML_INVALID");

  const headingHtml = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  const currentName = decodeHtmlText(headingHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  if (!currentName) throw new Error(`MATURE_GUIDE_H1_MISSING:${route}`);

  let articleFound = false;
  let output = html.replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi, (full, open, body, close) => {
    let json;
    try {
      json = JSON.parse(body);
    } catch {
      return full;
    }
    const nodes = Array.isArray(json?.["@graph"]) ? json["@graph"] : [json];
    const articles = nodes.filter((node) => node?.["@type"] === "Article");
    if (!articles.length) return full;
    articleFound = true;
    for (const article of articles) {
      article.inLanguage = config.locale;
      article.datePublished = validDate(article.datePublished) || requiredDate(datePublished, "PUBLISHED", route);
      article.dateModified = latestDate(validDate(article.dateModified), requiredDate(dateModified, "MODIFIED", route));
      const existingAuthor = article.author && typeof article.author === "object" && !Array.isArray(article.author) ? article.author : {};
      article.author = { "@type": "Person", ...existingAuthor, name: "Petr Gálík", url: existingAuthor.url || `${SITE_URL}${config.about}` };
      const existingPublisher = article.publisher && typeof article.publisher === "object" && !Array.isArray(article.publisher) ? article.publisher : {};
      article.publisher = { "@type": "Organization", ...existingPublisher, name: "MyPowerSetup", url: existingPublisher.url || `${SITE_URL}/` };
      article.mainEntityOfPage ||= `${SITE_URL}${route}`;
    }
    return `${open}${JSON.stringify(json).replace(/</g, "\\u003c")}${close}`;
  });
  if (!articleFound) throw new Error(`MATURE_GUIDE_ARTICLE_SCHEMA_MISSING:${route}`);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: config.homeLabel, item: `${SITE_URL}${config.home}` },
      { "@type": "ListItem", position: 2, name: config.hubLabel, item: `${SITE_URL}${config.hub}` },
      { "@type": "ListItem", position: 3, name: currentName, item: `${SITE_URL}${route}` },
    ],
  };

  output = output.replace(/\s*<script\b[^>]*data-mature-breadcrumb-schema[^>]*>[\s\S]*?<\/script>\s*/gi, "");
  if (!/"@type"\s*:\s*"BreadcrumbList"/.test(output)) {
    output = output.replace("</head>", `<script type="application/ld+json" data-mature-breadcrumb-schema>${JSON.stringify(breadcrumb).replace(/</g, "\\u003c")}</script></head>`);
  }

  const visible = `<nav class="crumbs" data-mature-breadcrumbs aria-label="${escapeHtml(config.aria)}"><a href="${config.home}">${escapeHtml(config.homeLabel)}</a><span aria-hidden="true"> › </span><a href="${config.hub}">${escapeHtml(config.hubLabel)}</a><span aria-hidden="true"> › </span><span aria-current="page">${escapeHtml(currentName)}</span></nav>`;
  const matureNav = /<nav\b[^>]*data-mature-breadcrumbs[^>]*>[\s\S]*?<\/nav>/i;
  const legacyCrumbs = /<div\b[^>]*class=["'][^"']*\bcrumbs\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i;
  if (matureNav.test(output)) output = output.replace(matureNav, visible);
  else if (legacyCrumbs.test(output)) output = output.replace(legacyCrumbs, visible);
  else throw new Error(`MATURE_GUIDE_VISIBLE_CRUMBS_MISSING:${route}`);

  return output;
}

export function articleModifiedDate(html) {
  for (const match of String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const json = JSON.parse(match[1]);
      const nodes = Array.isArray(json?.["@graph"]) ? json["@graph"] : [json];
      const article = nodes.find((node) => node?.["@type"] === "Article");
      if (article && validDate(article.dateModified)) return article.dateModified;
    } catch {}
  }
  return null;
}

export function setSitemapLastmod(xml, route, date) {
  const normalized = requiredDate(date, "SITEMAP", route);
  const escaped = escapeRegExp(route);
  const pattern = new RegExp(`(<url>\\s*<loc>https:\\/\\/mypowersetup\\.com${escaped}<\\/loc>)([\\s\\S]*?)(<\\/url>)`);
  if (!pattern.test(xml)) throw new Error(`MATURE_GUIDE_SITEMAP_ROUTE_MISSING:${route}`);
  return xml.replace(pattern, (_full, open, middle, close) => {
    const next = /<lastmod>[^<]+<\/lastmod>/.test(middle)
      ? middle.replace(/<lastmod>[^<]+<\/lastmod>/, `<lastmod>${normalized}</lastmod>`)
      : `<lastmod>${normalized}</lastmod>${middle}`;
    return `${open}${next}${close}`;
  });
}

function requiredDate(value, kind, route) {
  const date = validDate(value);
  if (!date) throw new Error(`MATURE_GUIDE_DATE_${kind}_MISSING:${route}`);
  return date;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : null;
}

function latestDate(left, right) {
  if (!left) return right;
  return left >= right ? left : right;
}

function decodeHtmlText(value) {
  return String(value)
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/gi, "'").replace(/&nbsp;/gi, " ");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}
