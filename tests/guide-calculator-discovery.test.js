import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const routes = [
  ["vydrz-baterie", "/kalkulacky/vydrz-baterie/"],
  ["mppt-regulator", "/kalkulacky/mppt-regulator/"],
  ["vykon-menice", "/kalkulacky/vykon-menice/"],
];

test("guide hub offers human-readable direct paths to the three relevant calculators", async () => {
  const hub = await read("pruvodce/index.html");
  assert.match(hub, /id="rychle-kalkulacky"/);
  for (const [name, route] of routes) {
    assert.ok(hub.includes(`href="${route}"`), name);
    const calculator = await read(`kalkulacky/${name}/index.html`);
    assert.ok(calculator.includes(`rel="canonical" href="https://mypowersetup.com${route}"`), name);
  }
});

test("buyer-intent guides lead to suitable calculators without claiming complete installation safety", async () => {
  const [wiring, power] = await Promise.all([
    read("pruvodce/schema-elektroinstalace-karavanu/index.html"),
    read("pruvodce/power-station-nebo-pevna-instalace-karavan/index.html"),
  ]);
  assert.ok(wiring.includes('href="/kalkulacky/vykon-menice/"'));
  assert.ok(power.includes('href="/kalkulacky/kapacita-baterie/"'));
  assert.ok(power.includes('href="/kalkulacky/vykon-menice/"'));
  assert.match(wiring, /nenahrazuje kontrolu baterie, BMS ani elektroprojekt/);
  assert.match(power, /samotný výpočet neověří/i);
});

test("changed Czech guide URLs have matching semantic and sitemap modification dates", async () => {
  const sitemap = await read("sitemap.xml");
  for (const [path, modified] of [
    ["pruvodce/", "2026-11-15"],
    ["pruvodce/schema-elektroinstalace-karavanu/", "2026-11-17"],
    ["pruvodce/power-station-nebo-pevna-instalace-karavan/", "2026-11-15"],
  ]) {
    const html = await read(`${path}index.html`);
    assert.ok(html.includes(`"dateModified":"${modified}"`), path);
    assert.ok(sitemap.includes(`<loc>https://mypowersetup.com/${path}</loc><lastmod>${modified}</lastmod>`), path);
  }
});
