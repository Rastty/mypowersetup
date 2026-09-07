const SITE_ORIGIN = "https://mypowersetup.com";

export function extractInternalAnchorRoutes(html, sourceRoute = "/") {
  if (typeof html !== "string") return Object.freeze([]);
  const routes = new Set();

  for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1].trim();
    if (!href || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(href)) continue;

    let url;
    try {
      url = new URL(href, `${SITE_ORIGIN}${sourceRoute}`);
    } catch {
      continue;
    }
    if (url.origin !== SITE_ORIGIN) continue;
    const route = normalizeRoute(url.pathname);
    routes.add(route);
  }
  return Object.freeze([...routes]);
}

export async function auditPublicInternalLinks({ routes, readPage }) {
  if (!Array.isArray(routes) || typeof readPage !== "function") {
    throw new TypeError("PUBLIC_LINK_GRAPH_INPUT_INVALID");
  }

  const publicRoutes = new Set(routes.map(normalizeRoute));
  const inbound = new Map([...publicRoutes].map((route) => [route, new Set()]));
  const outbound = new Map([...publicRoutes].map((route) => [route, new Set()]));
  const unreadable = [];

  for (const source of publicRoutes) {
    let html;
    try {
      html = await readPage(source);
    } catch {
      unreadable.push(source);
      continue;
    }
    for (const target of extractInternalAnchorRoutes(html, source)) {
      if (!publicRoutes.has(target) || target === source) continue;
      inbound.get(target).add(source);
      outbound.get(source).add(target);
    }
  }

  const homeRoutes = new Set(["/", "/sk/", "/pl/", "/hu/", "/pt/", "/ro/", "/si/"]);
  const orphanRoutes = [...publicRoutes]
    .filter((route) => !homeRoutes.has(route) && (inbound.get(route)?.size || 0) === 0)
    .sort();

  const inboundCounts = Object.fromEntries(
    [...inbound.entries()].map(([route, sources]) => [route, sources.size])
  );

  const crawlDepths = shortestCrawlDepths(outbound, "/");
  const unreachableRoutes = [...publicRoutes]
    .filter((route) => route !== "/" && !crawlDepths.has(route))
    .sort();
  const deepRoutes = [...crawlDepths.entries()]
    .filter(([route, depth]) => route !== "/" && depth > 3)
    .map(([route, depth]) => Object.freeze({ route, depth }))
    .sort((a, b) => b.depth - a.depth || a.route.localeCompare(b.route));
  const maxCrawlDepth = Math.max(0, ...crawlDepths.values());

  return Object.freeze({
    safe: orphanRoutes.length === 0 && unreadable.length === 0 && unreachableRoutes.length === 0 && deepRoutes.length === 0,
    routeCount: publicRoutes.size,
    orphanRoutes: Object.freeze(orphanRoutes),
    unreachableRoutes: Object.freeze(unreachableRoutes),
    deepRoutes: Object.freeze(deepRoutes),
    maxCrawlDepth,
    crawlDepths: Object.freeze(Object.fromEntries([...crawlDepths.entries()].sort(([a], [b]) => a.localeCompare(b)))),
    unreadable: Object.freeze(unreadable.sort()),
    inboundCounts: Object.freeze(inboundCounts),
  });
}

function shortestCrawlDepths(outbound, startRoute) {
  const depths = new Map();
  if (!outbound.has(startRoute)) return depths;

  depths.set(startRoute, 0);
  const queue = [startRoute];
  for (let index = 0; index < queue.length; index += 1) {
    const source = queue[index];
    const nextDepth = depths.get(source) + 1;
    for (const target of outbound.get(source) || []) {
      if (depths.has(target)) continue;
      depths.set(target, nextDepth);
      queue.push(target);
    }
  }
  return depths;
}

function normalizeRoute(pathname) {
  if (!pathname || pathname === "/") return "/";
  const clean = pathname.replace(/\/{2,}/g, "/");
  return clean.endsWith("/") ? clean : `${clean}/`;
}
