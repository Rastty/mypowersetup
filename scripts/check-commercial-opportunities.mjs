import { readFile } from "node:fs/promises";
import { buildCommercialOpportunityBacklog, aggregateCommercialOpportunityBacklogs } from "../src/commercial-opportunity-backlog.js";
import { COMMERCIAL_MARKET_CONFIG } from "../src/commercial-market-config.js";

async function readCatalog(config) {
  const payloads = await Promise.all(config.files.map(async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"))));
  return {
    market: config.market,
    sources: Object.assign({}, ...payloads.map((payload) => payload.sources || {})),
    products: payloads.flatMap((payload) => payload.products || []),
  };
}

const markets = [];
for (const config of COMMERCIAL_MARKET_CONFIG) markets.push(buildCommercialOpportunityBacklog(await readCatalog(config), config.locale));
const portfolio = aggregateCommercialOpportunityBacklogs(markets);
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), portfolio, markets }, null, 2));
