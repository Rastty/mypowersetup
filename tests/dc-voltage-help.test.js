import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { dcVoltageGuide, renderDcLoadVoltageNotice } from "../src/dc-voltage-help.js";

test("seven 24V safety notices link only to their published local 12V/24V guide", async () => {
  for (const locale of ["cs", "sk", "pl", "hu", "pt", "ro", "si"]) {
    const guide = dcVoltageGuide(locale);
    assert.ok(guide, `${locale}: missing guide`);
    assert.ok(guide.href.startsWith("/") && guide.href.endsWith("/"), `${locale}: nonlocal guide`);
    await access(new URL(`../${guide.href.slice(1)}index.html`, import.meta.url));

    const notice = renderDcLoadVoltageNotice('Confirm <24V> & "12V"', locale);
    assert.match(notice, /class="dc-voltage-warning" role="note"/);
    assert.ok(notice.includes(`href="${guide.href}"`), `${locale}: wrong guide`);
    assert.match(notice, /data-dc-voltage-guide data-result-guide data-topic="system_voltage"/);
    assert.ok(notice.includes("Confirm &lt;24V&gt; &amp; &quot;12V&quot;"));
    assert.doesNotMatch(notice, /href="https?:|href="\/\//);
    assert.doesNotMatch(notice, /<24V>/);
  }
});

test("no 24V DC load warning means no extra guide or purchase implication", () => {
  assert.equal(renderDcLoadVoltageNotice(null, "cs"), "");
  assert.equal(renderDcLoadVoltageNotice("  ", "pt"), "");
  const unknown = renderDcLoadVoltageNotice("Check compatibility", "xx");
  assert.ok(unknown.includes("Check compatibility"));
  assert.doesNotMatch(unknown, /<a /);
  assert.equal(dcVoltageGuide("xx"), null);
});
