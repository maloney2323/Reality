// Reassembles the exact Base44 benchmark source without modifying its bytes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const base = 'shared/reality-core/';
const parts = [1,2,3].map(n => readFileSync(base + 'business50-corpus-part-0' + n + '.txt', 'utf8'));
const content = parts.join('');
const digest = createHash('sha256').update(content).digest('hex');
const expected = '';
if (!expected) throw new Error('EXPECTED_HASH_NOT_SET');
if (digest !== expected) throw new Error('CORPUS_HASH_MISMATCH: ' + digest);
if ((content.match(/makeCase\\('B\\d+/g) || []).length !== 50) throw new Error('CASE_COUNT_MISMATCH');
writeFileSync(base + 'business-adversarial-50-six-sector-v0.1.js', content);
console.log('Frozen corpus reassembled and verified: ' + digest);
