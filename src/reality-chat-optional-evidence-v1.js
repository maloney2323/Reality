// Reality's authenticated Chat must not depend on every read-only
// contextual dashboard provider being available before it can reply.
// Message identity, goal authority, model integrity review and atomic
// assistant publication remain mandatory and are NOT handled here.
export async function collectOptionalChatEvidence(entries,{timeoutMs=12000}={}){
 if(!Array.isArray(entries)||entries.length<1||entries.length>16||
    !Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)
  throw Error('CHAT_OPTIONAL_EVIDENCE_CONTRACT_INVALID');
 const ids=new Set();
 for(const entry of entries){
  if(!/^[a-z][a-z0-9_]{2,48}$/.test(entry?.id||'')||
     typeof entry.read!=='function'||
     typeof entry.validate!=='function'||
     !Object.hasOwn(entry,'fallback')||ids.has(entry.id)||
     (entry.timeoutMs!==undefined&&(!Number.isInteger(entry.timeoutMs)||entry.timeoutMs<1||entry.timeoutMs>30000)))
   throw Error('CHAT_OPTIONAL_EVIDENCE_CONTRACT_INVALID');
  ids.add(entry.id);
 }
 const outcomes=await Promise.all(entries.map(async entry=>{
  let timer;
  const timeout=new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(Error('READBACK_TIMEOUT')),entry.timeoutMs??timeoutMs);
   timer.unref?.();
  });
  try{
   const value=await Promise.race([
    Promise.resolve().then(entry.read),timeout
   ]);
   if(!entry.validate(value))throw Error('READBACK_SHAPE_UNVERIFIED');
   return Object.freeze({id:entry.id,verified:true,value});
  }catch{
   // An unverified source is NOT evidence of zero work/zero failures.
   // Never display a provider error (which could contain secrets).
   return Object.freeze({id:entry.id,verified:false,value:entry.fallback});
  }finally{if(timer)clearTimeout(timer)}
 }));
 const values=Object.fromEntries(outcomes.map(o=>[o.id,o.value]));
 const unavailable=outcomes.filter(o=>!o.verified).map(o=>o.id);
 return Object.freeze({
  values:Object.freeze(values),
  unavailable:Object.freeze(unavailable),
  status:unavailable.length?
   'OPTIONAL_EVIDENCE_PARTIALLY_UNAVAILABLE':'OPTIONAL_EVIDENCE_READBACKS_VERIFIED',
  // Never claim a missing source means no work; caller must expose status.
  all_sources_verified:unavailable.length===0,
  grants_execution_authority:false,
  installation_authorized:false,
 });
}
