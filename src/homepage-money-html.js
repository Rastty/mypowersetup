import { coreMoneyLinks } from "./homepage-money-routing.js";

const GENERATED_START = "<!-- mps:home-money-links:start -->";
const GENERATED_END = "<!-- mps:home-money-links:end -->";
const GENERATED_BLOCK = new RegExp(`\\s*${escapeRegExp(GENERATED_START)}[\\s\\S]*?${escapeRegExp(GENERATED_END)}\\s*`, "g");

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[char]);
}

function extractHrefs(html) {
  return new Set([...String(html).matchAll(/<a\b[^>]*\bhref=(?:"([^"]+)"|'([^']+)')[^>]*>/gi)].map((match) => match[1] || match[2]));
}

export function renderHomepageMoneyCard(item) {
  return `<a data-money-guide href="${escapeHtml(item.href)}">\n            <span>${escapeHtml(item.label)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>\n          </a>`;
}

export function syncHomepageMoneyLinksHtml(html, { lang } = {}) {
  const source = String(html || "");
  const links = coreMoneyLinks(lang);
  if (!source || !links.length) return source;

  const withoutGenerated = source.replace(GENERATED_BLOCK, "\n");
  const gridMatch = withoutGenerated.match(/<div\s+class=(?:"guide-preview-grid"|'guide-preview-grid')[^>]*>([\s\S]*?)<\/div>/i);
  if (!gridMatch) return source;

  const existing = extractHrefs(gridMatch[1]);
  const missing = links.filter((item) => !existing.has(item.href));
  if (!missing.length) return withoutGenerated;

  const block = `\n          ${GENERATED_START}\n          ${missing.map(renderHomepageMoneyCard).join("\n          ")}\n          ${GENERATED_END}\n        `;
  const updatedGrid = gridMatch[0].replace(/<\/div>\s*$/i, `${block}</div>`);
  return withoutGenerated.replace(gridMatch[0], updatedGrid);
}

export const HOMEPAGE_MONEY_GENERATED_START = GENERATED_START;
export const HOMEPAGE_MONEY_GENERATED_END = GENERATED_END;
