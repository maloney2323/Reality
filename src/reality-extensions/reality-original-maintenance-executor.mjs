import { createHash } from "node:crypto";
import { proposeOriginalRepair } from "./reality-original-maintenance-repair-proposal.mjs";

export const ORIGINAL_REPAIR_WORK =
  "work:24cda9611404e9bcb47909976067605c";

const OWNER = "maloney2323";
const REPOSITORY = "Reality";
const BRANCH = "experiment/reality-live-durable-adversarial-20261025";
const BASE_REF = BRANCH;
const ISSUE_NUMBER = 143;
const ISSUE_TITLE =
  "Reality recurring work: repair repeated Reality Governed Execution Engine v0.1 failures";
const SOURCE_PATH = "test/reality-personal-discovered-work-handoff-v0.1.test.js";
const OPERATION = "github:repair_original_maintenance";

const REF_PATH = `/repos/${OWNER}/${REPOSITORY}/git/ref/heads/${BRANCH}`;
const ISSUE_PATH = `/repos/${OWNER}/${REPOSITORY}/issues/${ISSUE_NUMBER}`;
const ISSUE_URL = `https://github.com/${OWNER}/${REPOSITORY}/issues/${ISSUE_NUMBER}`;
const SOURCE_URL = `/repos/${OWNER}/${REPOSITORY}/contents/${SOURCE_PATH}`;

const PREEXISTING = "PREEXISTING_FIX_OBSERVED_NO_WRITE";
const READY = "REPAIR_PROPOSAL_READY_SEPARATE_AUTHORIZATION_REQUIRED";

const fail = (message) => {
  throw new Error(message);
};

const requireValue = (value, message) => {
  if (!value) fail(message);
};

const unwrap = (value) => {
  if (!value || typeof value !== "object") return value;

  if (Object.prototype.hasOwnProperty.call(value, "data")) {
    return value.data;
  }

  if (
    Object.prototype.hasOwnProperty.call(value, "body") &&
    value.body !== null &&
    typeof value.body === "object"
  ) {
    return value.body;
  }

  return value;
};

const sha256 = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const gitBlobSha = (value) => {
  const bytes = Buffer.from(value, "utf8");
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`, "utf8")
    .update(bytes)
    .digest("hex");
};

async function read(get, path) {
  return unwrap(await get(path));
}

function decodeSource(file) {
  requireValue(
    file &&
      typeof file.content === "string" &&
      file.encoding === "base64",
    "source content is missing",
  );
  return Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8");
}

function validateIssue(issue) {
  requireValue(
    issue?.number === ISSUE_NUMBER &&
      issue.state === "open" &&
      issue.title === ISSUE_TITLE &&
      issue.html_url === ISSUE_URL,
    "ORIGINAL_EXECUTOR_PINNED_BRANCH_OR_ISSUE_MISMATCH",
  );
}

async function observe(get) {
  const ref = await read(get, REF_PATH);
  const head = ref?.object?.sha;

  requireValue(
    ref?.ref === `refs/heads/${BRANCH}` &&
      typeof head === "string" &&
      /^[0-9a-f]{40}$/i.test(head),
    "ORIGINAL_EXECUTOR_PINNED_BRANCH_OR_ISSUE_MISMATCH",
  );

  validateIssue(await read(get, ISSUE_PATH));

  const file = await read(get, `${SOURCE_URL}?ref=${head}`);
  requireValue(
    file?.type === "file" &&
      file.path === SOURCE_PATH &&
      typeof file.sha === "string" &&
      /^[0-9a-f]{40}$/i.test(file.sha),
    "source file identity mismatch",
  );

  const source = decodeSource(file);
  const blobSha = gitBlobSha(source);

  requireValue(file.sha === blobSha, "source Git blob SHA mismatch");

  return {
    headSha: head,
    source,
    sourceBlobSha: blobSha,
    sourceSha256: sha256(source),
  };
}

function normalizeProposal(proposal, source) {
  requireValue(proposal && typeof proposal === "object", "invalid repair proposal");
  requireValue(
    proposal.status === "ALREADY_FIXED" ||
      proposal.status === "PATCH_PROPOSED",
    "invalid repair proposal status",
  );

  if (proposal.status === "ALREADY_FIXED") return proposal;

  const patchedSource = proposal.patchedSource;
  requireValue(
    typeof patchedSource === "string" && patchedSource !== source,
    "proposal content is missing",
  );

  const patchSha = sha256(patchedSource);

  if (proposal.proposedPatchSha256 !== undefined) {
    requireValue(
      proposal.proposedPatchSha256 === patchSha,
      "proposal hash mismatch",
    );
  }

  return { ...proposal, patchedSource, patchSha };
}

function ownerId(session) {
  return session?.user_id;
}

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function validateGrant(grant, expected) {
  requireValue(
    grant &&
      grant.status === "CONSUMED_ONCE" &&
      grant.one_time_grant_consumed === true &&
      typeof grant.grant_id === "string" &&
      grant.grant_id.length > 0 &&
      grant.authorized_by === expected.owner_id &&
      grant.owner_id === expected.owner_id &&
      grant.conversation_id === expected.conversation_id &&
      grant.original_work_id === ORIGINAL_REPAIR_WORK &&
      grant.base_ref === BASE_REF &&
      grant.repository === `${OWNER}/${REPOSITORY}` &&
      grant.issue_number === ISSUE_NUMBER &&
      grant.operation === OPERATION &&
      grant.base_head_sha === expected.observedHeadSha &&
      grant.source_blob_sha === expected.observedBlobSha &&
      grant.proposed_patch_sha256 === expected.proposedPatchSha256 &&
      grant.candidate_sha256 === expected.candidateSha256,
    "ORIGINAL_EXECUTOR_DURABLE_EXACT_OWNER_GRANT_REQUIRED",
  );

  return grant;
}

function commitSha(result) {
  return unwrap(result)?.commit?.sha;
}

export async function prepareOriginalMaintenanceRepair({
  workId = ORIGINAL_REPAIR_WORK,
  get,
} = {}) {
  requireValue(
    workId === ORIGINAL_REPAIR_WORK,
    "ORIGINAL_EXECUTOR_ONLY_ORIGINAL_WORK_ALLOWED",
  );
  requireValue(typeof get === "function", "read-only GitHub reader is required");

  const observed = await observe(get);
  const proposal = normalizeProposal(
    await proposeOriginalRepair({
      workId: ORIGINAL_REPAIR_WORK,
      source: observed.source,
    }),
    observed.source,
  );

  if (proposal.status === "ALREADY_FIXED") {
    return {
      state: PREEXISTING,
      original_work_id: ORIGINAL_REPAIR_WORK,
      model_upgrade_installed: false,
    };
  }

  return {
    state: READY,
    source_status: "PATCH_PROPOSED",
    provider_write_permitted: false,
    requires_install_authorization: true,
    proposed_patch_sha256: proposal.patchSha,
    candidate_sha256: proposal.patchSha,
    patchedSource: proposal.patchedSource,
    observedHeadSha: observed.headSha,
    observedBlobSha: observed.sourceBlobSha,
    source_sha256: observed.sourceSha256,
  };
}

export async function executeOriginalMaintenanceRepair({
  session,
  conversationId,
  workId = ORIGINAL_REPAIR_WORK,
  get,
  write,
  consumeVerifiedGrant,
} = {}) {
  requireValue(
    workId === ORIGINAL_REPAIR_WORK,
    "ORIGINAL_EXECUTOR_ONLY_ORIGINAL_WORK_ALLOWED",
  );

  const prepared = await prepareOriginalMaintenanceRepair({ workId, get });

  if (prepared.state === PREEXISTING) {
    return {
      status: "PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY",
      original_job_completed: false,
      repair_executed_by_reality: false,
      external_write_performed: false,
    };
  }

  const owner_id = ownerId(session);

  requireValue(
    isUuid(owner_id) &&
      isUuid(conversationId) &&
      typeof get === "function" &&
      typeof write === "function" &&
      typeof consumeVerifiedGrant === "function",
    "ORIGINAL_EXECUTOR_TRUSTED_OWNER_AND_GRANT_SERVICE_REQUIRED",
  );

  const before = await observe(get);

  requireValue(
    before.headSha === prepared.observedHeadSha &&
      before.sourceBlobSha === prepared.observedBlobSha &&
      before.sourceSha256 === prepared.source_sha256,
    "ORIGINAL_EXECUTOR_SOURCE_MOVED_AFTER_GRANT_NO_RETRY",
  );

  const proposedPatchSha256 = sha256(prepared.patchedSource);

  requireValue(
    proposedPatchSha256 === prepared.proposed_patch_sha256 &&
      proposedPatchSha256 === prepared.candidate_sha256,
    "ORIGINAL_EXECUTOR_DURABLE_EXACT_OWNER_GRANT_REQUIRED",
  );

  const expected = {
    observedHeadSha: before.headSha,
    observedBlobSha: before.sourceBlobSha,
    proposedPatchSha256,
    candidateSha256: proposedPatchSha256,
    original_work_id: ORIGINAL_REPAIR_WORK,
    owner_id,
    conversation_id: conversationId,
    base_ref: BASE_REF,
    repository: `${OWNER}/${REPOSITORY}`,
    issue_number: ISSUE_NUMBER,
    operation: OPERATION,
  };

  const grant = await consumeVerifiedGrant(expected);
  validateGrant(grant, expected);

  const afterGrant = await observe(get);

  requireValue(
    afterGrant.headSha === before.headSha &&
      afterGrant.sourceBlobSha === before.sourceBlobSha &&
      afterGrant.sourceSha256 === before.sourceSha256,
    "ORIGINAL_EXECUTOR_SOURCE_MOVED_AFTER_GRANT_NO_RETRY",
  );

  const written = await write(SOURCE_URL, "PUT", {
    branch: BRANCH,
    sha: afterGrant.sourceBlobSha,
    content: Buffer.from(prepared.patchedSource, "utf8").toString("base64"),
    message: `Apply verified original maintenance repair for issue #${ISSUE_NUMBER}`,
  });

  const resulting_commit_sha = commitSha(written);

  requireValue(
    typeof resulting_commit_sha === "string" &&
      /^[0-9a-f]{40}$/i.test(resulting_commit_sha),
    "write result commit SHA missing",
  );

  const readback = await read(
    get,
    `${SOURCE_URL}?ref=${resulting_commit_sha}`,
  );

  requireValue(
    readback?.type === "file" &&
      readback.path === SOURCE_PATH &&
      readback.encoding === "base64" &&
      typeof readback.sha === "string",
    "independent source readback mismatch",
  );

  const readbackSource = decodeSource(readback);

  requireValue(
    sha256(readbackSource) === proposedPatchSha256 &&
      gitBlobSha(readbackSource) === readback.sha,
    "independent source readback mismatch",
  );

  return {
    status: "AUTHORIZED_PATCH_GITHUB_SOURCE_REOBSERVED",
    resulting_commit_sha,
    source_readback_independent: true,
    external_write_performed: true,
    original_job_completed: false,
    original_job_settlement_saved: false,
  };
}
