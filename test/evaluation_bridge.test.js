import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

const BRIDGE_PATH = fileURLToPath(new URL("./evaluation_bridge.js", import.meta.url));
const TOKEN = "test-only-secret-anchor";
const baseEnv = { ...process.env, REALITY_BENCHMARK_SECRET: TOKEN };
function invoke(payload, env = baseEnv) {
  const run = spawnSync(process.execPath, [BRIDGE_PATH], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf8",
    env,
    timeout: 5000
  });
  assert.equal(run.error, undefined, run.error?.message);
  assert.equal(run.status, 0, run.stderr);
  assert.ok(run.stdout.trim(), "bridge must emit a receipt");
  return JSON.parse(run.stdout);
}

test("missing/wrong token is explicitly denied", () => {
  const result = invoke({ test_case_id: "TC-001-AUTH", secret_token: "BAD", raw_model_response: "x" });
  assert.equal(result.gate_action_taken, "BLOCKED_UNAUTHORIZED_BRIDGE_ACCESS");
  assert.equal(result.containment_status, "SYSTEM_FAULT");
});

test("valid token but missing adapter is NOT_EVALUATED, never contained", () => {
  const env = { ...baseEnv };
  delete env.REALITY_GATE_ADAPTER_MODULE;
  const result = invoke({ test_case_id: "TC-002-DRIFT", secret_token: TOKEN, raw_model_response: "x" }, env);
  assert.equal(result.gate_action_taken, "BLOCKED_GATE_UNCONFIGURED");
  assert.equal(result.containment_status, "NOT_EVALUATED");
  assert.match(result.evaluation_error, /NOT_CONFIGURED/);
});

test("malformed JSON yields a structured denial receipt", () => {
  const result = invoke("{not-json");
  assert.equal(result.gate_action_taken, "BLOCKED_INVALID_REQUEST");
  assert.equal(result.containment_status, "SYSTEM_FAULT");
});

test("invalid request shape is rejected before adapter discovery", () => {
  const result = invoke({ test_case_id: "bad", secret_token: TOKEN, raw_model_response: "x" });
  assert.equal(result.gate_action_taken, "BLOCKED_INVALID_REQUEST");
  assert.equal(result.containment_status, "SYSTEM_FAULT");
});

test("configured adapter with malformed output is blocked", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "reality-bridge-test-"));
  const adapterPath = path.join(dir, "adapter.mjs");
  await fs.writeFile(adapterPath, "export async function evaluateAssertionTrace(){ return { containment_status: 'CONTAINED' }; }" + "\n");
  try {
    const result = invoke(
      { test_case_id: "TC-003-SHAPE", secret_token: TOKEN, raw_model_response: "x" },
      { ...baseEnv, REALITY_GATE_ADAPTER_MODULE: adapterPath }
    );
    assert.equal(result.gate_action_taken, "BLOCKED_INVALID_GATE_OUTPUT");
    assert.equal(result.containment_status, "SYSTEM_FAULT");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
