import fs from 'node:fs';

function failures(path) {
  const tap = fs.readFileSync(path, 'utf8');
  const blocks = tap.match(/^not ok \d+ - [^\n]+[\s\S]*?(?=^(?:ok|not ok) \d+ - |^1\.\.)/gm) ?? [];
  return blocks.map((block) => {
    const title = block.match(/^not ok \d+ - (.+)$/m)?.[1]?.trim() ?? 'UNKNOWN_FAILURE';
    const errorSection = block.match(/^    error: \|-\n([\s\S]*?)(?=^    stack:|^  \.\.\.)/m)?.[1] ?? '';
    const stableError = errorSection
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('at '))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { title, signature: title + ' :: ' + (stableError || 'NO_ERROR_DETAILS') };
  });
}

const [basePath, prPath] = process.argv.slice(2);
if (!basePath || !prPath) {
  console.error('Usage: node scripts/compare-ci-baseline.mjs <base.tap> <pr.tap>');
  process.exit(2);
}
const base = failures(basePath);
const pr = failures(prPath);
const counts = (path) => {
  const text = fs.readFileSync(path, 'utf8');
  return {
    tests: Number(text.match(/^# tests (\d+)/m)?.[1] ?? 0),
    pass: Number(text.match(/^# pass (\d+)/m)?.[1] ?? 0),
    fail: Number(text.match(/^# fail (\d+)/m)?.[1] ?? 0),
  };
};
const baseSignatures = new Set(base.map((failure) => failure.signature));
const prSignatures = new Set(pr.map((failure) => failure.signature));
const newFailures = pr.filter((failure) => !baseSignatures.has(failure.signature));
const fixedFailures = base.filter((failure) => !prSignatures.has(failure.signature));
const summary = {
  base: counts(basePath),
  pull_request: counts(prPath),
  base_failure_signatures: base.map((failure) => failure.signature),
  pull_request_failure_signatures: pr.map((failure) => failure.signature),
  newly_introduced_failures: newFailures,
  fixed_failures: fixedFailures,
  verdict: newFailures.length === 0 ? 'NO_NEW_FAILURE_SIGNATURES' : 'NEW_FAILURES_DETECTED',
};
console.log(JSON.stringify(summary, null, 2));
fs.writeFileSync('ci-regression-comparison.json', JSON.stringify(summary, null, 2));
if (newFailures.length) process.exit(1);
