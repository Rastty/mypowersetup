import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const port = Number(process.env.EXPANSION_PREVIEW_PORT || 4174);
const seeds = new Map([[RO_MARKET_SEED.route, RO_MARKET_SEED], [PT_MARKET_SEED.route, PT_MARKET_SEED]]);
const mime = { ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };

createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    if (seeds.has(pathname)) return send(response, 200, "text/html; charset=utf-8", renderPrivateMarketSeedPage(seeds.get(pathname)));
    if (["/styles.css", "/favicon.svg"].includes(pathname)) {
      const file = resolve(root, pathname.slice(1));
      return send(response, 200, mime[extname(file)] || "application/octet-stream", await readFile(file));
    }
    return send(response, 404, "text/plain; charset=utf-8", "Not found");
  } catch {
    return send(response, 500, "text/plain; charset=utf-8", "Preview error");
  }
}).listen(port, "127.0.0.1", () => console.log(`Private RO/PT preview: http://127.0.0.1:${port}/ro/ and /pt/`));

function send(response, status, contentType, body) {
  response.writeHead(status, { "content-type": contentType, "x-robots-tag": "noindex, nofollow, noarchive" });
  response.end(body);
}
