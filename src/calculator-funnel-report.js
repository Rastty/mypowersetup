const STEP_BY_EVENT = Object.freeze({
  calculator_landing_view: "views",
  calculator_started: "starts",
  calculation_completed: "completes",
  calculator_landing_continue: "continues",
  product_choice_impression: "impressions",
  affiliate_click: "clicks",
});

const CALCULATOR_ROOT_BY_LOCALE = Object.freeze({
  cs: "/kalkulacky/",
  sk: "/sk/kalkulacky/",
  pl: "/pl/kalkulatory/",
  hu: "/hu/kalkulatorok/",
});

function eventParameters(event) {
  return event?.parameters && typeof event.parameters === "object" ? event.parameters : event || {};
}

function clean(value) {
  return String(value || "").trim();
}

function language(value) {
  return clean(value).toLowerCase().split("-")[0];
}

function eventWeight(event, params) {
  const value = event?.funnel_count
    ?? event?.total_users
    ?? event?.event_count
    ?? event?.count
    ?? params?.funnel_count
    ?? params?.total_users
    ?? params?.event_count
    ?? params?.count;
  if (value === undefined || value === null || value === "") return 1;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 1;
}

export function calculatorLocaleForPath(path) {
  const value = clean(path);
  for (const [locale, root] of Object.entries(CALCULATOR_ROOT_BY_LOCALE)) {
    if (value.startsWith(root)) return locale;
  }
  return "";
}

export function isCalculatorLandingPath(path, locale) {
  return Boolean(language(locale) && calculatorLocaleForPath(path) === language(locale));
}

export function buildCalculatorFunnelSummary(events = []) {
  const groups = new Map();

  for (const event of events) {
    const eventName = clean(event?.event_name || event?.name);
    const step = STEP_BY_EVENT[eventName];
    if (!step) continue;
    const params = eventParameters(event);
    const path = clean(params.calculator_landing_path || params.landing_path);
    const locale = language(params.calculator_landing_locale || params.landing_locale);
    const intent = clean(params.calculator_landing_intent || params.landing_intent);
    if (!isCalculatorLandingPath(path, locale) || !intent) continue;

    const key = `${locale}\t${intent}\t${path}`;
    if (!groups.has(key)) {
      groups.set(key, { locale, intent, path, views: 0, starts: 0, completes: 0, continues: 0, impressions: 0, clicks: 0 });
    }
    groups.get(key)[step] += eventWeight(event, params);
  }

  return [...groups.values()]
    .map((row) => Object.freeze({
      ...row,
      startRate: rate(row.starts, row.views),
      completionRate: rate(row.completes, row.starts),
      continuationRate: rate(row.continues, row.completes),
      productClickRate: rate(row.clicks, row.impressions),
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
