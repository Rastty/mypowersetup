import { readFile, writeFile } from "node:fs/promises";

async function replaceIn(path, replacements) {
  let content = await readFile(path, "utf8");
  for (const [from, to] of replacements) {
    if (!content.includes(from)) throw new Error(`NORMALIZE_PATTERN_MISSING:${path}:${from.slice(0, 80)}`);
    content = content.replaceAll(from, to);
  }
  await writeFile(path, content, "utf8");
}

await replaceIn("src/commercial-scenarios.js", [
  ['"sk-SK": Object.freeze({ minPurchaseReadyRatio: 0.47, minWeightedCoverage: 0.79 })', '"sk-SK": Object.freeze({ minPurchaseReadyRatio: 1.0, minWeightedCoverage: 1.0 })'],
  ['"pl-PL": Object.freeze({ minPurchaseReadyRatio: 0.47, minWeightedCoverage: 0.79 })', '"pl-PL": Object.freeze({ minPurchaseReadyRatio: 1.0, minWeightedCoverage: 1.0 })'],
  ['"hu-HU": Object.freeze({ minPurchaseReadyRatio: 0.47, minWeightedCoverage: 0.79 })', '"hu-HU": Object.freeze({ minPurchaseReadyRatio: 1.0, minWeightedCoverage: 1.0 })'],
]);

await replaceIn("src/expansion-publication.js", [
  ['    ["Falhar fechado", "Sem validação, sem recomendação"],', '    ["Falhar fechado", "Sem validação, sem recomendação"],\n    ["Versão privada em validação para Portugal.", "Calculadora para Portugal."],\n    ["Pré-visualização privada para Portugal — os resultados ainda não são publicados nem indexados.", "Estimativa com base nos consumos e no perfil de viagem selecionados."],'],
  ['    ["Fail closed", "Brez preverjanja ni priporočila"],', '    ["Fail closed", "Brez preverjanja ni priporočila"],\n    ["Zasebna različica v preverjanju za Slovenijo.", "Kalkulator za Slovenijo."],\n    ["Zasebni predogled za Slovenijo — rezultati še niso javno objavljeni ali indeksirani.", "Ocena temelji na izbranih porabnikih in načinu potovanja."],'],
  ['    ["Ce capacitate de baterie are nevoie o autorulotă?", "Ce capacitate trebuie să aibă bateria unei autorulote?"],', '    ["Ce capacitate de baterie are nevoie o autorulotă?", "Ce capacitate trebuie să aibă bateria unei autorulote?"],\n    ["Versiune privată în validare pentru România.", "Calculator pentru România."],\n    ["Previzualizare privată pentru România — rezultatele nu sunt încă publicate sau indexate.", "Estimarea folosește consumatorii aleși și modul de utilizare selectat."],\n    [" h/day", " h/zi"],'],
  ['<priority>${priority}</url>`', '<priority>${priority}</priority></url>`'],
]);

await replaceIn("pt/index.html", [
  ["Versão privada em validação para Portugal.", "Calculadora para Portugal."],
  ["Pré-visualização privada para Portugal — os resultados ainda não são publicados nem indexados.", "Estimativa com base nos consumos e no perfil de viagem selecionados."],
]);
await replaceIn("si/index.html", [
  ["Zasebna različica v preverjanju za Slovenijo.", "Kalkulator za Slovenijo."],
  ["Zasebni predogled za Slovenijo — rezultati še niso javno objavljeni ali indeksirani.", "Ocena temelji na izbranih porabnikih in načinu potovanja."],
]);
await replaceIn("ro/index.html", [
  ["Versiune privată în validare pentru România.", "Calculator pentru România."],
  ["Previzualizare privată pentru România — rezultatele nu sunt încă publicate sau indexate.", "Estimarea folosește consumatorii aleși și modul de utilizare selectat."],
  [" h/day", " h/zi"],
]);

const sitemapPath = "sitemap.xml";
let sitemap = await readFile(sitemapPath, "utf8");
const broken = (sitemap.match(/<priority>[^<]+<\/url>/g) || []).length;
if (!broken) throw new Error("NORMALIZE_SITEMAP_NO_BROKEN_PRIORITY_FOUND");
sitemap = sitemap.replace(/<priority>([^<]+)<\/url>/g, "<priority>$1</priority></url>");
await writeFile(sitemapPath, sitemap, "utf8");

console.log(JSON.stringify({ ready: true, repairedSitemapEntries: broken }, null, 2));
