import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const cases = [
  ["cs", "pruvodce/schema-elektroinstalace-karavanu/index.html", "/pruvodce/power-station-nebo-pevna-instalace-karavan/"],
  ["sk", "sk/sprievodca/schema-elektroinstalacie-karavanu/index.html", "/sk/sprievodca/power-station-alebo-pevna-instalacia-karavan/"],
  ["pl", "pl/poradnik/schemat-instalacji-elektrycznej-kampera/index.html", "/pl/poradnik/power-station-czy-stala-instalacja-kamper/"],
  ["hu", "hu/utmutatok/lakoauto-elektromos-rendszer-kapcsolasi-rajz/index.html", "/hu/utmutatok/power-station-vagy-beepitett-rendszer-lakoauto/"],
];

for (const [market, file, target] of cases) {
  test(`${market} electrical architecture offers a relevant early link to the local portable-vs-fixed decision`, () => {
    const html = readFileSync(`${root}/${file}`, "utf8");
    const handoffs = [...html.matchAll(/<p data-portable-vs-fixed-handoff>([\s\S]*?)<\/p>/g)];
    assert.equal(handoffs.length, 1, `${file}: exactly one intent-matched handoff`);
    const snippet = handoffs[0][0];
    assert.match(snippet, new RegExp(`href="${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    assert.ok(html.indexOf(snippet) > html.indexOf('class="answer"'));
    assert.ok(html.indexOf(snippet) < html.indexOf('<h2 id='), "decision link precedes technical sections");
    assert.ok(!/nofollow|sponsored|utm_|target="_blank"/.test(snippet), "an internal editorial link is not an ad or external jump");
    assert.equal(existsSync(`${root}/${target.slice(1)}index.html`), true, "linked guide exists locally");
    for (const [, , otherTarget] of cases) {
      if (otherTarget !== target) assert.equal(html.includes(`href="${otherTarget}"`), false, "no wrong-market editorial link");
    }
  });
}
