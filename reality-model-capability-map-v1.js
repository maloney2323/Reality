// Reality's model-augmentation capability inventory. Public, static and
// source-linked: no fabricated performance metrics, no execution, and no claims
// that the presence of source/tests proves production-wide readiness.
(()=>{
 'use strict';
 const host=document.getElementById('realityModelCapabilities');
 if(!host)return;
 const EVIDENCE_BASE=
  'https://github.com/maloney2323/Reality/blob/74159ac09fbb24a516e5f214e06ca9547eb2fe14/';
 const groups=[
  {title:'1 · Understand and remember',summary:'Operational awareness the model does not get from a standalone prompt.',items:[
   {name:'Durable original-work continuity',adds:'Keeps work identity, evidence, goal transitions and provenance connected across stages and interruptions.',
    guard:'Requires linked continuity roots and lineage evidence; a new model response cannot silently replace the original objective.',
    source:'src/reality-continuity-spine-v2.0.js',test:'test/reality-continuity-spine-v2.0.test.js',
    boundary:'Code and tests available · live continuity across arbitrary businesses not certified'},
   {name:'Source-backed opportunity discovery',adds:'Turns connected issue, pull-request and operational signals into a ranked investigation inventory.',
    guard:'Provider observations remain distinct from verified defects, approved jobs and savings; incomplete source scans are labelled partial.',
    source:'src/reality-work-catalog-v0.1.js',test:'test/reality-work-catalog-v0.1.test.js',
    boundary:'Code and tests available · GitHub source scope in this preview'},
   {name:'Failure versus capability-gap diagnosis',adds:'Distinguishes an observed missing ability from a transient failure or an uncertain external effect before suggesting repair.',
    guard:'Requires independently supported execution evidence and refuses model authorization or unsafe replay from diagnostic text.',
    source:'src/reality-genuine-capability-failure-classifier-v1.js',test:'test/reality-genuine-capability-failure-classifier-v1.test.js',
    boundary:'Code and tests available · not every failure is a verified gap'}
  ]},
  {title:'2 · Enforce permission and safety',summary:'Governance outside the model, rather than relying on convincing instructions.',items:[
   {name:'Exact-work execution authority',adds:'Can associate an AI-proposed action with a particular user, goal, connector, operation, destination and approved inputs.',
    guard:'Exact-work fingerprints and fresh owner/goal checks prevent an approval for one action from silently authorizing a different one.',
    source:'src/reality-personal-action-authority-v0.1.js',test:'test/reality-personal-action-authority-v0.1.test.js',
    boundary:'Code and tests available · exact owner scope required'},
   {name:'Two explicit authorization boundaries',adds:'Separates permission to undertake the original job from permission to install a verified capability upgrade.',
    guard:'Rejects an installation review if the candidate or its installation-to-original-job-settlement protocol lacks required proof.',
    source:'src/reality-two-authorization-execution-preflight-v1.js',test:'test/reality-two-authorization-execution-preflight-v1.test.js',
    boundary:'Code and tests available · approval is not execution or settlement'}
  ]},
  {title:'3 · Improve and continue work',summary:'More than suggesting code: candidate creation stays tied to the actual blocked job.',items:[
   {name:'Evidence-gated self-upgrade orchestration',adds:'Routes an independently confirmed missing capability from real original work into the governed candidate and test path.',
    guard:'A model guess, GitHub issue or generic feature idea cannot on its own authorize synthesis, promotion or installation.',
    source:'src/reality-genuine-capability-engine-v1.js',test:'test/reality-genuine-capability-engine-v1.test.js',
    boundary:'Code and tests available · general full-loop automation remains under validation'},
   {name:'Original-job continuation safeguards',adds:'Carries the original work identity through discovered gaps, worker readback and safe continuation decisions.',
    guard:'Unknown worker state, mismatched owner/goal, or missing evidence must not be treated as completed work or installation authority.',
    source:'src/reality-governed-original-continuity-v1.0.js',test:'test/reality-governed-original-continuity-v1.0.test.js',
    boundary:'Code and tests available · no universal resume guarantee'}
  ]},
  {title:'4 · Verify, prove and value',summary:'Completion depends on independent evidence, not the model saying “done.”',items:[
   {name:'Independent post-install acceptance',adds:'Checks the installed commit, frozen tests and original-work acceptance against a provider witness.',
    guard:'A generated diff or a successful build cannot substitute for the exact installed artifact passing the independent acceptance suite.',
    source:'src/reality-general-installed-work-verifier-v1.0.js',test:'test/reality-general-installed-work-verifier-v1.0.test.js',
    boundary:'Code and tests available · scope-specific isolated acceptance'},
   {name:'Durable final settlement receipts',adds:'Produces an inspectable receipt from independently verified original-work settlement evidence.',
    guard:'A model-generated completion claim cannot mint a verified final receipt; exact original-work identity and independent record fields are required.',
    source:'src/reality-genuine-completed-receipt-pdf-v1.js',test:'test/reality-genuine-completed-receipt-pdf-v1.test.js',
    boundary:'Code and tests available · owner-specific final receipts shown below'},
   {name:'Evidence-scoped business value',adds:'Tracks measured execution timestamps and potential customer economic inputs without inventing human time saved.',
    guard:'Separates source-labelled costs, public labor references, owner-reported estimates and independently proven cash outcomes.',
    source:'src/reality-operational-roi-v2.js',test:'test/reality-operational-roi-v2.test.js',
    boundary:'Code and tests available · verified net savings not yet established'}
  ]}
 ];
 const make=(tag,className,textValue)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(textValue!=null)node.textContent=textValue;
  return node;
 };
 for(const group of groups){
  const groupNode=make('section','reality-model-cap-group');
  groupNode.append(
   make('h5',null,group.title),
   make('p',null,group.summary)
  );
  for(const item of group.items){
   const details=make('details','reality-model-cap-item');
   const summary=make('summary');
   const main=make('div');
   main.append(
    make('strong',null,item.name),
    make('small',null,item.adds)
   );
   summary.append(main,make('span','reality-model-cap-expand','View control + proof'));
   const content=make('div','reality-model-cap-inside');
   const ability=make('p');
   ability.append(make('b',null,'What the model gains: '),
    document.createTextNode(item.adds));
   const guard=make('p');
   guard.append(make('b',null,'What Reality enforces: '),
    document.createTextNode(item.guard));
   const maturity=make('span','reality-model-cap-maturity',item.boundary);
   const links=make('div','reality-model-cap-links');
   for(const [label,path] of [
    ['Inspect implementation',item.source],
    ['Inspect automated tests',item.test]]){
    // The inputs are bundled, reviewed source paths, not model-generated URLs.
    if(!/^(?:src|api\/reality|test)\/[A-Za-z0-9._/-]+\.(?:js|mjs)$/.test(path)||
      path.includes('..'))continue;
    const link=make('a',null,label);
    link.href=EVIDENCE_BASE+path;
    link.target='_blank';
    link.rel='noopener noreferrer';
    links.append(link);
   }
   content.append(ability,guard,maturity,links);
   details.append(summary,content);
   groupNode.append(details);
  }
  host.append(groupNode);
 }
})();
