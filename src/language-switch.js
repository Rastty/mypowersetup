export const PUBLIC_LANGUAGE_MARKETS = [
  { code: "CZ", lang: "cs", hreflang: "cs-CZ", path: "/" },
  { code: "SK", lang: "sk", hreflang: "sk-SK", path: "/sk/" },
  { code: "PL", lang: "pl", hreflang: "pl-PL", path: "/pl/" },
  { code: "HU", lang: "hu", hreflang: "hu-HU", path: "/hu/" },
  { code: "PT", lang: "pt", hreflang: "pt-PT", path: "/pt/" },
  { code: "SI", lang: "sl", hreflang: "sl-SI", path: "/si/" },
  { code: "RO", lang: "ro", hreflang: "ro-RO", path: "/ro/" },
];

const HOMEPAGE_PATHS = new Set(PUBLIC_LANGUAGE_MARKETS.map((market) => market.path));

export function marketFromHomepagePath(pathname) {
  return PUBLIC_LANGUAGE_MARKETS.find((market) => market.path === pathname) || null;
}

export function isPublicMarketHomepage(pathname) {
  return HOMEPAGE_PATHS.has(pathname);
}

function ensureStyles(documentRef) {
  if (documentRef.querySelector("style[data-language-switch-style]")) return;
  const style = documentRef.createElement("style");
  style.dataset.languageSwitchStyle = "";
  style.textContent = `
    .language-select-wrap { display: inline-flex; align-items: center; margin-left: .15rem; }
    .language-select { min-width: 4.6rem; border: 1px solid rgba(255,255,255,.34); border-radius: 999px; background: transparent; color: inherit; padding: .46rem .65rem; font: inherit; font-weight: 700; line-height: 1.1; cursor: pointer; }
    .language-select option { color: #10261f; background: #fff; }
    @media (max-width: 760px) { .language-select { min-width: 4.2rem; padding: .42rem .55rem; } }
  `;
  documentRef.head.append(style);
}

export function enhanceHomepageLanguageSwitch({ documentRef = document, locationRef = window.location } = {}) {
  const pathname = locationRef.pathname;
  if (!isPublicMarketHomepage(pathname)) return false;

  const current = marketFromHomepagePath(pathname);
  const nav = documentRef.querySelector(".site-header .header-nav, .site-header .expansion-nav");
  if (!current || !nav) return false;

  nav.querySelectorAll("a.language-switch, [data-language-switcher]").forEach((node) => node.remove());
  ensureStyles(documentRef);

  const wrapper = documentRef.createElement("label");
  wrapper.className = "language-select-wrap";
  wrapper.dataset.languageSwitcher = "";

  const select = documentRef.createElement("select");
  select.className = "language-select";
  select.setAttribute("aria-label", "Language");

  for (const market of PUBLIC_LANGUAGE_MARKETS) {
    const option = documentRef.createElement("option");
    option.value = market.path;
    option.textContent = market.code;
    option.lang = market.lang;
    option.selected = market.code === current.code;
    select.append(option);
  }

  select.addEventListener("change", () => {
    const target = select.value;
    if (target && target !== pathname) locationRef.assign(target);
  });

  wrapper.append(select);
  nav.append(wrapper);
  return true;
}
