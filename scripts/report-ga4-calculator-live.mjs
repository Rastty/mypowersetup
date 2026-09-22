#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import {
  calculatorEventsFromGa4RunReport,
  ga4CalculatorDimensionFilter,
  ga4MetadataDimensionState,
  selectExactGa4WebStream,
} from "../src/ga4-live-baseline.js";

const [clientPath, tokenPath, outputPath = "ga4-calculator-live.json"] = process.argv.slice(2);
const targetHostname = process.env.GA4_TARGET_HOSTNAME || "mypowersetup.com";
const startDate = process.env.GA4_START_DATE || "28daysAgo";
const endDate = process.env.GA4_END_DATE || "yesterday";

if (!clientPath || !tokenPath) {
  console.error("Usage: node scripts/report-ga4-calculator-live.mjs <oauth-client.json> <readonly-token.json> [output.json]");
  console.error("Optional env: GA4_TARGET_HOSTNAME, GA4_START_DATE, GA4_END_DATE");
  process.exitCode = 1;
} else {
  try {
    const client = oauthClient(JSON.parse(await readFile(clientPath, "utf8")));
    const token = JSON.parse(await readFile(tokenPath, "utf8"));
    const accessToken = await refreshAccessToken(client, token);

    const propertySummaries = await listPropertySummaries(accessToken);
    const properties = await Promise.all(propertySummaries.map(async (property) => ({
      property: property.property,
      displayName: property.displayName || "",
      streams: await listDataStreams(accessToken, property.property),
    })));

    const selected = selectExactGa4WebStream(properties, targetHostname);
    const metadata = await apiJson(
      `https://analyticsdata.googleapis.com/v1beta/${selected.property}/metadata`,
      { accessToken },
    );
    const customDimensions = ga4MetadataDimensionState(metadata);
    const baseRequest = {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
      dimensionFilter: ga4CalculatorDimensionFilter(targetHostname),
      limit: "10000",
    };

    const summaryReport = await runReport(accessToken, selected.property, {
      ...baseRequest,
      dimensions: [{ name: "eventName" }, { name: "hostName" }],
    });

    let detailedReport = null;
    let events = [];
    if (customDimensions.ready) {
      detailedReport = await runReport(accessToken, selected.property, {
        ...baseRequest,
        dimensions: [
          { name: "eventName" },
          { name: "customEvent:calculator_landing_path" },
          { name: "customEvent:calculator_landing_locale" },
          { name: "customEvent:calculator_landing_intent" },
          { name: "hostName" },
        ],
      });
      events = calculatorEventsFromGa4RunReport(detailedReport);
    }

    const payload = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      targetHostname,
      dateRange: { startDate, endDate },
      property: {
        name: selected.property,
        displayName: selected.propertyDisplayName,
      },
      stream: {
        name: selected.streamName,
        displayName: selected.streamDisplayName,
        measurementId: selected.measurementId,
        defaultUri: selected.defaultUri,
        hostname: selected.hostname,
      },
      customDimensions,
      summary: reportRows(summaryReport),
      events,
      status: customDimensions.ready ? "ready" : "route_dimensions_missing",
    };

    await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`GA4 property: ${payload.property.name} (${payload.property.displayName || "unnamed"})`);
    console.log(`GA4 stream: ${payload.stream.name} / ${payload.stream.defaultUri}`);
    console.log(`GA4 measurement ID discovered: ${payload.stream.measurementId || "not returned"}`);
    console.log(`Calculator summary rows: ${payload.summary.length}`);
    console.log(`Route-level calculator rows: ${events.length}`);
    console.log(`Evidence written to ${outputPath}`);

    if (!customDimensions.ready) {
      console.error(`Route-level GA4 baseline is blocked: missing registered dimensions: ${customDimensions.missing.join(", ")}`);
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(safeError(error));
    process.exitCode = 1;
  }
}

function oauthClient(payload) {
  const config = payload?.installed || payload?.web || payload;
  if (!config?.client_id || !config?.client_secret) throw new Error("GA4_OAUTH_CLIENT_INVALID");
  return {
    clientId: config.client_id,
    clientSecret: config.client_secret,
    tokenUri: config.token_uri || "https://oauth2.googleapis.com/token",
  };
}

async function refreshAccessToken(client, token) {
  if (!token?.refresh_token) throw new Error("GA4_REFRESH_TOKEN_MISSING");
  const body = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    refresh_token: token.refresh_token,
    grant_type: "refresh_token",
  });
  const response = await fetch(client.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    throw new Error(`GA4_TOKEN_REFRESH_FAILED:${response.status}:${payload?.error || "unknown"}`);
  }
  return payload.access_token;
}

async function listPropertySummaries(accessToken) {
  const rows = [];
  let pageToken = "";
  do {
    const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await apiJson(url, { accessToken });
    for (const account of payload.accountSummaries || []) {
      for (const property of account.propertySummaries || []) {
        if (property?.property) rows.push(property);
      }
    }
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  if (!rows.length) throw new Error("GA4_NO_ACCESSIBLE_PROPERTIES");
  return rows;
}

async function listDataStreams(accessToken, property) {
  const rows = [];
  let pageToken = "";
  do {
    const url = new URL(`https://analyticsadmin.googleapis.com/v1beta/${property}/dataStreams`);
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await apiJson(url, { accessToken });
    rows.push(...(payload.dataStreams || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return rows;
}

async function runReport(accessToken, property, body) {
  return apiJson(
    `https://analyticsdata.googleapis.com/v1beta/${property}:runReport`,
    { accessToken, method: "POST", body },
  );
}

async function apiJson(url, { accessToken, method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiMessage = String(payload?.error?.message || payload?.error || "unknown");
    const scopeHint = response.status === 403 ? ":analytics.readonly/access check required" : "";
    throw new Error(`GA4_API_FAILED:${response.status}${scopeHint}:${apiMessage}`);
  }
  return payload;
}

function reportRows(response = {}) {
  const dimensionHeaders = (response.dimensionHeaders || []).map((item) => item?.name || "");
  const metricHeaders = (response.metricHeaders || []).map((item) => item?.name || "");
  return (response.rows || []).map((row) => {
    const out = {};
    dimensionHeaders.forEach((name, index) => { out[name] = row?.dimensionValues?.[index]?.value ?? ""; });
    metricHeaders.forEach((name, index) => { out[name] = Number(row?.metricValues?.[index]?.value ?? 0); });
    return out;
  });
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "[REDACTED_ACCESS_TOKEN]")
    .replace(/1\/\/[A-Za-z0-9._-]+/g, "[REDACTED_REFRESH_TOKEN]");
}
