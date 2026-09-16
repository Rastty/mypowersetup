function clean(value) {
  return String(value ?? "").trim();
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function pagePath(value) {
  const text = clean(value);
  if (!text) return "";
  try {
    const url = new URL(text, "https://mypowersetup.com");
    return url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  } catch {
    return "";
  }
}

function gscPage(row) {
  if (row?.page || row?.url || row?.landingPage) return pagePath(row.page || row.url || row.landingPage);
  if (Array.isArray(row?.keys) && row.keys[0]) return pagePath(row.keys[0]);
  return "";
}

function gscQuery(row) {
  if (row?.query) return clean(row.query);
  if (Array.isArray(row?.keys) && row.keys[1]) return clean(row.keys[1]);
  return "";
}

function normalizeIndexed(value) {
  if (typeof value === "boolean") return value;
  const text = clean(value).toLowerCase();
  if (!text) return null;
  if (text === "indexed" || text.includes("submitted and indexed") || text.includes("url is on google")) return true;
  if (text === "not indexed" || text.includes("not on google") || text.includes("excluded")) return false;
  return null;
}

export function aggregateGscCalculatorRows(rows = []) {
  const pages = new Map();
  for (const row of rows) {
    const path = gscPage(row);
    if (!path) continue;
    const clicks = finite(row?.clicks);
    const impressions = finite(row?.impressions);
    const position = finite(row?.position, 0);
    const query = gscQuery(row);
    if (!pages.has(path)) pages.set(path, { path, clicks: 0, impressions: 0, weightedPosition: 0, positionWeight: 0, queries: new Map() });
    const page = pages.get(path);
    page.clicks += clicks;
    page.impressions += impressions;
    if (position > 0) {
      const weight = impressions || 1;
      page.weightedPosition += position * weight;
      page.positionWeight += weight;
    }
    if (query) {
      const current = page.queries.get(query) || { query, clicks: 0, impressions: 0, weightedPosition: 0, positionWeight: 0 };
      current.clicks += clicks;
      current.impressions += impressions;
      if (position > 0) {
        const weight = impressions || 1;
        current.weightedPosition += position * weight;
        current.positionWeight += weight;
      }
      page.queries.set(query, current);
    }
  }

  return [...pages.values()].map((page) => {
    const queries = [...page.queries.values()]
      .map((query) => ({
        query: query.query,
        clicks: query.clicks,
        impressions: query.impressions,
        ctr: ratio(query.clicks, query.impressions),
        position: query.positionWeight ? query.weightedPosition / query.positionWeight : 0,
      }))
      .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks || a.query.localeCompare(b.query));
    return Object.freeze({
      path: page.path,
      clicks: page.clicks,
      impressions: page.impressions,
      ctr: ratio(page.clicks, page.impressions),
      position: page.positionWeight ? page.weightedPosition / page.positionWeight : 0,
      topQuery: queries[0] || null,
      queries,
    });
  }).sort((a, b) => b.impressions - a.impressions || a.path.localeCompare(b.path));
}

export function buildCalculatorGrowthPriorities({ gscRows = [], funnelRows = [], indexingRows = [] } = {}) {
  const gsc = new Map(aggregateGscCalculatorRows(gscRows).map((row) => [row.path, row]));
  const funnel = new Map((Array.isArray(funnelRows) ? funnelRows : []).map((row) => [pagePath(row?.path), row]));
  const indexing = new Map();
  for (const row of Array.isArray(indexingRows) ? indexingRows : []) {
    const path = pagePath(row?.page || row?.url || row?.path);
    const indexed = normalizeIndexed(row?.indexed ?? row?.coverageState ?? row?.verdict ?? row?.status);
    if (path && indexed !== null) indexing.set(path, indexed);
  }

  const paths = new Set([...gsc.keys(), ...funnel.keys(), ...indexing.keys()].filter(Boolean));
  const rows = [...paths].map((path) => {
    const search = gsc.get(path) || { path, clicks: 0, impressions: 0, ctr: 0, position: 0, topQuery: null, queries: [] };
    const flow = funnel.get(path) || {};
    const views = finite(flow.views);
    const starts = finite(flow.starts);
    const completes = finite(flow.completes);
    const continues = finite(flow.continues);
    const productImpressions = finite(flow.impressions);
    const affiliateClicks = finite(flow.clicks);
    const evidence = {
      path,
      locale: clean(flow.locale).toLowerCase(),
      intent: clean(flow.intent),
      indexed: indexing.has(path) ? indexing.get(path) : null,
      searchClicks: search.clicks,
      searchImpressions: search.impressions,
      searchCtr: search.ctr,
      averagePosition: search.position,
      topQuery: search.topQuery,
      views,
      starts,
      completes,
      continues,
      productImpressions,
      affiliateClicks,
      startRate: ratio(starts, views),
      completionRate: ratio(completes, starts),
      continuationRate: ratio(continues, completes),
      productClickRate: ratio(affiliateClicks, productImpressions),
      viewToClickRate: ratio(affiliateClicks, views),
    };
    const opportunities = detectOpportunities(evidence);
    const top = opportunities[0] || null;
    return Object.freeze({
      ...evidence,
      evidenceStatus: hasEnoughEvidence(evidence) ? "measurable" : "insufficient",
      primaryOpportunity: top?.type || null,
      priorityScore: top?.score || 0,
      action: top?.action || null,
      rationale: top?.rationale || "Collect more GSC/GA evidence before changing the page.",
      opportunities,
    });
  });

  return rows.sort((a, b) => b.priorityScore - a.priorityScore || b.searchImpressions - a.searchImpressions || b.views - a.views || a.path.localeCompare(b.path));
}

function hasEnoughEvidence(row) {
  return row.searchImpressions >= 20 || row.views >= 10 || row.starts >= 8 || row.productImpressions >= 5 || row.indexed === false;
}

function detectOpportunities(row) {
  const items = [];
  if (row.indexed === false) {
    items.push(opportunity("indexing", 100 + Math.min(20, row.searchImpressions / 10), "Investigate indexing/canonical/internal-link blockers before changing copy.", `URL is reported not indexed${row.searchImpressions ? ` despite ${row.searchImpressions} impressions in the supplied search window` : ""}.`));
  }
  if (row.searchImpressions >= 20 && row.averagePosition > 0 && row.averagePosition <= 20 && row.searchCtr < 0.03) {
    const score = 80 + Math.min(15, row.searchImpressions / 50) + Math.min(5, (0.03 - row.searchCtr) * 100);
    items.push(opportunity("search_ctr", score, "Use query evidence to test title/meta alignment without changing the primary intent.", `${row.searchImpressions} impressions at avg. position ${row.averagePosition.toFixed(1)} but ${(row.searchCtr * 100).toFixed(1)}% CTR.`));
  }
  if (row.views >= 10 && row.startRate < 0.5) {
    items.push(opportunity("calculator_start", 70 + Math.min(15, row.views / 20) + (0.5 - row.startRate) * 10, "Improve above-the-fold intent match and calculator affordance.", `${row.views} landing views but only ${(row.startRate * 100).toFixed(1)}% start the calculator.`));
  }
  if (row.starts >= 8 && row.completionRate < 0.65) {
    items.push(opportunity("calculator_completion", 65 + Math.min(15, row.starts / 20) + (0.65 - row.completionRate) * 10, "Reduce input friction or clarify fields while preserving the canonical calculation engine.", `${row.starts} starts with ${(row.completionRate * 100).toFixed(1)}% completion.`));
  }
  if (row.completes >= 5 && row.continuationRate < 0.35) {
    items.push(opportunity("builder_continuation", 60 + Math.min(15, row.completes / 20) + (0.35 - row.continuationRate) * 10, "Strengthen the result-to-builder/product next step without adding a new route.", `${row.completes} completed calculations with ${(row.continuationRate * 100).toFixed(1)}% continuation.`));
  }
  if (row.productImpressions >= 5 && row.productClickRate < 0.12) {
    items.push(opportunity("affiliate_click", 55 + Math.min(15, row.productImpressions / 20) + (0.12 - row.productClickRate) * 10, "Improve recommendation confidence, product comparison context or CTA clarity; keep technical eligibility first.", `${row.productImpressions} product impressions with ${(row.productClickRate * 100).toFixed(1)}% affiliate click rate.`));
  }
  return items.sort((a, b) => b.score - a.score || a.type.localeCompare(b.type));
}

function opportunity(type, score, action, rationale) {
  return Object.freeze({ type, score: Number(score.toFixed(2)), action, rationale });
}

export function renderCalculatorGrowthMarkdown(rows = [], limit = 10) {
  const selected = rows.slice(0, Math.max(0, limit));
  const header = "| Priority | Landing | GSC impressions | CTR | Position | Views | Start | Complete | Continue | Product→click | Action |";
  const divider = "| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |";
  const body = selected.map((row, index) => `| ${index + 1} | ${row.path} | ${row.searchImpressions} | ${percent(row.searchCtr)} | ${row.averagePosition ? row.averagePosition.toFixed(1) : "—"} | ${row.views} | ${percent(row.startRate)} | ${percent(row.completionRate)} | ${percent(row.continuationRate)} | ${percent(row.productClickRate)} | ${row.primaryOpportunity || "observe"} |`);
  return [header, divider, ...body].join("\n");
}

function percent(value) {
  return `${(finite(value) * 100).toFixed(1)}%`;
}
