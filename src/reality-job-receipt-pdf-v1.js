// Safe owner-verified Reality receipt PDF. Does not create receipts or authority.
import {createHash} from 'node:crypto';
const fail=x=>{throw Error('REALITY_PDF_RECEIPT_'+x)};
const ascii=x=>String(x??'').replace(/[^\x20-\x7e]/g,'?').slice(0,1400);
const esc=x=>ascii(x).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
function wrap(label,value){
 const result=[];let s=ascii((label?label+': ':'')+value);
 while(s.length>91){let i=s.lastIndexOf(' ',91);if(i<24)i=91;result.push(s.slice(0,i));s=s.slice(i).trimStart();}
 result.push(s);return result;
}
export function renderRealityReceiptPdf(report){
 const r=report?.automatic_candidate_receipt;
 if(report?.ok!==true||report.status!=='HARDENED_SOURCE_VERIFIED_NOT_OWNER_WORK_BOUND'||
    r?.status!=='INDEPENDENTLY_VERIFIED_AND_DURABLY_RELEASED'||
    r.durable_release_readback_verified!==true||r.record_is_immutable!==true||
    !/^candidate-receipt:[a-f0-9]{32}$/.test(r.receipt_id||'')||
    !/^[a-f0-9]{64}$/.test(r.source_sha256||'')||
    r.source_sha256!==report.source_sha256||
    r.verification_checks_passed!==report.independent_tests_passed||
    report.qualified_for_owner_installation!==false||
    report.installed!==false||report.owner_approval_issued!==false||
    report.production_changed!==false||
    r.installation_authorized!==false||r.installed!==false||
    r.production_changed!==false||r.new_owner_job_created!==false||
    report.new_original_work_id!==null||
    report.discovery_value?.version!=='reality-discovery-economic-context-v1'||
    report.discovery_value?.receipt_id!==r.receipt_id||
    report.discovery_value?.realized_roi_percent!==null||
    report.discovery_value?.realized_net_roi_usd!==null||
    report.discovery_value?.measured_comparable_human_diagnostic_hours!==null||
    report.discovery_value?.verified_discovery_cash_savings_usd!==null||
    report.discovery_value?.installation_authorized!==false||
    !Array.isArray(report.discovery_value?.labor_equivalent_scenarios)||
    report.discovery_value.labor_equivalent_scenarios.length!==3)
  fail('VERIFIED_DURABLE_RECEIPT_REQUIRED');

 // One identity; successive exports are snapshots, not new receipts.
 const d=report.discovery_value;
 const navy=[0.07,0.13,0.22],teal=[0.03,0.43,0.40],grey=[0.38,0.44,0.50],light=[0.92,0.95,0.96],amber=[0.72,0.41,0.07];
 const pdfText=(s)=>esc(s);
 const rgb=(v)=>v.join(' ')+' rg';
 const stroke=(v)=>v.join(' ')+' RG';
 const pages=[];
 const makePage=()=>{
  const cmds=[];
  const rect=(x,y,w,h,c)=>{
    cmds.push('q '+rgb(c)+' '+x+' '+y+' '+w+' '+h+' re f Q');
  };
  const border=(x,y,w,h,c)=>{
    cmds.push('q '+stroke(c)+' 0.6 w '+x+' '+y+' '+w+' '+h+' re S Q');
  };
  const txt=(x,y,s,size=9,color=navy,bold=false)=>{
    cmds.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+rgb(color)+
      ' 1 0 0 1 '+x+' '+y+' Tm ('+pdfText(s)+') Tj ET');
  };
  const multiline=(x,y,title,body,width=80,size=9,dy=13)=>{
    if(title)txt(x,y,title,10,navy,true);
    let pos=y-(title?18:0);
    for(const l of wrap('',body)){
      let line=l, limit=width;
      while(line.length>limit){
        txt(x,pos,line.slice(0,limit),size,grey);
        line=line.slice(limit);pos-=dy;
      }
      txt(x,pos,line,size,grey);pos-=dy;
    }
    return pos;
  };
  const h=(name,y)=>{txt(43,y,name,11,navy,true);rect(43,y-8,524,1.2,teal);};
  const header=(part)=>{
    rect(0,712,612,80,navy);
    txt(43,758,'REALITY',23,[1,1,1],true);
    txt(43,738,part,10,[0.75,0.86,0.85]);
    txt(43,693,'RECEIPT  '+r.receipt_id,8.4,grey);
    txt(43,677,'Released '+r.durable_release_at+'  |  Generated '+new Date().toISOString(),8,grey);
  };
  const footer=(index)=>{
    rect(43,55,526,0.7,light);
    txt(43,39,'EVIDENCE SNAPSHOT - not installation authorization or final job settlement',8.2,grey);
    txt(520,39,'PAGE '+index+' / 3',8,grey);
  };
  return {cmds,rect,border,txt,multiline,h,header,footer};
 };
 const p=makePage();
 p.header('UPGRADE DECISION & BUSINESS VALUE REPORT');
 // Executive assessment
 p.rect(43,603,526,56,light);p.border(43,603,526,56,[0.78,0.84,0.85]);
 p.txt(55,642,'DECISION SNAPSHOT',10,teal,true);
 p.txt(55,626,'Verified candidate. Installation and original-job completion remain unproven.',10,navy,true);
 p.txt(55,611,'INDEPENDENTLY VERIFIED AND DURABLY RELEASED | '+r.verification_checks_passed+' of '+r.verification_checks_passed+' checks passed',8.6,grey);
 p.h('WHY REALITY SUGGESTED THIS UPGRADE',576);
 p.txt(43,553,'Observed blocker: missing executable final-outcome verification capability (#188).',9.4,navy,true);
 p.multiline(43,535,'',
  'Frozen GitHub acceptance failed because the general execution-receipt module was absent. The missing verifier is needed to check that owner, goal, original job, installed artifact and provider commit agree before calling a repair complete.',
  100,8.8,13);
 p.h('EXPECTED VALUE (NOT YET REALIZED)',466);
 p.multiline(43,445,'',
  'A reusable verifier could reduce false-completion claims, improve traceability and support reliable same-job resumption and settlement. No measured customer labor, dollar savings or deployment benefit is claimed.',
  101,8.8,13);
 p.h('POTENTIAL BENEFITS / TRADE-OFFS',396);
 p.rect(43,252,255,129,[0.94,0.98,0.96]);p.rect(309,252,260,129,[0.99,0.97,0.92]);
 p.txt(54,365,'PROS - expected',10,teal,true);
 p.multiline(54,344,'','+ Detect mismatched completion receipts',44,8.7,14);
 p.multiline(54,316,'','+ Strengthen evidence provenance',44,8.7,14);
 p.multiline(54,288,'','+ Support governed resumption proofs',44,8.7,14);
 p.txt(320,365,'CONS / RISKS - unresolved',10,amber,true);
 p.multiline(320,344,'','- No real installation or activation proof',46,8.7,14);
 p.multiline(320,316,'','- Needs exact authorization and integration',46,8.7,14);
 p.multiline(320,288,'','- Runtime cost and unknown failure modes',46,8.7,14);
 p.h('INDEPENDENT VERIFICATION GRAPH',222);
 p.txt(43,202,'PASS',9,teal,true);
 p.rect(106,194,380,13,light);p.rect(106,194,380,13,teal);
 p.txt(493,197,String(r.verification_checks_passed),10,teal,true);
 p.txt(43,175,'FAIL',9,amber,true);
 p.rect(106,167,380,13,light);
 p.txt(493,170,'0',10,amber,true);
 p.txt(43,146,'21 / 21 checks reported passed in isolated verification. This is NOT a production success rate.',8.5,grey);
 p.footer(1);
 pages.push(p.cmds.join('\n')+'\n');
 const q=makePage();
 q.header('PROVENANCE, WORKFLOW & ECONOMIC OUTCOME');
 q.h('LIFECYCLE PROGRESS (EVIDENCE, NOT % OF JOB DONE)',652);
 const stages=[
  ['Discover',true],['Generate',true],['Verify',true],['Release',true],
  ['Bind work',false],['Approve',false],['Install',false],['Resume',false],['Settle',false]
 ];
 const sx=43,step=58;
 stages.forEach(([name,done],i)=>{
   const x=sx+i*step;
   q.rect(x,609,51,22,done?teal:light);
   q.txt(x+4,615,done?'VERIFIED':'PENDING',7.0,done?[1,1,1]:grey,done);
   q.txt(x+2,594,name,7.5,navy,done);
 });
 q.txt(43,570,'Four evidence stages verified; five subsequent stages remain incomplete.',8.7,grey);
 q.h('EXACT STAGE RECEIPTS',546);
 const state=[
 'Discovery / problem observed: VERIFIED SOURCE EVIDENCE',
 'Generated candidate: SOURCE HASH RECORDED',
 'Independent tests: '+r.verification_checks_passed+' of '+r.verification_checks_passed+' PASSED',
 'Immutable release / readback: VERIFIED',
 'New original job binding: NOT VERIFIED',
 'Exact installation approval: NOT GIVEN',
 'Isolated installation / monitored activation: NOT PERFORMED',
 'Original job resumption: NOT VERIFIED',
 'New original-job settlement: NOT VERIFIED'
 ];
 state.forEach((t,i)=>q.txt(44,524-i*18,t,8.9,i<4?teal:grey,i<4));
 q.h('SOURCE & VERIFICATION LINKS',338);
 const fields=[
  ['Source SHA-256',r.source_sha256],
  ['Git revision',r.provider_repository_sha],
  ['Independent GitHub run',r.provider_run_url],
  ['Proposal archive SHA-256',r.proposal_archive_sha256],
  ['Verifier archive SHA-256',r.independent_verification_archive_sha256]
 ];
 let yy=318;
 for(const [label,value] of fields){
   q.txt(44,yy,label,8.4,grey,true); yy-=11;
   q.txt(44,yy,value,8.1,navy);yy-=25;
 }
 q.h('ECONOMIC VALUE - DOCUMENTED VS UNKNOWN',134);
 q.txt(43,112,'Human baseline / supervision: UNKNOWN   |   API + infrastructure cost: NOT VERIFIED',8.5,grey);
 q.txt(43,95,'Cash savings / ROI: UNKNOWN   |   Workforce reduction: NOT ESTABLISHED',8.5,grey);
 q.txt(43,72,'No receipt, approval, or external action is created by downloading this PDF.',7.65,grey);
 q.footer(2);
 pages.push(q.cmds.join('\n')+'\n');
 const z=makePage();
 z.header('DISCOVERY VALUE - COST COMPARISON, NOT CASH SAVINGS');
 z.rect(43,606,526,55,light);
 z.txt(55,644,'WHY THIS HAS ECONOMIC POTENTIAL',10,teal,true);
 z.txt(55,626,'Reality found a missing source capability and produced independently tested evidence.',9,navy);
 z.txt(55,613,'Comparable human diagnosis has labor cost even before installation.',8.8,grey);
 z.h('WHAT REALITY ACTUALLY OBSERVED',580);
 z.txt(44,557,'Issue #188: missing independent original-job completion verifier',9.2,navy,true);
 z.txt(44,539,'Model attempts: '+d.observed.model_attempts+'  |  Input tokens: '+d.observed.model_input_tokens+
   '  |  Output tokens: '+d.observed.model_output_tokens,9,navy);
 z.txt(44,521,'Independent checks: '+d.observed.independent_checks_passed+
   ' passed  |  Separate verification: '+(d.observed.independent_verification_ms/1000).toFixed(1)+' seconds',9,navy);
 z.txt(44,504,'Recorded verification seconds are not total job time or human hours saved.',8.2,grey);
 z.h('ILLUSTRATIVE HUMAN DIAGNOSIS LABOR VALUE',475);
 z.txt(44,452,'Assumed human diagnostic time (not measured for this exact issue)',9,grey);
 z.txt(44,433,'Based on BLS national median employee wages, May 2025 - NOT contractor fees.',8.5,grey);
 const benchmarks=d.labor_equivalent_scenarios;
 const max=benchmarks[2].developer_median_wage_labor_equivalent_usd;
 const draw=(x,y,length,color)=>z.rect(x,y,Math.max(length,1),10,color);
 for(let i=0;i<3;i++){
  const a=benchmarks[i],yy=399-i*63;
  if(a.evidence_status!=='ILLUSTRATIVE_HOURS_NOT_MEASURED_OR_VERIFIED'||
     a.assumed_human_diagnostic_hours!==[1,2,4][i]||
     !Number.isFinite(a.developer_median_wage_labor_equivalent_usd)||
     !Number.isFinite(a.qa_median_wage_labor_equivalent_usd))
    fail('DISCOVERY_VALUE_SCENARIO_SOURCE_INVALID');
  z.txt(44,yy+5,a.assumed_human_diagnostic_hours+' hypothetical human hr'+(i?'s':''),9,navy,true);
  draw(230,yy+5,215*a.qa_median_wage_labor_equivalent_usd/max,[0.44,0.69,0.68]);
  draw(230,yy-10,215*a.developer_median_wage_labor_equivalent_usd/max,teal);
  z.txt(459,yy+7,'QA USD '+a.qa_median_wage_labor_equivalent_usd.toFixed(2),8.5,grey);
  z.txt(459,yy-8,'DEV USD '+a.developer_median_wage_labor_equivalent_usd.toFixed(2),8.5,navy);
 }
 z.txt(44,209,'Light = QA median USD '+d.public_wage_context.qa_median_usd_per_hour+
     '/hr   Dark = developer median USD '+d.public_wage_context.developer_median_usd_per_hour+'/hr',8.5,grey);
 z.h('ACTUAL FINANCIAL ROI: NOT YET VERIFIABLE',183);
 z.txt(44,162,'Comparable human diagnosis time: UNKNOWN    |    Human review time: UNKNOWN',8.5,navy);
 z.txt(44,145,'Provider charge and infrastructure cost: NOT VERIFIED',8.5,navy);
 z.txt(44,128,'Customer dollars paid, actual savings and net ROI: UNKNOWN',8.7,navy,true);
 z.txt(44,111,'A modeled labor replacement value is not an invoice, saving or realized profit.',8.1,grey);
 z.txt(44,93,'Public wage source: www.bls.gov/news.release/ocwage.t01.htm',8,grey);
 z.txt(44,75,'No installation, receipt mutation, or authority is created by exporting this report.',7.6,grey);
 z.footer(3);
 pages.push(z.cmds.join('\n')+'\n');
 // Stable PDF 1.4: base fonts + vector rectangles and bars; no external fonts.
 const objs=[];const put=v=>{objs.push(v);return objs.length;};
 const f1=put('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const f2=put('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const cat=put(''),root=put(''),ids=[];
 for(const stream of pages){
  const content=put('<< /Length '+Buffer.byteLength(stream,'latin1')+' >>\nstream\n'+stream+'endstream');
  ids.push(put('<< /Type /Page /Parent '+root+' 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >> >> /Contents '+content+' 0 R >>'));
 }
 objs[cat-1]='<< /Type /Catalog /Pages '+root+' 0 R >>';
 objs[root-1]='<< /Type /Pages /Kids ['+ids.map(x=>x+' 0 R').join(' ')+'] /Count '+ids.length+' >>';
 let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n',offsets=[];
 for(let i=0;i<objs.length;i++){offsets.push(Buffer.byteLength(out,'latin1'));out+=(i+1)+' 0 obj\n'+objs[i]+'\nendobj\n';}
 const start=Buffer.byteLength(out,'latin1');
 out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
 for(const offset of offsets)out+=String(offset).padStart(10,'0')+' 00000 n \n';
 const digest=createHash('md5').update(r.receipt_id).digest('hex');
 out+='trailer\n<< /Size '+(objs.length+1)+' /Root '+cat+' 0 R /ID [<'+digest+'> <'+digest+'>] >>\nstartxref\n'+start+'\n%%EOF\n';
 const pdf=Buffer.from(out,'latin1');
 if(pdf.length>250000||pdf.toString('latin1',0,8)!=='%PDF-1.4')fail('INVALID_BINARY');
 return pdf;
}
