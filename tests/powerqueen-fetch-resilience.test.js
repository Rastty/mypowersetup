import test from "node:test";
import assert from "node:assert/strict";
import { fetchPowerQueenPayload } from "../scripts/lib/sync-powerqueen-eu.mjs";

function response(status, payload = { products: [] }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; },
  };
}

test("Power Queen fetch retries a transient network failure", async () => {
  let calls = 0;
  const payload = { products: [{ id: 1 }] };
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("fetch failed");
    return response(200, payload);
  };

  assert.deepEqual(await fetchPowerQueenPayload(fetchImpl, { attempts: 3, timeoutMs: 1000, sleep: async () => {} }), payload);
  assert.equal(calls, 2);
});

test("Power Queen fetch retries retryable HTTP failures", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return calls < 3 ? response(503) : response(200, { products: [] });
  };

  await fetchPowerQueenPayload(fetchImpl, { attempts: 3, timeoutMs: 1000, sleep: async () => {} });
  assert.equal(calls, 3);
});

test("Power Queen fetch fails immediately on a permanent client error", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response(404);
  };

  await assert.rejects(
    fetchPowerQueenPayload(fetchImpl, { attempts: 3, timeoutMs: 1000, sleep: async () => {} }),
    /POWERQUEEN_FETCH_FAILED:HTTP 404/,
  );
  assert.equal(calls, 1);
});
