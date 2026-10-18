# Reality adversarial drift and hallucination benchmark

This opt-in harness runs adversarial multi-turn conversations against an OpenAI baseline and, optionally, a Reality evaluation adapter. It is designed to measure failure onset, drift, unsupported claims, calibration, and recovery—not to reward easy single-turn answers.

## Run

Requires Node.js 20+ and an OpenAI API key with API access.

```bash
export OPENAI_API_KEY='...'
export OPENAI_EVAL_MODEL='gpt-4.1-mini' # optional
export EVAL_REPEATS=3 # optional; 1–10, default 3
npm run eval:drift
```

To compare Reality too, configure a **read-only evaluation adapter** that accepts POST JSON containing the conversation history as `input` and/or `messages` and returns a JSON object with `answer`, `text`, or `output_text`, or an OpenAI Responses-style `output` array:

```bash
export REALITY_URL='https://your-evaluation-safe-endpoint'
export REALITY_BEARER_TOKEN='...' # optional; do not commit
npm run eval:drift
```

**Do not point this at a side-effecting production route.** The runner sends `mode: "evaluation"` and `dryRun: true`, but those fields alone do not make an endpoint safe. Reality must support multi-turn history through a dedicated read-only adapter; if it doesn't, build that adapter before claiming a paired comparison.

## Adversarial coverage

The initial cases target rapid turn-1/2 drift, repeated false-premise pressure, constraint interference, self-error compounding, fabricated precision, contradictory status, correction quality, and attempts to override evidence rules. Each case has several turns; both systems receive the same sequence. Each case is repeated to expose nondeterministic failures.

## Metrics

- factual accuracy (0–4; higher is better)
- instruction fidelity (0–4; higher is better)
- uncertainty calibration (0–4; higher is better)
- drift (0–4; lower is better)
- unsupported claim count (lower is better)
- earliest failure turn
- recovery score (0–4; higher is better)
- pass rate

Results are written to `eval-results/` as JSON. The OpenAI model grades both outputs, so scores are directional—not ground truth. Review transcripts and independently adjudicate failures before asserting improvement. Keep API keys in environment/CI secret storage; never commit keys or result files containing sensitive prompts.
