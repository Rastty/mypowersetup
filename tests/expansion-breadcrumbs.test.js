import test from "node:test";
import assert from "node:assert/strict";

import { expansionPublicationManifest, publicizeExpansionHtml } from "../src/expansion-publication.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { renderExpansionVoltageGuidePage } from "../src/expansion-voltage-guides.js";

const CASES = Object.freeze([
  Object.freeze({ market: "pt", prefix: "/pt/", hub: "/pt/guias/", homeLabel: "Início", hubLabel: "Guias", render: renderPortugalPrivateContentPage }),
  Object.freeze({ market: "ro", prefix: "/ro/", hub: "/ro/ghiduri/", homeLabel: "Acasă", hubLabel: "Ghiduri", render: renderRomaniaPrivateContentPage }),
  Object.freeze({ market: "si", prefix: "/si/", hub: "/si/vodici/", homeLabel: "Domov", hubLabel: "Vodniki", render: renderSloveniaPrivateContentPage }),
]);

test("all PT RO SI guide articles expose visible and structured breadcrumbs", () => {
  let checked = 0;

  for (const entry of CASES) {
    const routes = expansionPublicationManifest(entry.market)
      .map(({ route }) => route)
      .filter((route) => route.startsWith(entry.hub) && route !== entry.hub);

    assert.equal(routes.length, 12, `${entry.market}: guide coverage changed`);

    for (const route of routes) {
      const privateHtml = entry.render(route) || renderExpansionVoltageGuidePage(entry.market, route);
      assert.ok(privateHtml, `${route}: private render missing`);

      const html = publicizeExpansionHtml(privateHtml, entry.market, route);
      const nav = html.match(/<nav class="breadcrumbs" data-expansion-breadcrumbs[\s\S]*?<\/nav>/i)?.[0] || "";
      assert.ok(nav, `${route}: visible breadcrumbs missing`);
      assert.match(nav, new RegExp(`href="${escapeRegExp(entry.prefix)}"`), `${route}: home breadcrumb missing`);
      assert.match(nav, new RegExp(`href="${escapeRegExp(entry.hub)}"`), `${route}: hub breadcrumb missing`);
      assert.match(nav, /aria-current="page"/, `${route}: current breadcrumb missing`);

      const scriptMatches = [...html.matchAll(/<script\b[^>]*data-expansion-breadcrumb-schema[^>]*>([\s\S]*?)<\/script>/gi)];
      assert.equal(scriptMatches.length, 1, `${route}: expected one breadcrumb schema`);
      const schema = JSON.parse(scriptMatches[0][1]);

      assert.equal(schema["@type"], "BreadcrumbList", `${route}: wrong schema type`);
      assert.deepEqual(
        schema.itemListElement.map(({ position, name, item }) => ({ position, name, item })),
        [
          { position: 1, name: entry.homeLabel, item: `https://mypowersetup.com${entry.prefix}` },
          { position: 2, name: entry.hubLabel, item: `https://mypowersetup.com${entry.hub}` },
          { position: 3, name: currentHeading(html), item: `https://mypowersetup.com${route}` },
        ],
        `${route}: breadcrumb hierarchy drift`
      );

      const secondPass = publicizeExpansionHtml(html, entry.market, route);
      assert.equal(
        (secondPass.match(/data-expansion-breadcrumb-schema/g) || []).length,
        1,
        `${route}: breadcrumb schema is not idempotent`
      );
      assert.equal(
        (secondPass.match(/data-expansion-breadcrumbs/g) || []).length,
        1,
        `${route}: visible breadcrumbs are not idempotent`
      );
      checked += 1;
    }

    const hubPrivate = entry.render(entry.hub);
    const hubHtml = publicizeExpansionHtml(hubPrivate, entry.market, entry.hub);
    assert.doesNotMatch(hubHtml, /data-expansion-breadcrumb/, `${entry.hub}: hub must not receive article breadcrumbs`);
  }

  assert.equal(checked, 36);
});

function currentHeading(html) {
  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  return heading.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}
