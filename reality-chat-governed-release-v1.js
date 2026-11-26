/* Existing Reality release controller, surfaced in authenticated Chat.
 * The browser supplies no credentials, owner identity, release target or authority.
 * Preparation cannot activate. One explicit exact approval can authorize delivery.
 */
(()=>{
 'use strict';
 if(!/^\/chat\/?$/.test(location.pathname))return;
 const ready=document.getElementById('privateReady');
 const work=document.getElementById('realityChatPanelWork');
 if(!ready||!work||document.getElementById('realityChatGovernedRelease'))return;
 const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
 const SHA=/^[a-f0-9]{40}$/;
 const HASH=/^sha256:[a-f0-9]{64}$/;
 const KEY=/^[A-Z][A-Z0-9_]{3,110}$/;
 const URL='/api/reality/governed-worker-release-control-plane';
 const signed=()=>ready.style.display==='block';
 const node=(tag,cls,text)=>{
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(text!==undefined)el.textContent=text;return el;
 };
 const card=node('section','reality-final-loop-child-approval-card');
 card.id='realityChatGovernedRelease';card.hidden=true;
 card.setAttribute('aria-label','Governed worker release');
 const header=node('div','reality-final-loop-child-actions');
 const title=node('strong','reality-final-loop-child-title','Reality · release qualification');
 const dismiss=node('button','reality-final-loop-child-refresh','×');
 dismiss.type='button';dismiss.setAttribute('aria-label','Dismiss release details');
 header.append(title,dismiss);
 const detail=node('p','reality-final-loop-child-detail','Check the independently tested release for your existing authorized shift.');
 const evidence=node('p','reality-final-loop-child-evidence','');
 const limits=node('p','reality-final-loop-child-limits','Preview only. No new shift, production change, original-job settlement or extra work authority.');
 const actions=node('div','reality-final-loop-child-actions');
 const check=node('button','reality-final-loop-child-refresh','Check release qualification');
 const approve=node('button','reality-final-loop-child-approve','Approve exact Preview release');
 check.type=approve.type='button';approve.hidden=true;approve.disabled=true;
 const message=node('p','reality-final-loop-child-message','');
 message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 actions.append(check,approve);card.append(header,detail,evidence,limits,actions,message);
 work.prepend(card);
 let packet=null,busy=false,uncertain=false,dismissed=false,epoch=0;
 const clear=()=>{packet=null;approve.hidden=true;approve.disabled=true;evidence.textContent='';};
 const valid=p=>p?.status==='SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED'&&
  UUID.test(p.request_id||'')&&UUID.test(p.shift_id||'')&&SHA.test(p.release_sha||'')&&
  HASH.test(p.proposal_fingerprint||'')&&KEY.test(p.capability_key||'')&&
  /^[a-z0-9-]{6,145}\.vercel\.app$/.test(p.scheduled_alias||'')&&
  /^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$/.test(p.release_ref||'')&&
  p.target_environment==='CANONICAL_BENCHMARK_PREVIEW'&&p.owner_approval_granted===false&&
  p.release_changed===false&&p.original_job_completed===false&&
  p.runtime_scope?.shift_id===p.shift_id&&p.runtime_scope.release_sha===p.release_sha&&
  p.runtime_scope.child_execution_enabled===false&&p.runtime_scope.parent_delivery_enabled===false&&
  p.runtime_scope.production_changed===false;
 async function request(body){
  const r=await fetch(URL,{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'content-type':'application/json'},body:JSON.stringify(body),
   signal:AbortSignal.timeout(65000)});
  return {status:r.status,data:await r.json().catch(()=>null)};
 }
 function report(data){
  const status=typeof data?.status==='string'?data.status:'UNVERIFIED_RESPONSE';
  const reason=typeof data?.qualification_status==='string'?data.qualification_status:'';
  const next=typeof data?.next_governed_action==='string'?data.next_governed_action:'';
  return [status,reason,next].filter(Boolean).join(' · ').replaceAll('_',' ');
 }
 check.addEventListener('click',async()=>{
  if(!signed()||busy)return;
  busy=true;const started=epoch;check.disabled=true;clear();
  message.textContent='Reading independent release and continuity evidence…';
  try{
   const {data}=await request({intent:'OWNER_PREPARE_EXACT_RELEASE'});
   if(started!==epoch||!signed())return;
   if(data?.production_changed!==false||data.original_job_completed!==false)throw Error('Unverified');
   if(data.status==='SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED'&&
      data.release_switch_attempted===false&&valid(data.release_preparation)){
    const p=data.release_preparation;
    detail.textContent='Activate only the verified Preview worker for the existing shift '+p.shift_id+'.';
    evidence.textContent='Commit '+p.release_sha+' · branch '+p.release_ref+' · '+p.capability_key+
     ' · target '+p.scheduled_alias+' · original '+(p.runtime_scope.original_work_id||'unverified')+
     ' · packet '+p.request_id+' · fingerprint '+p.proposal_fingerprint;
    if(uncertain){message.textContent='An earlier approval outcome is uncertain. No repeat approval is allowed here.';return;}
    packet=p;approve.hidden=false;approve.disabled=false;
    message.textContent='Independently qualified. Your exact approval is required. Nothing has been activated.';
   }else{
    message.textContent=report(data);
   }
  }catch{if(started===epoch)message.textContent='Qualification response unavailable. No approval or release activation is confirmed.';}
  finally{busy=false;check.disabled=false;}
 });
 approve.addEventListener('click',async()=>{
  if(!signed()||busy||uncertain||!packet||approve.disabled)return;
  const p=packet,started=epoch;busy=true;uncertain=true;
  approve.disabled=true;check.disabled=true;
  message.textContent='Requalifying and recording your exact approval once…';
  try{
   const {data}=await request({intent:'OWNER_APPROVE_EXACT_RELEASE',request_id:p.request_id,
    proposal_fingerprint:p.proposal_fingerprint});
   if(started!==epoch||!signed())return;
   if(data?.production_changed!==false||data.original_job_completed!==false)throw Error('Unverified');
   if(data.status==='GOVERNED_RELEASE_SWITCH_DELIVERED_AWAITING_SIGNED_WORKER_WAKE'&&
      HASH.test(data.owner_approval_receipt_sha256||'')&&data.signed_worker_new_release_observed===false){
    message.textContent='Exact approval receipt '+data.owner_approval_receipt_sha256+
     '. Release delivery reported; actual worker execution and original work completion are not yet verified.';
    if(data.governed_trigger_observation?.wake_queued===true)
     message.textContent+=' Governed wake queued.';
   }else message.textContent=report(data)+'. Do not repeat approval; reconcile existing authority and effects.';
  }catch{if(started===epoch)message.textContent='Approval or delivery outcome uncertain. Do not repeat. Check verified status.';}
  finally{busy=false;clear();check.disabled=false;}
 });
 dismiss.addEventListener('click',()=>{dismissed=true;card.hidden=true;});
 function sync(){
  if(!signed()){epoch++;clear();card.hidden=true;dismissed=false;return;}
  card.hidden=dismissed;
 }
 new MutationObserver(sync).observe(ready,{attributes:true,attributeFilter:['style']});
 sync();
})();
