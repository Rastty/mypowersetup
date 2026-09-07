const SITE_URL = "https://mypowersetup.com";

const MARKETS = Object.freeze([
  Object.freeze({ key: "cs", prefix: "/", locale: "cs-CZ", home: "/", guideHub: "/pruvodce/" }),
  Object.freeze({ key: "sk", prefix: "/sk/", locale: "sk-SK", home: "/sk/", guideHub: "/sk/sprievodca/" }),
  Object.freeze({ key: "pl", prefix: "/pl/", locale: "pl-PL", home: "/pl/", guideHub: "/pl/poradnik/" }),
  Object.freeze({ key: "hu", prefix: "/hu/", locale: "hu-HU", home: "/hu/", guideHub: "/hu/utmutatok/" }),
  Object.freeze({ key: "pt", prefix: "/pt/", locale: "pt-PT", home: "/pt/", guideHub: "/pt/guias/" }),
  Object.freeze({ key: "ro", prefix: "/ro/", locale: "ro-RO", home: "/ro/", guideHub: "/ro/ghiduri/" }),
  Object.freeze({ key: "si", prefix: "/si/", locale: "sl-SI", home: "/si/", guideHub: "/si/vodici/" }),
]);

function marketForRoute(route) {
  if (route === "/" || route.startsWith("/pruvodce/") || ["/o-projektu/", "/metodika/", "/affiliate/", "/soukromi/"].includes(route)) return MARKETS[0];
  return MARKETS.slice(1).find(({ prefix }) => route.startsWith(prefix)) || null;
}

function schemaTypes(node) {
  const types = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    const type = value["@type"];
    if (Array.isArray(type)) types.push(...type);
    else if (typeof type === "string") types.push(type);
    if (Array.isArray(value["@graph"])) value["@graph"].forEach(visit);
  };
  visit(node);
  return types;
}

function schemaNodes(schemas) {
  return schemas.flatMap((schema) => Array.isArray(schema?.["@graph"]) ? schema["@graph"] : [schema]);
}

function breadcrumbNodeIsValid(node, market, route) {
  const items = Array.isArray(node?.itemListElement) ? node.itemListElement : [];
  const expected = [
    { position: 1, item: `${SITE_URL}${market.home}` },
    { position: 2, item: `${SITE_URL}${market.guideHub}` },
    { position: 3, item: `${SITE_URL}${route}` },
  ];
  if (items.length !== expected.length) return false;
  return expected.every((entry, index) => {
    const item = items[index];
    return item?.["@type"] === "ListItem"
      && item.position === entry.position
      && typeof item.name === "string"
      && item.name.trim().length > 0
      && item.item === entry.item;
  });
}

function visibleBreadcrumbIsValid(html, market) {
  const nav = html.match(/<nav\b[^>]*data-expansion-breadcrumbs[^>]*>[\s\S]*?<\/nav>/i)?.[0] || "";
  if (!nav) return false;
  return nav.includes(`href="${market.home}"`)
    && nav.includes(`href="${market.guideHub}"`)
    && /aria-current=["']page["']/i.test(nav);
}

function canonicalHrefs(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => ({
      rel: tag.match(/\brel=["']([^"']+)["']/i)?.[1] || "",
      href: tag.match(/\bhref=["']([^"']+)["']/i)?.[1] || "",
    }))
    .filter(({ rel }) => rel.split(/\s+/).some((value) => value.toLowerCase() === "canonical"))
    .map(({ href }) => href);
}

export function sitemapRoutes(xml) {
  if (typeof xml !== "string") throw new TypeError("PUBLIC_SEO_SITEMAP_REQUIRED");
  return Object.freeze([...xml.matchAll(/<loc>https:\/\/mypowersetup\.com([^<]*)<\/loc>/g)].map((match) => match[1] || "/"));
}

export function publicRoutePath(route) {
  if (route === "/") return "index.html";
  return `${route.slice(1)}index.html`;
}

export async function auditPublicSeo({ sitemapXml, readPage }) {
  if (typeof readPage !== "function") throw new TypeError("PUBLIC_SEO_READER_REQUIRED");
  const routes = sitemapRoutes(sitemapXml);
  const failures = [];
  const marketCounts = Object.fromEntries(MARKETS.map(({ key }) => [key, 0]));
  let jsonLdScripts = 0;
  let articlePages = 0;
  let breadcrumbPages = 0;

  for (const route of routes) {
    const market = marketForRoute(route);
    if (!market) {
      failures.push(`${route}:UNKNOWN_MARKET`);
      continue;
    }
    marketCounts[market.key] += 1;
    let html;
    try {
      html = await readPage(publicRoutePath(route), route);
    } catch {
      failures.push(`${route}:FILE_MISSING`);
      continue;
    }
    if (typeof html !== "string") {
      failures.push(`${route}:HTML_INVALID`);
      continue;
    }

    const expectedCanonical = `${SITE_URL}${route}`;
    const canonicals = canonicalHrefs(html);
    if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) failures.push(`${route}:CANONICAL_INVALID`);
    if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)
      || /<meta\b[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(html)) failures.push(`${route}:NOINDEX_PUBLIC`);

    const schemas = [];
    for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      jsonLdScripts += 1;
      try {
        schemas.push(JSON.parse(match[1]));
      } catch {
        failures.push(`${route}:JSON_LD_INVALID`);
      }
    }
    const types = schemas.flatMap(schemaTypes);
    if (route === market.home) {
      if (!types.includes("WebSite")) failures.push(`${route}:WEBSITE_SCHEMA_MISSING`);
      if (!types.includes("WebApplication")) failures.push(`${route}:WEBAPPLICATION_SCHEMA_MISSING`);
    }

    const isArticle = route.startsWith(market.guideHub) && route !== market.guideHub;
    if (isArticle) {
      articlePages += 1;
      const nodes = schemaNodes(schemas);
      const articles = nodes.filter((schema) => schema?.["@type"] === "Article");
      if (!articles.length) failures.push(`${route}:ARTICLE_SCHEMA_MISSING`);
      else {
        const declaredLanguages = articles.map(({ inLanguage }) => inLanguage).filter(Boolean);
        const acceptedLanguages = new Set([market.locale, market.locale.split("-")[0]]);
        if (declaredLanguages.length && !declaredLanguages.some((language) => acceptedLanguages.has(language))) failures.push(`${route}:ARTICLE_LANGUAGE_INVALID`);
        if (["pt", "ro", "si"].includes(market.key)) {
          breadcrumbPages += 1;
          const authoritative = articles.some((article) => {
            const author = article.author;
            const publisher = article.publisher;
            return Boolean(
              author && typeof author === "object" && author.name === "Petr Gálík" && typeof author.url === "string"
              && publisher && typeof publisher === "object" && publisher.name === "MyPowerSetup"
              && /^\d{4}-\d{2}-\d{2}$/.test(article.datePublished || "")
              && /^\d{4}-\d{2}-\d{2}$/.test(article.dateModified || "")
            );
          });
          if (!authoritative) failures.push(`${route}:ARTICLE_AUTHORITY_METADATA_MISSING`);

          const breadcrumbs = nodes.filter((node) => node?.["@type"] === "BreadcrumbList");
          if (breadcrumbs.length !== 1) failures.push(`${route}:BREADCRUMB_SCHEMA_MISSING`);
          else if (!breadcrumbNodeIsValid(breadcrumbs[0], market, route)) failures.push(`${route}:BREADCRUMB_SCHEMA_INVALID`);
          if (!visibleBreadcrumbIsValid(html, market)) failures.push(`${route}:BREADCRUMB_VISIBLE_MISSING`);
        }
      }
    }
  }

  return Object.freeze({
    ready: failures.length === 0,
    routeCount: routes.length,
    articlePages,
    breadcrumbPages,
    jsonLdScripts,
    marketCounts: Object.freeze(marketCounts),
    failures: Object.freeze([...new Set(failures)]),
  });
}

export { MARKETS as PUBLIC_SEO_MARKETS };
