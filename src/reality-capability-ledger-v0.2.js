import crypto from 'node:crypto';
export const CAPABILITY_LEDGER_VERSION='reality-capability-ledger-v0.2';
export const CAPABILITY_LIFECYCLE=Object.freeze(['verified','monitored','degraded','quarantined','deprecated','retired']);
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v))}
function digest(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')}
export function createCapabilityLedger({entries=[]}={}){return Object.freeze({version:CAPABILITY_LEDGER_VERSION,entries:entries.map(clone)})}
export function createCapabilityRecord(input={}) {
  if(!input.id) throw new Error('CAPABILITY_ID_REQUIRED');
  const status=input.status||'verified'; if(!CAPABILITY_LIFECYCLE.includes(status)) throw new Error('CAPABILITY_STATUS_INVALID');
  const record={...clone(input),version:CAPABILITY_LEDGER_VERSION,status,currentLevel:Number(input.currentLevel??0),importance:Number(input.importance??0),observedDemand:Number(input.observedDemand??0),failureRate:Number(input.failureRate??0),uncertainty:Number(input.uncertainty??0),improvementCost:Number(input.improvementCost??1),safetyRisk:Number(input.safetyRisk??0),verificationDifficulty:Number(input.verificationDifficulty??0),dependencies:[...(input.dependencies||[])],evidenceRefs:[...(input.evidenceRefs||[])]};
  return Object.freeze({...record,recordHash:`capability:${digest(record)}`});
}
export function upsertCapability(ledger,record){
  if(!ledger?.version) throw new Error('CAPABILITY_LEDGER_REQUIRED'); if(!record?.id) throw new Error('CAPABILITY_RECORD_REQUIRED');
  const entries=ledger.entries.filter(x=>x.id!==record.id); return Object.freeze({...ledger,entries:[...entries,clone(record)]});
}
export function classifyCapabilityHealth(record){
  if(!record) throw new Error('CAPABILITY_RECORD_REQUIRED');
  if(record.status==='retired'||record.status==='deprecated') return record.status;
  if(record.safetyRisk>0.8) return 'quarantined';
  if(record.failureRate>0.35||record.uncertainty>0.75) return 'degraded';
  return record.status||'verified';
}
