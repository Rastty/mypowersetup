// One strict interpretation of the same GSC URL-inspection evidence across
// live API responses, CSV/TSV imports and prioritization. Unknown statuses
// remain unknown: missing evidence is not evidence of indexation failure.
function normalizedStatus(value) {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function classifyGscIndexingStatus(value) {
  if (typeof value === "boolean") return value;
  const status = normalizedStatus(value);
  if (!status) return null;

  // These specific indexed states include caveats, not negative verdicts.
  // "Indexed, though blocked by robots.txt" is still an indexed URL.
  if (/^(?:indexed though blocked by robots txt|page is indexed|url is on google|url je na googlu)(?:\b|$)/.test(status)) return true;

  if (/^(?:true|yes|indexed|indexovano|pass)$/.test(status)
    || /^submitted and indexed(?:\b|$)/.test(status)
    || /^indexed not submitted in sitemap(?:\b|$)/.test(status)) return true;

  if (/^(?:false|no|not indexed|neindexovano|fail)$/.test(status)
    || /\bnot indexed\b/.test(status)
    || /\bnot on google\b/.test(status)
    || /\bunknown to google\b/.test(status)
    || /\bneni na googlu\b/.test(status)
    || /\bvylouceno\b/.test(status)
    || /\bexcluded\b/.test(status)
    || /\bnoindex\b/.test(status)
    || /^(?:duplicate|alternate page|page with redirect|redirect error|soft 404|not found 404|server error 5xx|blocked by robots txt|blocked by access forbidden 403|blocked due to other 4xx)/.test(status)) return false;

  // E.g. NEUTRAL, PARTIAL, UNKNOWN and arbitrary site annotations.
  return null;
}
