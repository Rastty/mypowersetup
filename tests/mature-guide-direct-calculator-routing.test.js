import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const directRoutes = Object.freeze({
  "pruvodce/kapacita-baterie-do-karavanu/index.html": "/kalkulacky/kapacita-baterie/",
  "pruvodce/kolik-w-solarnich-panelu/index.html": "/kalkulacky/solarni-panely/",
  "pruvodce/jak-vybrat-mppt-regulator/index.html": "/kalkulacky/mppt-regulator/",
  "pruvodce/jak-vybrat-dc-dc-nabijecku/index.html": "/kalkulacky/dc-dc-nabijecka/",
  "pruvodce/jak-velky-menic-do-karavanu/index.html": "/kalkulacky/vykon-menice/",
  "sk/sprievodca/kapacita-baterie-do-karavanu/index.html": "/sk/kalkulacky/kapacita-baterie/",
  "sk/sprievodca/kolko-w-solarnych-panelov/index.html": "/sk/kalkulacky/solarne-panely/",
  "pl/poradnik/pojemnosc-akumulatora-do-kampera/index.html": "/pl/kalkulatory/pojemnosc-akumulatora/",
  "pl/poradnik/ile-wat-paneli-solarnych-do-kampera/index.html": "/pl/kalkulatory/panele-solarne/",
  "hu/utmutatok/lakoauto-akkumulator-kapacitas/index.html": "/hu/kalkulatorok/akkumulator-kapacitas/",
  "hu/utmutatok/hany-watt-napelem-lakoautohoz/index.html": "/hu/kalkulatorok/napelem-teljesitmeny/",
});

test("high-intent money guides use their dedicated calculator when one exists", async () => {
  for (const [file, expectedHref] of Object.entries(directRoutes)) {
    const html = await readFile(file, "utf8");
    const cta = html.match(/<section class="cta">[\s\S]*?<\/section>/)?.[0] ?? "";
    const href = cta.match(/<a\s+href="([^"]+)"/)?.[1];
    assert.equal(href, expectedHref, file);
  }
});
