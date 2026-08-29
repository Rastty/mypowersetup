import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const port = Number(process.env.EXPANSION_PREVIEW_PORT || 4174);
const seeds = new Map([[RO_MARKET_SEED.route, RO_MARKET_SEED],[PT_MARKET_SEED.route, PT_MARKET_SEED],[SI_MARKET_SEED.route, SI_MARKET_SEED]]);
const mime = { ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };

createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    if (seeds.has(pathname)) return send(response, 200, "text/html; charset=utf-8", renderPrivateMarketSeedPage(seeds.get(pathname)));
    if (["/styles.css", "/analytics.css", "/favicon.svg", "/data/products-pt.json"].includes(pathname) || pathname.startsWith("/src/")) {
      const file = resolve(root, pathname.slice(1));
      if (!file.startsWith(root + sep)) return send(response, 403, "text/plain; charset=utf-8", "Forbidden");
      return send(response, 200, mime[extname(file)] || "application/octet-stream", await readFile(file));
    }
    return send(response, 404, "text/plain; charset=utf-8", "Not found");
  } catch {
    return send(response, 500, "text/plain; charset=utf-8", "Preview error");
  }
}).listen(port, "127.0.0.1", () => console.log(`Private expansion preview: http://127.0.0.1:${port}/ro/, /pt/ and /si/`));

function send(response, status, contentType, body) {
  response.writeHead(status, { "content-type": contentType, "x-robots-tag": "noindex, nofollow, noarchive" });
  response.end(body);
}
