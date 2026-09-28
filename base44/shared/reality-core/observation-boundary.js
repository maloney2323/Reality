// Internal storage boundary shared by Reality's public observation interface and
// first-party Reality applications. This module does not expose a client API.
// It preserves the frozen F0-F6 identity invariant: the authenticated principal
// is resolved before service-role storage and caller-supplied identity is ignored.

const boundaryIssuedObservations = new WeakSet();

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function freezeBoundaryObservation(record) {
  const value = Object.freeze({
    id: record.id,
    content: record.content,
    origin: record.origin,
    admission_principal_id: record.admission_principal_id,
    received_at: record.created_date,
  });
  boundaryIssuedObservations.add(value);
  return value;
}

export function requireBoundaryAdmittedObservation({ principal, admittedObservation }) {
  const principalId = requireAuthenticatedPrincipal(principal);
  if (!admittedObservation || !boundaryIssuedObservations.has(admittedObservation)) {
    throw new Error('Reality Observation Boundary-issued observation required.');
  }
  if (admittedObservation.admission_principal_id !== principalId) {
    throw new Error('Reality admitted observation belongs to a different authenticated principal.');
  }
  return admittedObservation;
}

export function requireAuthenticatedPrincipal(principal) {
  if (!principal || !nonEmptyString(principal.id)) {
    const error = new Error('Reality requires an authenticated principal.');
    error.status = 401;
    throw error;
  }
  return principal.id;
}

export async function admitObservationForPrincipal({ base44, principal, observation }) {
  const admissionPrincipalId = requireAuthenticatedPrincipal(principal);
  if (!observation || typeof observation.content !== 'string') {
    const error = new Error('admit requires an observation with a string content.');
    error.status = 400;
    throw error;
  }
  if (!nonEmptyString(observation.origin)) {
    const error = new Error('admit requires a non-empty string origin.');
    error.status = 400;
    throw error;
  }

  const created = await base44.asServiceRole.entities.Observation.create({
    content: observation.content,
    origin: observation.origin,
    admission_principal_id: admissionPrincipalId,
  });
  const record = await base44.asServiceRole.entities.Observation.get(created.id);
  return freezeBoundaryObservation(record);
}

export async function retrieveObservationForPrincipal({ base44, principal, id }) {
  const admissionPrincipalId = requireAuthenticatedPrincipal(principal);
  if (!nonEmptyString(id)) {
    const error = new Error('retrieve requires an id.');
    error.status = 400;
    throw error;
  }

  let record;
  try {
    record = await base44.asServiceRole.entities.Observation.get(id);
  } catch {
    const error = new Error('Not found.');
    error.status = 404;
    throw error;
  }

  if (!record || !nonEmptyString(record.admission_principal_id) || record.admission_principal_id !== admissionPrincipalId) {
    const error = new Error('Not found.');
    error.status = 404;
    throw error;
  }

  return freezeBoundaryObservation(record);
}