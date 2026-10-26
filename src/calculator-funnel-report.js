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
  // GA4 eventCount counts actions; totalUsers is only a fallback.
  const value = event?.funnel_count
    ?? event?.event_count
    ?? event?.eventCount
    ?? event?.count
    ?? event?.total_users
    ?? event?.totalUsers
    ?? params?.funnel_count
    ?? params?.event_count
    ?? params?.eventCount
    ?? params?.count
    ?? params?.total_users
    ?? params?.totalUsers;
  if (value === undefined || value === null) return 1;
  const number = Number(value);
  // An explicit GA4 aggregate with a corrupt count is UNKNOWN, never one
  // invented conversion. Unweighted browser events above still count once.
  if (!Number.isSafeInteger(number) || number < 0 || !String(value).trim()) {
    throw new Error("CALCULATOR_FUNNEL_INVALID_EVENT_COUNT");
  }
  return number;
}

// Distinguish observed click/impression events from unique-user funnel rates.
// Missing aggregate event counts must not be inferred from unique users.
function actionCount(event, params) {
  const value = event?.event_count ?? event?.eventCount ?? event?.count
    ?? params?.event_count ?? params?.eventCount ?? params?.count;
  if (value === undefined || value === null) {
    if (event?.funnel_count !== undefined || event?.total_users !== undefined ||
        event?.totalUsers !== undefined || params?.funnel_count !== undefined) return null;
    return 1; // An individual consented browser event.
  }
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0 || !String(value).trim()) {
    throw new Error("CALCULATOR_FUNNEL_INVALID_EVENT_COUNT");
  }
  return count;
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
    const eventName = clean(event?.event_name || event?.eventName || event?.name);
    const step = STEP_BY_EVENT[eventName];
    if (!step) continue;
    const params = eventParameters(event);
    // Accept both consent-gated browser events and the real GA4 Data API adapter.
    const path = clean(params.calculator_landing_path || params.calculatorLandingPath || params.landing_path);
    const locale = language(params.calculator_landing_locale || params.calculatorLandingLocale || params.landing_locale);
    const intent = clean(params.calculator_landing_intent || params.calculatorLandingIntent || params.landing_intent);
    if (!isCalculatorLandingPath(path, locale) || !intent) continue;

    const key = `${locale}\t${intent}\t${path}`;
    if (!groups.has(key)) {
      groups.set(key, { locale, intent, path, views: 0, starts: 0, completes: 0, continues: 0, impressions: 0, clicks: 0, impressionEvents: 0, clickEvents: 0 });
    }
    const group = groups.get(key);
    group[step] += eventWeight(event, params); // Existing unique-user funnel semantics.
    if (step === "impressions" || step === "clicks") {
      const field = step === "impressions" ? "impressionEvents" : "clickEvents";
      const actions = actionCount(event, params);
      group[field] = group[field] === null || actions === null ? null : group[field] + actions;
    }
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
  const header = "| Locale | Intent | Landing | Views | Starts | Complete | Continue | Product impressions (users) | Affiliate clicks (users) | Click events | View→click |";
  const divider = "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |";
  const body = rows.map((row) => `| ${row.locale} | ${row.intent} | ${row.path} | ${row.views} | ${row.starts} | ${row.completes} | ${row.continues} | ${row.impressions} | ${row.clicks} | ${row.clickEvents ?? "n/a"} | ${percent(row.clickThroughRate)} |`);
  return [header, divider, ...body].join("\n");
}

function rate(numerator, denominator) {
  // No observed denominator means the rate is unknown, not a measured 0%.
  return denominator > 0 ? numerator / denominator : null;
}

function percent(value) {
  return value === null || value === undefined ? "n/a" : `${(Number(value) * 100).toFixed(1)}%`;
}
