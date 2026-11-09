import { spawn, spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

class CdpClient {
  static async connect(url) {
    const client = new CdpClient(url);
    await client.opened;
    return client;
  }

  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.exceptions = [];
    this.socket = new WebSocket(url);
    this.opened = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown") {
        this.exceptions.push(message.params?.exceptionDetails?.exception?.description ||
          message.params?.exceptionDetails?.text || "unknown JS exception");
      }
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(`CDP ${message.error.code}: ${message.error.message}`));
      else resolve(message.result || {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    for (const { reject } of this.pending.values()) reject(new Error("CDP connection closed"));
    this.pending.clear();
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise((resolve) => this.socket.addEventListener("close", resolve, { once: true }));
    this.socket.close();
    await Promise.race([closed, delay(500)]);
  }
}

const markets = [
  { locale: "cs", route: "/", lang: "cs", guide: "/pruvodce/", canonical: "/" },
  { locale: "sk", route: "/sk/", lang: "sk", guide: "/sk/sprievodca/", canonical: "/sk/" },
  { locale: "pl", route: "/pl/", lang: "pl", guide: "/pl/poradnik/", canonical: "/pl/" },
];
const expectedHreflangs = ["cs-CZ", "sk-SK", "pl-PL", "x-default"];
const port = Number(process.env.PUBLIC_SMOKE_PORT || 4184);
const origin = `http://127.0.0.1:${port}`;
const chromeBin = findChrome();
const server = spawn(process.execPath, ["server.mjs"], {
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
const serverDiagnostics = captureDiagnostics(server);
// Starting Chrome while the local server boots can starve the GitHub runner.
// Launch it only once HTTP is ready, and retry a startup that never exposes
// DevToolsActivePort. Do not skip the mobile/browser assertions.
let chrome;
let profileDir;
async function launchChromeWithRetry() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    profileDir = `/tmp/mypowersetup-public-chrome-${process.pid}-${attempt}`;
    chrome = spawn(chromeBin, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-allow-origins=*",
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    const diagnostics = captureDiagnostics(chrome);
    try {
      const debugPort = await waitForDevToolsPort(profileDir, chrome, diagnostics);
      return await waitForChromeTarget(debugPort, chrome, diagnostics);
    } catch (error) {
      lastError = error;
      if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill("SIGTERM");
      await waitForExit(chrome);
      await cleanupProfile(profileDir);
      console.warn(`Public mobile Chrome startup retry ${attempt}/3: ${error.message.split(":")[0]}`);
    }
  }
  throw lastError;
}

let cdp;
try {
  await waitForHttp(`${origin}/`, server, serverDiagnostics, "SERVER");
  const target = await launchChromeWithRetry();
  cdp = await CdpClient.connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

  const reports = [];
  for (const market of markets) reports.push(await smokeMarket(cdp, market));
  const batteryUpgrade = await smokeBatteryUpgrade(cdp);
  const fridgeGuide = await smokeFridgeGuideHandoff(cdp);
  const mpptBuyerMatches = await smokeMpptBuyerMatches(cdp);

  console.log(JSON.stringify({
    ok: true,
    chrome: chromeBin,
    viewport: "390x844",
    markets: reports,
    batteryUpgrade,
    fridgeGuide,
    mpptBuyerMatches,
  }, null, 2));
} finally {
  if (cdp) await cdp.send("Browser.close").catch(() => {});
  await cdp?.close().catch(() => {});
  server.kill("SIGTERM");
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) chrome.kill("SIGTERM");
  await Promise.allSettled([waitForExit(server), chrome ? waitForExit(chrome) : Promise.resolve()]);
  if (profileDir) await cleanupProfile(profileDir);
}

async function smokeMarket(client, market) {
  const pageUrl = `${origin}${market.route}`;
  await client.send("Page.navigate", { url: pageUrl });
  await waitFor(async () => await evaluate(client, `document.readyState === "complete" && Boolean(document.querySelector("#setup-form"))`));
  await waitFor(async () => await evaluate(client, `document.querySelectorAll("[data-appliance-card]").length > 0`));
  await delay(150);

  const initial = await evaluate(client, `(() => ({
    lang: document.documentElement.lang,
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    robots: document.querySelector('meta[name="robots"]')?.content || "",
    hreflangs: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map((node) => node.hreflang),
    guideHref: document.querySelector('a[href="${market.guide}"]')?.getAttribute("href") || null,
    hoursInputMode: document.querySelector("[data-hours]")?.inputMode || null,
    quantityInputMode: document.querySelector("[data-quantity]")?.inputMode || null
  }))()`);

  assert(initial.lang === market.lang, `${market.locale}: expected document lang ${market.lang}, got ${initial.lang}`);
  assert(initial.width === 390, `${market.locale}: expected 390px viewport, got ${initial.width}`);
  assert(initial.scrollWidth <= initial.width + 2, `${market.locale}: homepage overflows horizontally`);
  assert(initial.canonical === `https://mypowersetup.com${market.canonical}`, `${market.locale}: canonical mismatch ${initial.canonical}`);
  assert(!/noindex/i.test(initial.robots), `${market.locale}: public homepage unexpectedly contains noindex`);
  for (const hreflang of expectedHreflangs) assert(initial.hreflangs.includes(hreflang), `${market.locale}: missing ${hreflang} hreflang`);
  assert(initial.guideHref === market.guide, `${market.locale}: guide hub link is missing`);
  assert(initial.hoursInputMode === "decimal", `${market.locale}: hours inputmode is ${initial.hoursInputMode}`);
  assert(initial.quantityInputMode === "numeric", `${market.locale}: quantity inputmode is ${initial.quantityInputMode}`);

  await evaluate(client, `document.querySelector("[data-next]").click()`);
  await waitFor(async () => await evaluate(client, `document.querySelector('[data-step="2"]').hidden === false`));
  const stepTwo = await evaluate(client, `(() => {
    for (const id of ["fridge", "laptop"]) {
      const checkbox = document.querySelector('[data-appliance-card="' + id + '"] input[name="appliance"]');
      if (!checkbox) throw new Error("Missing appliance " + id);
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return {
      selected: document.querySelector("#selected-count")?.textContent,
      daily: document.querySelector("#live-consumption")?.textContent,
      scrollWidth: document.documentElement.scrollWidth,
      width: window.innerWidth
    };
  })()`);
  assert(Number(stepTwo.selected) === 2, `${market.locale}: expected 2 selected appliances, got ${stepTwo.selected}`);
  assert(stepTwo.daily && !/^0(?:\D|$)/.test(stepTwo.daily), `${market.locale}: daily consumption did not update: ${stepTwo.daily}`);
  assert(stepTwo.scrollWidth <= stepTwo.width + 2, `${market.locale}: step 2 overflows horizontally`);

  await evaluate(client, `document.querySelector("#setup-form").requestSubmit()`);
  await waitFor(async () => await evaluate(client, `document.querySelector('[data-step="3"]').hidden === false`));
  await waitFor(async () => await evaluate(client, `document.querySelectorAll("#recommendation-groups .product-card").length > 0`), 120);

  const result = await evaluate(client, `(() => ({
    productCards: document.querySelectorAll("#recommendation-groups .product-card").length,
    productGroups: document.querySelectorAll("#recommendation-groups .product-group").length,
    firstAffiliateHref: document.querySelector("#recommendation-groups [data-affiliate-click]")?.href || null,
    firstAffiliateRel: document.querySelector("#recommendation-groups [data-affiliate-click]")?.rel || null,
    recommendationHeading: document.querySelector("#product-heading")?.textContent?.trim() || null,
    scrollWidth: document.documentElement.scrollWidth,
    width: window.innerWidth
  }))()`);
  assert(result.productCards > 0 && result.productGroups > 0, `${market.locale}: no verified product recommendations rendered`);
  assert(result.firstAffiliateHref?.startsWith("https://"), `${market.locale}: recommendation has no HTTPS affiliate destination`);
  assert(result.firstAffiliateRel?.includes("sponsored"), `${market.locale}: affiliate link is missing rel=sponsored`);
  assert(Boolean(result.recommendationHeading), `${market.locale}: recommendation heading is empty`);
  assert(result.scrollWidth <= result.width + 2, `${market.locale}: result view overflows horizontally`);

  const guideResponse = await fetch(`${origin}${market.guide}`);
  assert(guideResponse.ok, `${market.locale}: guide hub returned HTTP ${guideResponse.status}`);
  const guideHtml = await guideResponse.text();
  assert(guideHtml.includes(`<html lang="${market.lang}"`), `${market.locale}: guide hub language is wrong`);
  assert(/rel="canonical"/.test(guideHtml), `${market.locale}: guide hub is missing canonical`);

  return {
    locale: market.locale,
    selectedAppliances: Number(stepTwo.selected),
    productGroups: result.productGroups,
    productCards: result.productCards,
    horizontalOverflow: false,
  };
}


async function smokeBatteryUpgrade(client) {
  // Browser-prove the measurable next step: invalidation, exact input transfer,
  // mobile navigation, and a visibly editable two-day receiving assumption.
  await client.send("Page.navigate", { url: origin + "/kalkulacky/vydrz-baterie/" });
  await waitFor(async () => await evaluate(client,
    'document.readyState === "complete" && Boolean(document.querySelector("[data-calculator-handoff]"))'));

  const invalidated = await evaluate(client,
    '(function(){ const form=document.querySelector("[data-calculator-form]"); for (const [name,value] of Object.entries({batteryCapacityAh:"150",systemVoltage:"24",batteryType:"lead",dailyWh:"1200"})){ const field=form.elements.namedItem(name); if(!field) throw new Error("missing "+name); field.value=value; field.dispatchEvent(new Event("change",{bubbles:true})); } return {resultHidden:document.querySelector("[data-calculator-result]").hidden, staleNoticeVisible:!document.querySelector("[data-calculator-stale]").hidden}; })()');
  assert(invalidated.resultHidden && invalidated.staleNoticeVisible,
    "battery result was not invalidated after changing the form");

  await evaluate(client, 'document.querySelector("[data-calculator-form]").requestSubmit()');
  await waitFor(async () => await evaluate(client,
    '(function(){ const link=document.querySelector("[data-calculator-handoff]"); return Boolean(link && !link.hidden && !document.querySelector("[data-calculator-result]").hidden); })()'));

  const outgoing = await evaluate(client,
    '(function(){ const link=document.querySelector("[data-calculator-handoff]"); return {href:link.getAttribute("href"),label:link.textContent.trim(),width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth}; })()');
  const destination = new URL(outgoing.href, origin);
  assert(destination.origin === origin && destination.pathname === "/kalkulacky/kapacita-baterie/",
    "battery upgrade has wrong destination");
  for (const [key,value] of Object.entries({
    mps_from:"battery-autonomy",dailyWh:"1200",systemVoltage:"24",batteryType:"lead"
  })) assert(destination.searchParams.get(key) === value, "battery handoff lost "+key);
  assert(outgoing.label.includes("2 dny"), "battery upgrade hides editable two-day target");
  assert(outgoing.scrollWidth <= outgoing.width + 2, "battery autonomy overflows mobile screen");

  await evaluate(client, 'document.querySelector("[data-calculator-handoff]").click()');
  await waitFor(async () => await evaluate(client,
    '(function(){ const form=document.querySelector("[data-calculator-form]"); return location.pathname === "/kalkulacky/kapacita-baterie/" && Boolean(form) && form.elements.namedItem("dailyWh").value === "1200" && form.elements.namedItem("systemVoltage").value === "24" && form.elements.namedItem("batteryType").value === "lead"; })()'));

  const incoming = await evaluate(client,
    '(function(){ const form=document.querySelector("[data-calculator-form]"); return {days:form.elements.namedItem("autonomyDays").value,resultVisible:!document.querySelector("[data-calculator-result]").hidden,width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth}; })()');
  assert(incoming.days === "2", "destination silently changed required days of autonomy");
  assert(incoming.resultVisible, "receiving battery sizing result did not render");
  assert(incoming.scrollWidth <= incoming.width + 2, "receiving capacity form overflows mobile screen");
  return {
    source: "/kalkulacky/vydrz-baterie/",
    destination: destination.pathname,
    preserved: ["dailyWh", "systemVoltage", "batteryType"],
    editableAutonomyDays: Number(incoming.days),
    staleResultInvalidated: true,
    mobileHorizontalOverflow: false,
  };
}


async function smokeFridgeGuideHandoff(client) {
  const guidePath = "/pruvodce/spotreba-kompresorove-lednice/";
  const destination = "/kalkulacky/vydrz-baterie/";
  const cases = [
    { dailyWh: "270", measuredWh: 268 },
    { dailyWh: "560", measuredWh: 557 },
    { dailyWh: "270", measuredWh: 268, community: true },
  ];
  const communitySearch = "?utm_source=reddit&utm_medium=community&utm_campaign=cz_technical_help&utm_content=fridge-help-01";
  for (const { dailyWh, measuredWh, community = false } of cases) {
    await client.send("Page.navigate", { url: origin + guidePath + (community ? communitySearch : "") });
    await waitFor(async () => await evaluate(client, 'document.readyState === "complete" && document.querySelectorAll("a[href*=\\"mps_from=fridge-guide\\"]").length === 2'));
    const link = await evaluate(client,
      '(function(){ const a=Array.from(document.querySelectorAll("a[href]")).find(a=>a.href.includes("mps_from=fridge-guide") && a.href.includes("dailyWh=' + dailyWh + '")); return a && {href:a.getAttribute("href"),width:innerWidth,scrollWidth:document.documentElement.scrollWidth}; })()');
    assert(link && link.href.includes("dailyWh=" + dailyWh), "measured fridge scenario link missing");
    assert(link.scrollWidth <= link.width + 2, "fridge guide overflows 390px");
    assert(Number(dailyWh) >= measuredWh && Number(dailyWh) - measuredWh < 10,
      "fridge case was not rounded conservatively to form step");
    await evaluate(client,
      '(function(){ Array.from(document.querySelectorAll("a[href]")).find(a=>a.href.includes("mps_from=fridge-guide") && a.href.includes("dailyWh=' + dailyWh + '")).click(); })()');
    await waitFor(async () => await evaluate(client,
      '(function(){ const f=document.querySelector("[data-calculator-form]"); return location.pathname==="/kalkulacky/vydrz-baterie/" && f?.elements.namedItem("dailyWh").value==="' + dailyWh + '" && !document.querySelector("[data-calculator-result]").hidden; })()'));
    const arrival = await evaluate(client,
      '(function(){ const f=document.querySelector("[data-calculator-form]"); return {dailyWh:f.elements.namedItem("dailyWh").value,capacity:f.elements.namedItem("batteryCapacityAh").value,voltage:f.elements.namedItem("systemVoltage").value,chemistry:f.elements.namedItem("batteryType").value,note:f.querySelector("[role=status]")?.textContent||"",search:location.search,width:innerWidth,scrollWidth:document.documentElement.scrollWidth}; })()');
    assert(arrival.dailyWh === dailyWh && arrival.capacity === "100"
      && arrival.voltage === "12" && arrival.chemistry === "lifepo4",
      "guide handoff silently changed unverified battery parameters");
    assert(arrival.note.includes("lednice"), "guide scenario prefill notice missing");
    assert(arrival.scrollWidth <= arrival.width + 2, "receiving battery form overflows 390px");
    if (community) {
      const utm = new URLSearchParams(arrival.search);
      assert(utm.get("utm_source") === "reddit" && utm.get("utm_medium") === "community"
        && utm.get("utm_campaign") === "cz_technical_help"
        && utm.get("utm_content") === "fridge-help-01",
        "community attribution did not survive guide-to-calculator navigation");
    }
  }
  return { source: guidePath, destination, measuredDailyWh: [268,557],
    roundedFormDailyWh: [270,560], communityAttributionPreserved: true, untouchedBatteryFields: true,
    mobileHorizontalOverflow: false };
}


async function smokeMpptBuyerMatches(client) {
  await client.send("Page.navigate", { url: origin + "/kalkulacky/mppt-regulator/" });
  await waitFor(async () => await evaluate(client,
    'document.readyState === "complete" && Boolean(document.querySelector("[data-calculator-intent=mppt-sizing] [data-calculator-form]"))'));
  const before = await evaluate(client, '(() => { const root=document.querySelector("[data-calculator-landing]"); const p=root.querySelector("[data-mppt-buyers]"); return {hidden:p.hidden,links:p.querySelectorAll("a[data-affiliate-click]").length,result:!root.querySelector("[data-calculator-result]").hidden,overflow:document.documentElement.scrollWidth>innerWidth+2}; })()');
  assert(before.hidden && before.links === 0 && before.result && !before.overflow,
    "MPPT preview must not show unverified offers or horizontally overflow");

  await evaluate(client, 'document.querySelector("[data-calculator-intent=mppt-sizing] [data-calculator-form]").requestSubmit()');
  try {
    await waitFor(async () => await evaluate(client,
      '(() => { const p=document.querySelector("[data-mppt-buyers]"); return !p.hidden && !p.querySelector("[data-mppt-offer-fallback]").textContent.startsWith("Ověřujeme"); })()'), 200);
  } catch {
    const debug = await evaluate(client, '(() => { const p=document.querySelector("[data-mppt-buyers]"); const form=document.querySelector("[data-calculator-form]"); return {url:location.href,readyState:document.readyState,buyerHidden:p?.hidden,fallback:p?.querySelector("[data-mppt-offer-fallback]")?.textContent,metric:document.querySelector("[data-result-controller-amps]")?.textContent,formPresent:Boolean(form),scripts:[...document.querySelectorAll("script[src]")].map(s=>s.src)}; })()');
    throw new Error("MPPT_BUYER_BROWSER_DIAGNOSTIC:" + JSON.stringify(debug) +
      ":JS_EXCEPTIONS:" + JSON.stringify(client.exceptions.slice(-5)));
  }
  const after = await evaluate(client, '(() => { const p=document.querySelector("[data-mppt-buyers]"); const links=[...p.querySelectorAll("a[data-affiliate-click]")]; return {links:links.map(x=>({id:x.dataset.productId,source:x.dataset.source,merchant:x.dataset.merchant,href:x.href,expiry:Number(x.dataset.offerExpiresAt)})),fallbackHidden:p.querySelector("[data-mppt-offer-fallback]").hidden,result:!document.querySelector("[data-calculator-result]").hidden,overflow:document.documentElement.scrollWidth>innerWidth+2}; })()');
  assert(after.result && !after.overflow, "MPPT result must be visible without mobile horizontal overflow");
  for (const link of after.links) {
    assert(/^vselektro:victron-smartsolar-100-(20|30|50)$/.test(link.id), "unapproved MPPT candidate in live browser");
    assert(link.merchant === "vselektro" && link.source === "mppt-calculator-match",
      "MPPT candidate has wrong measurement attribution");
    assert(link.href.startsWith("https://ehub.cz/system/scripts/click.php?") && Number.isFinite(link.expiry),
      "MPPT candidate lacks exact affiliate guard and expiry");
  }
  assert(after.fallbackHidden === (after.links.length > 0),
    "MPPT missing-feed fallback and real offer links must be mutually exclusive");
  await evaluate(client, '(() => { const input=document.querySelector("#panelWatts"); input.value="900"; input.dispatchEvent(new Event("input",{bubbles:true})); })()');
  const invalidated = await evaluate(client, '(() => { const root=document.querySelector("[data-calculator-landing]"); const offers=root.querySelector("[data-mppt-buyers]"); return {hidden:offers.hidden,links:offers.querySelectorAll("a[data-affiliate-click]").length,resultHidden:root.querySelector("[data-calculator-result]").hidden,staleNotice:!document.querySelector("[data-calculator-stale]").hidden}; })()');
  assert(invalidated.hidden && invalidated.links === 0 && invalidated.resultHidden && invalidated.staleNotice,
    "MPPT input change must invalidate result and all previous product offers");
  return { route: "/kalkulacky/mppt-regulator/", candidates: after.links.length, freshOrFallback: true,
    previewPurchaseLinks: 0, staleOffersCleared: true, mobileHorizontalOverflow: false };
}


function findChrome() {
  const candidates = [process.env.CHROME_BIN, "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (result.status === 0) return candidate;
  }
  throw new Error(`PUBLIC_MOBILE_SMOKE_CHROME_NOT_FOUND:${candidates.join(",")}`);
}

function captureDiagnostics(child) {
  let output = "";
  const append = (chunk) => {
    output += String(chunk);
    if (output.length > 12000) output = output.slice(-12000);
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  return () => output.trim();
}

async function cleanupProfile(directory) {
  try {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    console.warn(`Public mobile smoke passed; temporary Chrome profile cleanup was skipped: ${error?.code || error?.message || error}`);
  }
}

async function waitForHttp(url, child, diagnostics, label, attempts = 60) {
  for (let index = 0; index < attempts; index += 1) {
    if (child.exitCode !== null) throw new Error(`PUBLIC_MOBILE_SMOKE_${label}_EXITED:${child.exitCode}:${diagnostics()}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`PUBLIC_MOBILE_SMOKE_${label}_TIMEOUT:${url}:${diagnostics()}`);
}

async function waitForDevToolsPort(directory, child, diagnostics, attempts = 120) {
  const path = `${directory}/DevToolsActivePort`;
  for (let index = 0; index < attempts; index += 1) {
    if (child.exitCode !== null) throw new Error(`PUBLIC_MOBILE_SMOKE_CHROME_EXITED:${child.exitCode}:${diagnostics()}`);
    try {
      const [portText] = (await readFile(path, "utf8")).trim().split(/\r?\n/);
      const port = Number(portText);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {}
    await delay(100);
  }
  throw new Error(`PUBLIC_MOBILE_SMOKE_DEVTOOLS_PORT_TIMEOUT:${path}:${diagnostics()}`);
}

async function waitForChromeTarget(port, child, diagnostics, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    if (child.exitCode !== null) throw new Error(`PUBLIC_MOBILE_SMOKE_CHROME_EXITED:${child.exitCode}:${diagnostics()}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
        if (target) return target;
      }
    } catch {}
    await delay(100);
  }
  throw new Error(`PUBLIC_MOBILE_SMOKE_CHROME_TARGET_TIMEOUT:${port}:${diagnostics()}`);
}

async function waitFor(predicate, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error("PUBLIC_MOBILE_SMOKE_CONDITION_TIMEOUT");
}

async function evaluate(cdp, expression) {
  const response = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (response.exceptionDetails) throw new Error(`PUBLIC_MOBILE_SMOKE_EVALUATION_FAILED:${response.exceptionDetails.text || "unknown"}`);
  return response.result?.value;
}

function assert(condition, message) {
  if (!condition) throw new Error(`PUBLIC_MOBILE_SMOKE_ASSERT:${message}`);
}

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", resolve));
}
