// Live Reality chat activity transport. Only observable pipeline checkpoints;
// not private model deliberation, hidden prompts, or execution authorization.
const STAGES=new Set(['session','message_saved','model_running','review_complete',
  'goal_checked','answer_saved']);
export function openChatActivityStream(req,res){
 if(!/\btext\/event-stream\b/i.test(String(req.headers?.accept||'')))return null;
 res.status(200);
 res.setHeader('Content-Type','text/event-stream; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store, no-transform');
 res.setHeader('X-Accel-Buffering','no');
 res.flushHeaders?.();
 let ended=false;
 function write(event,data){
  if(ended)return false;
  res.write('event: '+event+'\n'+'data: '+JSON.stringify(data)+'\n\n');
  return true;
 }
 const transport={
  progress(stage,message){
   if(!STAGES.has(stage))throw Error('CHAT_PROGRESS_STAGE_NOT_SUPPORTED');
   return write('progress',{stage,message});
  },
  complete(result){
   if(!result||result.ok!==true)throw Error('CHAT_PROGRESS_RESULT_NOT_VERIFIED');
   write('result',result);
   ended=true;res.end();
  },
  failure(code){
   const value=String(code||'CHAT_UNAVAILABLE');
   write('error',{error:/^CHAT_[A-Z0-9_]+$/.test(value)?value:'CHAT_UNAVAILABLE'});
   ended=true;res.end();
  },
  get ended(){return ended;},
 };
 transport.progress('session','Account and conversation verified');
 return transport;
}
