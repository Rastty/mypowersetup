import test from "node:test";
import assert from "node:assert/strict";
import { PT_PRIVATE_CONTENT, getPortugalPrivatePage, renderPortugalPrivateContentPage } from "../src/private-content-pt.js";

test("Portugal private foundation contains four trust pages and an eleven-guide cluster", () => {
  assert.equal(PT_PRIVATE_CONTENT.trust.length, 4);
  assert.equal(PT_PRIVATE_CONTENT.guides.length, 11);
  assert.deepEqual(PT_PRIVATE_CONTENT.trust.map((page) => page.slug), ["sobre-o-projeto", "metodologia", "afiliacao", "privacidade"]);
  assert.equal(new Set(PT_PRIVATE_CONTENT.guides.map((page) => page.slug)).size, 11);
});

test("every Portugal private content page stays outside public discovery", () => {
  const paths = [
    ...PT_PRIVATE_CONTENT.trust.map((page) => `/pt/${page.slug}/`),
    "/pt/guias/",
    ...PT_PRIVATE_CONTENT.guides.map((page) => `/pt/guias/${page.slug}/`),
  ];
  for (const path of paths) {
    const html = renderPortugalPrivateContentPage(path);
    assert.ok(html, path);
    assert.match(html, /noindex,nofollow,noarchive/);
    assert.doesNotMatch(html, /rel="canonical"/);
    assert.doesNotMatch(html, /hreflang=/);
    assert.match(html, /Versão privada em validação para Portugal/);
  }
});

test("Portugal guides form a calculator-linked internal cluster", () => {
  for (const guide of PT_PRIVATE_CONTENT.guides) {
    const html = renderPortugalPrivateContentPage(`/pt/guias/${guide.slug}/`);
    assert.match(html, /href="\/pt\/#calculator-preview"/);
    assert.match(html, /class="related"/);
    assert.match(html, /class="cta"/);
    assert.match(html, /<h2>/);
  }
  const hub = renderPortugalPrivateContentPage("/pt/guias/");
  for (const guide of PT_PRIVATE_CONTENT.guides) assert.match(hub, new RegExp(`/pt/guias/${guide.slug}/`));
});

test("Portugal methodology preserves core calculator assumptions", () => {
  const html = renderPortugalPrivateContentPage("/pt/metodologia/");
  assert.match(html, /15%/);
  assert.match(html, /75%/);
  assert.match(html, /LiFePO₄/);
  assert.match(html, /MPPT/);
});

test("Portugal affiliate and privacy pages describe fail-closed monetization and consent", () => {
  const affiliate = renderPortugalPrivateContentPage("/pt/afiliacao/");
  assert.match(affiliate, /Destino exato/);
  assert.match(affiliate, /Falhar fechado/);
  assert.match(affiliate, /não recomendar nada/);

  const privacy = renderPortugalPrivateContentPage("/pt/privacidade/");
  assert.match(privacy, /consentimento/);
  assert.match(privacy, /Google Analytics/);
  assert.match(privacy, /Google Signals/);
});

test("Portugal guide topics cover the full initial decision journey", () => {
  const slugs = new Set(PT_PRIVATE_CONTENT.guides.map((page) => page.slug));
  for (const slug of [
    "capacidade-bateria-autocaravana",
    "lifepo4-vs-agm-autocaravana",
    "quantos-watts-paineis-solares-autocaravana",
    "como-escolher-controlador-mppt",
    "inversor-autocaravana-potencia",
    "carregador-dc-dc-autocaravana",
    "carregador-230v-bateria-autocaravana",
    "cabos-fusiveis-12v-autocaravana",
    "consumo-frigorifico-compressor-autocaravana",
    "sistema-eletrico-completo-autocaravana",
  ]) assert.ok(slugs.has(slug), slug);
});

test("unknown Portugal private routes fail closed", () => {
  assert.equal(getPortugalPrivatePage("/pt/guias/inventado/"), null);
  assert.equal(renderPortugalPrivateContentPage("/pt/guias/inventado/"), null);
});
