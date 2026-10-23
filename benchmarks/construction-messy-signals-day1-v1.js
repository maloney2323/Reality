// An intentionally fictional same-day construction workstream.
// Inspired by construction owner-operator workflow categories; no actual
// customer data, calls, photos, approvals, or provider quotes are represented.
export const CONSTRUCTION_PILOT_AS_OF='2026-10-23T19:00:00.000Z';
export const CONSTRUCTION_PILOT_WORLD='construction:synthetic:juan-pilot';
export const CONSTRUCTION_PILOT_PROJECT='job:synthetic:kitchen-042';
const p=CONSTRUCTION_PILOT_PROJECT;
const at=n=>new Date(Date.parse('2026-10-23T09:00:00.000Z')+n*600000).toISOString();
const claim=(entity_ref,state_key,value,report_kind='OBSERVED_REPORT')=>({
 entity_ref,state_key,value,
 value_type:typeof value==='number'?'NUMBER':typeof value==='boolean'?'BOOLEAN':'STRING',
 report_kind,
});
const signal=(n,channel,origin,body,claims,project_id=p)=>({
 signal_id:'messy:'+String(n).padStart(2,'0'),
 project_id,source_ref:'synthetic:'+channel+':'+origin+':'+n,
 channel,body,received_at:at(n),claims,
});
export const CONSTRUCTION_PILOT_SIGNALS=Object.freeze([
 signal(1,'SMS','homeowner','We have not decided between black and stainless sink.',[
  claim('kitchen:sink','sink.selection','UNDECIDED')]),
 signal(2,'VOICE_NOTE','subcontractor','Homeowner told me black sink was approved verbally.',[
  claim('kitchen:sink','sink.selection','BLACK_APPROVED','CLAIMED_APPROVAL')]),
 signal(3,'EMAIL','homeowner','Still deciding. Do not order the sink or send final estimate.',[
  claim('kitchen:sink','sink.selection','UNDECIDED'),
  claim('estimate:final','estimate.send_approved',false)]),
 signal(4,'SUPPLIER_PORTAL','supplier','Supplier order summary says 160 units ordered.',[
  claim('materials:cabinet-hardware','material.units_ordered',160,'SOURCE_RECORD')]),
 signal(5,'PHOTO_NOTE','delivery','Photo shows boxes at jobsite; count cannot be determined.',[
  claim('materials:cabinet-hardware','delivery.photo_exists',true)]),
 signal(6,'CREW_SMS','foreman','I counted 152 cabinet hardware units onsite.',[
  claim('materials:cabinet-hardware','material.units_counted',152)]),
 signal(7,'INVENTORY_NOTE','warehouse','Eight units are reserved for a different project.',[
  claim('materials:cabinet-hardware','material.units_reserved',8)]),
 signal(8,'CREW_SMS','foreman','Crew says installation can start tomorrow.',[
  claim('kitchen:install','install.ready',true)]),
 signal(9,'INSPECTION_NOTE','project_manager','Rough-in inspection is still pending.',[
  claim('kitchen:install','inspection.status','PENDING')]),
 signal(10,'SITE_NOTE','second_foreman','My count says 155 hardware units, not 152.',[
  claim('materials:cabinet-hardware','material.units_counted',155)]),
 signal(11,'PHOTO_CAPTION','installer','The cabinet opening measures six feet.',[
  claim('kitchen:opening','opening.width_ft',6)]),
 signal(12,'VOICE_NOTE','second_installer','I think that opening is seven feet.',[
  claim('kitchen:opening','opening.width_ft',7)]),
]);
const req=(request_id,summary,operation,related_keys=[],prerequisites=[])=>({
 request_id,summary,operation,project_id:p,related_keys,prerequisites,
});
export const CONSTRUCTION_PILOT_REQUESTS=Object.freeze([
 req('daily-customer-update','Prepare a supported homeowner update with decisions outstanding','PREPARE_DRAFT',
  ['sink.selection','inspection.status']),
 req('draft-estimate','Prepare a preliminary estimate and clearly mark unverified measurements','PREPARE_DRAFT',
  ['opening.width_ft','sink.selection']),
 req('social-post-draft','Prepare a social media post about a generic remodel, not the customer job','PREPARE_DRAFT'),
 req('inventory-verify','Prepare hardware reconciliation and supplier discrepancy follow-up','PREPARE_DRAFT',
  ['material.units_counted','material.units_reserved','material.units_ordered']),
 req('supplier-price-compare','Prepare supplier comparison questions; no verified quotes yet','PREPARE_DRAFT',
  ['material.units_ordered']),
 req('code-research','Prepare building-code research questions; verify jurisdiction first','PREPARE_DRAFT',
  [],[{entity_ref:'kitchen:job','state_key':'jurisdiction.verified','required_value':true}]),
 req('send-final-estimate','Send the final priced estimate to the homeowner','SEND',
  ['sink.selection','opening.width_ft'],
  [{entity_ref:'estimate:final',state_key:'estimate.send_approved',required_value:true}]),
 req('buy-material','Purchase additional cabinet hardware','PURCHASE',
  ['material.units_counted','material.units_ordered']),
 req('book-crew','Schedule irreversible installation for tomorrow','SCHEDULE',
  ['inspection.status'],[{entity_ref:'kitchen:install',
    state_key:'inspection.status',required_value:'PASSED'}]),
]);
