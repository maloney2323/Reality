// Historical settlement must be read back before the same approved original
// is resumed. Static CI invariant: fail before any workflow execution if the
// ordering or the signed dispatch preflight is removed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/reality-genuine-capability-auto-trigger-v1.yml',import.meta.url),'utf8');
const reconciler=readFileSync(new URL('../scripts/reality-genuine-universe-outcome-auto-finalize-v2.mjs',import.meta.url),'utf8');
function job(name){
 const start=workflow.indexOf('\\n  '+name+':\\n');
 assert.notEqual(start,-1,'missing '+name);
 const suffix=workflow.slice(start+1);
 const end=suffix.slice(3).search(/\\n  [a-z][a-z0-9_-]*:\\n/);
 return end<0?suffix:suffix.slice(0,end+3);
}
test('one reconciliation barrier precedes each governed original-job resume',()=>{
 const resume=job('resume_original_job');
 assert.match(resume,/needs: \\[record_owner_approved_activation, record_consumed_preview_recovery, reconcile_all_settled_outcomes\\]/);
 assert.match(resume,/needs\\.reconcile_all_settled_outcomes\\.result == 'success'/);
 assert.match(resume,/needs\\.record_owner_approved_activation\\.result/);
 assert.match(resume,/needs\\.record_consumed_preview_recovery\\.result/);
 assert.doesNotMatch(resume,/installation_authorized:\\s*true/);
});
test('reconciliation runs for both signed wake types without claiming execution',()=>{
 const reconcile=job('reconcile_all_settled_outcomes');
 assert.match(reconcile,/github\\.event_name == 'push' \\|\\| github\\.event_name == 'workflow_dispatch'/);
 assert.match(reconcile,/reality-genuine-universe-outcome-auto-finalize-v2\\.mjs/);
 assert.match(reconciler,/\\['push','workflow_dispatch'\\]\\.includes\\(e\\.GITHUB_EVENT_NAME\\)/);
 assert.match(reconciler,/e\\.GITHUB_REF!==BRANCH/);
 assert.match(reconciler,/ACTION[S]?_ID_TOKEN_REQUEST_TOKEN/);
 assert.match(reconciler,/replay\\.receipt\\.newly_reconciled!==0/);
});
