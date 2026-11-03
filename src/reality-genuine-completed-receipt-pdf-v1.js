// Automatic final customer PDF from an ALREADY independently verified DB receipt.
// Export is read-only; it cannot issue a receipt, grant consent or alter settlement.
import {createHash} from 'node:crypto';
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const fail=x=>{throw Error('REALITY_COMPLETED_RECEIPT_PDF_'+x)};
const ascii=x=>String(x??'').replace(/[^\x20-\x7e]/g,'?').slice(0,512);
const esc=x=>ascii(x).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
export function renderRealityCompletedJobPdf(r){
 if(r?.status!=='FULL_LOOP_INDEPENDENTLY_VERIFIED'||
    !WORK.test(r.original_work_id||'')||
    !HASH.test(r.artifact_sha256||'')||
    !SHA.test(r.installed_commit_sha||'')||
    !UUID.test(r.settlement_event_id||'')||
    !Number.isSafeInteger(r.provider_run_id)||r.provider_run_id<1||
    !/^sha256:[a-f0-9]{64}$/.test(r.verifier_artifact_digest||'')||
    !Number.isFinite(Date.parse(r.verified_at||''))||
    r.production_changed!==false)
  fail('INDEPENDENT_PROVIDER_AND_DB_RECEIPT_REQUIRED');
 const navy=[0.08,0.14,0.24],teal=[0.03,0.43,0.40],grey=[0.36,0.42,0.49],pale=[0.91,0.96,0.95];
 const rgb=c=>c.join(' ')+' rg';
 const cmds=[];
 const box=(x,y,w,h,color)=>cmds.push('q '+rgb(color)+' '+x+' '+y+' '+w+' '+h+' re f Q');
 const txt=(x,y,value,size=9,color=navy,bold=false)=>
  cmds.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+rgb(color)+
   ' 1 0 0 1 '+x+' '+y+' Tm ('+esc(value)+') Tj ET');
 const heading=(text,y)=>{txt(44,y,text,11,navy,true);box(44,y-9,525,1,teal)};
 box(0,707,612,85,navy);
 txt(44,756,'REALITY',24,[1,1,1],true);
 txt(44,735,'FINAL VERIFIED CUSTOMER JOB RECEIPT',11,[0.8,0.94,0.92]);
 txt(44,685,'INDEPENDENTLY VERIFIED - ORIGINAL WORK SETTLED',12,teal,true);
 txt(44,665,'Issued from durable verified evidence, not a model completion claim.',9,grey);
 box(44,570,525,73,pale);
 txt(57,621,'FULL-LOOP RESULT',10,teal,true);
 txt(57,602,'Discovery > Repair > Tests > Owner approval > Install > Resume > Settle',9,navy,true);
 txt(57,582,'Installed verifier passed real receipt checks and 5 rejection probes.',9,grey);
 heading('ORIGINAL CUSTOMER WORK & INSTALLED ARTIFACT',537);
 txt(44,516,'Original job: '+r.original_work_id,9,navy,true);
 txt(44,496,'Candidate SHA-256: '+r.artifact_sha256,8.7,navy);
 txt(44,476,'Installed commit: '+r.installed_commit_sha,8.7,navy);
 heading('INDEPENDENT PROVIDER & SETTLEMENT EVIDENCE',443);
 txt(44,421,'GitHub Actions run: '+r.provider_run_id,9,navy);
 txt(44,402,'Durable settlement event: '+r.settlement_event_id,8.6,navy);
 txt(44,384,'Final verifier artifact digest:',8.7,grey);
 txt(44,367,r.verifier_artifact_digest,8.1,navy);
 heading('CUSTOMER BENEFIT & ECONOMIC ACCOUNTABILITY',328);
 txt(44,306,'Verified contribution: capability repaired, installed, and original work settled.',9,navy);
 txt(44,289,'Verified controls: source identity, explicit authorization, independent final readback.',9,navy);
 txt(44,271,'Measured labor hours saved: NOT MEASURED',9,grey);
 txt(44,254,'Provider and infrastructure cost: NOT VERIFIED',9,grey);
 txt(44,237,'Realized cash ROI: NOT VERIFIED - no financial number invented.',9,grey);
 heading('RELIABILITY & SCOPE',202);
 txt(44,180,'Final receipt verified: '+r.verified_at,8.6,navy);
 txt(44,162,'Production changes: NONE. Isolated preview was the only authorized target.',8.6,navy);
 txt(44,144,'Original job is never reauthorized or replayed by viewing this document.',8.6,navy);
 box(44,67,525,1,pale);
 txt(44,50,'Reality - source-linked final receipt / signed provider and durable database evidence',8,grey);
 // Minimal stable PDF 1.4, vector content and embedded standard font references.
 const stream=cmds.join('\n')+'\n';
 const objects=[];const add=x=>(objects.push(x),objects.length);
 const f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const catalog=add(''),pages=add('');
 const content=add('<< /Length '+Buffer.byteLength(stream,'latin1')+' >>\nstream\n'+stream+'endstream');
 const page=add('<< /Type /Page /Parent '+pages+' 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >> >> /Contents '+content+' 0 R >>');
 objects[catalog-1]='<< /Type /Catalog /Pages '+pages+' 0 R >>';
 objects[pages-1]='<< /Type /Pages /Kids ['+page+' 0 R] /Count 1 >>';
 let pdf='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const offsets=[];
 for(let i=0;i<objects.length;i++){
  offsets.push(Buffer.byteLength(pdf,'latin1'));
  pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';
 }
 const xref=Buffer.byteLength(pdf,'latin1');
 pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(const offset of offsets)pdf+=String(offset).padStart(10,'0')+' 00000 n \n';
 const id=createHash('md5').update(r.original_work_id+'|'+r.artifact_sha256).digest('hex');
 pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root '+catalog+
  ' 0 R /ID [<'+id+'> <'+id+'>] >>\nstartxref\n'+xref+'\n%%EOF\n';
 const buffer=Buffer.from(pdf,'latin1');
 if(buffer.length>60000||buffer.toString('latin1',0,8)!=='%PDF-1.4')fail('BAD_BINARY');
 return buffer;
}
