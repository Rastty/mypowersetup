import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import {
  INDEXNOW_KEY_FILE,
  INDEXNOW_ORIGIN,
  buildIndexNowPayload,
  changedFilesToIndexNowUrls,
  extractSitemapUrls,
  isIndexNowSuccess,
} from "../src/indexnow.js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || process.env.INDEXNOW_DRY_RUN === "1";
const forceAll = args.has("--all") || process.env.INDEXNOW_SUBMIT_ALL === "1";
const changedFilesPath = argumentValue("--changed-files");

const [sitemapXml, key] = await Promise.all([
  readFile("sitemap.xml", "utf8"),
  readFile(INDEXNOW_KEY_FILE, "utf8").then((value) => value.trim()),
]);
const sitemapUrls = extractSitemapUrls(sitemapXml);
const changedFiles = changedFilesPath
  ? (await readFile(changedFilesPath, "utf8")).split(/\r?\n/).filter(Boolean)
  : [];
const selectedUrls = changedFilesToIndexNowUrls(changedFiles, sitemapUrls, { forceAll });

if (!selectedUrls.length) {
  console.log(JSON.stringify({ ok: true, submitted: false, reason: "no-public-url-change", changedFiles }, null, 2));
  process.exit(0);
}

const payload = buildIndexNowPayload(selectedUrls, key);
if (dryRun) {
  console.log(JSON.stringify({ ok: true, dryRun: true, urlCount: payload.urlList.length, urlList: payload.urlList }, null, 2));
  process.exit(0);
}

const keyReady = await waitForPublishedKey(key);
if (!keyReady) {
  console.warn(`INDEXNOW_SKIPPED:key-file-not-live:${payload.keyLocation}`);
  process.exit(0);
}

try {
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!isIndexNowSuccess(response.status)) {
    const body = await response.text().catch(() => "");
    console.warn(`INDEXNOW_WARNING:http-${response.status}:${body.slice(0, 500)}`);
    process.exit(0);
  }

  console.log(JSON.stringify({ ok: true, submitted: true, status: response.status, urlCount: payload.urlList.length, urlList: payload.urlList }, null, 2));
} catch (error) {
  // Discovery notification must never block site publication or product refresh.
  console.warn(`INDEXNOW_WARNING:network:${error?.message || error}`);
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function waitForPublishedKey(expectedKey) {
  const attempts = Math.max(1, Number(process.env.INDEXNOW_KEY_VERIFY_ATTEMPTS || 18));
  const intervalMs = Math.max(100, Number(process.env.INDEXNOW_KEY_VERIFY_INTERVAL_MS || 5000));
  const url = `${INDEXNOW_ORIGIN}/${INDEXNOW_KEY_FILE}`;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (response.ok && (await response.text()).trim() === expectedKey) return true;
    } catch {}
    if (attempt < attempts) await delay(intervalMs);
  }
  return false;
}
