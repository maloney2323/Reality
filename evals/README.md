# Reality drift and hallucination benchmark

This is an opt-in, read-only comparison harness. It does not deploy code, trigger cron jobs, mutate Reality state, or call downstream connectors.

## Run

Requires Node.js 20+ and an OpenAI API key with API access.

```bash
export OPENAI_API_KEY='...'
export OPENAI_EVAL_MODEL='gpt-4.1-mini' # optional
npm run eval:drift
```

To compare Reality too, configure an evaluation-safe endpoint that accepts POST JSON containing `input` (also sent as `prompt`) and returns a JSON object with `answer`, `text`, or `output_text`, or an OpenAI Responses-style `output` array:

```bash
export REALITY_URL='https://your-evaluation-safe-endpoint'
export REALITY_BEARER_TOKEN='...' # optional; do not commit
npm run eval:drift
```

**Do not point this at a side-effecting production route.** Use a read-only evaluation adapter. The runner sends `mode: "evaluation"` and `dryRun: true`, but those fields alone do not make an endpoint safe.

## Metrics

- factual accuracy (0–4; higher is better)
- instruction fidelity (0–4; higher is better)
- uncertainty calibration (0–4; higher is better)
- drift (0–4; lower is better)
- unsupported claim count (lower is better)
- pass rate

Results are written to `eval-results/` as JSON. The OpenAI model grades both outputs, so scores are directional—not ground truth. Review failures and repeat runs before asserting improvements. Keep API keys in environment/CI secret storage; never commit keys or result files containing sensitive prompts.
