#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import {
  calculatorUrlsFromSitemap,
  defaultGscDateRange,
  gscPageQueryRequest,
  gscPageTotalRequest,
  normalizeSearchAnalyticsPageTotal,
  normalizeSearchAnalyticsRows,
  normalizeUrlInspection,
  selectExactGscProperty,
} from "../src/gsc-live-baseline.js";

const [clientPath, tokenPath, outputPath = "gsc-calculator-live.json"] = process.argv.slice(2);
const targetHostname = process.env.GSC_TARGET_HOSTNAME || "mypowersetup.com";
const sitemapPath = process.env.GSC_CALCULATOR_SITEMAP || "sitemap-calculators.xml";
const defaults = defaultGscDateRange();
const startDate = process.env.GSC_START_DATE || defaults.startDate;
const endDate = process.env.GSC_END_DATE || defaults.endDate;

if (!clientPath || !tokenPath) {
  console.error("Usage: node scripts/report-gsc-calculator-live.mjs <oauth-client.json> <readonly-token.json> [output.json]");
  console.error("Optional env: GSC_TARGET_HOSTNAME, GSC_CALCULATOR_SITEMAP, GSC_START_DATE, GSC_END_DATE");
  process.exitCode = 1;
} else {
  try {
    const client = oauthClient(JSON.parse(await readFile(clientPath, "utf8")));
    const token = JSON.parse(await readFile(tokenPath, "utf8"));
    const sitemapXml = await readFile(sitemapPath, "utf8");
    const accessToken = await refreshAccessToken(client, token);

    const sites = await listSites(accessToken);
    const selected = selectExactGscProperty(sites, targetHostname);
    const urls = calculatorUrlsFromSitemap(sitemapXml, targetHostname);

    const pageTotals = [];
    const searchAnalytics = [];
    const indexing = [];

    for (const url of urls) {
      const [total, search] = await Promise.all([
        querySearchAnalytics(accessToken, selected.siteUrl, gscPageTotalRequest(url, startDate, endDate)),
        querySearchAnalytics(accessToken, selected.siteUrl, gscPageQueryRequest(url, startDate, endDate)),
      ]);
      pageTotals.push(normalizeSearchAnalyticsPageTotal(url, total));
      searchAnalytics.push(...normalizeSearchAnalyticsRows(url, search));

      const inspection = await inspectUrl(accessToken, selected.siteUrl, url);
      indexing.push(normalizeUrlInspection(url, inspection));
    }

    const payload = {
      schemaVersion: 2,
      generatedAt: new Date().toISOString(),
      targetHostname,
      property: selected,
      dateRange: { startDate, endDate },
      sitemapPath,
      urlCount: urls.length,
      urls,
      pageTotals,
      searchAnalytics,
      indexing,
      status: "ready",
    };

    await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    const indexedCount = indexing.filter((row) => row.indexed === true).length;
    const notIndexedCount = indexing.filter((row) => row.indexed === false).length;
    const unknownCount = indexing.length - indexedCount - notIndexedCount;
    const impressions = pageTotals.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
    const clicks = pageTotals.reduce((sum, row) => sum + Number(row.clicks || 0), 0);

    console.log(`GSC property: ${selected.siteUrl} (${selected.permissionLevel || "permission unknown"})`);
    console.log(`Calculator URLs inspected: ${urls.length}`);
    console.log(`Indexing: ${indexedCount} indexed / ${notIndexedCount} not indexed / ${unknownCount} unknown`);
    console.log(`Search Analytics ${startDate}..${endDate}: ${impressions} page impressions / ${clicks} page clicks / ${searchAnalytics.length} visible page-query rows`);
    console.log(`Evidence written to ${outputPath}`);
  } catch (error) {
    console.error(safeError(error));
    process.exitCode = 1;
  }
}

function oauthClient(payload) {
  const config = payload?.installed || payload?.web || payload;
  if (!config?.client_id || !config?.client_secret) throw new Error("GSC_OAUTH_CLIENT_INVALID");
  return {
    clientId: config.client_id,
    clientSecret: config.client_secret,
    tokenUri: config.token_uri || "https://oauth2.googleapis.com/token",
  };
}

async function refreshAccessToken(client, token) {
  if (!token?.refresh_token) throw new Error("GSC_REFRESH_TOKEN_MISSING");
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
    throw new Error(`GSC_TOKEN_REFRESH_FAILED:${response.status}:${payload?.error || "unknown"}`);
  }
  return payload.access_token;
}

async function listSites(accessToken) {
  const payload = await apiJson("https://www.googleapis.com/webmasters/v3/sites", { accessToken });
  return payload.siteEntry || [];
}

async function querySearchAnalytics(accessToken, siteUrl, body) {
  return apiJson(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    { accessToken, method: "POST", body },
  );
}

async function inspectUrl(accessToken, siteUrl, inspectionUrl) {
  return apiJson(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      accessToken,
      method: "POST",
      body: { inspectionUrl, siteUrl, languageCode: "en-US" },
    },
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
    const scopeHint = response.status === 403 ? ":webmasters.readonly/access check required" : "";
    throw new Error(`GSC_API_FAILED:${response.status}${scopeHint}:${apiMessage}`);
  }
  return payload;
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "[REDACTED_ACCESS_TOKEN]")
    .replace(/1\/\/[A-Za-z0-9._-]+/g, "[REDACTED_REFRESH_TOKEN]");
}
