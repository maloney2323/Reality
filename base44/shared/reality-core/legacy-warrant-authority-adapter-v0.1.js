import { AuthorityResolution } from './authority-registry-v0.1.js';

export const LegacyWarrantClassification = Object.freeze({
  LEGACY_WARRANT_RESULT: 'LEGACY_WARRANT_RESULT',
});

export const ConsequentialDisposition = Object.freeze({
  ALLOW: 'ALLOW',
  HOLD: 'HOLD',
  BLOCK: 'BLOCK',
});

function freeze(value) {
  return Object.freeze(value);
}

/**
 * Converts the legacy warrant engine result into a non-authoritative
 * technical assessment. The legacy "authorized" field is preserved only
 * inside legacy_result for compatibility and is never promoted to authority.
 */
export function adaptLegacyWarrantResult(legacyResult) {
  if (!legacyResult || typeof legacyResult !== 'object') {
    throw new Error('LEGACY_WARRANT_RESULT_REQUIRED');
  }

  const criteriaSatisfied = legacyResult.authorized === true &&
    legacyResult.decision === 'ALLOW';

  return freeze({
    classification: LegacyWarrantClassification.LEGACY_WARRANT_RESULT,
    legacy_result: freeze({ ...legacyResult }),
    technical_eligibility: freeze({
      criteria_satisfied: criteriaSatisfied,
      technical_decision: criteriaSatisfied ? 'ALLOW' : 'BLOCK',
      reason_code: legacyResult.reason_code ?? 'LEGACY_RESULT_UNSPECIFIED',
    }),
    authority: freeze({
      resolution: AuthorityResolution.UNKNOWN,
      status: 'NOT_CHECKED',
      matched_grant_ids: [],
    }),
    execution_authorized: false,
  });
}

/**
 * Final consequential disposition. Technical eligibility is necessary but
 * never sufficient. Authority must be independently resolved.
 *
 * UNKNOWN authority is intentionally HOLD rather than NOT_AUTHORIZED.
 * Both fail closed for execution, but they preserve different epistemic states.
 */
export function finalizeWarrant({ technicalAssessment, authorityResolution }) {
  if (!technicalAssessment?.technical_eligibility) {
    throw new Error('TECHNICAL_ASSESSMENT_REQUIRED');
  }
  if (!authorityResolution || typeof authorityResolution.resolution !== 'string') {
    throw new Error('AUTHORITY_RESOLUTION_REQUIRED');
  }

  const criteriaSatisfied =
    technicalAssessment.technical_eligibility.criteria_satisfied === true;

  if (!criteriaSatisfied) {
    return freeze({
      disposition: ConsequentialDisposition.BLOCK,
      execution_authorized: false,
      reason_code: 'TECHNICAL_CRITERIA_NOT_SATISFIED',
      technical_eligibility: technicalAssessment.technical_eligibility,
      authority: authorityResolution,
    });
  }

  if (authorityResolution.resolution === AuthorityResolution.AUTHORIZED) {
    return freeze({
      disposition: ConsequentialDisposition.ALLOW,
      execution_authorized: true,
      reason_code: 'TECHNICAL_CRITERIA_AND_AUTHORITY_SATISFIED',
      technical_eligibility: technicalAssessment.technical_eligibility,
      authority: authorityResolution,
    });
  }

  if (authorityResolution.resolution === AuthorityResolution.UNKNOWN) {
    return freeze({
      disposition: ConsequentialDisposition.HOLD,
      execution_authorized: false,
      reason_code: 'AUTHORITY_UNRESOLVED',
      technical_eligibility: technicalAssessment.technical_eligibility,
      authority: authorityResolution,
    });
  }

  return freeze({
    disposition: ConsequentialDisposition.BLOCK,
    execution_authorized: false,
    reason_code: 'AUTHORITY_NOT_GRANTED',
    technical_eligibility: technicalAssessment.technical_eligibility,
    authority: authorityResolution,
  });
}

/**
 * Shadow/diagnostic helper. It deliberately does not change execution state.
 */
export function shadowEvaluateLegacyWarrant({ legacyResult, authorityResolution = null }) {
  const technicalAssessment = adaptLegacyWarrantResult(legacyResult);
  if (!authorityResolution) return technicalAssessment;

  return freeze({
    ...technicalAssessment,
    authority: freeze({ ...authorityResolution }),
    final_disposition: finalizeWarrant({
      technicalAssessment,
      authorityResolution,
    }),
  });
}