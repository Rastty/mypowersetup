const SITE_URL = "https://mypowersetup.com/";
const SOCIAL_IMAGE = `${SITE_URL}social-card.png`;

function escapeAttribute(value) {
  return String(value).replace(/[&<>\"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[char]);
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildMarketHomeSearchSurface(seed) {
  if (!seed?.route || !seed?.locale || !seed?.copy?.title || !seed?.copy?.description) {
    throw new Error("SEARCH_SURFACE_MARKET_METADATA_REQUIRED");
  }

  const canonical = new URL(seed.route, SITE_URL).toString();
  const calculatorUrl = `${canonical}#calculator-preview`;
  const title = seed.copy.title;
  const description = seed.copy.description;
  const imageAlt = seed.copy.heading || title;
  const ogLocale = seed.locale.replace("-", "_");

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}#website`,
        url: SITE_URL,
        name: "MyPowerSetup",
        inLanguage: seed.locale,
        publisher: { "@id": `${SITE_URL}#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${canonical}#calculator`,
        name: title,
        url: calculatorUrl,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        inLanguage: seed.locale,
        description,
        publisher: { "@id": `${SITE_URL}#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#organization`,
        name: "MyPowerSetup",
        url: SITE_URL,
      },
    ],
  };

  return [
    '<meta name="theme-color" content="#10261f">',
    `<meta property="og:title" content="${escapeAttribute(title)}">`,
    `<meta property="og:description" content="${escapeAttribute(description)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:url" content="${escapeAttribute(canonical)}">`,
    '<meta property="og:site_name" content="MyPowerSetup">',
    `<meta property="og:locale" content="${escapeAttribute(ogLocale)}">`,
    `<meta property="og:image" content="${escapeAttribute(SOCIAL_IMAGE)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${escapeAttribute(imageAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<script type="application/ld+json">${safeJson(structuredData)}</script>`,
  ].join("\n  ");
}
