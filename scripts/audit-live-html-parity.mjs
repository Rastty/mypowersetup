import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const ORIGIN = (process.env.MPS_PRODUCTION_URL || "https://mypowersetup.com").replace(/\/$/, "");
const CONCURRENCY = 8;
const isoDate = new Date().toISOString();
const htmlFiles = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && entry.name === "index.html") htmlFiles.push(path);
  }
}
function routeFromFile(path) {
  const relative = path.slice(ROOT.length + 1).replaceAll("\\", "/");
  return relative === "index.html" ? "/" : "/" + relative.slice(0, -"index.html".length);
}
function textContent(html) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || "";
  const main = body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || body;
  return main.replace(/<!--[\s\S]*?-->/g, " ").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<(nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ").replace(/&(?:nbsp|amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/gi, " ")
    .replace(/\s+/g, " ").trim();
}
const h1 = html => (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const canonical = html => html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)/i)?.[1]
  || html.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["']/i)?.[1] || "";
async function fetchHtml(route) {
  let last = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(ORIGIN + route + (route.includes("?") ? "&" : "?") + "mps_audit=1", {
        headers: { accept: "text/html", "user-agent": "MyPowerSetup-content-audit/1.0" },
        signal: AbortSignal.timeout(16000), redirect: "follow", cache: "no-store",
      });
      const html = await response.text();
      if (response.ok && response.headers.get("content-type")?.includes("text/html")) return {status:response.status,url:response.url,html};
      last = "HTTP_" + response.status + "_OR_NON_HTML_" + (response.headers.get("content-type") || "missing");
    } catch (error) { last = String(error.message); }
  }
  return {error:last};
}
await walk(ROOT);
const sitemap = await readFile(join(ROOT, "sitemap.xml"), "utf8");
const listed = new Set([...sitemap.matchAll(/<loc>https:\/\/mypowersetup\.com([^<]+)<\/loc>/g)].map(match => match[1]));
const local = await Promise.all(htmlFiles.map(async path => {
  const html = await readFile(path, "utf8");
  return {path: routeFromFile(path), html, text:textContent(html), h1:h1(html)};
}));
local.sort((a,b)=>a.path.localeCompare(b.path));
const routeSet = new Set(local.map(x=>x.path));
const rows = [];
let cursor = 0;
async function worker() {
  while (cursor < local.length) {
    const entry = local[cursor++];
    const live = await fetchHtml(entry.path);
    const issues = [];
    const warnings = [];
    const guide = /^\/(?:pruvodce|sk\/sprievodca|pl\/poradnik|hu\/utmutatok|pt\/guias|ro\/ghiduri|si\/vodici)\//.test(entry.path);
    if (live.error) issues.push("HTTP_OR_FETCH_ERROR:" + live.error);
    let liveText = "";
    if (live.html) {
      liveText = textContent(live.html);
      const minChars = guide ? (entry.path.split("/").length <= 4 ? 200 : 900) : 80;
      if (liveText.length < minChars) issues.push("LIVE_TEXT_TOO_SHORT:" + liveText.length);
      if (!h1(live.html)) warnings.push("H1_MISSING");
      if (entry.h1 && h1(live.html) !== entry.h1) warnings.push("H1_DIFF");
      if (entry.text.length >= 500 && liveText.length < entry.text.length * 0.6) issues.push("LIVE_CONTENT_TRUNCATED");
      if (guide && canonical(live.html) !== ORIGIN + entry.path) warnings.push("CANONICAL_DRIFT");
      const linked = [...live.html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].map(m=>m[1]);
      for (const href of linked) {
        try {
          if (/^(?:mailto:|tel:|javascript:|#)/i.test(href)) continue;
          const u = new URL(href, ORIGIN + entry.path);
          if (u.origin !== ORIGIN || !u.pathname.endsWith("/") || routeSet.has(u.pathname)) continue;
          warnings.push("UNKNOWN_INTERNAL_ROUTE:" + u.pathname);
        } catch {}
      }
    }
    if (!listed.has(entry.path)) warnings.push("SITEMAP_OMISSION");
    rows.push({path:entry.path,status:live.status || null,localTextChars:entry.text.length,liveTextChars:liveText.length,issues:[...new Set(issues)],warnings:[...new Set(warnings)]});
  }
}
await Promise.all(Array.from({length:CONCURRENCY}, () => worker()));
rows.sort((a,b)=>a.path.localeCompare(b.path));
const issues = rows.filter(x=>x.issues.length), warnings=rows.filter(x=>x.warnings.length);
const result={at:isoDate,site:ORIGIN,checked:rows.length,ok:rows.length-issues.length,errors:issues.length,warnings:warnings.length,unlisted:[...routeSet].filter(x=>!listed.has(x)),issues,warningsDetail:warnings};
console.log("LIVE_CONTENT_AUDIT_SUMMARY " + JSON.stringify({checked:result.checked,ok:result.ok,errors:result.errors,warnings:result.warnings,unlisted:result.unlisted}));
for(const r of issues)console.log("LIVE_CONTENT_AUDIT_ERROR "+JSON.stringify(r));
for(const r of warnings)console.log("LIVE_CONTENT_AUDIT_WARNING "+JSON.stringify(r));
await writeFile("live-content-audit.json", JSON.stringify(result,null,2));
if (issues.length) process.exitCode = 1;
