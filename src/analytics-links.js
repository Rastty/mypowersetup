export function classifyGuideCalculatorLink(href, { origin = "https://mypowersetup.com" } = {}) {
  let url;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }

  const expectedOrigin = new URL(origin).origin;
  if (url.origin !== expectedOrigin || url.hash !== "#kalkulator") return null;
  if (!isCalculatorPath(url.pathname)) return null;

  return Object.freeze({ destination_path: url.pathname });
}

export function classifyGuideClickZone({ inPrimaryCta = false, inRelated = false, inHeader = false } = {}) {
  if (inPrimaryCta) return "primary_cta";
  if (inRelated) return "related";
  if (inHeader) return "header";
  return "inline";
}

function isCalculatorPath(pathname) {
  return pathname === "/" || /^\/[a-z]{2}\/$/i.test(pathname);
}
