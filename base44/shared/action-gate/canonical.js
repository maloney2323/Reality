// Domain-neutral canonicalization and receipt primitives for the Reality Action Gate.
// This module is outside the frozen Reality Core. It never decides whether evidence
// is sufficient; it only binds bytes and signs/validates authorization artifacts.

function canonicalValue(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('canonical values require finite numbers');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) throw new Error(`canonical value cannot contain undefined at ${key}`);
      result[key] = canonicalValue(value[key]);
    }
    return result;
  }
  throw new Error(`unsupported canonical value type: ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function utf8(value) {
  return new TextEncoder().encode(value);
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function fromBase64Url(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', utf8(value));
  return bytesToHex(new Uint8Array(digest));
}

async function importHmacKey(keyBase64Url, usage) {
  return crypto.subtle.importKey(
    'raw',
    fromBase64Url(keyBase64Url),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

export async function hmacSign(keyBase64Url, payload) {
  const key = await importHmacKey(keyBase64Url, 'sign');
  const signature = await crypto.subtle.sign('HMAC', key, utf8(canonicalJson(payload)));
  return toBase64Url(new Uint8Array(signature));
}

export async function hmacVerify(keyBase64Url, payload, signatureBase64Url) {
  try {
    const key = await importHmacKey(keyBase64Url, 'verify');
    return crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signatureBase64Url),
      utf8(canonicalJson(payload))
    );
  } catch {
    return false;
  }
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}