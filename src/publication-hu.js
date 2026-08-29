import { HU_TRUST_ROUTES } from "./trust-pages-hu.js";
import { HU_GUIDE_ROUTES } from "./guides-hu.js";

const trustMeta = Object.freeze({
  about: { changefreq: "monthly", priority: "0.6" },
  methodology: { changefreq: "monthly", priority: "0.7" },
  affiliate: { changefreq: "yearly", priority: "0.4" },
  privacy: { changefreq: "yearly", priority: "0.4" },
});

export const HU_PUBLICATION_MANIFEST = Object.freeze([
  Object.freeze({ source: "home", key: "home", route: "/hu/", path: "hu/index.html", changefreq: "weekly", priority: "0.9" }),
  ...Object.entries(HU_TRUST_ROUTES).map(([key, route]) => Object.freeze({
    source: "trust",
    key,
    route,
    path: `${route.slice(1)}index.html`,
    ...trustMeta[key],
  })),
  ...Object.entries(HU_GUIDE_ROUTES).map(([key, route]) => Object.freeze({
    source: "guide",
    key,
    route,
    path: `${route.slice(1)}index.html`,
    changefreq: key === "hub" ? "weekly" : "monthly",
    priority: "0.9",
  })),
]);

const homeAlternates = Object.freeze([
  ["cs-CZ", "https://mypowersetup.com/"],
  ["sk-SK", "https://mypowersetup.com/sk/"],
  ["pl-PL", "https://mypowersetup.com/pl/"],
  ["hu-HU", "https://mypowersetup.com/hu/"],
  ["x-default", "https://mypowersetup.com/"],
]);

export function publicizeHungarianHtml(html, route, { home = false } = {}) {
  if (typeof html !== "string" || !html.includes("<head")) throw new Error("HU_PUBLICATION_HTML_INVALID");
  if (!route?.startsWith("/hu/")) throw new Error("HU_PUBLICATION_ROUTE_INVALID");

  let output = html.replace(/\s*<meta name="robots" content="noindex,nofollow,noarchive">\s*/g, "\n");
  const additions = [];
  const canonicalUrl = `https://mypowersetup.com${route}`;
  if (!/rel="canonical"/.test(output)) additions.push(`<link rel="canonical" href="${canonicalUrl}">`);

  if (home) {
    for (const [language, href] of homeAlternates) {
      if (!output.includes(`hreflang="${language}"`)) additions.push(`<link rel="alternate" hreflang="${language}" href="${href}">`);
    }
  }

  if (additions.length) output = output.replace("</head>", `  ${additions.join("\n  ")}\n</head>`);
  return output;
}

export function addHungarianHomeAlternate(html) {
  if (typeof html !== "string" || !html.includes("</head>")) throw new Error("HU_HREFLANG_HTML_INVALID");
  if (html.includes('hreflang="hu-HU"')) return html;
  const tag = '<link rel="alternate" hreflang="hu-HU" href="https://mypowersetup.com/hu/" />';
  const xDefault = /<link rel="alternate" hreflang="x-default"[^>]*>/;
  if (xDefault.test(html)) return html.replace(xDefault, `${tag}\n    $&`);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

export function addHungarianRoutesToSitemap(xml) {
  if (typeof xml !== "string" || !xml.includes("</urlset>")) throw new Error("HU_SITEMAP_INVALID");
  const additions = HU_PUBLICATION_MANIFEST
    .filter(({ route }) => !xml.includes(`<loc>https://mypowersetup.com${route}</loc>`))
    .map(({ route, changefreq, priority }) => `  <url><loc>https://mypowersetup.com${route}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`);
  if (!additions.length) return xml;
  return xml.replace("</urlset>", `${additions.join("\n")}\n</urlset>`);
}
