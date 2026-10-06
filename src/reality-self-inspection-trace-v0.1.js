import { readGitHubFile } from './reality-governed-system-access-v0.1.js';

export const SELF_INSPECTION_TRACE_VERSION = 'reality-self-inspection-trace-v0.1';

const SOURCE_CHECKS = [
  'src/reality-constitution.js',
  'src/reality-capability-gap-detector-v0.1.js',
  'src/reality-governed-cognitive-loop-v0.1.js',
  'src/reality-intelligence-orchestrator-v0.1.js',
  'src/reality-ekr-v0.2.js',
  'src/reality-governed-system-access-v0.1.js',
  'src/reality-chat-interface.js',
  'src/reality-observation-boundary-v0.1.js',
];
const TEST_CHECKS = SOURCE_CHECKS.map((path) => path.replace(/^src\//, 'test/').replace(/\.js$/, '.test.js'));

const STALE_PATTERNS = [
  { id: 'BASE44_REFERENCE', pattern: /base44/i },
  { id: 'OLD_DEPLOYMENT_REFERENCE', pattern: /dpl_[A-Za-z0-9]+/ },
  { id: 'LEGACY_ALIAS_REFERENCE', pattern: /reality-blond\.vercel\.app/i },
];

export async function runSelfInspectionTrace({ owner = 'maloney2323', repo = 'Reality', ref = 'main' } = {}) {
  const checked = [];
  const staleReferences = [];

  for (const path of [...SOURCE_CHECKS, ...TEST_CHECKS, 'REALITY_PRODUCTION_SOURCE_OF_TRUTH.md']) {
    try {
      const file = await readGitHubFile({ owner, repo, path, ref });
      checked.push({
        path,
        status: 'READ',
        sha: file.sha,
        bytes: file.content.length,
        category: path.startsWith('src/') ? 'SOURCE' : path.startsWith('test/') ? 'TEST' : 'DECLARATION',
      });
      for (const candidate of STALE_PATTERNS) {
        if (candidate.pattern.test(file.content)) {
          staleReferences.push({ ...candidate, path, status: 'OBSERVED' });
        }
      }
    } catch (error) {
      checked.push({ path, status: 'UNREADABLE', reason: error.message });
    }
  }

  const summary = {
    source_files_checked: checked.filter((x) => x.category === 'SOURCE' && x.status === 'READ').length,
    test_files_checked: checked.filter((x) => x.category === 'TEST' && x.status === 'READ').length,
    declarations_checked: checked.filter((x) => x.category === 'DECLARATION' && x.status === 'READ').length,
    unreadable: checked.filter((x) => x.status === 'UNREADABLE').length,
    stale_reference_hits: staleReferences.length,
  };

  return Object.freeze({
    trace_version: SELF_INSPECTION_TRACE_VERSION,
    observed_at: new Date().toISOString(),
    target: { provider: 'github', repository: `${owner}/${repo}`, ref },
    checks: checked,
    stale_references: staleReferences,
    summary,
    epistemic_state: 'OBSERVED_NOT_INDEPENDENTLY_VERIFIED',
    execution: 'NOT_EXECUTED',
    authority: 'READ_ONLY_INSPECTION',
  });
}
