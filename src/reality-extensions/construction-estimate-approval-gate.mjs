export function evaluateEstimateRelease(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid input");
  }

  if (!Object.prototype.hasOwnProperty.call(input, "estimate_id")) {
    throw new Error("Invalid estimate_id");
  }

  const estimateId = input.estimate_id;

  if (
    typeof estimateId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.test(estimateId)
  ) {
    throw new Error("Invalid estimate_id");
  }

  if (input.homeowner_approved !== true) {
    return {
      estimate_id: estimateId,
      status: "HOLD",
      reason: "HOMEOWNER_APPROVAL_MISSING",
      external_action_authorized: false
    };
  }

  if (
    typeof input.approval_evidence_id !== "string" ||
    !/^approval:[a-z0-9-]{8,64}$/.test(input.approval_evidence_id)
  ) {
    return {
      estimate_id: estimateId,
      status: "HOLD",
      reason: "APPROVAL_EVIDENCE_MISSING",
      external_action_authorized: false
    };
  }

  if (input.owner_reviewed !== true) {
    return {
      estimate_id: estimateId,
      status: "HOLD",
      reason: "OWNER_REVIEW_REQUIRED",
      external_action_authorized: false
    };
  }

  return {
    estimate_id: estimateId,
    status: "READY_FOR_AUTHORIZATION",
    reason: "SEPARATE_SEND_AUTHORIZATION_REQUIRED",
    external_action_authorized: false
  };
}
