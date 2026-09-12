import { coreMoneyLinks } from "./homepage-money-routing.js";

const GENERATED_START = "<!-- mps:home-money-links:start -->";
const GENERATED_END = "<!-- mps:home-money-links:end -->";
const GENERATED_BLOCK = new RegExp(`${escapeRegExp(GENERATED_START)}[\\s\\S]*?${escapeRegExp(GENERATED_END)}`, "g");
const GRID_PATTERN = /(<div\s+class=(?:"guide-preview-grid"|'guide-preview-grid')[^>]*>)([\s\S]*?)(<\/div>)/i;

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

  const gridMatch = source.match(GRID_PATTERN);
  if (!gridMatch) return source;

  const editorialInner = gridMatch[2].replace(GENERATED_BLOCK, "").trimEnd();
  const existing = extractHrefs(editorialInner);
  const missing = links.filter((item) => !existing.has(item.href));
  const generated = missing.length
    ? `\n          ${GENERATED_START}\n          ${missing.map(renderHomepageMoneyCard).join("\n          ")}\n          ${GENERATED_END}`
    : "";
  const updatedGrid = `${gridMatch[1]}${editorialInner}${generated}\n        ${gridMatch[3]}`;
  return source.replace(gridMatch[0], updatedGrid);
}

export const HOMEPAGE_MONEY_GENERATED_START = GENERATED_START;
export const HOMEPAGE_MONEY_GENERATED_END = GENERATED_END;
