// Reality Signing Key Provider — abstraction layer.

import { canonicalJson } from './canonical.js';

export const KEY_PROVIDER_VERSION = 'reality.key-provider.v0.1';
export const SIGNING_ALGORITHM = 'Ed25519';
export const KEY_ALGORITHM_ED25519 = SIGNING_ALGORITHM;

function b64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function b64UrlDecode(str) {
  const padded = str.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - str.length % 4) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function utf8(str) {
  return new TextEncoder().encode(str);
}

export function createDevKeyProvider({ keyStore, purpose = 'reality-access-boundary' }) {
  if (!keyStore || typeof keyStore.loadActive !== 'function' || typeof keyStore.persist !== 'function') {
    throw new Error('DevKeyProvider requires a keyStore with loadActive() and persist()');
  }

  async function importPrivate(privateKeyB64) {
    const pkcs8 = b64UrlDecode(privateKeyB64);
    return crypto.subtle.importKey('pkcs8', pkcs8, { name: SIGNING_ALGORITHM }, false, ['sign']);
  }

  async function importPublic(publicKeyB64) {
    const spki = b64UrlDecode(publicKeyB64);
    return crypto.subtle.importKey('spki', spki, { name: SIGNING_ALGORITHM }, true, ['verify']);
  }

  async function ensureActive() {
    const existing = await keyStore.loadActive();
    if (existing && existing.private_key_b64 && existing.public_key_b64) {
      const privateKey = await importPrivate(existing.private_key_b64);
      return { key_id: existing.key_id, algorithm: SIGNING_ALGORITHM, privateKey, publicKeyB64: existing.public_key_b64 };
    }
    const pair = await crypto.subtle.generateKey({ name: SIGNING_ALGORITHM }, true, ['sign', 'verify']);
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
    const spki = await crypto.subtle.exportKey('spki', pair.publicKey);
    const persisted = await keyStore.persist({
      key_id: `rk_${crypto.randomUUID()}`,
      algorithm: SIGNING_ALGORITHM,
      private_key_b64: b64Url(new Uint8Array(pkcs8)),
      public_key_b64: b64Url(new Uint8Array(spki)),
      purpose,
      generated_at: new Date().toISOString(),
    });
    return { key_id: persisted.key_id, algorithm: SIGNING_ALGORITHM, privateKey: pair.privateKey, publicKeyB64: persisted.public_key_b64 };
  }

  return {
    version: KEY_PROVIDER_VERSION,
    algorithm: SIGNING_ALGORITHM,
    custody: 'DEVELOPMENT_BASE44_STORAGE_NOT_PRODUCTION',
    async getActiveKey() {
      const active = await ensureActive();
      return { key_id: active.key_id, algorithm: active.algorithm, public_key_b64: active.publicKeyB64 };
    },
    async sign(canonicalPayloadJson) {
      if (typeof canonicalPayloadJson !== 'string') throw new Error('sign() requires canonical JSON string');
      const active = await ensureActive();
      const signature = await crypto.subtle.sign({ name: SIGNING_ALGORITHM }, active.privateKey, utf8(canonicalPayloadJson));
      return { key_id: active.key_id, algorithm: active.algorithm, public_key_b64: active.publicKeyB64, signature_b64: b64Url(new Uint8Array(signature)) };
    },
    async verify(publicKeyB64, canonicalPayloadJson, signatureB64) {
      try {
        const publicKey = await importPublic(publicKeyB64);
        return (await crypto.subtle.verify({ name: SIGNING_ALGORITHM }, publicKey, b64UrlDecode(signatureB64), utf8(canonicalPayloadJson))) === true;
      } catch {
        return false;
      }
    },
    async exportPublicJwk(publicKeyB64) {
      return crypto.subtle.exportKey('jwk', await importPublic(publicKeyB64));
    },
  };
}

export async function verifyEd25519Jwk(jwk, canonicalPayloadJson, signatureB64) {
  try {
    if (!jwk || jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || typeof jwk.x !== 'string' || 'd' in jwk) return false;
    const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: SIGNING_ALGORITHM }, false, ['verify']);
    return (await crypto.subtle.verify({ name: SIGNING_ALGORITHM }, publicKey, b64UrlDecode(signatureB64), utf8(canonicalPayloadJson))) === true;
  } catch {
    return false;
  }
}

export async function signPayload(provider, payload) {
  const payloadJson = canonicalJson(payload);
  const signed = await provider.sign(payloadJson);
  return { payload_json: payloadJson, signature: signed.signature_b64, key_id: signed.key_id, algorithm: signed.algorithm, public_key_b64: signed.public_key_b64 };
}

export { canonicalJson };