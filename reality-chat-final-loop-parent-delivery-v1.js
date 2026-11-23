/* Reality Chat · second owner consent for exact parent GitHub publication.
 * The FIRST consent is read-only internal work. This one is an external
 * effect, so it remains explicit and separate within the SAME Final Loop.
 */
(()=>{
 'use strict';
 if(!/^\/chat\/?$/.test(location.pathname))return;
 const auth=document.getElementById('privateReady');
 const panel=document.getElementById('realityChatPanelWork');
 if(!auth||!panel||document.getElementById('realityFinalLoopParentDelivery'))return;
 const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
 const HASH=/^sha256:[a-f0-9]{64}$/;
 const SHA=/^[a-f0-9]{40}$/;
 const WORK=/^work:[a-f0-9]{32}$/;
 const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
 const API='/api/reality/owner-final-loop-parent-delivery';
 const signed=()=>auth.style.display==='block';
 const el=(tag,cl,value)=>{
  const n=document.createElement(tag);if(cl)n.className=cl;
  if(value!==undefined)n.textContent=value;return n;
 };
 const card=el('section','reality-final-loop-parent-publication-card');
 card.id='realityFinalLoopParentDelivery';
 card.hidden=true;
 card.setAttribute('aria-label','Final Loop exact parent publication approval');
 const title=el('strong','label','REALITY · VERIFIED PARENT DELIVERY');
 const heading=el('h3','','Exact publication approval required');
 const desc=el('p','reality-final-loop-parent-desc','');
 const preview=el('pre','reality-final-loop-parent-preview','');
 preview.style.cssText='white-space:pre-wrap;max-height:180px;overflow:auto;';
 const warning=el('p','reality-final-loop-parent-warning',
  'This action authorizes ONE GitHub PR review comment with the exact verified text. '+
  'It does not authorize merging, installation, source changes or a second post. '+
  'Reality must independently verify delivery and return a Universe receipt.');
 const actions=el('div','reality-final-loop-parent-actions');
 const approve=el('button','reality-final-loop-parent-approve',
  'Approve exact GitHub review publication');
 approve.type='button';approve.disabled=true;
 const refresh=el('button','reality-final-loop-parent-refresh',
  'Check current receipt');
 refresh.type='button';
 const status=el('p','reality-final-loop-parent-status','');
 status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 actions.append(approve,refresh);
 card.append(title,heading,desc,preview,warning,actions,status);
 panel.prepend(card);
 let selected=null,busy=false,uncertain=false;
 function valid(p){
  return p&&UUID.test(p.delivery_id||'')&&
   WORK.test(p.parent_original_work_id||'')&&
   REF.test(p.source_ref||'')&&SHA.test(p.source_head_sha||'')&&
   HASH.test(p.source_manifest_sha256||'')&&
   HASH.test(p.acceptance_contract_sha256||'')&&
   HASH.test(p.cross_scope_receipt_sha256||'')&&
   HASH.test(p.delivery_body_sha256||'')&&
   HASH.test(p.proposal_fingerprint||'')&&
   typeof p.delivery_preview==='string'&&
   p.delivery_preview.length>50&&p.delivery_preview.length<=1500&&
   ['AWAITING_EXACT_PUBLICATION_APPROVAL','APPROVED_ONCE',
    'POST_RESERVED_RECONCILE_ONLY','SETTLED'].includes(p.status)&&
   typeof p.publication_approved==='boolean'&&
   typeof p.original_job_completed==='boolean';
 }
 async function currentShift(){
  const r=await fetch('/api/reality/personal-governed-employee-shift?hours=8',{
   cache:'no-store',credentials:'same-origin',
   signal:AbortSignal.timeout(16000)
  });
  const x=await r.json().catch(()=>null);
  if(!r.ok||x?.status!=='OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK'||
     x.production_changed!==false||
     !Array.isArray(x.shifts)||x.shifts.length>5)
   throw Error('CURRENT_SIGNED_OWNER_SHIFT_UNVERIFIED');
  const matches=x.shifts.filter(s=>
   UUID.test(s.shift_id||'')&&
   ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s.status)&&
   !s.closed_at);
  if(matches.length>1)throw Error('AMBIGUOUS_ACTIVE_SHIFT');
  return matches[0]?.shift_id||null;
 }
 async function readPackets(shiftId){
  const r=await fetch(API+'?shift_id='+encodeURIComponent(shiftId),{
   cache:'no-store',credentials:'same-origin',
   signal:AbortSignal.timeout(16000)
  });
  const x=await r.json().catch(()=>null);
  if(!r.ok||x?.ok!==true||x.owner_scope_verified!==true||
   x.read_only!==true||x.publication_authorized!==false||
   !Array.isArray(x.deliveries)||x.deliveries.length>12||
   !x.deliveries.every(valid))
   throw Error('PARENT_PUBLICATION_RECEIPTS_UNVERIFIED');
  return x.deliveries;
 }
 async function reload({explicit=false}={}){
  if(!signed()||busy)return;
  busy=true;approve.disabled=true;refresh.disabled=true;
  try{
   const id=await currentShift();
   if(!id){selected=null;card.hidden=true;return;}
   const all=await readPackets(id);
   const pending=all.filter(p=>p.status==='AWAITING_EXACT_PUBLICATION_APPROVAL'&&
    p.publication_approved===false&&p.original_job_completed===false);
   if(explicit)uncertain=false;
   if(!pending.length){
    selected=null;card.hidden=true;return;
   }
   const p=pending[0];selected={...p,shift_id:id};
   heading.textContent='Publish independently verified review of PR #'+
    p.source_ref.split('/').pop();
   desc.textContent='Original '+p.parent_original_work_id+
    ' is still open. The exact source head is '+p.source_head_sha+
    '. Verified integration receipt: '+p.cross_scope_receipt_sha256+
    '. This is a separate GitHub write approval.';
   preview.textContent=p.delivery_preview;
   status.textContent=uncertain?
    'Previous response uncertain. Check the current receipt before another action.':
    'No external publication has been authorized by this card yet.';
   card.hidden=false;approve.disabled=uncertain;
  }catch{
   if(selected){card.hidden=false;
    status.textContent='Current source or approval state is unavailable; no action was taken.';}
   approve.disabled=true;
  }finally{busy=false;refresh.disabled=false;}
 }
 approve.addEventListener('click',async()=>{
  if(!signed()||busy||uncertain||approve.disabled||!selected)return;
  busy=true;approve.disabled=true;
  const exact=selected;
  status.textContent='Checking the exact publication packet…';
  try{
   const all=await readPackets(exact.shift_id);
   const current=all.find(x=>x.delivery_id===exact.delivery_id);
   if(!current||current.status!=='AWAITING_EXACT_PUBLICATION_APPROVAL'||
    current.publication_approved!==false||
    current.proposal_fingerprint!==exact.proposal_fingerprint||
    current.delivery_body_sha256!==exact.delivery_body_sha256||
    current.source_head_sha!==exact.source_head_sha)
    throw Error('PARENT_PUBLICATION_PACKET_CHANGED');
   const response=await fetch(API,{
    method:'POST',cache:'no-store',credentials:'same-origin',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     shift_id:exact.shift_id,
     intent:'APPROVE_EXACT_GITHUB_PR_REVIEW_PUBLICATION',
     delivery_id:exact.delivery_id,
     proposal_fingerprint:exact.proposal_fingerprint,
     delivery_body_sha256:exact.delivery_body_sha256,
     source_head_sha:exact.source_head_sha
    }),signal:AbortSignal.timeout(20000)
   });
   const x=await response.json().catch(()=>null);
   if(!response.ok||x?.ok!==true||
    x.status!=='FINAL_LOOP_EXACT_PARENT_GITHUB_PUBLICATION_OWNER_APPROVED_ONCE'||
    x.delivery_id!==exact.delivery_id||
    !HASH.test(x.publication_approval_receipt_sha256||'')||
    x.publication_effect_reserved!==false||
    x.original_job_completed!==false||
    x.production_changed!==false)
    throw Error('OWNER_PUBLICATION_APPROVAL_NOT_RECEIPTED');
   uncertain=true;
   const read=await readPackets(exact.shift_id);
   if(!read.some(p=>p.delivery_id===exact.delivery_id&&
    p.status!=='AWAITING_EXACT_PUBLICATION_APPROVAL'&&
    p.publication_approved===true))
    throw Error('OWNER_PUBLICATION_APPROVAL_READBACK_UNVERIFIED');
   status.textContent='Exact GitHub publication approved. Independent provider verification and parent settlement are still required.';
   selected=null;uncertain=false;
  }catch{
   uncertain=true;
   status.textContent='Approval response uncertain. Check current receipt. No automatic second approval or GitHub post.';
  }finally{busy=false;approve.disabled=true;}
 });
 refresh.addEventListener('click',()=>void reload({explicit:true}));
 const observer=new MutationObserver(()=>{
  if(signed())void reload();
  else{selected=null;uncertain=false;card.hidden=true;approve.disabled=true;}
 });
 observer.observe(auth,{attributes:true,attributeFilter:['style']});
 if(signed())void reload();
 window.addEventListener('pageshow',()=>{if(signed())void reload()});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&signed())void reload();
 });
})();
