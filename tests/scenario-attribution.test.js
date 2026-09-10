import test from "node:test";
import assert from "node:assert/strict";
import { readScenarioAttribution, resolveScenarioAttribution } from "../src/scenario-attribution.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("scenario attribution accepts only explicit internal scenario campaigns", () => {
  assert.deepEqual(
    readScenarioAttribution("?utm_source=scenario_page&utm_medium=internal&utm_campaign=remote_work"),
    { scenario_source: "scenario_page", scenario_campaign: "remote_work" },
  );
  assert.equal(readScenarioAttribution("?utm_source=scenario_page&utm_medium=community&utm_campaign=remote_work"), null);
  assert.equal(readScenarioAttribution("?utm_source=newsletter&utm_medium=internal&utm_campaign=remote_work"), null);
  assert.equal(readScenarioAttribution("?utm_source=scenario_page&utm_medium=internal&utm_campaign=Remote%20Work"), null);
  assert.equal(readScenarioAttribution("?utm_source=scenario_page&utm_medium=internal"), null);
});

test("scenario attribution survives calculator URL cleanup for the rest of the session", () => {
  const storage = memoryStorage();
  const initialSearch = "?loads=fridge:8:1,laptop:8:1&utm_source=scenario_page&utm_medium=internal&utm_campaign=remote_work";

  assert.deepEqual(resolveScenarioAttribution({ search: initialSearch, initialSearch, storage }), {
    scenario_source: "scenario_page",
    scenario_campaign: "remote_work",
  });

  assert.deepEqual(resolveScenarioAttribution({ search: "?loads=fridge:8:1,laptop:8:1", initialSearch: "", storage }), {
    scenario_source: "scenario_page",
    scenario_campaign: "remote_work",
  });
});

test("initial landing search preserves attribution when history.replaceState removes UTM before consent", () => {
  const storage = memoryStorage();
  assert.deepEqual(resolveScenarioAttribution({
    search: "?loads=fridge:8:1",
    initialSearch: "?loads=fridge:8:1&utm_source=scenario_page&utm_medium=internal&utm_campaign=weekend",
    storage,
  }), {
    scenario_source: "scenario_page",
    scenario_campaign: "weekend",
  });
});
