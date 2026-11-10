import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const path="kalkulacky/mppt-regulator/index.html";
const expectedExternal="https://solar-expert.cz/mppt-kalkulacka/";
const expectedCanonical="https://mypowersetup.com/kalkulacky/mppt-regulator/";

test("MPPT buyer can verify panel-side Voc/Vmp using a real specialized tool, without duplicating its engine", async()=>{
  const html=await readFile(path,"utf8");
  const section=html.match(/<section class="calculator-section calculator-content-card" id="mppt-kontrola-stringu" data-calculator-continuation-section="mppt_string_check">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(section,"the check must be visible independently of dynamic offer availability");
  assert.match(section, /proud do baterie/);
  assert.match(section, /Voc/);
  assert.match(section, /Vmp/);
  assert.match(section, /počet panelů v sérii/);
  assert.match(section, /teplotní koeficient Voc/);
  assert.match(section, /Nejde o potvrzení instalace/);
  assert.match(section, /Isc/);
  const links=[...section.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>/g)];
  assert.equal(links.length,1,"only one deliberate specialty tool handoff");
  assert.equal(links[0][1],expectedExternal);
  assert.match(links[0][0],/target="_blank"/);
  assert.match(links[0][0],/rel="noopener noreferrer"/);
  assert.doesNotMatch(links[0][0],/data-affiliate|data-product-id|a_aid=|desturl=|[?&]ref=|productId=|dataLayer/);
  assert.ok(!new URL(links[0][1]).search);
  assert.equal((html.match(/data-mppt-buyers/g)||[]).length,1,"existing guarded merchant offers retained");
  assert.match(html,/data-calculator-intent="mppt-sizing"/);
  assert.match(html,/rel="canonical" href="https:\/\/mypowersetup\.com\/kalkulacky\/mppt-regulator\/"/);
});

test("a substantive new MPPT buyer verification route updates both published sitemaps and schema recency", async()=>{
  const [html,sitemap,calculators]=await Promise.all([
    readFile(path,"utf8"),readFile("sitemap.xml","utf8"),
    readFile("sitemap-calculators.xml","utf8"),
  ]);
  assert.match(html,/"dateModified":"2026-11-10"/);
  for(const xml of [sitemap,calculators]){
    assert.ok(xml.includes(`<loc>${expectedCanonical}</loc><lastmod>2026-11-10</lastmod>`),
      "the real content change must be reflected in sitemap lastmod");
    assert.equal(xml.split(`<loc>${expectedCanonical}</loc>`).length-1,1);
  }
  // Both content destinations are known public tools. No fabricated
  // conversion, data sharing, SEO uplift or qualification is asserted.
  assert.ok(html.includes('href="/pruvodce/jak-vybrat-mppt-regulator/"'));
});
