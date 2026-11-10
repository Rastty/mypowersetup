import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classifyCalculatorSpecialistHandoff } from "../src/calculator-copy.js";

const exact = "https://solar-expert.cz/mppt-kalkulacka/";
const approved = Object.freeze({
  href:exact,sourceSection:"mppt_string_check",intent:"mppt-sizing",locale:"cs",
});

test("the exact approved cross-site MPPT validation action has fixed, non-personal event fields",()=>{
  const event=classifyCalculatorSpecialistHandoff(approved);
  assert.deepEqual(event,{
    destination_type:"mppt_string_validation",
    destination_site:"solar-expert.cz",
    destination_path:"/mppt-kalkulacka/",
    source_section:"mppt_string_check",
    handoff_method:"manual_no_input_transfer",
  });
  assert.equal(Object.isFrozen(event),true);
  const serialized=JSON.stringify(event);
  for(const sensitive of ["href","panelWatts","systemVoltage","batteryType","affiliateUrl","productId","search","referrer"])
    assert.equal(serialized.includes(sensitive),false,sensitive);
});

test("external analytics fail closed on lookalike domains, redirects, appended parameters and unrelated pages",()=>{
  for(const href of [
    "http://solar-expert.cz/mppt-kalkulacka/",
    "https://www.solar-expert.cz/mppt-kalkulacka/",
    "https://solar-expert.cz.evil.example/mppt-kalkulacka/",
    "https://solar-expert.cz@evil.example/mppt-kalkulacka/",
    "https://solar-expert.cz:443/other/",
    "https://solar-expert.cz/mppt-kalkulacka/?panelWatts=400",
    "https://solar-expert.cz/mppt-kalkulacka/#result",
    "https://user:pass@solar-expert.cz/mppt-kalkulacka/",
    "javascript:alert(1)",
    "/mppt-kalkulacka/",
    "",
  ]) assert.equal(classifyCalculatorSpecialistHandoff({...approved,href}),null,href);
  for(const changes of [
    {locale:"sk"},{locale:"pl"},{locale:"hu"},{locale:"pt"},
    {intent:"battery-capacity"},{intent:"solar-sizing"},
    {sourceSection:"any_other_section"},{sourceSection:""},
  ]) assert.equal(classifyCalculatorSpecialistHandoff({...approved,...changes}),null,JSON.stringify(changes));
  assert.equal(classifyCalculatorSpecialistHandoff(),null);
});

test("public MPPT buyer link is enabled for opt-in delegated analytics, without adding another tracker",async()=>{
  const [html,browser,ga4]=await Promise.all([
    readFile("kalkulacky/mppt-regulator/index.html","utf8"),
    readFile("src/calculator-landing-browser.js","utf8"),
    readFile("src/ga4-live-baseline.js","utf8"),
  ]);
  assert.match(html, /id="mppt-kontrola-stringu" data-calculator-continuation-section="mppt_string_check"/);
  assert.match(html, /href="https:\/\/solar-expert\.cz\/mppt-kalkulacka\/"/);
  assert.match(html, /src="\/src\/calculator-landing-browser\.js\?v=20261110-attributed-mppt-specialist1"/);
  assert.match(browser, /classifyCalculatorSpecialistHandoff/);
  assert.match(browser, /if \(url\.origin !== window\.location\.origin\) \{/);
  assert.match(browser, /track\("calculator_landing_continue", specialist\)/);
  assert.match(browser, /document\.querySelectorAll\("\[data-calculator-continuation-section\]"\)/);
  assert.match(browser, /window\.MyPowerSetupAnalytics\?\.track/);
  assert.match(ga4, /"calculator_landing_continue"/);
  assert.doesNotMatch(html, /data-solar-expert-token|data-ga4-bypass/);
});
