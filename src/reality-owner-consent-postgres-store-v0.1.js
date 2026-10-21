// Trusted server-side PostgreSQL nonce-consumption adapter.
// Requires sql/owner_approval_consumptions_v0.1.sql to be applied by an
// operator, with private schema permissions granted to a trusted runtime.
// No connection strings or credentials are embedded or read from the caller.
// query(sql, parameters) MUST be a trusted, parameterized PostgreSQL client.
// Do not expose this adapter to untrusted public HTTP request bodies.

const isText = v => typeof v === 'string' && v.trim().length > 0;
const HASH_RE = /^[0-9a-f]{64}$/i;

export function createPostgresOwnerApprovalStore({query}={}) {
  if (typeof query !== 'function') throw new Error('TRUSTED_POSTGRES_QUERY_REQUIRED');
  const consumeOnce = async input => {
    if (!isText(input?.key) ||
        !HASH_RE.test(input?.binding_sha256 || '') ||
        !isText(input?.owner_id) || !isText(input?.purpose) ||
        !isText(input?.subject_ref) || !isText(input?.consent_ref) ||
        !Number.isFinite(Date.parse(input?.expires_at))) {
      throw new Error('INVALID_OWNER_APPROVAL_CONSUMPTION_REQUEST');
    }
    // Exactly one INSERT can win due to the approval_key PRIMARY KEY.
    // The expiration condition is evaluated by the database clock.
    // No UPSERT, ON CONFLICT UPDATE, or rollback of consumed approvals.
    const sql = [
      'INSERT INTO reality_governance.owner_approval_consumptions',
      '(approval_key,binding_sha256,owner_id,purpose,subject_ref,consent_ref,expires_at)',
      'SELECT $1,$2,$3,$4,$5,$6,$7::timestamptz',
      'WHERE $7::timestamptz > now()',
      'ON CONFLICT (approval_key) DO NOTHING',
    ].join(' ');
    const args = [
      input.key, input.binding_sha256, input.owner_id,
      input.purpose, input.subject_ref, input.consent_ref,
      input.expires_at,
    ];
    // Insert-only database roles must NOT need SELECT or RETURNING rights.
    // A trusted autocommit PostgreSQL driver provides a server-calculated
    // command rowCount: exactly 1 for the unique winner, 0 for duplicates/
    // expired approval. Anything else fails closed without an execution token.
    const result = await query(sql,args);
    if (!result || (result.rowCount !== 1 && result.rowCount !== 0) ||
        (Array.isArray(result.rows) && result.rows.length !== 0)) {
      throw new Error('POSTGRES_OWNER_CONSUMPTION_ROWCOUNT_INVALID');
    }
    const inserted = result.rowCount === 1;
    if (inserted) {
      return Object.freeze({
        key:input.key, binding_sha256:input.binding_sha256,
        atomic:true, durable:true, consumed:true, already_used:false,
        record_ref:'pg-owner-approval:'+input.key,
      });
    }
    // No row inserted: duplicate or expired according to the database clock.
    // Either way the caller must not execute the requested operation.
    return Object.freeze({
      key:input.key, binding_sha256:input.binding_sha256,
      atomic:true, durable:true, consumed:false, already_used:true,
      record_ref:null,
    });
  };
  return Object.freeze({
    kind:'TRUSTED_DURABLE_OWNER_APPROVAL_STORE',
    consumeOnce,
  });
}
