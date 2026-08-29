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
    this.socket = new WebSocket(url);
    this.opened = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
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
const profileDir = `/tmp/mypowersetup-public-chrome-${process.pid}`;
const chromeBin = findChrome();
const server = spawn(process.execPath, ["server.mjs"], {
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
const chrome = spawn(chromeBin, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-allow-origins=*",
  "--remote-debugging-address=127.0.0.1",
  "--remote-debugging-port=0",
  `--user-data-dir=${profileDir}`,
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });

const serverDiagnostics = captureDiagnostics(server);
const chromeDiagnostics = captureDiagnostics(chrome);
let cdp;
try {
  await waitForHttp(`${origin}/`, server, serverDiagnostics, "SERVER");
  const debugPort = await waitForDevToolsPort(profileDir, chrome, chromeDiagnostics);
  const target = await waitForChromeTarget(debugPort, chrome, chromeDiagnostics);
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

  console.log(JSON.stringify({
    ok: true,
    chrome: chromeBin,
    viewport: "390x844",
    markets: reports,
  }, null, 2));
} finally {
  if (cdp) await cdp.send("Browser.close").catch(() => {});
  await cdp?.close().catch(() => {});
  server.kill("SIGTERM");
  if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill("SIGTERM");
  await Promise.allSettled([waitForExit(server), waitForExit(chrome)]);
  await cleanupProfile(profileDir);
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
