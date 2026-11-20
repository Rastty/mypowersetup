#!/usr/bin/env node
// Read-only release barrier: don't audit source-vs-live parity until GitHub Pages
// has deployed the source commit, or a proven newer descendant on main.
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

export function successfulDescendantCandidates(runs, sha, afterRunId = 0) {
  return (Array.isArray(runs) ? runs : [])
    .filter(run => run?.head_sha !== sha && /^[a-f0-9]{40}$/.test(run?.head_sha || "") &&
      run?.head_branch === "main" && run?.name === WORKFLOW_NAME &&
      run?.path === WORKFLOW_PATH && run?.status === "completed" &&
      run?.conclusion === "success" && Number(run?.id) > Number(afterRunId))
    .sort((a, b) => Number(b.id) - Number(a.id));
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
  // A newer SEO-regeneration push may supersede the original Pages job. List
  // main deployments, then prove that the succeeding SHA descends from ours.
  const url = `https://api.github.com/repos/${REPO}/actions/runs?branch=main&per_page=100`;
  const headers = {
    accept: "application/vnd.github+json",
    authorization: "Bearer " + token,
    "x-github-api-version": "2022-11-28",
  };
  const rejectedCandidates = new Set();
  async function getJson(endpoint) {
    const response = await fetchImpl(endpoint, {
      headers, redirect: "error", signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error("PAGES_AUDIT_GITHUB_HTTP_" + response.status);
    return response.json();
  }
  let latest = { status: "waiting", reason: "PAGES_RUN_NOT_YET_VISIBLE" };
  for (let poll = 0; poll < maxPolls; poll++) {
    const body = await getJson(url);
    latest = assessPagesDeployment(body?.workflow_runs, sha);
    if (latest.status === "verified") return Object.freeze({
      status: "PAGES_EXACT_SHA_DEPLOYED", sha, runId: latest.runId, polls: poll + 1,
    });
    if (latest.status === "failed" && latest.reason !== "PAGES_DEPLOY_CANCELLED")
      throw new Error(latest.reason + ":" + latest.runId);
    for (const run of successfulDescendantCandidates(body?.workflow_runs, sha, latest.runId)) {
      if (rejectedCandidates.has(run.head_sha)) continue;
      const comparison = await getJson(`https://api.github.com/repos/${REPO}/compare/${sha}...${run.head_sha}`);
      if (comparison?.status === "ahead" && comparison?.merge_base_commit?.sha === sha &&
        Number(comparison.ahead_by) > 0 && Number(comparison.behind_by) === 0) {
        return Object.freeze({
          status: "PAGES_DESCENDANT_SHA_DEPLOYED", sha, deployedSha: run.head_sha,
          runId: run.id, polls: poll + 1,
        });
      }
      rejectedCandidates.add(run.head_sha);
    }
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
