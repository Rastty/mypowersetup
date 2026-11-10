#!/usr/bin/env node
// Read-only release barrier: don't audit source-vs-live parity until GitHub Pages
// has successfully deployed the exact source commit under inspection.
// The built-in Pages workflow does not consistently emit workflow_run triggers.
import { pathToFileURL } from "node:url";

const REPO = "Rastty/mypowersetup";
const WORKFLOW_NAME = "pages build and deployment";
const WORKFLOW_PATH = "dynamic/pages/pages-build-deployment";
const TERMINAL_FAILURES = new Set(["failure", "cancelled", "timed_out", "action_required"]);

export function assessPagesDeployment(runs, sha) {
  const matches = (Array.isArray(runs) ? runs : [])
    .filter(run => run?.head_sha === sha && run?.head_branch === "main" &&
      run?.name === WORKFLOW_NAME && run?.path === WORKFLOW_PATH)
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  const run = matches[0];
  if (!run) return Object.freeze({ status: "waiting", reason: "PAGES_RUN_NOT_YET_VISIBLE" });
  if (run.status !== "completed") return Object.freeze({ status: "waiting", reason: "PAGES_STILL_RUNNING", runId: run.id });
  if (run.conclusion === "success") return Object.freeze({ status: "verified", runId: run.id });
  if (TERMINAL_FAILURES.has(run.conclusion)) return Object.freeze({
    status: "failed", reason: "PAGES_DEPLOY_" + run.conclusion.toUpperCase(), runId: run.id,
  });
  return Object.freeze({ status: "waiting", reason: "PAGES_OUTCOME_PENDING", runId: run.id });
}

export async function waitForPagesDeployment({
  repo = process.env.GITHUB_REPOSITORY,
  sha = process.env.GITHUB_SHA,
  token = process.env.GITHUB_TOKEN,
  fetchImpl = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  maxPolls = 60,
  intervalMs = 10_000,
} = {}) {
  if (repo !== REPO || !/^[a-f0-9]{40}$/.test(sha || "") || typeof token !== "string" || !token)
    throw new Error("PAGES_AUDIT_INVALID_REPOSITORY_SHA_OR_TOKEN");
  const url = `https://api.github.com/repos/${REPO}/actions/runs?head_sha=${sha}&per_page=50`;
  let latest = { status: "waiting", reason: "PAGES_RUN_NOT_YET_VISIBLE" };
  for (let poll = 0; poll < maxPolls; poll++) {
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: "Bearer " + token,
        "x-github-api-version": "2022-11-28",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error("PAGES_AUDIT_GITHUB_HTTP_" + response.status);
    const body = await response.json();
    latest = assessPagesDeployment(body?.workflow_runs, sha);
    if (latest.status === "verified") return Object.freeze({
      status: "PAGES_EXACT_SHA_DEPLOYED", sha, runId: latest.runId, polls: poll + 1,
    });
    if (latest.status === "failed") throw new Error(latest.reason + ":" + latest.runId);
    if (poll + 1 < maxPolls) await sleep(intervalMs);
  }
  throw new Error("PAGES_AUDIT_WAIT_TIMEOUT:" + latest.reason);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await waitForPagesDeployment();
    console.log("PAGES_RELEASE_BARRIER " + JSON.stringify(result));
  } catch (error) {
    console.error("PAGES_RELEASE_BARRIER " + JSON.stringify({
      status: "NOT_VERIFIED", reason: String(error?.message || error).slice(0, 170),
    }));
    process.exitCode = 1;
  }
}
