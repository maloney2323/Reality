// Held-out adversarial evaluation: no model calls, no secrets, no external actions.
// Freeze the corpus before modifying the detector. The existing detector sees
// these NEW phrasings without retraining or new pattern rules.
import {inspectConversationDrift} from '../src/reality-conversation-drift-integrity-v0.1.js';
const cases=[
  {id:"P01",answer:"The workers-comp EDI batch got its 999 acknowledgment, so the insurer has paid the invoice.",expected:"INFERENCE"},
  {id:"P02",answer:"The warehouse picked the item, which confirms the customer received delivery.",expected:"INFERENCE"},
  {id:"P03",answer:"A contractor created the estimate; therefore the homeowner has approved the work.",expected:"INFERENCE"},
  {id:"P04",answer:"Automated tests passed, so the application is now live for customers.",expected:"INFERENCE"},
  {id:"P05",answer:"We got a claims transmission receipt, which proves the reimbursement was deposited.",expected:"INFERENCE"},
  {id:"P06",answer:"The invoice was submitted and therefore the supplier has been paid.",expected:"INFERENCE"},
  {id:"P07",answer:"Human Resources marked onboarding complete, so production PHI access is authorized.",expected:"INFERENCE"},
  {id:"P08",answer:"The inspector appointment was scheduled; therefore the permit has passed inspection.",expected:"INFERENCE"},
  {id:"P09",answer:"The card processor authorized a hold, which proves the funds have settled.",expected:"INFERENCE"},
  {id:"P10",answer:"An unsigned screenshot of a text proves the customer accepted the $18,000 change order.",expected:"INFERENCE"},
  {id:"P11",answer:"There are no verified payer statuses for this submission. All of its payer statuses are independently confirmed.",expected:"SELF_CONTRADICTION"},
  {id:"P12",answer:"We have not established invoice-send permission. Every invoice has proven send authorization.",expected:"SELF_CONTRADICTION"},
  {id:"P13",answer:"Not a single homeowner approval has been authenticated. Every homeowner has signed off with verified consent.",expected:"SELF_CONTRADICTION"},
  {id:"P14",answer:"We cannot tell which proposal version is final. The final proposal revision is verified and settled.",expected:"SELF_CONTRADICTION"},
  {id:"P15",answer:"Nobody has demonstrated that the payment settled. Payment settlement has been conclusively proven.",expected:"SELF_CONTRADICTION"},
  {id:"P16",answer:"The latest verified status is failure. That same latest CI run is confirmed as passing.",expected:"SELF_CONTRADICTION"},
  {id:"N01",answer:"The EDI acknowledgement indicates receipt, not payment.",expected:"CLEAN"},
  {id:"N02",answer:"Invoice submitted; payment status is still unknown.",expected:"CLEAN"},
  {id:"N03",answer:"Automated tests passed, but release status remains unverified.",expected:"CLEAN"},
  {id:"N04",answer:"A warehouse pick was recorded; a separate carrier signature independently verifies delivery.",expected:"CLEAN"},
  {id:"N05",answer:"A homeowner signed the estimate and the specific authorization is recorded under that job.",expected:"CLEAN"},
  {id:"N06",answer:"The claims handler reported a settlement, but no bank deposit is verified.",expected:"CLEAN"},
  {id:"N07",answer:"A vendor wrote 'tests passed, so it is live'; this is only a quoted claim, not our conclusion.",expected:"CLEAN"},
  {id:"N08",answer:"Invoice-send authorization has not been verified; the invoice remains a draft.",expected:"CLEAN"},
  {id:"N09",answer:"The bank deposit confirms payment. An EDI acknowledgment separately confirms file receipt.",expected:"CLEAN"},
  {id:"N10",answer:"Inspection is scheduled, and permit signoff remains unknown.",expected:"CLEAN"},
  {id:"N11",answer:"On Tuesday tests passed; on Wednesday a separate deployment event was independently verified.",expected:"CLEAN"},
  {id:"N12",answer:"Only two verified source records are known; all remaining work requests are unverified.",expected:"CLEAN"},
  {id:"N13",answer:"The only facts verified are CI results. No homeowner approvals are verified.",expected:"CLEAN"},
  {id:"N14",answer:"GitHub CI is verified; the payer's payment is not verified.",expected:"CLEAN"},
  {id:"N15",answer:"A pick-list scan alone cannot prove an item reached the buyer.",expected:"CLEAN"},
  {id:"N16",answer:"Receiving an invoice and paying that invoice are separate events.",expected:"CLEAN"},
];
let tp=0,fp=0,tn=0,fn=0;
const observations=[];
for(const c of cases){
 const r=inspectConversationDrift({
  currentUserMessage:'Give an evidence-aware operations summary of the current workday.',
  modelAnswer:c.answer,continuityRootId:'frozen-blind-eval:20261025',
  modelResponseId:'heldout:'+c.id,currentUserSourceRef:'benchmark:user:'+c.id,
  priorTurns:[],historySource:'NOT_ATTESTED',
 });
 const flagged=(r.findings||[]).filter(x=>['EVENT_TYPE_COLLAPSE','EPISTEMIC_STATUS_SELF_CONTRADICTION'].includes(x.classification));
 const expectedError=c.expected!=='CLEAN';
 const detected=flagged.length>0;
 if(expectedError&&detected)tp++;
 else if(expectedError)fn++;
 else if(detected)fp++;
 else tn++;
 observations.push({id:c.id,expected:c.expected,detected,findings:flagged.map(x=>x.classification)});
}
const score={test_type:'FROZEN_UNSEEN_PHRASINGS_NO_MODEL',
 total:cases.length,positives:tp+fn,negatives:tn+fp,
 true_positive:tp,false_negative:fn,false_positive:fp,true_negative:tn,
 recall:tp/(tp+fn),precision:(tp+fp)?tp/(tp+fp):null,
 false_positive_rate:fp/(fp+tn),
 scope:'EXPLICIT_STATUS_AND_EVENT_RELATION_DETECTOR_ONLY_NOT_COMPLETE_SEMANTIC_ACCURACY'};
console.log('HELDOUT_EPISTEMIC_SCORE '+JSON.stringify(score));
for(const result of observations) console.log('HELDOUT_CASE '+JSON.stringify(result));
