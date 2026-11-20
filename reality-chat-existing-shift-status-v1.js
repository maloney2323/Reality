// A small always-visible Chat receipt for the latest saved owner instruction
// to continue an existing authorized shift. It NEVER dispatches work.
(()=>{
 'use strict';
 if(!/^\/chat\/?$/.test(location.pathname))return;
 const composer=document.getElementById('realityChatComposer');
 if(!composer||document.getElementById('realityChatExistingShiftHandoff'))return;
 const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 const box=document.createElement('section');
 box.id='realityChatExistingShiftHandoff';
 box.setAttribute('role','status');
 box.setAttribute('aria-live','polite');
 box.setAttribute('aria-label','Saved signed employee shift work receipt');
 box.hidden=true;
 box.style.cssText='box-sizing:border-box;max-width:100%;margin:0 0 12px;padding:12px 14px;'+
  'border:1px solid #43849a;border-radius:12px;background:#103044;'+
  'font-size:13px;color:#ebf6fc;line-height:1.5;overflow-wrap:anywhere';
 const heading=document.createElement('strong');
 heading.textContent='REALITY · EXISTING SHIFT HANDOFF VERIFIED';
 heading.style.cssText='display:block;margin:0 0 4px;font-size:13px';
 const summary=document.createElement('p');
 summary.style.cssText='margin:5px 0';
 const next=document.createElement('p');
 next.style.cssText='margin:5px 0;color:#c7deea';
 const link=document.createElement('button');
 link.type='button';
 link.textContent='View the saved instruction';
 link.style.cssText='background:transparent;border:0;padding:8px 0;min-height:36px;'+
  'text-decoration:underline;font:inherit;color:#a5ddff;text-align:left';
 link.hidden=true;
 box.append(heading,summary,next,link);
 composer.insertBefore(box,composer.firstChild);
 let inFlight=false,again=false,latest=null;
 function paint(data){
  box.hidden=false;
  const short=data.shift_id.slice(0,8);
  summary.textContent='Your signed Chat instruction was delivered to authorized shift '+short+
   '… · worker request '+data.network_request_id+
   '. No new shift or approval was needed.';
  const s=String(data.last_worker_safe_result||'');
  next.textContent=s==='SIGNED_MAINTENANCE_AUTHORIZED_CASE_SPECIFIC_FROZEN_RED_REQUIRED'?
   'Current verified stage: maintenance is authorized; independent case-specific failure tests are still required. No original-job completion is claimed.':
   'Last signed worker stage: '+(s?s.replaceAll('_',' '):
     'no verified worker result yet')+
   '. Queueing this wake does not prove this request started or completed the job.';
  latest=data;
  link.hidden=!UUID.test(data.conversation_id||'');
 }
 async function refresh(){
  if(inFlight){again=true;return}
  inFlight=true;
  try{
   const response=await fetch('/api/reality/personal-chat-existing-shift-status',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(16000)
   });
   const data=await response.json().catch(()=>null);
   if(response.status===401){
    box.hidden=true;latest=null;return;
   }
   if(!response.ok||data?.ok!==true)return;
   if(data.status==='NO_OWNER_ACTIVE_SIGNED_SHIFT_CHAT_WAKE'){
    box.hidden=true;latest=null;return;
   }
   if(data.status!=='OWNER_LATEST_SIGNED_SHIFT_CHAT_WAKE_VERIFIED'||
      !UUID.test(data.shift_id||'')||
      !UUID.test(data.conversation_id||'')||
      !UUID.test(data.request_id||'')||
      !Number.isSafeInteger(data.network_request_id)||
      data.network_request_id<1||
      data.wake_enqueued!==true||
      data.worker_execution_verified_for_this_request!==false||
      data.installation_authorized!==false||
      data.production_changed!==false||
      data.original_job_completed!==false||
      data.new_shift_started!==false)return;
   paint(data);
  }catch{
   // Keep the previously verified receipt visible across transient errors.
   // No claim can be made from an unavailable provider response.
  }finally{
   inFlight=false;
   if(again){again=false;void refresh()}
  }
 }
 link.onclick=()=>{
  if(!latest||!UUID.test(latest.conversation_id||''))return;
  if(window.realityActiveConversationId?.()===latest.conversation_id){
   document.getElementById('privateTranscript')?.scrollIntoView({
    behavior:'smooth',block:'nearest'
   });
   return;
  }
  localStorage.setItem('reality.private.chat.conversation.v1',
   latest.conversation_id);
  void window.realityChatRefreshTranscript?.();
 };
 window.addEventListener('reality:saved-chat-readback',()=>{void refresh()});
 window.addEventListener('reality:chat-intake-saved',()=>{void refresh()});
 window.addEventListener('pageshow',()=>{void refresh()});
 if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',()=>{void refresh()},{once:true});
 else void refresh();
})();
