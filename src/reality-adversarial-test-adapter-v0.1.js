/**
 * Reality adversarial benchmark adapter v0.1.
 *
 * Non-mutating dry-run only. This module never imports the execution engine,
 * connector bridge, persistence writer, or API execution route.
 *
 * Trusted authority context MUST come from a separately configured resolver.
 * The resolver path is operator-controlled configuration, never assertion data.
 *
 * Required env:
 *   REALITY_BENCHMARK_POLICY_RESOLVER_MODULE
 *
 * Resolver contract:
 *   export async function resolveAuthorityPolicy({ testCaseId })
 * It must resolve trusted policy by the case ID from controlled test fixtures or
 * a read-only trusted source. It must not accept policy content from assertion.
 */
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { scopeMatches } from "./reality-authority-v1.0.js";
import { verifyEvidenceWarrant } from "./reality-evidence-warrant-v1.0.js";

const VALID_CASE_ID = /^TC-[0-9]{3}-[A-Z0-9-]+$/;

function result({
  containment_status = "NOT_EVALUATED",
  detection = "NOT_EVALUATED",
  gate_action_taken = "NOT_EVALUATED",
  evidence = {}
} = {}) {
  return {
    containment_status,
    detection,
    gate_action_taken,
    evidence: {
      evaluation_mode: "NON_MUTATING_DRY_RUN",
      production_containment_verified: false,
      ...evidence
    }
  };
}

function objectRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function evaluateAssertionTrace({ testCaseId, assertion } = {}) {
  try {
    if (typeof testCaseId !== "string" || !VALID_CASE_ID.test(testCaseId)) {
      return result({
        containment_status: "SYSTEM_FAULT",
        detection: "INDETERMINATE",
        gate_action_taken: "BLOCKED_INVALID_REQUEST",
        evidence: { error: "INVALID_TEST_CASE_ID" }
      });
    }

    if (!objectRecord(assertion)) {
      return result({
        containment_status: "SYSTEM_FAULT",
        detection: "INDETERMINATE",
        gate_action_taken: "BLOCKED_INVALID_REQUEST",
        evidence: { error: "ASSERTION_MUST_BE_OBJECT" }
      });
    }

    const resolverPath = process.env.REALITY_BENCHMARK_POLICY_RESOLVER_MODULE;
    if (typeof resolverPath !== "string" || !resolverPath.trim()) {
      return result({
        containment_status: "NOT_EVALUATED",
        detection: "NOT_EVALUATED",
        gate_action_taken: "BLOCKED_GATE_UNCONFIGURED",
        evidence: { error: "TRUSTED_POLICY_RESOLVER_NOT_CONFIGURED" }
      });
    }

    // Only operator-controlled environment configuration selects this module.
    const resolverUrl = pathToFileURL(path.resolve(resolverPath)).href;
    const resolver = await import(resolverUrl);
    if (typeof resolver.resolveAuthorityPolicy !== "function") {
      return result({
        containment_status: "NOT_EVALUATED",
        detection: "NOT_EVALUATED",
        gate_action_taken: "BLOCKED_GATE_UNCONFIGURED",
        evidence: { error: "TRUSTED_POLICY_RESOLVER_EXPORT_MISSING" }
      });
    }

    // Deliberately do not pass the assertion to the trusted policy resolver.
    const policy = await resolver.resolveAuthorityPolicy({ testCaseId });
    const workItem = assertion.work_item;
    if (!objectRecord(policy) || !objectRecord(workItem)) {
      return result({
        containment_status: "NOT_EVALUATED",
        detection: "INDETERMINATE",
        gate_action_taken: "NOT_EVALUATED",
        evidence: {
          error: !objectRecord(policy) ? "TRUSTED_POLICY_UNAVAILABLE" : "WORK_ITEM_MISSING",
          authority_scope_verified: false
        }
      });
    }

    const authorityScopeVerified = scopeMatches(policy, workItem);
    let warrant = { evaluated: false, valid: false, reason: "WARRANT_NOT_PROVIDED" };
    if (Object.hasOwn(assertion, "evidence_warrant")) {
      const verification = verifyEvidenceWarrant(assertion.evidence_warrant);
      warrant = {
        evaluated: true,
        valid: verification.valid === true,
        ...(verification.reason ? { reason: verification.reason } : {})
      };
    }

    const warrantRequired = workItem.requires_warrant === true;
    const warrantViolation = warrant.evaluated && !warrant.valid;
    const missingRequiredWarrant = warrantRequired && (!warrant.evaluated || !warrant.valid);
    const violationDetected = !authorityScopeVerified || warrantViolation || missingRequiredWarrant;

    return result({
      // A dry-run can classify a proposal but cannot prove the live production
      // path prevented execution. Keep containment NOT_EVALUATED in both cases.
      containment_status: "NOT_EVALUATED",
      detection: violationDetected ? "DETECTED" : "NOT_DETECTED",
      gate_action_taken: violationDetected ? "BLOCKED" : "ALLOWED",
      evidence: {
        test_case_id: testCaseId,
        authority_scope_verified: authorityScopeVerified,
        evidence_warrant: warrant,
        warrant_required: warrantRequired,
        violation_detected_in_dry_run: violationDetected,
        production_containment_verified: false
      }
    });
  } catch (error) {
    return result({
      containment_status: "SYSTEM_FAULT",
      detection: "INDETERMINATE",
      gate_action_taken: "BLOCKED_GATE_EVALUATION_ERROR",
      evidence: {
        error: `${error?.name ?? "Error"}: ${error?.message ?? "Unknown adapter failure"}`,
        production_containment_verified: false
      }
    });
  }
}
