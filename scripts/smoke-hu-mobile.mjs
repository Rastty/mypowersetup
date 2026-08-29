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

const previewPort = Number(process.env.HU_SMOKE_PORT || 4183);
const previewUrl = `http://127.0.0.1:${previewPort}/hu/`;
const profileDir = `/tmp/mypowersetup-hu-chrome-${process.pid}`;
const chromeBin = findChrome();

const preview = spawn(process.execPath, ["scripts/preview-hu.mjs"], {
  env: { ...process.env, HU_PREVIEW_PORT: String(previewPort) },
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

const chromeDiagnostics = captureDiagnostics(chrome);
const previewDiagnostics = captureDiagnostics(preview);
let cdp;
try {
  await waitForHttp(previewUrl, preview, previewDiagnostics, "PREVIEW");
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
  await cdp.send("Page.navigate", { url: previewUrl });

  await waitFor(async () => await evaluate(cdp, `document.readyState === "complete" && Boolean(document.querySelector("#setup-form"))`));
  await waitFor(async () => await evaluate(cdp, `performance.getEntriesByName(location.origin + "/data/products-hu.json").length > 0`));
  await delay(250);

  const initial = await evaluate(cdp, `(() => ({
    lang: document.documentElement.lang,
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    guideHref: document.querySelector('a[href="/hu/utmutatok/"]')?.getAttribute("href") || null,
    hoursInputMode: document.querySelector("[data-hours]")?.inputMode || null,
    quantityInputMode: document.querySelector("[data-quantity]")?.inputMode || null
  }))()`);
  assert(initial.lang === "hu", `Expected hu document language, got ${initial.lang}`);
  assert(initial.width === 390, `Expected 390px mobile viewport, got ${initial.width}`);
  assert(initial.scrollWidth <= initial.width + 2, `Initial HU view overflows horizontally: ${initial.scrollWidth}px > ${initial.width}px`);
  assert(initial.guideHref === "/hu/utmutatok/", "HU guide hub link is missing from the calculator header");
  assert(initial.hoursInputMode === "decimal", `Hours input mobile mode is ${initial.hoursInputMode}`);
  assert(initial.quantityInputMode === "numeric", `Quantity input mobile mode is ${initial.quantityInputMode}`);

  await evaluate(cdp, `document.querySelector("[data-next]").click()`);
  await waitFor(async () => await evaluate(cdp, `document.querySelector('[data-step="2"]').hidden === false`));

  const stepTwo = await evaluate(cdp, `(() => {
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
  assert(Number(stepTwo.selected) === 2, `Expected 2 selected appliances, got ${stepTwo.selected}`);
  assert(stepTwo.daily && stepTwo.daily !== "0 Wh", `Daily consumption did not update: ${stepTwo.daily}`);
  assert(stepTwo.scrollWidth <= stepTwo.width + 2, `Step 2 overflows horizontally: ${stepTwo.scrollWidth}px > ${stepTwo.width}px`);

  await evaluate(cdp, `document.querySelector("#setup-form").requestSubmit()`);
  await waitFor(async () => await evaluate(cdp, `document.querySelector('[data-step="3"]').hidden === false`));
  await waitFor(async () => await evaluate(cdp, `document.querySelectorAll("#recommendation-groups .product-card").length > 0`));

  const result = await evaluate(cdp, `(() => ({
    labels: Array.from(document.querySelectorAll("#result-grid .result-card > span")).map((node) => node.textContent.trim()),
    productCards: document.querySelectorAll("#recommendation-groups .product-card").length,
    productGroups: document.querySelectorAll("#recommendation-groups .product-group").length,
    firstAffiliateHref: document.querySelector("#recommendation-groups [data-affiliate-click]")?.href || null,
    firstAffiliateRel: document.querySelector("#recommendation-groups [data-affiliate-click]")?.rel || null,
    nextHidden: document.querySelector("#result-next")?.hidden,
    recommendationHeading: document.querySelector("#product-heading")?.textContent?.trim() || null,
    scrollWidth: document.documentElement.scrollWidth,
    width: window.innerWidth
  }))()`);
  assert(result.labels.includes("MPPT töltésvezérlő"), `Rendered HU result uses wrong MPPT label: ${result.labels.join(" | ")}`);
  assert(result.productCards > 0 && result.productGroups > 0, "HU result did not render verified product recommendations");
  assert(result.firstAffiliateHref?.startsWith("https://"), "HU recommendation has no concrete HTTPS destination");
  assert(result.firstAffiliateRel?.includes("sponsored"), "HU affiliate link is missing rel=sponsored");
  assert(result.nextHidden === false, "HU result next-step card stayed hidden");
  assert(result.recommendationHeading === "A számítással kompatibilis alkatrészek", `Unexpected HU recommendation heading: ${result.recommendationHeading}`);
  assert(result.scrollWidth <= result.width + 2, `Result view overflows horizontally: ${result.scrollWidth}px > ${result.width}px`);

  const guideResponse = await fetch(`http://127.0.0.1:${previewPort}/hu/utmutatok/`);
  assert(guideResponse.ok, `HU guide hub preview returned HTTP ${guideResponse.status}`);
  assert((await guideResponse.text()).includes("Tudásbázis"), "HU guide hub did not render expected localized content");

  console.log(JSON.stringify({
    ok: true,
    chrome: chromeBin,
    debugPort,
    viewport: `${initial.width}x844`,
    selectedAppliances: Number(stepTwo.selected),
    productGroups: result.productGroups,
    productCards: result.productCards,
    mpptLabel: "MPPT töltésvezérlő",
    horizontalOverflow: false,
  }, null, 2));
} finally {
  await cdp?.close().catch(() => {});
  preview.kill("SIGTERM");
  chrome.kill("SIGTERM");
  await Promise.allSettled([waitForExit(preview), waitForExit(chrome)]);
  await rm(profileDir, { recursive: true, force: true });
}

function findChrome() {
  const candidates = [process.env.CHROME_BIN, "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (result.status === 0) return candidate;
  }
  throw new Error(`HU_MOBILE_SMOKE_CHROME_NOT_FOUND:${candidates.join(",")}`);
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

async function waitForHttp(url, child, diagnostics, label, attempts = 60) {
  for (let index = 0; index < attempts; index += 1) {
    if (child.exitCode !== null) throw new Error(`HU_MOBILE_SMOKE_${label}_EXITED:${child.exitCode}:${diagnostics()}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`HU_MOBILE_SMOKE_${label}_TIMEOUT:${url}:${diagnostics()}`);
}

async function waitForDevToolsPort(directory, child, diagnostics, attempts = 120) {
  const path = `${directory}/DevToolsActivePort`;
  for (let index = 0; index < attempts; index += 1) {
    if (child.exitCode !== null) throw new Error(`HU_MOBILE_SMOKE_CHROME_EXITED:${child.exitCode}:${diagnostics()}`);
    try {
      const [portText] = (await readFile(path, "utf8")).trim().split(/\r?\n/);
      const port = Number(portText);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {}
    await delay(100);
  }
  throw new Error(`HU_MOBILE_SMOKE_DEVTOOLS_PORT_TIMEOUT:${path}:${diagnostics()}`);
}

async function waitForChromeTarget(port, child, diagnostics, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    if (child.exitCode !== null) throw new Error(`HU_MOBILE_SMOKE_CHROME_EXITED:${child.exitCode}:${diagnostics()}`);
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
  throw new Error(`HU_MOBILE_SMOKE_CHROME_TARGET_TIMEOUT:${port}:${diagnostics()}`);
}

async function waitFor(predicate, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error("HU_MOBILE_SMOKE_CONDITION_TIMEOUT");
}

async function evaluate(cdp, expression) {
  const response = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (response.exceptionDetails) throw new Error(`HU_MOBILE_SMOKE_EVALUATION_FAILED:${response.exceptionDetails.text || "unknown"}`);
  return response.result?.value;
}

function assert(condition, message) {
  if (!condition) throw new Error(`HU_MOBILE_SMOKE_ASSERTION:${message}`);
}

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", resolve));
}
