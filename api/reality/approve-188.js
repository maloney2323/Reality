import {readFileSync} from 'node:fs';
// Bounded single-action owner page. GET serves HTML only; it never grants
// authorization, reserves a DB claim, installs code or starts a worker.
// The user's explicit POST goes to personal-real-repair-install.js instead.
const html=readFileSync(new URL('../../approve-188.html',import.meta.url),'utf8');
export default function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){
  res.setHeader('Allow','GET');
  return res.status(405).send('GET_ONLY');
 }
 return res.status(200).setHeader('Content-Type','text/html; charset=utf-8').send(html);
}
