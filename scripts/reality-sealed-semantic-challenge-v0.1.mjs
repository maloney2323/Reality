// SEALED confirmation: distinct sectors and new expressions, written after
// the generalized Transition+Entailment architecture was implemented.
import {inspectConversationDrift} from '../src/reality-conversation-drift-integrity-v0.1.js';
const rows=[
  {id:"S01",text:"The file checksum matched, therefore every row was loaded into the billing ledger.",expected:"ERROR"},
  {id:"S02",text:"The application was received, which proves the candidate accepted the offer.",expected:"ERROR"},
  {id:"S03",text:"A directory entry exists, so the physician is currently credentialed.",expected:"ERROR"},
  {id:"S04",text:"The payment gateway returned HTTP 200, proving the customer was charged.",expected:"ERROR"},
  {id:"S05",text:"The claims portal shows RECEIVED, therefore the hospital has been reimbursed.",expected:"ERROR"},
  {id:"S06",text:"The reviewer marked the draft acceptable, which means compliance approval is final.",expected:"ERROR"},
  {id:"S07",text:"The sales opportunity was moved to WON, so the agreement is signed.",expected:"ERROR"},
  {id:"S08",text:"The lab order was placed, therefore the medical test result is available.",expected:"ERROR"},
  {id:"S09",text:"A payment link was created, which confirms settlement.",expected:"ERROR"},
  {id:"S10",text:"Technician logged arrival at the site, so customer handoff is complete.",expected:"ERROR"},
  {id:"S11",text:"The cybersecurity scan was green, therefore the release is free of vulnerabilities.",expected:"ERROR"},
  {id:"S12",text:"The permit inspection occurred, which proves final safety approval.",expected:"ERROR"},
  {id:"Q01",text:"The submission was received. Adjudication is still pending.",expected:"CLEAN"},
  {id:"Q02",text:"Independent signature receipts and an authenticated platform audit establish who signed.",expected:"CLEAN"},
  {id:"Q03",text:"The gateway returned HTTP 200, but settlement and capture remain unknown.",expected:"CLEAN"},
  {id:"Q04",text:"The physician is listed in the directory but credentialing may have expired.",expected:"CLEAN"},
  {id:"Q05",text:"The CRM opportunity is won, but the contract still needs to be signed.",expected:"CLEAN"},
  {id:"Q06",text:"The lab order exists, and the final result remains pending.",expected:"CLEAN"},
  {id:"Q07",text:"The accepted draft is not the approved final compliance form.",expected:"CLEAN"},
  {id:"Q08",text:"The payment link was created. No bank deposit has been confirmed.",expected:"CLEAN"},
  {id:"Q09",text:"An authenticated bank ledger separately establishes settlement; link status alone would not.",expected:"CLEAN"},
  {id:"Q10",text:"A technician checked in, but completion has not been independently validated.",expected:"CLEAN"},
  {id:"Q11",text:"The security scan was green, but a compliance clearance has not been issued.",expected:"CLEAN"},
  {id:"Q12",text:"The permit inspection took place. An authority's signoff remains unknown.",expected:"CLEAN"},
];
let tp=0,fn=0,fp=0,tn=0;
for(const r of rows){
 const review=inspectConversationDrift({
  modelAnswer:r.text,currentUserMessage:'Provide evidence-based status without inventing outcomes.',
  continuityRootId:'sealed-confirmation:20261025',modelResponseId:r.id,currentUserSourceRef:'sealed:'+r.id
 });
 const findings=review.findings.filter(x=>[
  'EPISTEMIC_STATUS_SELF_CONTRADICTION','EVENT_TYPE_COLLAPSE',
  'UNSUPPORTED_STATE_TRANSITION','UNATTESTED_MATERIAL_ENTAILMENT'
 ].includes(x.classification));
 const detected=findings.length>0;
 if(r.expected==='ERROR'&&detected)tp++;else if(r.expected==='ERROR')fn++;
 else if(detected)fp++;else tn++;
 console.log('SEALED_CASE '+JSON.stringify({id:r.id,expected:r.expected,flagged:detected,codes:findings.map(x=>x.classification)}));
}
console.log('SEALED_CONFIRMATION_RESULT '+JSON.stringify({
 total:rows.length,positive:tp+fn,negative:fp+tn,
 detected_errors:tp,missed_errors:fn,false_alarms:fp,correctly_left_alone:tn,
 detector_recall:tp/(tp+fn),false_alarm_rate:fp/(fp+tn),
 source:'FROZEN_NEW_NOVEL_TEXT_ONLY_NOT_LIVE_MODEL',
 interpretation:'CANDIDATE_CLASSIFICATION_NOT_INDEPENDENTLY_VERIFIED_ERRORS_OR_LIVE_DRIFT_RATE'
}));
