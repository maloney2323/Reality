/* Reality Chat · exact Final Loop child-review consent on ONE existing shift.
 * Chat displays the service-bound packet and records a deliberate click.
 * Never creates customer acceptance, a new job, extra scope, or execution.
 */
(()=>{
 'use strict';
 if(!/^\/chat\/?$/.test(location.pathname))return;
 const ready=document.getElementById('privateReady');
 const work=document.getElementById('realityChatPanelWork');
 if(!ready||!work||document.getElementById('realityFinalLoopChildApproval'))return;
 const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
 const HASH=/^sha256:[a-f0-9]{64}$/;
 const WORK=/^work:[a-f0-9]{32}$/;
 const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
 const URL='/api/reality/owner-final-loop-child-approval';
 const signed=()=>ready.style.display==='block';
 const node=(tag,cls,value)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(value!==undefined)e.textContent=value;
  return e;
 };
 const card=node('section','reality-final-loop-child-approval-card');
 card.id='realityFinalLoopChildApproval';
 card.hidden=true;card.setAttribute('aria-label','Final Loop exact owner review approval');
 const label=node('span','label','REALITY · GOVERNED FINAL LOOP');
 const title=node('strong','reality-final-loop-child-title',
  'One unfinished original needs an exact review decision');
 const detail=node('p','reality-final-loop-child-detail','');
 const evidence=node('p','reality-final-loop-child-evidence','');
 const limits=node('p','reality-final-loop-child-limits',
  'Your click accepts the source-bound review goal and authorizes READ-ONLY internal review of the exact scoped source. '+
  'It does not authorize GitHub publication, installation, production changes, '+
  'or parent-job settlement. Other approvals remain separate.');
 const actions=node('div','reality-final-loop-child-actions');
 const approve=node('button','reality-final-loop-child-approve',
  'Approve exact internal review');
 approve.type='button';approve.disabled=true;
 const refresh=node('button','reality-final-loop-child-refresh',
  'Check verified status');
 refresh.type='button';
 actions.append(approve,refresh);
 const message=node('p','reality-final-loop-child-message','');
 message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 card.append(label,title,detail,evidence,limits,actions,message);
 work.prepend(card);
 let selected=null,busy=false,uncertain=false;
 function valid(packet){
  return packet&&UUID.test(packet.packet_id||'')&&
   REF.test(packet.source_ref||'')&&
   WORK.test(packet.parent_original_work_id||'')&&
   HASH.test(packet.source_manifest_sha256||'')&&
   HASH.test(packet.approval_fingerprint||'')&&
   HASH.test(packet.acceptance_contract_sha256||'')&&
   packet.effect_type==='READ_ONLY_INTERNAL_PR_REVIEW'&&
   Number.isSafeInteger(packet.file_count)&&
   packet.file_count>=9&&packet.file_count<=500&&
   Number.isSafeInteger(packet.proposed_scope_count)&&
   packet.proposed_scope_count>=2&&packet.proposed_scope_count<=63&&
   ['AWAITING_EXACT_OWNER_APPROVAL','APPROVED_ONCE',
    'EFFECT_RESERVED_RECONCILE_ONLY'].includes(packet.state)&&
   typeof packet.approved==='boolean';
 }
 function recovery(p){
  const q=p?.recovery_qualification,v=q?.proposal;
  return q?.status==='SAME_ORIGINAL_MISSING_REVIEW_WORK_QUALIFIED_FOR_EXACT_OWNER_DECISION'&&
   HASH.test(q.proposal_sha256||'')&&q.execution_authorized===false&&q.new_attempt_authorized===false&&q.replay_authorized===false&&
   v?.packet_id===p.packet_id&&v.original_work_id===p.parent_original_work_id&&
   v.source_manifest_sha256===p.source_manifest_sha256&&v.historical_invocation_replay_authorized===false&&
   v.new_budget_authorized===false&&v.prior_budget_preserved===true&&
   Number.isSafeInteger(v.missing_scope_count)&&v.missing_scope_count>0&&v.missing_scope_count<=p.proposed_scope_count&&
   v.proposed_max_new_provider_calls===2*v.missing_scope_count&&
   v.proposed_max_new_prepare_calls===v.missing_scope_count&&v.proposed_max_new_independent_verify_calls===v.missing_scope_count?
   q:null;
 }
 async function readActive(){
  const response=await fetch('/api/reality/personal-governed-employee-shift?hours=8',{
   credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(16000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.status!=='OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK'||
     data.production_changed!==false||
     !Array.isArray(data.shifts)||data.shifts.length>5)
   throw Error('CURRENT_OWNER_SHIFT_NOT_VERIFIED');
  const active=data.shifts.filter(s=>UUID.test(s.shift_id||'')&&
   ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s.status)&&
   !s.closed_at);
  if(active.length>1)throw Error('AMBIGUOUS_ACTIVE_SHIFT');
  return active[0]?.shift_id||null;
 }
 async function readPackets(shiftId){
  const response=await fetch(URL+'?shift_id='+encodeURIComponent(shiftId),{
   credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(16000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true||
     data.owner_scope_verified!==true||
     data.read_only!==true||data.execution_authorized!==false||
     !Array.isArray(data.packets)||data.packets.length>20||
     !data.packets.every(valid))
   throw Error('EXACT_OWNER_APPROVAL_PACKETS_UNVERIFIED');
  return data.packets;
 }
 async function reload({explicit=false}={}){
  if(!signed()||busy)return;
  busy=true;refresh.disabled=true;approve.disabled=true;
  try{
   const shiftId=await readActive();
   if(!shiftId){selected=null;card.hidden=true;return;}
   const packets=await readPackets(shiftId);
   const pending=packets.filter(p=>p.state==='AWAITING_EXACT_OWNER_APPROVAL'&&p.approved===false||
    p.state==='EFFECT_RESERVED_RECONCILE_ONLY'&&Boolean(recovery(p)));
   if(explicit)uncertain=false;
   if(!pending.length){
    selected=null;card.hidden=true;return;
   }
   const p=pending[0];
   const q=recovery(p);
   selected={...p,shift_id:shiftId,recovery:q};
   card.hidden=false;
   title.textContent='Review request for PR #'+p.source_ref.split('/').pop();
   detail.textContent='Original '+p.parent_original_work_id+
    ' remains open. Reality has identified '+p.file_count+
    ' changed files in '+p.proposed_scope_count+
    ' bounded review scopes. Reality has prepared a goal acceptance contract from the signed shift and verified source; it is not accepted until you approve.';
   evidence.textContent='Pinned source manifest: '+p.source_manifest_sha256+
    ' · exact approval packet: '+p.packet_id+'.';
   message.textContent=uncertain?
    'A prior approval response was uncertain. Use Check verified status before another action.':
    'Your approval has not been recorded. Other work continues within existing authority.';
   if(q){
    const v=q.proposal;
    title.textContent='Continue unfinished review for PR #'+p.source_ref.split('/').pop();
    detail.textContent=v.missing_scope_count+' unfinished scopes remain in the same original. '+v.preserved_verified_scope_count+
     ' verified scopes are preserved. Historical provider outcomes remain unknown.';
    evidence.textContent='Exact continuation proposal: '+q.proposal_sha256+' · frozen manifest: '+p.source_manifest_sha256;
    limits.textContent='Authorize at most '+v.proposed_max_new_provider_calls+
     ' new read-only model calls ('+v.proposed_max_new_prepare_calls+' preparations and '+v.proposed_max_new_independent_verify_calls+
     ' independent verifications). No historical replay, reset of the prior recovery budget, publication, installation or production changes.';
    approve.textContent='Approve bounded continuation';
   }else{
    limits.textContent='Your click accepts the source-bound review goal and authorizes READ-ONLY internal review of the exact scoped source. It does not authorize publication, installation, production changes or parent settlement.';
    approve.textContent='Approve exact internal review';
   }
   approve.disabled=uncertain;
  }catch{
   if(selected){card.hidden=false;message.textContent=
    'The latest source or approval receipt is not verified. No action taken.';}
   approve.disabled=true;
  }finally{busy=false;refresh.disabled=false;}
 }
 approve.addEventListener('click',async()=>{
  if(!signed()||busy||uncertain||approve.disabled||!selected)return;
  busy=true;approve.disabled=true;
  const exact=selected;
  message.textContent='Checking your exact source and approving once…';
  try{
   const packets=await readPackets(exact.shift_id);
   const current=packets.find(p=>p.packet_id===exact.packet_id);
   const recovering=Boolean(exact.recovery),currentRecovery=recovery(current);
   if(!current||current.source_manifest_sha256!==exact.source_manifest_sha256||
      current.parent_original_work_id!==exact.parent_original_work_id||
      (recovering?(current.state!=='EFFECT_RESERVED_RECONCILE_ONLY'||currentRecovery?.proposal_sha256!==exact.recovery.proposal_sha256):
       (current.state!=='AWAITING_EXACT_OWNER_APPROVAL'||current.approved!==false||current.approval_fingerprint!==exact.approval_fingerprint)))
    throw Error('OWNER_APPROVAL_PACKET_CHANGED');
   const response=await fetch(URL,{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     intent:recovering?'APPROVE_BOUNDED_SAME_OBLIGATION_RECOVERY':'APPROVE_READ_ONLY_INTERNAL_PR_REVIEW',
     packet_id:exact.packet_id,
     proposal_fingerprint:recovering?exact.recovery.proposal_sha256:exact.approval_fingerprint,
     source_manifest_sha256:exact.source_manifest_sha256
    }),
    signal:AbortSignal.timeout(20000)
   });
   const result=await response.json().catch(()=>null);
   if(!response.ok||result?.ok!==true||
      result.status!==(recovering?'FINAL_LOOP_SAME_OBLIGATION_RECOVERY_APPROVED_ONCE':'FINAL_LOOP_EXACT_CHILD_REVIEW_OWNER_APPROVED_ONCE')||
      (recovering&&(result.proposal_sha256!==exact.recovery.proposal_sha256||result.historical_invocation_replay_authorized!==false))||
      result.packet_id!==exact.packet_id||
      result.parent_original_work_id!==exact.parent_original_work_id||
      !HASH.test(result.approval_receipt_sha256||'')||
      result.execution_authorized!==false||
      result.child_originals_admitted!==0||
      result.original_job_completed!==false||
      result.production_changed!==false)
    throw Error('OWNER_APPROVAL_RECEIPT_UNVERIFIED');
   uncertain=true;
   const verified=await readPackets(exact.shift_id);
   if(!verified.some(p=>p.packet_id===exact.packet_id&&
      (recovering?p.recovery_approval?.approval_receipt_sha256===result.approval_receipt_sha256&&
        p.recovery_approval?.proposal_sha256===exact.recovery.proposal_sha256&&p.recovery_approval?.approved===true:
       p.state!=='AWAITING_EXACT_OWNER_APPROVAL'&&p.approved===true)))
    throw Error('OWNER_APPROVAL_INDEPENDENT_READBACK_UNVERIFIED');
   message.textContent=recovering?'Bounded continuation approval independently read back. Historical invocations remain fenced; the same original stays open until independent settlement.':'Exact review approval receipted. Child work is still subject to independent admission and verification.';
   selected=null;uncertain=false;
  }catch{
   uncertain=true;
   message.textContent='Approval result uncertain. Check verified status. Reality will not automatically repeat the approval.';
  }finally{busy=false;approve.disabled=true;}
 });
 refresh.addEventListener('click',()=>void reload({explicit:true}));
 const auth=new MutationObserver(()=>{
  if(signed())void reload();
  else{selected=null;uncertain=false;card.hidden=true;approve.disabled=true;}
 });
 auth.observe(ready,{attributes:true,attributeFilter:['style']});
 if(signed())void reload();
 window.addEventListener('pageshow',()=>{if(signed())void reload()});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&signed())void reload();
 });
})();
