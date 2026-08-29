import { readFile } from "node:fs/promises";
import { buildCommercialOpportunityBacklog, aggregateCommercialOpportunityBacklogs } from "../src/commercial-opportunity-backlog.js";

const CONFIG = [
  { market: "cs-CZ", locale: "cs", files: ["data/products.json", "data/products-ampul-cz.json"] },
  { market: "sk-SK", locale: "sk", files: ["data/products-sk.json"] },
  { market: "pl-PL", locale: "pl", files: ["data/products-pl.json"] },
  { market: "hu-HU", locale: "hu", files: ["data/products-hu.json"] },
];

async function readCatalog(config) {
  const payloads = await Promise.all(config.files.map(async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"))));
  return {
    market: config.market,
    sources: Object.assign({}, ...payloads.map((payload) => payload.sources || {})),
    products: payloads.flatMap((payload) => payload.products || []),
  };
}

const markets = [];
for (const config of CONFIG) markets.push(buildCommercialOpportunityBacklog(await readCatalog(config), config.locale));
const portfolio = aggregateCommercialOpportunityBacklogs(markets);
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), portfolio, markets }, null, 2));
