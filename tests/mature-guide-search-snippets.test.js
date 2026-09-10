import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const guideRoots = ["/pruvodce/", "/sk/sprievodca/", "/pl/poradnik/", "/hu/utmutatok/"];

function directGuideRoutes(sitemap, prefix) {
  const routes = [...sitemap.matchAll(/<loc>https:\/\/mypowersetup\.com([^<]*)<\/loc>/g)]
    .map((match) => match[1] || "/")
    .filter((route) => route.startsWith(prefix) && route !== prefix);
  return routes.filter((route) => {
    const remainder = route.slice(prefix.length);
    return remainder.endsWith("/") && !remainder.slice(0, -1).includes("/");
  });
}

function routeFile(route) {
  return `${route.slice(1)}index.html`;
}

test("mature-market guide titles and descriptions fit useful search-snippet bounds", async () => {
  const sitemap = await readFile("sitemap.xml", "utf8");
  const titles = new Set();
  const descriptions = new Set();

  for (const root of guideRoots) {
    const guideRoutes = directGuideRoutes(sitemap, root);
    assert.equal(guideRoutes.length, 12, `${root} core guide coverage changed`);

    for (const route of guideRoutes) {
      const file = routeFile(route);
      const html = await readFile(file, "utf8");
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
      const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1] ?? "";

      assert.ok(title.length >= 35 && title.length <= 60, `${file} title has ${title.length} characters`);
      assert.ok(description.length >= 110 && description.length <= 160, `${file} description has ${description.length} characters`);
      assert.ok(!titles.has(title), `${file} duplicates a guide title`);
      assert.ok(!descriptions.has(description), `${file} duplicates a guide description`);
      titles.add(title);
      descriptions.add(description);
    }
  }
});
