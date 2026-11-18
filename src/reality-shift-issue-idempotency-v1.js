import crypto from 'node:crypto';

export const SHIFT_ISSUE_IDEMPOTENCY_VERSION='reality-shift-issue-idempotency-v1';
const REPO='maloney2323/Reality';

export function shiftIssueMarker(workItemId) {
  if (typeof workItemId!=='string' || !workItemId.trim()) throw new Error('WORK_ITEM_ID_REQUIRED');
  const fingerprint=crypto.createHash('sha256').update(workItemId).digest('hex').slice(0,32);
  return '<!-- reality-shift-work:'+fingerprint+' -->';
}

export function attachShiftIssueMarker(body,workItemId) {
  if (typeof body!=='string') throw new Error('GITHUB_ISSUE_BODY_REQUIRED');
  const marker=shiftIssueMarker(workItemId);
  return body.includes(marker) ? body : body+'\n\n'+marker;
}

/**
 * Direct provider readback (not a model conclusion). This is a conservative
 * bounded lookup of current issues and will return null on uncertainty.
 * Never interpret null as proof an earlier write did not happen.
 */
export async function findExistingShiftIssue(job,githubRead) {
  if (typeof githubRead!=='function') throw new Error('GITHUB_PROVIDER_READ_REQUIRED');
  if (job?.connector!=='github' || job?.operation!=='create_issue' ||
    job?.inputs?.repository!==REPO) return null;
  const marker=shiftIssueMarker(job.work_item_id);
  const issues=await githubRead('/repos/maloney2323/Reality/issues?state=all&per_page=100');
  if (!Array.isArray(issues)) throw new Error('GITHUB_ISSUES_READ_INVALID');
  const matching=issues.filter(x=>!x.pull_request && x?.body?.includes(marker)
    && x.title===job.inputs.title && Number.isInteger(x.number) && x.number>0);
  if (matching.length>1) throw new Error('DUPLICATE_EXISTING_WORK_ISSUES');
  const first=matching[0];
  if (!first) return null;
  const verified=await githubRead('/repos/maloney2323/Reality/issues/'+first.number);
  if (!verified || verified.number!==first.number || verified.state!=='open'
    || verified.title!==job.inputs.title || !verified.body?.includes(marker)
    || verified.html_url!==\`https://github.com/\${REPO}/issues/\${verified.number}\`) return null;
  return Object.freeze({
    work_item_id:job.work_item_id,issue_number:verified.number,
    issue_url:verified.html_url,provider_execution_id:String(verified.id),
    title:verified.title,state:verified.state,
    independent_readback:true,
  });
}