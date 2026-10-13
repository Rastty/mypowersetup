import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";

const root = "https://mypowersetup.com";
const routes = [
  "/pruvodce/jak-vybrat-mppt-regulator/",
  "/sk/sprievodca/ako-vybrat-mppt-regulator/",
  "/pl/poradnik/jak-dobrac-regulator-mppt/",
  "/hu/utmutatok/mppt-szabalyozo-kivalasztasa/",
];
const examples = Object.fromEntries(routes.map((route, index) => [route, ["cs", "sk", "pl", "hu"][index]]));
const externalTechnicalSource = "https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_75-10_up_to_100-20/en/technical-specifications.html";

test("four localized MPPT buying guides show grounded comparison, trustworthy source and working routes", async () => {
  const sitemap = await readFile("sitemap.xml", "utf8");
  for (const route of routes) {
    const file = route.slice(1) + "index.html";
    const html = await readFile(file, "utf8");
    const section = html.match(/<section\s+data-mppt-practical-example="([^"]+)">([\s\S]*?)<\/section>/)?.[0] || "";
    assert.ok(section, `${route}: missing practical comparison`);
    assert.match(section, new RegExp(`data-mppt-practical-example="${examples[route]}"`));
    for (const required of ["200 Wp", "400 Wp", "13,9 A", "27,8 A", "48,6 V", "Voc", "Isc", "290 W", "580 W"]) {
      assert.ok(section.includes(required), `${route}: missing ${required}`);
    }
    assert.equal((section.match(/<tr>/g) || []).length, 4, `${route}: three examples with headers expected`);
    assert.ok(section.includes(externalTechnicalSource), `${route}: missing manufacturer source`);
    assert.match(html, /"dateModified":"2026-10-13"/);
    const sitemapUrl = root + route;
    const row = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].find((match) => match[1].includes(`<loc>${sitemapUrl}</loc>`))?.[1] || "";
    assert.match(row, /<lastmod>2026-10-13<\/lastmod>/, `${route}: sitemap lastmod must match article`);
    for (const link of section.matchAll(/href="([^"]+)"/g)) {
      const target = link[1];
      if (/^https:\/\//.test(target)) continue;
      assert.ok(target.startsWith("/") && target.endsWith("/"), `${route}: expected a public internal landing route: ${target}`);
      await access(target === "/" ? "index.html" : target.slice(1) + "index.html");
    }
  }
});
