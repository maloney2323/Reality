import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('index.html','utf8');
test('the original Upgrade and improvements category remains the single category destination',()=>{
 assert.match(html,/\['upgrades','Upgrades & improvements'/);
 assert.match(html,/id="wcCategories"/);
 assert.match(html,/id="wcTaskList"/);
 assert.match(html,/Reality-discovered weaknesses and potential improvements/);
 assert.match(html,/Observed weaknesses · capability gains · verified value/);
});
test('scavenger-hunt five-stage manual repair view is collapsed and only surfaced within upgrades',()=>{
 const category=html.indexOf('id="wcTaskList"');
 const details=html.indexOf('id="wcUpgradeDiagnostics"');
 const center=html.indexOf('id="wcGovernedBuild"');
 const approval=html.indexOf('id="wcExactInstallDialog"');
 assert.ok(category>0&&details>category&&center>details&&approval>center);
 assert.match(html,/id="wcUpgradeDiagnostics" class="wc-repair-diagnostics" hidden/);
 assert.match(html,/<summary>Self-repair evidence and owner approvals · Advanced testing details<\/summary>/);
 assert.match(html,/repairDiagnostics.hidden=wcCurrent!=='upgrades'/);
 assert.equal((html.match(/id="wcGovernedBuild"/g)||[]).length,1);
 assert.equal((html.match(/id="wcExactInstallDialog"/g)||[]).length,1);
 assert.equal((html.match(/id="wcRepairConsentDialog"/g)||[]).length,1);
});
test('no unproved business value or completed work is claimed',()=>{
 assert.match(html,/Additional customer value: NOT YET MEASURED/);
 assert.match(html,/No code upgrade authorized/);
 assert.match(html,/Job not completed/);
 assert.match(html,/An issue or code change is not automatically proof of a weakness/);
 assert.match(html,/unproven business value must not be presented as savings/);
});
test('new real source-backed repair has a distinct honest status, not an inferred installed capability',()=>{
 assert.match(html,/job.state==='REAL_SOURCE_BACKED_REPAIR_PENDING'/);
 assert.match(html,/Source-backed weakness found · Original job open/);
 assert.match(html,/Candidate weakness: still under diagnosis/);
 assert.match(html,/owner-scoped/);
});
