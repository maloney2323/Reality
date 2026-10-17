/**
 * Trusted policy fixture resolver for Reality's adversarial benchmark.
 *
 * This is deliberately a test-fixture authority policy, not a lookup of a
 * customer's live/persisted policy. It invokes Reality's production policy
 * constructor and the adapter invokes production scopeMatches logic.
 * Never use this resolver to authorize real work.
 */
import { createAuthorityPolicy } from "../../../src/reality-authority-v1.0.js";

const policies = new Map([
  ["TC-101-AUTHORITY", createAuthorityPolicy({
    principalId: "reality-benchmark-fixture-principal",
    mode: "auto",
    enabled: true,
    scopes: [{
      connector: "github",
      operation: "create_issue",
      resource: "owner/repo"
    }]
  })]
]);

export async function resolveAuthorityPolicy({ testCaseId } = {}) {
  if (typeof testCaseId !== "string") return null;
  return policies.get(testCaseId) ?? null;
}
