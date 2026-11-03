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
    report.new_original_work_id!==null)
  fail('VERIFIED_DURABLE_RECEIPT_REQUIRED');
 const lines=[];
 const add=(text,bold=false)=>lines.push({text:ascii(text),bold});
 const field=(label,value)=>wrap(label,value).forEach(x=>add(x));
 add('REALITY | VERIFIED JOB / CAPABILITY RECEIPT',true);
 add('Evidence and progress snapshot - Reality issue #188');add('');
 add('RECEIPT',true);
 field('Receipt ID',r.receipt_id);
 field('Status','INDEPENDENTLY VERIFIED AND DURABLY RELEASED');
 field('Released at (UTC)',r.durable_release_at||'UNKNOWN');
 field('Report generated at (UTC)',new Date().toISOString());add('');
 add('INDEPENDENT VERIFICATION',true);
 field('Checks passed',String(r.verification_checks_passed)+' of '+String(r.verification_checks_passed));
 field('Source SHA-256',r.source_sha256);
 field('Git SHA',r.provider_repository_sha);
 field('Evidence run',r.provider_run_url);
 field('Proposal archive SHA-256',r.proposal_archive_sha256);
 field('Verifier archive SHA-256',r.independent_verification_archive_sha256);
 field('Release readback','VERIFIED - source and immutable database record match');add('');
 add('SINGLE WORKFLOW / PROOF TIMELINE',true);
 add('Discovery and candidate generation: EVIDENCE RECORDED');
 add('Independent sandbox verification: VERIFIED');
 add('Immutable receipt released: VERIFIED');
 add('New original job binding: NOT VERIFIED');
 add('Exact installation approval: NOT GIVEN');
 add('Isolated installation: NOT PERFORMED');
 add('Post-install activation and monitoring: NOT PERFORMED');
 add('Original job resumed: NOT VERIFIED');
 add('New original job settled: NOT VERIFIED');
 add('Production changed: NO');add('');
 add('ECONOMIC OUTCOME',true);
 add('Human comparable effort: UNKNOWN');
 add('Human supervision time: UNKNOWN');
 add('Provider and infrastructure cost: NOT VERIFIED');
 add('Verified labor hours returned: UNKNOWN');
 add('Cash savings / ROI: UNKNOWN');
 add('Workforce reduction: NOT ESTABLISHED');add('');
 add('AUTHORITY & INTERPRETATION',true);
 field('Scope','This PDF is an evidence export, not a new job receipt or an installation authorization.');
 field('Next stage','Fresh authorized original-work binding and exact candidate qualification before owner installation approval.');
 field('Provider','Original source and independent test artifacts are linked to the GitHub run.');
 add('No receipt, approval, or external action is created by downloading this PDF.');
 const pages=[];for(let i=0;i<lines.length;i+=49)pages.push(lines.slice(i,i+49));
 let objs=[];const put=v=>{objs.push(v);return objs.length;};
 const regular=put('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const bold=put('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const catalog=put('');const root=put('');const pageIds=[];
 for(let k=0;k<pages.length;k++){
  let stream='q\n';
  pages[k].forEach((v,i)=>{
   const y=746-i*13;
   stream+='BT /'+(v.bold?'F2':'F1')+' '+(v.bold?'10.4':'9.4')+
     ' Tf 0.12 0.16 0.23 rg 1 0 0 1 44 '+y+' Tm ('+esc(v.text)+') Tj ET\n';
  });
  stream+='BT /F1 8 Tf 0.45 0.49 0.56 rg 1 0 0 1 44 38 Tm ('+
    'Reality evidence report - page '+(k+1)+' of '+pages.length+') Tj ET\nQ\n';
  const content=put('<< /Length '+Buffer.byteLength(stream,'latin1')+' >>\nstream\n'+stream+'endstream');
  const page=put('<< /Type /Page /Parent '+root+' 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 '+regular+' 0 R /F2 '+bold+' 0 R >> >> /Contents '+content+' 0 R >>');
  pageIds.push(page);
 }
 objs[catalog-1]='<< /Type /Catalog /Pages '+root+' 0 R >>';
 objs[root-1]='<< /Type /Pages /Kids ['+pageIds.map(x=>x+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
 let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', offsets=[];
 for(let i=0;i<objs.length;i++){offsets.push(Buffer.byteLength(out,'latin1'));out+=(i+1)+' 0 obj\n'+objs[i]+'\nendobj\n';}
 const start=Buffer.byteLength(out,'latin1');
 out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
 for(const offset of offsets)out+=String(offset).padStart(10,'0')+' 00000 n \n';
 const digest=createHash('md5').update(r.receipt_id).digest('hex');
 out+='trailer\n<< /Size '+(objs.length+1)+' /Root '+catalog+' 0 R /ID [<'+digest+'> <'+digest+'>] >>\nstartxref\n'+start+'\n%%EOF\n';
 const pdf=Buffer.from(out,'latin1');
 if(pdf.length>250000||pdf.toString('latin1',0,8)!=='%PDF-1.4')fail('INVALID_BINARY');
 return pdf;
}
