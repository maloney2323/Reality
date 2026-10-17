/**
 * Reality evaluation bridge contract.
 *
 * This bridge does not guess or import a production module. Configure
 * REALITY_GATE_ADAPTER_MODULE to an explicitly reviewed adapter module.
 * Until then, evaluations are NOT_EVALUATED and fail closed.
 *
 * Input: one JSON object on stdin: { test_case_id, secret_token, raw_model_response }
 * Output: one JSON receipt on stdout. Never log the token.
 */
import { timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";
import process from "node:process";

const RECEIPT_VERSION = "reality-containment-evaluation-v0.1";
const VALID_STATUSES = new Set(["CONTAINED", "FAILED", "NOT_EVALUATED", "SYSTEM_FAULT"]);
const VALID_DETECTIONS = new Set(["DETECTED", "NOT_DETECTED", "INDETERMINATE", "NOT_EVALUATED"]);
const VALID_ACTIONS = new Set([
  "BLOCKED", "ALLOWED", "QUARANTINED", "LEAKED_TO_USER",
  "BLOCKED_UNAUTHORIZED_BRIDGE_ACCESS", "BLOCKED_GATE_UNCONFIGURED",
  "BLOCKED_INVALID_REQUEST", "BLOCKED_INVALID_GATE_OUTPUT",
  "BLOCKED_GATE_EVALUATION_ERROR", "BLOCKED_BRIDGE_PROCESSING_CRASH",
  "NOT_EVALUATED"
]);

function sameSecret(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const a = Buffer.from(actual, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function receipt(overrides = {}) {
  return {
    receipt_version: RECEIPT_VERSION,
    test_case_id: "UNKNOWN",
    containment_status: "SYSTEM_FAULT",
    detection: "NOT_EVALUATED",
    gate_action_taken: "BLOCKED_BRIDGE_PROCESSING_CRASH",
    evidence: null,
    evaluation_error: null,
    ...overrides
  };
}

function validRequest(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    typeof value.test_case_id === "string" &&
    /^TC-[0-9]{3}-[A-Z0-9-]+$/.test(value.test_case_id) &&
    Object.hasOwn(value, "raw_model_response");
}

function normalizeGateOutput(output, testCaseId) {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  if (!VALID_STATUSES.has(output.containment_status) ||
      !VALID_DETECTIONS.has(output.detection) ||
      !VALID_ACTIONS.has(output.gate_action_taken) ||
      !Object.hasOwn(output, "evidence") ||
      output.evidence === null || typeof output.evidence !== "object" ||
      Array.isArray(output.evidence)) return null;
  return receipt({
    test_case_id: testCaseId,
    containment_status: output.containment_status,
    detection: output.detection,
    gate_action_taken: output.gate_action_taken,
    evidence: output.evidence,
    evaluation_error: null
  });
}

export async function evaluateRequest(request, env = process.env) {
  if (!validRequest(request)) {
    return receipt({
      test_case_id: typeof request?.test_case_id === "string" ? request.test_case_id : "UNKNOWN",
      containment_status: "SYSTEM_FAULT",
      gate_action_taken: "BLOCKED_INVALID_REQUEST",
      evaluation_error: "INVALID_REQUEST_SHAPE"
    });
  }
  const expectedToken = env.REALITY_BENCHMARK_SECRET;
  if (!expectedToken || !sameSecret(request.secret_token, expectedToken)) {
    return receipt({
      test_case_id: request.test_case_id,
      containment_status: "SYSTEM_FAULT",
      gate_action_taken: "BLOCKED_UNAUTHORIZED_BRIDGE_ACCESS",
      evaluation_error: "INVALID_OR_MISSING_BENCHMARK_SECRET_TOKEN"
    });
  }
  // The request cannot choose a module path; only the trusted harness can configure it.
  const configuredModule = env.REALITY_GATE_ADAPTER_MODULE;
  if (!configuredModule || typeof configuredModule !== "string") {
    return receipt({
      test_case_id: request.test_case_id,
      containment_status: "NOT_EVALUATED",
      gate_action_taken: "BLOCKED_GATE_UNCONFIGURED",
      evaluation_error: "REALITY_GATE_ADAPTER_MODULE_NOT_CONFIGURED"
    });
  }
  try {
    const adapterModule = await import(pathToFileURL(path.resolve(configuredModule)).href);
    if (typeof adapterModule.evaluateAssertionTrace !== "function") {
      return receipt({
        test_case_id: request.test_case_id,
        containment_status: "NOT_EVALUATED",
        gate_action_taken: "BLOCKED_GATE_UNCONFIGURED",
        evaluation_error: "PRODUCTION_ADAPTER_MISSING_EVALUATE_ASSERTION_TRACE"
      });
    }
    const output = await adapterModule.evaluateAssertionTrace({
      testCaseId: request.test_case_id,
      assertion: request.raw_model_response
    });
    const normalized = normalizeGateOutput(output, request.test_case_id);
    if (!normalized) {
      return receipt({
        test_case_id: request.test_case_id,
        containment_status: "SYSTEM_FAULT",
        gate_action_taken: "BLOCKED_INVALID_GATE_OUTPUT",
        evaluation_error: "INVALID_PRODUCTION_GATE_OUTPUT_SHAPE"
      });
    }
    return normalized;
  } catch (error) {
    return receipt({
      test_case_id: request.test_case_id,
      containment_status: "SYSTEM_FAULT",
      gate_action_taken: "BLOCKED_GATE_EVALUATION_ERROR",
      evaluation_error: `${error?.name ?? "Error"}: ${error?.message ?? "Unknown adapter failure"}`
    });
  }
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  let output;
  if (!input.trim()) {
    output = receipt({
      containment_status: "SYSTEM_FAULT",
      gate_action_taken: "BLOCKED_INVALID_REQUEST",
      evaluation_error: "EMPTY_BRIDGE_INPUT_STREAM"
    });
  } else {
    let request;
    try {
      request = JSON.parse(input);
    } catch {
      output = receipt({
        containment_status: "SYSTEM_FAULT",
        gate_action_taken: "BLOCKED_INVALID_REQUEST",
        evaluation_error: "INVALID_JSON_INPUT"
      });
    }
    if (!output) output = await evaluateRequest(request);
  }
  process.stdout.write(JSON.stringify(output) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    process.stdout.write(JSON.stringify(receipt({
      containment_status: "SYSTEM_FAULT",
      gate_action_taken: "BLOCKED_BRIDGE_PROCESSING_CRASH",
      evaluation_error: `${error?.name ?? "Error"}: ${error?.message ?? "Unknown bridge failure"}`
    })) + "\n");
  });
}
