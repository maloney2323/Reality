import crypto from 'node:crypto';

// Optional, Preview-only encrypted original output for delayed adjudication.
// Encryption does not establish truth. Without a configured key, do not retain
// plaintext silently and do not pretend historical semantic replay is possible.
export const RELIABILITY_REPLAY_VERSION='reality-encrypted-output-v0.1';
export function sealModelOutput(output,{key=process.env.REALITY_RELIABILITY_REPLAY_KEY,scope=null}={}){
  if(typeof output!=='string')throw Error('RELIABILITY_REPLAY_OUTPUT_REQUIRED');
  if(!key || typeof scope!=='string' || !scope.trim())return Object.freeze({
    status:'NOT_RETAINED',reason:!key?'ENCRYPTION_KEY_NOT_CONFIGURED':'SCOPE_REQUIRED',
  });
  const bytes=Buffer.from(output,'utf8');
  if(bytes.length>48_000)throw Error('RELIABILITY_REPLAY_OUTPUT_TOO_LARGE');
  const iv=crypto.randomBytes(12);
  const secret=crypto.createHash('sha256').update(key).digest();
  const cipher=crypto.createCipheriv('aes-256-gcm',secret,iv);
  const aad=Buffer.from(scope,'utf8');
  cipher.setAAD(aad);
  const encrypted=Buffer.concat([cipher.update(bytes),cipher.final()]);
  return Object.freeze({
    status:'ENCRYPTED_REPLAY_AVAILABLE',version:RELIABILITY_REPLAY_VERSION,
    algorithm:'AES-256-GCM',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),
    ciphertext:encrypted.toString('base64'),
    plaintext_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
  });
}
export function openModelOutput(record,{key=process.env.REALITY_RELIABILITY_REPLAY_KEY,scope=null}={}){
  if(record?.status!=='ENCRYPTED_REPLAY_AVAILABLE'||!key||typeof scope!=='string')
    throw Error('RELIABILITY_REPLAY_UNAVAILABLE');
  if(record.version!==RELIABILITY_REPLAY_VERSION||record.algorithm!=='AES-256-GCM')
    throw Error('RELIABILITY_REPLAY_UNSUPPORTED');
  try{
    const decipher=crypto.createDecipheriv('aes-256-gcm',
      crypto.createHash('sha256').update(key).digest(),Buffer.from(record.iv,'base64'));
    decipher.setAAD(Buffer.from(scope,'utf8'));
    decipher.setAuthTag(Buffer.from(record.tag,'base64'));
    const plaintext=Buffer.concat([decipher.update(Buffer.from(record.ciphertext,'base64')),decipher.final()]);
    if(crypto.createHash('sha256').update(plaintext).digest('hex')!==record.plaintext_sha256)
      throw Error('RELIABILITY_REPLAY_HASH_MISMATCH');
    return plaintext.toString('utf8');
  }catch{throw Error('RELIABILITY_REPLAY_DECRYPT_OR_SCOPE_FAILED');}
}
