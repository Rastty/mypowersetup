import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expansionPublicationManifest } from "../src/expansion-publication.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const markets = Object.freeze({ pt: "pt-PT", si: "sl-SI", ro: "ro-RO" });
const allHomeLocales = Object.freeze(["cs-CZ", "sk-SK", "pl-PL", "hu-HU", "pt-PT", "sl-SI", "ro-RO", "x-default"]);
const privateCopyMarkers = Object.freeze({
  pt: ["Versão privada em validação", "Pré-visualização privada", "ainda não são publicados nem indexados", "Conteúdo publicado para Portugal"],
  si: ["Zasebna različica v preverjanju", "Zasebni predogled", "še niso javno objavljeni ali indeksirani", "Objavljena vsebina za Slovenijo"],
  ro: ["Versiune privată în validare", "Previzualizare privată", "nu sunt încă publicate sau indexate", "Conținut publicat pentru România"],
});

const failures = [];
const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
const priorityOpen = (sitemap.match(/<priority>/g) || []).length;
const priorityClose = (sitemap.match(/<\/priority>/g) || []).length;
if (priorityOpen !== priorityClose) failures.push(`SITEMAP_PRIORITY_TAG_MISMATCH:${priorityOpen}:${priorityClose}`);
if (/<priority>[^<]+<\/url>/.test(sitemap)) failures.push("SITEMAP_MALFORMED_PRIORITY");
if (!sitemap.trimEnd().endsWith("</urlset>")) failures.push("SITEMAP_URLSET_NOT_CLOSED");

for (const [market, locale] of Object.entries(markets)) {
  const manifest = expansionPublicationManifest(market);
  for (const entry of manifest) {
    const expectedLoc = `<loc>https://mypowersetup.com${entry.route}</loc>`;
    if (!sitemap.includes(expectedLoc)) failures.push(`${market}:${entry.route}:SITEMAP_MISSING`);
    const html = await readFile(resolve(root, entry.path), "utf8");
    if (/noindex/i.test(html)) failures.push(`${market}:${entry.route}:NOINDEX_PRESENT`);
    const canonical = `<link rel="canonical" href="https://mypowersetup.com${entry.route}">`;
    if (!html.includes(canonical)) failures.push(`${market}:${entry.route}:CANONICAL_MISSING`);
    for (const marker of privateCopyMarkers[market]) if (html.includes(marker)) failures.push(`${market}:${entry.route}:PRIVATE_COPY:${marker}`);
    if (entry.source === "home") {
      if (!html.includes(`globalThis.__MPS_${market.toUpperCase()}_PUBLICATION__=true`)) failures.push(`${market}:PUBLICATION_MARKER_MISSING`);
      for (const expectedLocale of allHomeLocales) if (!html.includes(`hreflang="${expectedLocale}"`)) failures.push(`${market}:HOME_HREFLANG_MISSING:${expectedLocale}`);
      if (!html.includes(`hreflang="${locale}" href="https://mypowersetup.com${entry.route}"`)) failures.push(`${market}:HOME_SELF_HREFLANG_INVALID`);
    }
  }
}

for (const [path, route] of [["index.html", "/"], ["sk/index.html", "/sk/"], ["pl/index.html", "/pl/"], ["hu/index.html", "/hu/"]]) {
  const html = await readFile(resolve(root, path), "utf8");
  for (const [market, locale] of Object.entries(markets)) {
    if (!html.includes(`hreflang="${locale}" href="https://mypowersetup.com/${market}/`)) failures.push(`${route}:EXPANSION_HREFLANG_MISSING:${market}`);
  }
}

console.log(JSON.stringify({ ready: failures.length === 0, failures }, null, 2));
if (failures.length) process.exitCode = 1;
