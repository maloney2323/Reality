import fs from 'node:fs';

function stableErrorFromBlock(block) {
  // Node's TAP reporter emits either a scalar (error: 'MESSAGE') or a
  // YAML block (error: |- followed by indented assertion details).
  const inline = block.match(/^  error: (.+)$/m)?.[1]?.trim();
  if (inline && inline !== 'test failed' && inline !== '~') {
    const unquoted = inline
      .replace(/^'(.*)'$/s, '$1')
      .replace(/^"(.*)"$/s, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    if (unquoted && unquoted !== '|-' && unquoted !== '|') return unquoted;
  }

  const blockMatch = block.match(/^  error: \|-?\n([\s\S]*?)(?=^  (?:stack|code|failureType|exitCode|signal):|^  \.\.\.)/m);
  if (blockMatch) {
    const detail = blockMatch[1]
      .split('\n')
      .map((line) => line.replace(/^    /, '').trim())
      .filter(Boolean)
      .filter((line) => !/^at \S/.test(line))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (detail) return detail;
  }

  // File-level failures often only say "test failed"; retain that explicitly
  // rather than pretending we recovered the underlying assertion.
  if (inline) return inline.replace(/^'(.*)'$/s, '$1').replace(/^"(.*)"$/s, '$1');
  return 'ERROR_DETAILS_UNAVAILABLE';
}

function failures(path) {
  const tap = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const blocks = tap.match(/^not ok \d+ - [^\n]+[\s\S]*?(?=^(?:ok|not ok) \d+ - |^1\.\.)/gm) ?? [];
  return blocks.map((block) => {
    const title = block.match(/^not ok \d+ - (.+)$/m)?.[1]?.trim() ?? 'UNKNOWN_FAILURE';
    const error = stableErrorFromBlock(block);
    return { title, error, signature: title + ' :: ' + error };
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
  const content = fs.readFileSync(path, 'utf8');
  return {
    tests: Number(content.match(/^# tests (\d+)/m)?.[1] ?? 0),
    pass: Number(content.match(/^# pass (\d+)/m)?.[1] ?? 0),
    fail: Number(content.match(/^# fail (\d+)/m)?.[1] ?? 0),
  };
};
const baseSignatures = new Set(base.map((failure) => failure.signature));
const prSignatures = new Set(pr.map((failure) => failure.signature));
const newFailures = pr.filter((failure) => !baseSignatures.has(failure.signature));
const fixedFailures = base.filter((failure) => !prSignatures.has(failure.signature));
const summary = {
  base: counts(basePath),
  pull_request: counts(prPath),
  base_failure_signatures: base,
  pull_request_failure_signatures: pr,
  newly_introduced_failures: newFailures,
  fixed_failures: fixedFailures,
  error_details_unavailable_count: [...base, ...pr].filter((failure) => failure.error === 'ERROR_DETAILS_UNAVAILABLE').length,
  verdict: newFailures.length === 0 ? 'NO_NEW_FAILURE_SIGNATURES' : 'NEW_FAILURES_DETECTED',
};
console.log(JSON.stringify(summary, null, 2));
fs.writeFileSync('ci-regression-comparison.json', JSON.stringify(summary, null, 2));
if (newFailures.length) process.exit(1);
