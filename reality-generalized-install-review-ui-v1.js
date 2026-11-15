// Authenticated owner read-only overview of Reality's verified original
// repair. No browser element or model response can authorize an install.
const API='/api/reality/generalized-original-install-review';
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const get=id=>document.getElementById(id);
const add=(kind,parent,value)=>{const e=document.createElement(kind);
 if(value)e.textContent=value;parent.append(e);return e;};
function panel(){
 const host=get('realityChatPanelProof')||get('chat')||get('privateReady');
 if(!host)return null;
 let p=get('generalizedOriginalInstallReviewPanel');
 if(!p){
  p=add('section',host);p.id='generalizedOriginalInstallReviewPanel';
  p.className='team-proof';p.hidden=true;
  p.setAttribute('aria-live','polite');
  add('h4',p,'Verified original repair · release readiness');
  add('p',p).id='generalizedOriginalInstallReviewStatus';
  add('p',p).id='generalizedOriginalInstallReviewArtifact';
  add('p',p).id='generalizedOriginalInstallReviewGates';
  const links=add('p',p);links.id='generalizedOriginalInstallReviewEvidence';
  const warning=add('p',p,
   'Reality does not install a repair or settle an original job from a passing model answer or CI check. The exact owner approval must follow independent release-continuation readiness.');
  warning.style.fontSize='13px';
 }
 const proof=get('realityChatPanelProof');
 if(proof&&p.parentNode!==proof)proof.append(p);
 return p;
}
function safe(d){
 return d?.ok===true&&
  d.status==='GENERALIZED_VERIFIED_ORIGINAL_INSTALL_REVIEW'&&
  WORK.test(d.original_work_id||'')&&
  SOURCE.test(d.source_ref||'')&&
  HASH.test(d.candidate_artifact_sha256||'')&&
  SHA.test(d.candidate_commit_sha||'')&&
  SHA.test(d.expected_preinstall_blob_sha||'')&&
  SHA.test(d.expected_installed_blob_sha||'')&&
  Number.isSafeInteger(d.independent_frozen_run_id)&&
  d.independent_frozen_run_id>10000&&
  Number.isSafeInteger(d.integrated_test_run_id)&&
  d.integrated_test_run_id>10000&&
  d.production_changed===false&&
  typeof d.owner_approval_ready==='boolean'&&
  typeof d.installation_authorized==='boolean'&&
  typeof d.original_job_completed==='boolean'&&
  d.owner_approval_action_available===false&&
  typeof d.phase==='string';
}
function evidenceLink(parent,label,url){
 const a=add('a',parent,label);
 a.href=url;a.target='_blank';a.rel='noopener noreferrer';
 a.style.display='inline-block';a.style.marginRight='14px';
}
let busy=false;
async function refresh(){
 if(busy)return;const p=panel();if(!p)return;
 busy=true;
 try{
  const response=await fetch(API,{method:'GET',cache:'no-store',
   credentials:'same-origin',headers:{accept:'application/json'}});
  if(response.status===401){p.hidden=true;return;}
  const d=await response.json().catch(()=>null);
  if(response.ok&&d?.status==='NO_CURRENT_VERIFIED_ORIGINAL_INSTALL_REVIEW'){
   p.hidden=true;return;
  }
  if(!response.ok||!safe(d)){
   p.hidden=false;
   get('generalizedOriginalInstallReviewStatus').textContent=
    'Current original installation review is unavailable or not independently verified.';
   get('generalizedOriginalInstallReviewArtifact').textContent='';
   get('generalizedOriginalInstallReviewGates').textContent='';
   get('generalizedOriginalInstallReviewEvidence').replaceChildren();
   return;
  }
  p.hidden=false;
  const issue=d.source_ref.split('/').at(-1);
  get('generalizedOriginalInstallReviewStatus').textContent=
    'Original job #'+issue+' · '+d.phase.replaceAll('_',' ')+
    (d.original_job_completed?' · independently settled':
     ' · original job remains open');
  get('generalizedOriginalInstallReviewArtifact').textContent=
    'Exact independently tested source '+d.candidate_commit_sha.slice(0,12)+
    ' · artifact '+d.candidate_artifact_sha256.slice(0,20)+'…';
  const gates=[
   ['GitHub write transport',d.isolated_github_write_verified],
   ['Automatic isolated preview deployment',d.preview_auto_deploy_verified],
   ['Original-job continuation and final receipt',d.same_original_execution_and_settlement_contract_verified]
  ];
  get('generalizedOriginalInstallReviewGates').textContent=
   gates.map(([name,ok])=>(ok?'Verified: ':'Not yet independently verified: ')+name).join(' · ')+
   (d.owner_approval_ready?
    ' · Ready for exact owner decision through Reality governance':
    ' · Installation approval is not available');
  const links=get('generalizedOriginalInstallReviewEvidence');
  links.replaceChildren();
  evidenceLink(links,'Original source',d.source_ref);
  evidenceLink(links,'Frozen candidate tests',
   'https://github.com/maloney2323/Reality/actions/runs/'+d.independent_frozen_run_id);
  evidenceLink(links,'Integration tests',
   'https://github.com/maloney2323/Reality/actions/runs/'+d.integrated_test_run_id);
 }catch{if(p){p.hidden=false;get('generalizedOriginalInstallReviewStatus').textContent=
   'Owner verification readback unavailable; no installation approved.';}}
 finally{busy=false;}
}
if(document.readyState==='loading')
 document.addEventListener('DOMContentLoaded',refresh,{once:true});
else refresh();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
document.addEventListener('click',e=>{
 if(e.target?.closest?.('#realityChatTabProof,#realityChatPanelProof,#chatNavLink'))refresh();
});
setInterval(()=>{if(!document.hidden)refresh()},30000);
