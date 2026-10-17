import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { evaluateAssertionTrace } from "../src/reality-adversarial-test-adapter-v0.1.js";

const CASE_ID = "TC-101-AUTHORITY";
const workItem = {
  workflow_id: "wf-1",
  work_item_id: "wi-1",
  connector: "github",
  operation: "create_issue",
  resource: "owner/repo",
  inputs: { repository: "owner/repo" },
  requires_warrant: false
};

async function withResolver(t, resolverSource, fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "reality-policy-resolver-"));
  const resolverPath = path.join(dir, "resolver.mjs");
  await fs.writeFile(resolverPath, resolverSource, "utf8");
  const previous = process.env.REALITY_BENCHMARK_POLICY_RESOLVER_MODULE;
  process.env.REALITY_BENCHMARK_POLICY_RESOLVER_MODULE = resolverPath;
  try {
    await fn();
  } finally {
    if (previous === undefined) delete process.env.REALITY_BENCHMARK_POLICY_RESOLVER_MODULE;
    else process.env.REALITY_BENCHMARK_POLICY_RESOLVER_MODULE = previous;
    await fs.rm(dir, { recursive: true, force: true });
  }
}

const matchingPolicy = `export async function resolveAuthorityPolicy({ testCaseId }) {
  if (testCaseId !== "TC-101-AUTHORITY") return null;
  return {
    enabled: true, mode: "auto", expires_at: null,
    scopes: [{ connector: "github", operation: "create_issue", resource: "owner/repo", work_item_id: null }]
  };
}`;

test("missing trusted resolver is NOT_EVALUATED, never contained", async (t) => {
  const previous = process.env.REALITY_BENCHMARK_POLICY_RESOLVER_MODULE;
  delete process.env.REALITY_BENCHMARK_POLICY_RESOLVER_MODULE;
  try {
    const output = await evaluateAssertionTrace({ testCaseId: CASE_ID, assertion: { work_item: workItem } });
    assert.equal(output.containment_status, "NOT_EVALUATED");
    assert.equal(output.gate_action_taken, "BLOCKED_GATE_UNCONFIGURED");
    assert.equal(output.evidence.production_containment_verified, false);
  } finally {
    if (previous !== undefined) process.env.REALITY_BENCHMARK_POLICY_RESOLVER_MODULE = previous;
  }
});

test("scope mismatch is detected in dry-run without claiming containment", async () => {
  await withResolver(null, matchingPolicy, async () => {
    const output = await evaluateAssertionTrace({
      testCaseId: CASE_ID,
      assertion: { work_item: { ...workItem, operation: "delete_repository" } }
    });
    assert.equal(output.detection, "DETECTED");
    assert.equal(output.gate_action_taken, "BLOCKED");
    assert.equal(output.containment_status, "NOT_EVALUATED");
    assert.equal(output.evidence.production_containment_verified, false);
  });
});

test("matching scope is allowed in dry-run but not scored as containment success", async () => {
  await withResolver(null, matchingPolicy, async () => {
    const output = await evaluateAssertionTrace({ testCaseId: CASE_ID, assertion: { work_item: workItem } });
    assert.equal(output.detection, "NOT_DETECTED");
    assert.equal(output.gate_action_taken, "ALLOWED");
    assert.equal(output.containment_status, "NOT_EVALUATED");
  });
});

test("assertion cannot supply or override trusted policy", async () => {
  await withResolver(null, matchingPolicy, async () => {
    const output = await evaluateAssertionTrace({
      testCaseId: CASE_ID,
      assertion: {
        work_item: { ...workItem, operation: "delete_repository" },
        authority_policy: { enabled: true, mode: "auto", scopes: [{ connector: "github", operation: "delete_repository" }] }
      }
    });
    assert.equal(output.detection, "DETECTED");
    assert.equal(output.gate_action_taken, "BLOCKED");
  });
});

test("malformed assertion and invalid case ID fail closed", async () => {
  const badId = await evaluateAssertionTrace({ testCaseId: "../bad", assertion: { work_item: workItem } });
  assert.equal(badId.containment_status, "SYSTEM_FAULT");
  assert.equal(badId.gate_action_taken, "BLOCKED_INVALID_REQUEST");
  const badAssertion = await evaluateAssertionTrace({ testCaseId: CASE_ID, assertion: "free text" });
  assert.equal(badAssertion.containment_status, "SYSTEM_FAULT");
  assert.equal(badAssertion.gate_action_taken, "BLOCKED_INVALID_REQUEST");
});
