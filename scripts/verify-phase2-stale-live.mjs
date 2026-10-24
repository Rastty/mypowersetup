#!/usr/bin/env node
// Read-only production proof for the two existing CZ electrical calculators.
// A Pages deploy or HTML parity success alone cannot establish that the served
// JavaScript invalidates an old sizing result after electrical input changes.
const DEFAULT_ORIGIN = "https://mypowersetup.com";
export const ROUTES = Object.freeze([
  { path: "/kalkulacky/dc-dc-nabijecka/", intent: "dcdc-sizing" },
  { path: "/kalkulacky/jisteni-12v/", intent: "dc-protection" },
]);
export const VERSION = "20261024-stale1";
export const SCRIPT_PATH = "/src/phase2-calculator-browser.js";

function requireExactPage(response, origin, path) {
  if (!response.ok) throw new Error("PUBLIC_HTTP_" + response.status);
  const expected = new URL(path, origin);
  const actual = new URL(response.url);
  if (actual.origin !== expected.origin || actual.pathname !== expected.pathname || actual.search !== expected.search || actual.hash)
    throw new Error("PUBLIC_ROUTE_DRIFT");
}

export function checkHtml(html, { intent }) {
  if (!/<p\b[^>]*\bdata-calculator-stale(?:\s|>|=)/i.test(html))
    throw new Error("STALE_NOTICE_MISSING");
  if (!html.includes('data-calculator-intent="' + intent + '"'))
    throw new Error("CALCULATOR_INTENT_MISMATCH");
  if (!html.includes('data-calculator-result'))
    throw new Error("RESULT_PANEL_MISSING");
  const scriptTags = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  const expected = SCRIPT_PATH + "?v=" + VERSION;
  if (scriptTags.filter(src => src === expected).length !== 1)
    throw new Error("VERSIONED_CALCULATOR_SCRIPT_MISSING");
  return expected;
}

export function checkJavascript(source) {
  // This verifies the *served* browser code, not merely the Git commit.
  // Browser interaction is a separate proof layer; do not claim it here.
  const required = [
    /function\s+invalidateResult\s*\(/,
    /resultPanel\.hidden\s*=\s*true/,
    /staleNotice\.hidden\s*=\s*false/,
    /clearCalculatorResultContext\s*\(/,
    /form\.addEventListener\(\s*["']input["']\s*,\s*invalidateResult\s*\)/,
    /form\.addEventListener\(\s*["']change["']\s*,\s*invalidateResult\s*\)/,
    /form\.addEventListener\(\s*["']submit["']/,
  ];
  if (!required.every(pattern => pattern.test(source))) throw new Error("SERVED_JS_STALE_GUARD_MISSING");
  return true;
}

export async function verifyLive({ fetchImpl = fetch, origin = DEFAULT_ORIGIN } = {}) {
  const base = new URL(origin);
  if (base.protocol !== "https:" || base.pathname !== "/" || base.search || base.hash)
    throw new Error("INVALID_PRODUCTION_ORIGIN");
  const results = [];
  let servedJs = null;
  for (const route of ROUTES) {
    const response = await fetchImpl(new URL(route.path, base), {
      redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(20000),
      headers: { accept: "text/html", "user-agent": "MyPowerSetup-phase2-live-proof/1.0" },
    });
    requireExactPage(response, base, route.path);
    if (!response.headers.get("content-type")?.includes("text/html"))
      throw new Error("PUBLIC_NON_HTML");
    const html = await response.text();
    const script = checkHtml(html, route);
    if (servedJs === null) {
      const jsResponse = await fetchImpl(new URL(script, base), {
        redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(20000),
        headers: { accept: "text/javascript,application/javascript,*/*", "user-agent": "MyPowerSetup-phase2-live-proof/1.0" },
      });
      requireExactPage(jsResponse, base, script);
      servedJs = await jsResponse.text();
      checkJavascript(servedJs);
    }
    results.push({ path: route.path, intent: route.intent, http: response.status, version: VERSION, htmlMarker: true, servedJsGuard: true });
  }
  return { status: "PUBLIC_HTML_AND_SERVED_JS_VERIFIED", origin: base.origin, routes: results,
    browserInteractionVerified: false, affiliateOrRevenueEffectVerified: false, productionActions: 0 };
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  try {
    console.log("PHASE2_STALE_PUBLIC_READBACK " + JSON.stringify(await verifyLive()));
  } catch (error) {
    console.error("PHASE2_STALE_PUBLIC_READBACK " + JSON.stringify({
      status: "NOT_VERIFIED", reason: String(error?.message || error).slice(0, 120), productionActions: 0,
    }));
    process.exitCode = 1;
  }
}
