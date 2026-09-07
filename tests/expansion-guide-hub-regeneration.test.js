import test from "node:test";
import assert from "node:assert/strict";

import { publicizeExpansionHtml } from "../src/expansion-publication.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";

const CASES = Object.freeze([
  Object.freeze({
    market: "pt",
    route: "/pt/guias/",
    render: renderPortugalPrivateContentPage,
    locale: "pt-PT",
    home: "/pt/",
    homeLabel: "Início",
    hubLabel: "Guias",
  }),
  Object.freeze({
    market: "ro",
    route: "/ro/ghiduri/",
    render: renderRomaniaPrivateContentPage,
    locale: "ro-RO",
    home: "/ro/",
    homeLabel: "Acasă",
    hubLabel: "Ghiduri",
  }),
  Object.freeze({
    market: "si",
    route: "/si/vodici/",
    render: renderSloveniaPrivateContentPage,
    locale: "sl-SI",
    home: "/si/",
    homeLabel: "Domov",
    hubLabel: "Vodniki",
  }),
]);

test("PT RO SI hub regeneration preserves CollectionPage ItemList and breadcrumb schema", () => {
  for (const entry of CASES) {
    const source = entry.render(entry.route);
    assert.ok(source, `${entry.route}: hub render missing`);
    const html = publicizeExpansionHtml(source, entry.market, entry.route);

    const scripts = [...html.matchAll(/<script\b[^>]*data-guide-hub-schema[^>]*>([\s\S]*?)<\/script>/gi)];
    assert.equal(scripts.length, 1, `${entry.route}: expected one hub schema`);
    const schema = JSON.parse(scripts[0][1]);
    const nodes = schema["@graph"];
    assert.ok(Array.isArray(nodes));

    const page = nodes.find((node) => node?.["@type"] === "CollectionPage");
    const list = nodes.find((node) => node?.["@type"] === "ItemList");
    const breadcrumbs = nodes.find((node) => node?.["@type"] === "BreadcrumbList");

    assert.equal(page?.url, `https://mypowersetup.com${entry.route}`);
    assert.equal(page?.inLanguage, entry.locale);
    assert.equal(page?.dateModified, "2026-09-07");
    assert.equal(list?.numberOfItems, 12);
    assert.equal(list?.itemListElement?.length, 12);
    assert.ok(list.itemListElement.every((item, index) =>
      item?.["@type"] === "ListItem"
      && item.position === index + 1
      && typeof item.item === "string"
      && item.item.startsWith(`https://mypowersetup.com${entry.route}`)
    ));

    assert.deepEqual(
      breadcrumbs?.itemListElement?.map(({ position, name, item }) => ({ position, name, item })),
      [
        { position: 1, name: entry.homeLabel, item: `https://mypowersetup.com${entry.home}` },
        { position: 2, name: entry.hubLabel, item: `https://mypowersetup.com${entry.route}` },
      ]
    );

    const second = publicizeExpansionHtml(html, entry.market, entry.route);
    assert.equal((second.match(/data-guide-hub-schema/g) || []).length, 1, `${entry.route}: hub schema is not idempotent`);
  }
});
