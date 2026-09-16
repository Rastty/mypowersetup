const MARKET_CODES = Object.freeze({
  "pt-PT": "pt",
  "ro-RO": "ro",
  "sl-SI": "si",
});

export function normalizeAmpulMarketVerification(verification, candidateId, markets = []) {
  return Object.freeze((markets || [])
    .map((market) => normalizeMarketRecord(verification, candidateId, market))
    .filter(Boolean));
}

export function verifiedAmpulCandidateMarkets(verification, candidateId, markets = []) {
  return Object.freeze(normalizeAmpulMarketVerification(verification, candidateId, markets)
    .filter(({ verified }) => verified)
    .map(({ market }) => market));
}

export function unverifiedAmpulCandidateMarkets(verification, candidateId, markets = []) {
  return Object.freeze(normalizeAmpulMarketVerification(verification, candidateId, markets)
    .filter(({ verified }) => !verified)
    .map(({ market }) => market));
}

function normalizeMarketRecord(verification, candidateId, market) {
  const marketCode = MARKET_CODES[market];
  if (!marketCode) return null;

  const record = verification?.products?.[candidateId]?.markets?.[marketCode] || null;
  const evidenceUrl = validHttpsUrl(record?.evidenceUrl) ? record.evidenceUrl : null;
  const verifiedAt = /^\d{4}-\d{2}-\d{2}$/.test(record?.verifiedAt || "") ? record.verifiedAt : null;
  const verified = record?.verified === true && Boolean(evidenceUrl && verifiedAt);

  return Object.freeze({
    market,
    marketCode,
    verified,
    evidenceUrl: verified ? evidenceUrl : null,
    verifiedAt: verified ? verifiedAt : null,
    state: verified ? "verified" : record?.verified === true ? "invalid_evidence" : "unverified",
  });
}

function validHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}
