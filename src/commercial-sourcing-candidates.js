const CANDIDATES = Object.freeze([
  Object.freeze({
    id: "butler-victron-scc125060321",
    category: "controller",
    merchant: "butler_technik",
    affiliateNetwork: "awin",
    merchantId: "31291",
    productId: "SCC125060321",
    productName: "Victron SmartSolar MPPT 250/60-MC4",
    markets: Object.freeze(["sk-SK", "pl-PL", "hu-HU"]),
    specs: Object.freeze({ mppt: true, systemVoltagesV: Object.freeze([12, 24, 48]), currentA: 60, maxPvWattsAt12V: 860 }),
    status: "pending_affiliate_approval",
    blocker: "awin_program_approval",
  }),
  Object.freeze({
    id: "renogy-rover-60a-de",
    category: "controller",
    merchant: "renogy_de",
    affiliateNetwork: "awin",
    merchantId: "127459",
    productName: "Renogy Rover 60A MPPT",
    markets: Object.freeze(["sk-SK", "pl-PL", "hu-HU"]),
    specs: Object.freeze({ mppt: true, systemVoltagesV: Object.freeze([12]), currentA: 60 }),
    status: "blocked_stock",
    blocker: "exact_product_out_of_stock",
  }),
]);

export function listCommercialSourcingCandidates({ market, category } = {}) {
  return Object.freeze(CANDIDATES.filter((candidate) => {
    if (market && !candidate.markets.includes(market)) return false;
    if (category && candidate.category !== category) return false;
    return true;
  }));
}

export function bestCommercialSourcingCandidate({ market, category } = {}) {
  const rank = { pending_affiliate_approval: 0, ready_for_ingest: 1, blocked_stock: 2 };
  return listCommercialSourcingCandidates({ market, category })
    .slice()
    .sort((a, b) => (rank[a.status] ?? 99) - (rank[b.status] ?? 99))[0] || null;
}
