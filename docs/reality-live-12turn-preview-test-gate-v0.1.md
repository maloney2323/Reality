# Reality — Live 12-turn construction test gate
Status: NOT RUN. The existing 12-turn result used simulated providers, not a paid live LLM or real Auth/DB receipts.

## Preview identity and current setup
- PR #87; Preview only; Base44 and Vercel production untouched.
- Isolated Supabase benchmark project: hvkfreoagbrphwghjajw. Do NOT copy secrets from the main Universe.
- Existing branch-scoped preview: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, REALITY_UNIVERSE_PERSISTENCE_URL, REALITY_STANDALONE_EXPECTED_PROJECT_REF, REALITY_UNIVERSE_PERSISTENCE_ENABLED=true, REALITY_OPENAI_MODEL=gpt-4.1-mini and REALITY_STANDALONE_CHAT_ENABLED=false.
- Separate encrypted branch-only keys REALITY_UNIVERSE_PERSISTENCE_KEY (sandbox Supabase sb_secret) and OPENAI_API_KEY remain unconfigured. Never put keys into chat, source or logs.
- Standalone readiness route: /api/reality/standalone-readiness. It reports missing variable names only, never secrets. No live claims.

## Controlled activation after owner review
1. Add a new sandbox-project-only Supabase secret in the Vercel Reality project under REALITY_UNIVERSE_PERSISTENCE_KEY, Preview target restricted to branch migration/vercel-independent-chat-proof-20261022.
2. Add a low-budget OpenAI key in the same Preview-branch-only scope as OPENAI_API_KEY; never production or generic Preview.
3. Redeploy Preview and check readiness. No model charges or customer account changes until the live toggle is intentionally enabled for that same branch.
4. Create two synthetic separate benchmark Auth users, verify server-auth identity and tenant separation; never migrate real Base44 users in this stage.
5. Once readback and model call have been verified in the sandbox, enable REALITY_STANDALONE_CHAT_ENABLED=true for only that isolated Preview branch; never enable production.

## Frozen independent evaluation
- Run a fresh 12-turn construction scenario with an original estimate approval requirement, an unresolved cabinet color, a legitimate revision, confusing paraphrases, and a late recall request.
- Do not include expected evaluator answers in the model input.
- Capture actual model IDs, original user receipts, raw/displayed answer, persistence readback, Spine checkpoints, drift origin and discovery turn, and any execution claims.
- Restart and re-auth after Turn 6; verify original user intent and ledger state survive.
- Blind independent adjudication must distinguish early catch, late catch, missed relevant drift, false positive, model self-restatement vs independently verified correction.
- Keep separate denominators for model factual errors, drift per eligible turn, consequential escapes, and detection latency. Twelve turns cannot establish long-term <5 percent drift or ROI.
- Stop on wrong-project credentials, cross-tenant data, unauthenticated access, failed readback, unapproved external effects, or exceeded budget.

All earlier 12/12 results are synthetic. Do not relabel as live pass.