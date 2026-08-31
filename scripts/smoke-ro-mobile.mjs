import { spawn, spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

class CdpClient {
  static async connect(url) { const client = new CdpClient(url); await client.opened; return client; }
  constructor(url) {
    this.nextId = 1; this.pending = new Map(); this.socket = new WebSocket(url);
    this.opened = new Promise((resolve, reject) => { this.socket.addEventListener("open", resolve, { once: true }); this.socket.addEventListener("error", reject, { once: true }); });
    this.socket.addEventListener("message", (event) => { const message = JSON.parse(event.data); if (!message.id || !this.pending.has(message.id)) return; const { resolve, reject } = this.pending.get(message.id); this.pending.delete(message.id); if (message.error) reject(new Error(message.error.message)); else resolve(message.result || {}); });
  }
  send(method, params = {}) { const id = this.nextId++; return new Promise((resolve, reject) => { const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP_COMMAND_TIMEOUT:${method}`)); }, 10000); const settle = (callback, value) => { clearTimeout(timeout); callback(value); }; this.pending.set(id, { resolve: (value) => settle(resolve, value), reject: (error) => settle(reject, error) }); try { this.socket.send(JSON.stringify({ id, method, params })); } catch (error) { this.pending.delete(id); clearTimeout(timeout); reject(error); } }); }
  async close() { if (this.socket.readyState === WebSocket.CLOSED) return; this.socket.close(); await delay(100); }
}

const port = Number(process.env.RO_SMOKE_PORT || 4187);
const previewUrl = `http://127.0.0.1:${port}/ro/`;
const profileDir = `/tmp/mypowersetup-ro-chrome-${process.pid}`;
const chromeBin = findChrome();
const preview = spawn(process.execPath, ["scripts/preview-expansion-markets.mjs"], { env: { ...process.env, EXPANSION_PREVIEW_PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
const chrome = spawn(chromeBin, ["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--remote-allow-origins=*","--remote-debugging-address=127.0.0.1","--remote-debugging-port=0",`--user-data-dir=${profileDir}`,"about:blank"], { stdio: ["ignore", "pipe", "pipe"] });
let cdp;
try {
  await waitForHttp(previewUrl);
  const debugPort = await waitForDevToolsPort(profileDir);
  const target = await waitForChromeTarget(debugPort);
  cdp = await CdpClient.connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844 });
  await cdp.send("Page.navigate", { url: previewUrl });
  await waitFor(async () => evaluate(cdp, `document.readyState === "complete" && Boolean(document.querySelector("#setup-form"))`));
  const initial = await evaluate(cdp, `({lang:document.documentElement.lang,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,robots:document.querySelector('meta[name="robots"]')?.content})`);
  assert(initial.lang === "ro", `lang=${initial.lang}`); assert(initial.width === 390, `width=${initial.width}`); assert(initial.scrollWidth <= 392, `overflow=${initial.scrollWidth}`); assert(/noindex/.test(initial.robots || ""), "noindex missing");
  await evaluate(cdp, `document.querySelector('input[name="autonomyDays"][value="1"]').checked = true`);
  await evaluate(cdp, `document.querySelector("[data-next]").click()`);
  await waitFor(async () => evaluate(cdp, `document.querySelector('[data-form-step="2"]').hidden === false`));
  await evaluate(cdp, `document.querySelectorAll('[data-appliance]')[2].checked = false`);
  await evaluate(cdp, `document.querySelector("#setup-form").requestSubmit()`);
  await waitFor(async () => evaluate(cdp, `document.querySelector('[data-form-step="3"]').hidden === false`));
  await waitFor(async () => evaluate(cdp, `document.querySelectorAll("[data-affiliate-product]").length > 0`));
  const guideLinks = await evaluate(cdp, `[...document.querySelectorAll("[data-result-guide]")].map((link) => link.getAttribute("href"))`);
  assert(guideLinks.length === 3, `result guides=${guideLinks.length}`); assert(guideLinks.every((href) => href.startsWith("/ro/ghiduri/")), `wrong result guide=${guideLinks.join(",")}`);
  const componentLinks = await evaluate(cdp, `[...document.querySelectorAll("[data-component-guide]")].map((link) => link.getAttribute("href"))`);
  assert(componentLinks.length === 4, `component guides=${componentLinks.length}`); assert(componentLinks.every((href) => href.startsWith("/ro/ghiduri/")), `wrong component guide=${componentLinks.join(",")}`);
  const result = await evaluate(cdp, `({cards:document.querySelectorAll('[data-affiliate-product]').length,href:document.querySelector('[data-affiliate-product]')?.href,rel:document.querySelector('[data-affiliate-product]')?.rel,merchant:document.querySelector('[data-affiliate-product]')?.dataset.merchant,scrollWidth:document.documentElement.scrollWidth,width:innerWidth})`);
  assert(result.cards > 0, "no verified RO recommendation"); assert(result.href?.includes("awinmid=38934"), `wrong affiliate ${result.href}`); assert(result.href?.includes("ued="), "exact destination missing"); assert(result.rel?.includes("sponsored"), "rel sponsored missing"); assert(result.merchant === "allpowers_eu", `merchant=${result.merchant}`); assert(result.scrollWidth <= result.width + 2, `result overflow=${result.scrollWidth}`);
  for (const route of ["/ro/ghiduri/","/ro/metodologie/","/ro/confidentialitate/","/ro/afiliere/"]) { const response = await fetch(`http://127.0.0.1:${port}${route}`); assert(response.ok, `${route}:${response.status}`); const html = await response.text(); assert(/noindex/.test(html), `${route}:noindex missing`); }
  console.log(JSON.stringify({ ok:true, market:"ro", viewport:"390x844", affiliateCards:result.cards, exactMerchant:38934, horizontalOverflow:false }, null, 2));
} finally {
  if (cdp) await cdp.send("Browser.close").catch(() => {}); await cdp?.close().catch(() => {}); preview.kill("SIGTERM"); if (chrome.exitCode === null) chrome.kill("SIGTERM"); await rm(profileDir, { recursive:true, force:true }).catch(() => {});
}

function findChrome(){ for(const candidate of [process.env.CHROME_BIN,"google-chrome","google-chrome-stable","chromium","chromium-browser"].filter(Boolean)){ if(spawnSync(candidate,["--version"],{encoding:"utf8"}).status===0)return candidate;} throw new Error("RO_MOBILE_SMOKE_CHROME_NOT_FOUND"); }
async function waitForHttp(url){ for(let i=0;i<60;i++){ try{const r=await fetch(url);if(r.ok)return;}catch{} await delay(100);} throw new Error("RO_MOBILE_SMOKE_PREVIEW_TIMEOUT"); }
async function waitForDevToolsPort(directory){ const path=`${directory}/DevToolsActivePort`; for(let i=0;i<120;i++){ try{const [p]=(await readFile(path,"utf8")).trim().split(/\r?\n/); if(Number(p)>0)return Number(p);}catch{} await delay(100);} throw new Error("RO_MOBILE_SMOKE_DEVTOOLS_TIMEOUT"); }
async function waitForChromeTarget(port){ for(let i=0;i<80;i++){ try{const r=await fetch(`http://127.0.0.1:${port}/json/list`); if(r.ok){const t=(await r.json()).find((x)=>x.type==="page"&&x.webSocketDebuggerUrl);if(t)return t;}}catch{} await delay(100);} throw new Error("RO_MOBILE_SMOKE_TARGET_TIMEOUT"); }
async function waitFor(predicate){ for(let i=0;i<100;i++){ if(await predicate())return; await delay(100);} throw new Error("RO_MOBILE_SMOKE_CONDITION_TIMEOUT"); }
async function evaluate(cdp,expression){ const r=await cdp.send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true,userGesture:true}); if(r.exceptionDetails)throw new Error("RO_MOBILE_SMOKE_EVALUATION_FAILED"); return r.result?.value; }
function assert(condition,message){ if(!condition)throw new Error(`RO_MOBILE_SMOKE_ASSERTION:${message}`); }
