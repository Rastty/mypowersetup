function clean(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function canonicalHeader(value) {
  return clean(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const GSC_ALIASES = Object.freeze({
  page: ["page", "url", "landing page", "top pages", "top page", "nejvyznamnejsi stranky", "nejvyznamnejsi stranka", "stranka", "stranky"],
  query: ["query", "queries", "top queries", "top query", "dotaz", "dotazy", "nejvyznamnejsi dotazy", "nejvyznamnejsi dotaz"],
  clicks: ["clicks", "prokliky"],
  impressions: ["impressions", "zobrazeni"],
  ctr: ["ctr"],
  position: ["position", "average position", "avg position", "pozice", "prumerna pozice"],
});

const GA_ALIASES = Object.freeze({
  event_name: ["event name", "event", "name", "nazev udalosti", "udalost"],
  event_count: ["event count", "count", "events", "pocet udalosti", "pocet udalosti celkem"],
  total_users: ["total users", "users", "active users", "celkovy pocet uzivatelu", "uzivatele", "aktivni uzivatele"],
  calculator_landing_path: ["calculator landing path", "landing path", "page path", "path", "cesta vstupni stranky", "cesta stranky"],
  calculator_landing_locale: ["calculator landing locale", "landing locale", "locale", "language", "jazyk", "lokalita kalkulacky"],
  calculator_landing_intent: ["calculator landing intent", "landing intent", "intent", "zamer", "zamer kalkulacky"],
});

const INDEXING_ALIASES = Object.freeze({
  url: ["url", "page", "stranka"],
  indexed: ["indexed", "coverage state", "verdict", "status", "stav", "indexovano"],
});

function aliasLookup(row, aliases) {
  if (!row || typeof row !== "object") return undefined;
  const entries = new Map(Object.entries(row).map(([key, value]) => [canonicalHeader(key), value]));
  for (const alias of aliases) {
    const value = entries.get(canonicalHeader(alias));
    if (value !== undefined && clean(value) !== "") return value;
  }
  return undefined;
}

export function parseLocalizedNumber(value, { percent = false } = {}) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let text = clean(value).replace(/[\u00A0\u202F\s]/g, "");
  if (!text) return 0;
  const hasPercent = text.endsWith("%");
  if (hasPercent) text = text.slice(0, -1);

  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    if (comma > dot) text = text.replace(/\./g, "").replace(",", ".");
    else text = text.replace(/,/g, "");
  } else if (comma >= 0) {
    text = text.replace(",", ".");
  }

  text = text.replace(/[^0-9.+-]/g, "");
  const number = Number(text);
  if (!Number.isFinite(number)) return 0;
  return hasPercent || percent ? number / 100 : number;
}

function delimiterScore(line, delimiter) {
  let quoted = false;
  let score = 0;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && character === delimiter) score += 1;
  }
  return score;
}

export function detectDelimiter(text) {
  const firstLine = clean(text).split(/\r?\n/, 1)[0] || "";
  const candidates = ["\t", ";", ","];
  return candidates
    .map((delimiter) => ({ delimiter, score: delimiterScore(firstLine, delimiter) }))
    .sort((a, b) => b.score - a.score)[0]?.delimiter || ",";
}

export function parseDelimitedText(text, delimiter = detectDelimiter(text)) {
  const source = String(text ?? "").replace(/^\uFEFF/, "");
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === delimiter) {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else field += character;
  }
  record.push(field.replace(/\r$/, ""));
  if (record.some((value) => clean(value))) records.push(record);
  if (!records.length) return [];

  const headers = records.shift().map(clean);
  return records
    .filter((values) => values.some((value) => clean(value)))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

export function normalizeGscExportRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    if (Array.isArray(row?.keys)) return {
      ...row,
      clicks: strictNonNegativeCount(row.clicks, "GSC", "clicks"),
      impressions: strictNonNegativeCount(row.impressions, "GSC", "impressions"),
    };
    const page = aliasLookup(row, GSC_ALIASES.page);
    const query = aliasLookup(row, GSC_ALIASES.query);
    const ctr = aliasLookup(row, GSC_ALIASES.ctr);
    return {
      ...(page ? { page: clean(page) } : {}),
      ...(query ? { query: clean(query) } : {}),
      clicks: strictNonNegativeCount(aliasLookup(row, GSC_ALIASES.clicks), "GSC", "clicks"),
      impressions: strictNonNegativeCount(aliasLookup(row, GSC_ALIASES.impressions), "GSC", "impressions"),
      ctr: parseLocalizedNumber(ctr, { percent: clean(ctr).includes("%") }),
      position: parseLocalizedNumber(aliasLookup(row, GSC_ALIASES.position)),
    };
  }).filter((row) => row.page || row.query || row.keys);
}

function strictNonNegativeCount(value, source, field) {
  if (typeof value === "number") {
    if (Number.isSafeInteger(value) && value >= 0) return value;
    throw new Error(`${source}_${field.toUpperCase()}_INVALID`);
  }
  const text = clean(value);
  // Allow whole numbers and localized thousands grouping (1,234 / 1.234 /
  // 1 234), but never decimals, negatives, units or an absent value.
  const valid = /^\d+$/.test(text) || /^\d{1,3}(?:[.,\s\u00a0\u202f]\d{3})+$/.test(text);
  const count = valid ? Number(text.replace(/[.,\s\u00a0\u202f]/g, "")) : NaN;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error(`${source}_${field.toUpperCase()}_INVALID`);
  return count;
}

export function normalizeGa4CalculatorEventRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    if (row?.parameters && typeof row.parameters === "object") return row;
    const eventName = aliasLookup(row, GA_ALIASES.event_name);
    const eventCount = aliasLookup(row, GA_ALIASES.event_count);
    const totalUsers = aliasLookup(row, GA_ALIASES.total_users);
    const path = aliasLookup(row, GA_ALIASES.calculator_landing_path);
    const locale = aliasLookup(row, GA_ALIASES.calculator_landing_locale);
    const intent = aliasLookup(row, GA_ALIASES.calculator_landing_intent);
    // Aggregate GA4 exports are not individual raw events. Missing or corrupt
    // counts are UNKNOWN, never one synthetic affiliate click or a fake zero.
    const normalizedEventCount = strictNonNegativeCount(eventCount, "GA4", "event_count");
    const normalizedTotalUsers = totalUsers === undefined ? null : strictNonNegativeCount(totalUsers, "GA4", "total_users");
    return {
      event_name: clean(eventName),
      event_count: normalizedEventCount,
      ...(normalizedTotalUsers === null ? {} : { total_users: normalizedTotalUsers }),
      // The existing funnel tracks unique users when GA4 provides them.
      // Keep raw event_count separately so repeated click actions are not lost.
      funnel_count: normalizedTotalUsers ?? normalizedEventCount,
      calculator_landing_path: clean(path),
      calculator_landing_locale: clean(locale),
      calculator_landing_intent: clean(intent),
    };
  }).filter((row) => clean(row?.event_name || row?.name));
}

function normalizeIndexingStatus(value) {
  if (typeof value === "boolean") return value;
  const text = canonicalHeader(value);
  if (!text) return null;
  if (text === "true" || text === "yes" || text === "indexed" || text === "indexovano" || text.includes("url is on google") || text.includes("url je na googlu") || text.includes("submitted and indexed")) return true;
  if (text === "false" || text === "no" || text === "not indexed" || text === "neindexovano" || text.includes("url is not on google") || text.includes("url neni na googlu") || text.includes("not on google") || text.includes("vylouceno") || text.includes("excluded")) return false;
  return null;
}

export function normalizeIndexingExportRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const url = aliasLookup(row, INDEXING_ALIASES.url) ?? row?.url ?? row?.page ?? row?.path;
    const rawStatus = row?.indexed ?? row?.coverageState ?? row?.verdict ?? row?.status ?? aliasLookup(row, INDEXING_ALIASES.indexed);
    const indexed = normalizeIndexingStatus(rawStatus);
    return {
      ...row,
      url: clean(url),
      ...(indexed === null ? { status: clean(rawStatus) } : { indexed }),
    };
  }).filter((row) => clean(row?.url || row?.page || row?.path));
}
