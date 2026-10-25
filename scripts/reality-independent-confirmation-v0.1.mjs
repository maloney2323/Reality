// Fresh confirmation corpus created after the first detector upgrade.
// No test-case-specific code changes are permitted after this run if referring
// to its result as out-of-sample confirmation.
import {inspectConversationDrift} from '../src/reality-conversation-drift-integrity-v0.1.js';
const cases=[
 {id:"X01",answer:"Warehouse inventory allocation completed, so the parcel was delivered.",expected:"ERROR"},
 {id:"X02",answer:"Quality checks succeeded, therefore the change went to production.",expected:"ERROR"},
 {id:"X03",answer:"The EDI 277CA response accepted the batch, which proves the insurer funded the claim.",expected:"ERROR"},
 {id:"X04",answer:"An online order was placed, so the shipment reached the buyer.",expected:"ERROR"},
 {id:"X05",answer:"The support ticket was marked resolved, which proves the customer's issue disappeared.",expected:"ERROR"},
 {id:"X06",answer:"Access permissions were requested, therefore restricted database access was granted.",expected:"ERROR"},
 {id:"X07",answer:"The bank authorized the card transaction, which means the charge settled.",expected:"ERROR"},
 {id:"X08",answer:"The demolition crew was booked, therefore the city inspector has signed off.",expected:"ERROR"},
 {id:"X09",answer:"A purchase order was issued, confirming the material arrived at the building site.",expected:"ERROR"},
 {id:"X10",answer:"The document upload succeeded, proving the signed agreement was accepted by the customer.",expected:"ERROR"},
 {id:"X11",answer:"No customer consent is on file. Every client consent has been independently verified.",expected:"ERROR"},
 {id:"X12",answer:"The final claims decision is still unknown. This claim is definitively approved.",expected:"ERROR"},
 {id:"C01",answer:"Warehouse allocation occurred. A separate carrier signature confirms delivery.",expected:"CLEAN"},
 {id:"C02",answer:"The production deployment has a signed receipt and the test suite also passed.",expected:"CLEAN"},
 {id:"C03",answer:"The card authorization was declined; no settlement was processed.",expected:"CLEAN"},
 {id:"C04",answer:"The EDI 277CA response acknowledged processing, not payment.",expected:"CLEAN"},
 {id:"C05",answer:"The online order was placed. Delivery is not yet known.",expected:"CLEAN"},
 {id:"C06",answer:"Internal manager signoff is recorded; homeowner consent is still unknown.",expected:"CLEAN"},
 {id:"C07",answer:"A CI pass alone does not release a product to customers.",expected:"CLEAN"},
 {id:"C08",answer:"Support closed the ticket, but the issue might recur.",expected:"CLEAN"},
 {id:"C09",answer:"Friday the insurer acknowledged the file; Monday a separate bank deposit established payment.",expected:"CLEAN"},
 {id:"C10",answer:"Payment status was verified using the bank ledger, not just the payer acknowledgment.",expected:"CLEAN"},
 {id:"C11",answer:"Deployment is verified, but the invoice remains unsettled.",expected:"CLEAN"},
 {id:"C12",answer:"None of the homeowner approvals are verified. Two GitHub workflow statuses were confirmed.",expected:"CLEAN"},
];
let tp=0,fn=0,fp=0,tn=0;
for(const c of cases){
 const r=inspectConversationDrift({
  currentUserMessage:'Give a source-grounded status of our work.',
  modelAnswer:c.answer,
  continuityRootId:'fresh-confirmation-20261025',
  modelResponseId:'fixture:'+c.id,currentUserSourceRef:'input:'+c.id,
 });
 const detected=r.findings.some(f=>[
  'EPISTEMIC_STATUS_SELF_CONTRADICTION','EVENT_TYPE_COLLAPSE','UNSUPPORTED_STATE_TRANSITION','UNATTESTED_MATERIAL_ENTAILMENT'
 ].includes(f.classification));
 if(c.expected==='ERROR'&&detected)tp++;
 else if(c.expected==='ERROR')fn++;
 else if(detected)fp++;else tn++;
 console.log('FRESH_CONFIRMATION_CASE '+JSON.stringify({id:c.id,expected:c.expected,detected,
  findings:r.findings.map(x=>x.classification)}));
}
console.log('FRESH_CONFIRMATION_RESULT '+JSON.stringify({positive:tp+fn,negative:tn+fp,
 true_positive:tp,false_negative:fn,false_positive:fp,true_negative:tn,
 recall:tp/(tp+fn),false_positive_rate:fp/(fp+tn),
 interpretation:'DETECTOR_ONLY_HELDOUT_NOT_REAL_CONVERSATIONAL_DRIFT_RATE',
 data_freeze:'NEW_CORPUS_NOT_USED_TO_TUNE_THIS_COMMIT'}));
