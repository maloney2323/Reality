import { timingSafeEqual } from 'node:crypto';

// Server-to-server bridge authentication. Caller-provided authorization
// objects and work IDs are never themselves trusted invocation credentials.
// Internal direct connector routes are OFF until explicitly and separately
// released, even if the governed execution API is enabled.
export function requireTrustedInternalConnector(req, { purpose='WRITE' } = {}) {
  if (process.env.REALITY_GOVERNED_EXECUTION_ENABLED !== 'true' ||
      process.env[purpose==='READBACK'
        ? 'REALITY_CONNECTOR_READBACK_ENABLED'
        : 'REALITY_DIRECT_CONNECTOR_WRITES_ENABLED'] !== 'true') {
    const e=new Error('DIRECT_CONNECTOR_NOT_RELEASED');e.status=503;throw e;
  }
  const keyName=purpose==='READBACK'?'REALITY_VERIFIER_BRIDGE_TOKEN':'REALITY_CONNECTOR_BRIDGE_TOKEN';
  const secret=process.env[keyName];
  if (typeof secret!=='string'||secret.length<24) {
    const e=new Error('CONNECTOR_TRUST_BOUNDARY_UNCONFIGURED');e.status=503;throw e;
  }
  const authorization=req?.headers?.authorization;
  const match=typeof authorization==='string'?/^Bearer ([^\s]+)$/.exec(authorization):null;
  const expected=Buffer.from(secret,'utf8');
  const supplied=match?Buffer.from(match[1],'utf8'):Buffer.alloc(0);
  if(supplied.length!==expected.length || !timingSafeEqual(supplied,expected)){
    const e=new Error('UNAUTHORIZED_INTERNAL_CONNECTOR_INVOCATION');e.status=401;throw e;
  }
  return Object.freeze({trusted:true,purpose,external_effect_verified:false});
}
