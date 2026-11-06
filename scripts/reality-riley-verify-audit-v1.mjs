// Separate read-only GitHub Actions job independently verifies Riley evidence.
import {readFileSync} from 'node:fs';
import {independentlyVerifyRileyProviderAudit}
 from '../src/reality-riley-engineering-pilot-v1.js';
const fail=code=>{throw Error('RILEY_PILOT_VERIFY_'+code)};
const branch='fix/reality-chat-fullscreen-verified-cycle-20261105';
const allowedPush=process.env.GITHUB_EVENT_NAME==='push'&&
 process.env.GITHUB_REF==='refs/heads/'+branch;
const allowedReview=process.env.GITHUB_EVENT_NAME==='pull_request'&&
 /^refs\/pull\/[1-9]\d*\/merge$/.test(process.env.GITHUB_REF||'')&&
 process.env.GITHUB_HEAD_REF===branch;
if(process.env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 !(allowedPush||allowedReview)||
 !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA||'')||
 !/^[1-9]\d{0,15}$/.test(process.env.GITHUB_RUN_ID||''))
 fail('PREVIEW_PROVENANCE_UNVERIFIED');
const evidence=JSON.parse(readFileSync(
 'riley-pilot-evidence/investigation.json','utf8'));
if(evidence.work_provenance?.source_sha!==process.env.GITHUB_SHA||
 evidence.work_provenance?.run_url!==
 'https://github.com/maloney2323/Reality/actions/runs/'+process.env.GITHUB_RUN_ID)
 fail('WORKFLOW_PROVENANCE_CHANGED');
const result=await independentlyVerifyRileyProviderAudit(evidence,{
 token:process.env.GITHUB_TOKEN
});
console.log('RILEY_INDEPENDENT_PROVIDER_VERIFICATION',JSON.stringify(result));
