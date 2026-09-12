import { classifyPublicGuideRoute } from "./public-conversion-funnel.js";

const STORAGE_KEY = "mypowersetup_guide_attribution";
const MAX_AGE_MS = 30 * 60 * 1000;

function normalizeMarket(market) {
  const value = String(market || "").toLowerCase();
  if (value === "cz") return "cs";
  return value;
}

function normalizeStoredAttribution(value, now = Date.now()) {
  if (!value || typeof value !== "object") return null;
  const recordedAt = Number(value.recordedAt);
  if (!Number.isFinite(recordedAt) || recordedAt > now || now - recordedAt > MAX_AGE_MS) return null;
  const hit = classifyPublicGuideRoute(value.sourcePath);
  if (!hit) return null;
  return Object.freeze({
    guide_source_path: hit.route,
    guide_source_topic: hit.topic,
    guide_source_market: hit.market,
  });
}

export function rememberGuideAttribution({ sourcePath, storage = null, now = Date.now() } = {}) {
  const hit = classifyPublicGuideRoute(sourcePath);
  if (!hit) return null;
  const attribution = Object.freeze({
    guide_source_path: hit.route,
    guide_source_topic: hit.topic,
    guide_source_market: hit.market,
  });
  try {
    storage?.setItem?.(STORAGE_KEY, JSON.stringify({ sourcePath: hit.route, recordedAt: now }));
  } catch {}
  return attribution;
}

export function resolveGuideAttribution({ storage = null, market, now = Date.now() } = {}) {
  let raw;
  try { raw = storage?.getItem?.(STORAGE_KEY); } catch { return null; }
  if (!raw) return null;

  let parsed;
  try { parsed = JSON.parse(raw); } catch {
    try { storage?.removeItem?.(STORAGE_KEY); } catch {}
    return null;
  }

  const attribution = normalizeStoredAttribution(parsed, now);
  if (!attribution) {
    try { storage?.removeItem?.(STORAGE_KEY); } catch {}
    return null;
  }
  if (market && attribution.guide_source_market !== normalizeMarket(market)) return null;
  return attribution;
}

export function clearGuideAttribution(storage = null) {
  try { storage?.removeItem?.(STORAGE_KEY); return true; } catch { return false; }
}

export const GUIDE_ATTRIBUTION_MAX_AGE_MS = MAX_AGE_MS;
