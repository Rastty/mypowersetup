import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  assertExpansionMoneyGuideSeo,
  enhanceExpansionMoneyGuideSeo,
  expansionMoneyGuidePublicPath,
  expansionMoneyGuideRoutes,
} from "../src/expansion-money-guide-seo.js";

test("all 18 expansion money guides keep FAQ schema visible and social metadata complete", async () => {
  const routes = expansionMoneyGuideRoutes();
  assert.equal(routes.length, 18);
  for (const route of routes) {
    const html = await readFile(new URL(`../${expansionMoneyGuidePublicPath(route)}`, import.meta.url), "utf8");
    assert.equal(assertExpansionMoneyGuideSeo(html, route), true, route);
    assert.equal(enhanceExpansionMoneyGuideSeo(html, route), html, `${route} is idempotent`);
  }
});

test("transform materializes schema FAQ when it is not visible and remains idempotent", () => {
  const route = "/ro/ghiduri/capacitate-baterie-autorulota/";
  const schema = {
    "@context": "https://schema.org",
    "@graph": [{
      "@type": "Article",
      headline: "Test",
    }, {
      "@type": "FAQPage",
      mainEntity: [{
        "@type": "Question",
        name: "Întrebare test?",
        acceptedAnswer: { "@type": "Answer", text: "Răspuns test." },
      }],
    }],
  };
  const html = `<!doctype html><html><head><meta name="description" content="Descriere suficientă."><title>Titlu test</title><script type="application/ld+json">${JSON.stringify(schema)}</script><link rel="canonical" href="https://mypowersetup.com${route}"></head><body><main><h1>Titlu test</h1><aside class="related" data-contextual-growth-links><h2>Mai departe</h2></aside></main></body></html>`;
  const output = enhanceExpansionMoneyGuideSeo(html, route);
  assert.match(output, /data-guide-faq/);
  assert.match(output, /Întrebare test\?/);
  assert.match(output, /Răspuns test\./);
  assert.match(output, /property="og:type" content="article"/);
  assert.match(output, /name="twitter:card" content="summary_large_image"/);
  assert.equal(enhanceExpansionMoneyGuideSeo(output, route), output);
});

test("existing visible FAQ is preserved instead of duplicated", () => {
  const route = "/pt/guias/capacidade-bateria-autocaravana/";
  const schema = {
    "@context": "https://schema.org",
    "@graph": [{
      "@type": "FAQPage",
      mainEntity: [{
        "@type": "Question",
        name: "Pergunta existente?",
        acceptedAnswer: { "@type": "Answer", text: "Resposta existente." },
      }],
    }],
  };
  const html = `<!doctype html><html><head><meta name="description" content="Descrição."><title>Título</title><script type="application/ld+json">${JSON.stringify(schema)}</script><link rel="canonical" href="https://mypowersetup.com${route}"></head><body><main><section><h2>Perguntas frequentes</h2><h3>Pergunta existente?</h3><p>Resposta existente.</p></section><aside class="cta"></aside></main></body></html>`;
  const output = enhanceExpansionMoneyGuideSeo(html, route);
  assert.doesNotMatch(output, /data-guide-faq/);
  assert.equal((output.match(/Pergunta existente\?/g) || []).length, 2);
});
