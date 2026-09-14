const STEP_BY_EVENT = Object.freeze({
  calculator_landing_view: "views",
  calculator_started: "starts",
  calculation_completed: "completes",
  calculator_landing_continue: "continues",
  product_choice_impression: "impressions",
  affiliate_click: "clicks",
});

function eventParameters(event) {
  return event?.parameters && typeof event.parameters === "object" ? event.parameters : event || {};
}

function clean(value) {
  return String(value || "").trim();
}

export function buildCalculatorFunnelSummary(events = []) {
  const groups = new Map();

  for (const event of events) {
    const eventName = clean(event?.event_name || event?.name);
    const step = STEP_BY_EVENT[eventName];
    if (!step) continue;
    const params = eventParameters(event);
    const path = clean(params.calculator_landing_path || params.landing_path);
    const locale = clean(params.calculator_landing_locale || params.landing_locale).toLowerCase();
    const intent = clean(params.calculator_landing_intent || params.landing_intent);
    if (!path.startsWith("/kalkulacky/") || !locale || !intent) continue;

    const key = `${locale}\t${intent}\t${path}`;
    if (!groups.has(key)) {
      groups.set(key, { locale, intent, path, views: 0, starts: 0, completes: 0, continues: 0, impressions: 0, clicks: 0 });
    }
    groups.get(key)[step] += 1;
  }

  return [...groups.values()]
    .map((row) => Object.freeze({
      ...row,
      startRate: rate(row.starts, row.views),
      completionRate: rate(row.completes, row.starts),
      continuationRate: rate(row.continues, row.completes),
      clickThroughRate: rate(row.clicks, row.views),
    }))
    .sort((a, b) => b.clicks - a.clicks || b.views - a.views || a.path.localeCompare(b.path));
}

export function renderCalculatorFunnelMarkdown(rows = []) {
  const header = "| Locale | Intent | Landing | Views | Starts | Complete | Continue | Product impressions | Affiliate clicks | View→click |";
  const divider = "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |";
  const body = rows.map((row) => `| ${row.locale} | ${row.intent} | ${row.path} | ${row.views} | ${row.starts} | ${row.completes} | ${row.continues} | ${row.impressions} | ${row.clicks} | ${percent(row.clickThroughRate)} |`);
  return [header, divider, ...body].join("\n");
}

function rate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function percent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}
