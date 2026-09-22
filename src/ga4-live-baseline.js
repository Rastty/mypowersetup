const TARGET_EVENT_NAMES = Object.freeze([
  "calculator_landing_view",
  "calculator_started",
  "calculation_completed",
  "calculator_landing_continue",
  "product_choice_impression",
  "affiliate_click",
]);

const REQUIRED_ROUTE_DIMENSIONS = Object.freeze([
  "customEvent:calculator_landing_path",
  "customEvent:calculator_landing_locale",
  "customEvent:calculator_landing_intent",
]);

export const GA4_CALCULATOR_EVENT_NAMES = TARGET_EVENT_NAMES;
export const GA4_REQUIRED_ROUTE_DIMENSIONS = REQUIRED_ROUTE_DIMENSIONS;

export function normalizeWebHostname(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text.includes("://") ? text : `https://${text}`);
    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return "";
  }
}

function equivalentHostnames(targetHostname) {
  const target = normalizeWebHostname(targetHostname);
  if (!target) return new Set();
  const bare = target.startsWith("www.") ? target.slice(4) : target;
  return new Set([bare, `www.${bare}`]);
}

export function selectExactGa4WebStream(properties = [], targetHostname = "mypowersetup.com") {
  const allowedHosts = equivalentHostnames(targetHostname);
  if (!allowedHosts.size) throw new Error("GA4_TARGET_HOSTNAME_INVALID");

  const matches = [];
  for (const property of Array.isArray(properties) ? properties : []) {
    for (const stream of Array.isArray(property?.streams) ? property.streams : []) {
      if (stream?.type && stream.type !== "WEB_DATA_STREAM") continue;
      const defaultUri = stream?.webStreamData?.defaultUri || stream?.defaultUri || "";
      const hostname = normalizeWebHostname(defaultUri);
      if (!allowedHosts.has(hostname)) continue;
      matches.push({
        property: property.property,
        propertyDisplayName: property.displayName || "",
        streamName: stream.name || "",
        streamDisplayName: stream.displayName || "",
        measurementId: stream?.webStreamData?.measurementId || stream?.measurementId || "",
        defaultUri,
        hostname,
      });
    }
  }

  if (!matches.length) throw new Error(`GA4_EXACT_HOST_STREAM_NOT_FOUND:${[...allowedHosts].join(",")}`);
  if (matches.length > 1) {
    const ids = matches.map((item) => `${item.property || "?"}/${item.streamName || "?"}`).join(",");
    throw new Error(`GA4_EXACT_HOST_STREAM_AMBIGUOUS:${ids}`);
  }
  return Object.freeze(matches[0]);
}

export function ga4MetadataDimensionState(metadata = {}) {
  const available = new Set((metadata?.dimensions || []).map((item) => item?.apiName).filter(Boolean));
  const missing = REQUIRED_ROUTE_DIMENSIONS.filter((name) => !available.has(name));
  return Object.freeze({
    required: [...REQUIRED_ROUTE_DIMENSIONS],
    missing,
    ready: missing.length === 0,
  });
}

export function flattenGa4RunReport(response = {}) {
  const dimensions = (response.dimensionHeaders || []).map((item) => item?.name || "");
  const metrics = (response.metricHeaders || []).map((item) => item?.name || "");
  return (response.rows || []).map((row) => {
    const out = {};
    dimensions.forEach((name, index) => {
      out[name] = row?.dimensionValues?.[index]?.value ?? "";
    });
    metrics.forEach((name, index) => {
      out[name] = row?.metricValues?.[index]?.value ?? "";
    });
    return out;
  });
}

export function calculatorEventsFromGa4RunReport(response = {}) {
  return flattenGa4RunReport(response)
    .map((row) => ({
      eventName: row.eventName || "",
      eventCount: Number(row.eventCount || 0),
      totalUsers: Number(row.totalUsers || 0),
      calculatorLandingPath: row["customEvent:calculator_landing_path"] || "",
      calculatorLandingLocale: row["customEvent:calculator_landing_locale"] || "",
      calculatorLandingIntent: row["customEvent:calculator_landing_intent"] || "",
      hostName: row.hostName || "",
    }))
    .filter((row) => TARGET_EVENT_NAMES.includes(row.eventName));
}

export function ga4CalculatorDimensionFilter(targetHostname = "mypowersetup.com") {
  const hosts = [...equivalentHostnames(targetHostname)];
  return {
    andGroup: {
      expressions: [
        {
          filter: {
            fieldName: "hostName",
            inListFilter: { values: hosts, caseSensitive: false },
          },
        },
        {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: [...TARGET_EVENT_NAMES], caseSensitive: true },
          },
        },
      ],
    },
  };
}
