import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { renderHungarianPrivatePage } from "../src/page-hu.js";
import { HU_TRUST_ROUTES, renderHungarianTrustPage } from "../src/trust-pages-hu.js";
import { HU_GUIDE_ROUTES, renderHungarianGuide } from "../src/guides-hu.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const port = Number(process.env.HU_PREVIEW_PORT || 4173);
const trustKindByRoute = new Map(Object.entries(HU_TRUST_ROUTES).map(([kind, route]) => [route, kind]));
const guideKindByRoute = new Map(Object.entries(HU_GUIDE_ROUTES).map(([kind, route]) => [route, kind]));
const allowedStatic = new Set(["/styles.css", "/article.css", "/favicon.svg", "/data/products-hu.json"]);
const mime = { ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    if (pathname === "/hu/" || pathname === "/") return send(response, 200, "text/html; charset=utf-8", renderHungarianPrivatePage());
    if (trustKindByRoute.has(pathname)) return send(response, 200, "text/html; charset=utf-8", renderHungarianTrustPage(trustKindByRoute.get(pathname)));
    if (guideKindByRoute.has(pathname)) return send(response, 200, "text/html; charset=utf-8", renderHungarianGuide(guideKindByRoute.get(pathname)));
    if (allowedStatic.has(pathname) || pathname.startsWith("/src/")) {
      const file = resolve(root, pathname.slice(1));
      if (!file.startsWith(root) || (!allowedStatic.has(pathname) && !file.startsWith(resolve(root, "src")))) return send(response, 403, "text/plain", "Forbidden");
      return send(response, 200, mime[extname(file)] || "application/octet-stream", await readFile(file));
    }
    return send(response, 404, "text/plain; charset=utf-8", "Not found");
  } catch {
    return send(response, 500, "text/plain; charset=utf-8", "Preview error");
  }
}).listen(port, "127.0.0.1", () => console.log(`Private HU preview: http://127.0.0.1:${port}/hu/`));

function send(response, status, contentType, body) {
  response.writeHead(status, { "content-type": contentType, "x-robots-tag": "noindex, nofollow, noarchive" });
  response.end(body);
}
