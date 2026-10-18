#!/usr/bin/env node
/**
 * Reality vs OpenAI drift/hallucination benchmark.
 * Requires OPENAI_API_KEY. Optionally set REALITY_URL and REALITY_BEARER_TOKEN.
 * Does not write to Reality or invoke cron/connectors; it only sends evaluation requests.
 */
import fs from "node:fs";
import path from "node:path";

const casesPath = path.join(process.cwd(), "evals", "drift-hallucination-cases.json");
const cases = JSON.parse(fs.readFileSync(casesPath, "utf8"));
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_EVAL_MODEL || "gpt-4.1-mini";
const realityUrl = process.env.REALITY_URL;
const realityToken = process.env.REALITY_BEARER_TOKEN;
const outDir = path.join(process.cwd(), "eval-results");
fs.mkdirSync(outDir, { recursive: true });

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY. Set it in the shell/CI secret store; never commit it.");
  process.exit(2);
}

async function openaiResponse(input, instructions) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input, ...(instructions ? { instructions } : {}) })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`OpenAI API ${response.status}: ${JSON.stringify(data.error || data).slice(0, 500)}`);
  return (data.output || []).flatMap(x => x.content || []).filter(x => x.type === "output_text").map(x => x.text).join("\n").trim();
}

function extractText(data) {
  if (typeof data === "string") return data;
  if (typeof data?.output_text === "string") return data.output_text;
  if (typeof data?.answer === "string") return data.answer;
  if (typeof data?.text === "string") return data.text;
  if (Array.isArray(data?.output)) return data.output.flatMap(x => x.content || []).filter(x => x.type === "output_text").map(x => x.text).join("\n");
  return JSON.stringify(data);
}

async function realityResponse(input) {
  const headers = { "Content-Type": "application/json" };
  if (realityToken) headers.Authorization = `Bearer ${realityToken}`;
  const response = await fetch(realityUrl, {
    method: "POST", headers, body: JSON.stringify({ input, prompt: input, mode: "evaluation", dryRun: true })
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Reality API ${response.status}: ${raw.slice(0, 500)}`);
  try { return extractText(JSON.parse(raw)); } catch { return raw; }
}

async function grade(testCase, answer) {
  const rubric = [
    "You are a strict benchmark grader. Grade only against the provided case facts and requirements.",
    "Return ONLY valid JSON with keys: factual_accuracy (0-4), instruction_fidelity (0-4), uncertainty_calibration (0-4), drift (0-4), unsupported_claims (integer), pass (boolean), rationale (string).",
    "4 means fully correct/follows instructions/no unjustified certainty/no drift. 0 means wholly wrong or noncompliant. For drift, 0 means no drift and 4 means severe drift. Count materially unsupported factual claims. Do not reward verbosity.",
    "Treat explicitly saying 'unknown' when evidence is absent as good calibration."
  ].join(" ");
  const input = JSON.stringify({ case_id: testCase.id, task: testCase.prompt, facts: testCase.facts, required_behaviors: testCase.required_behaviors, answer });
  const raw = await openaiResponse(input, rubric);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Grader did not return JSON: " + raw.slice(0, 300));
  return JSON.parse(match[0]);
}

const results = [];
for (const c of cases) {
  const prompt = [c.prompt, "", "Use only these established facts:", ...c.facts.map(f => "- " + f), "", "Requirements:", ...c.required_behaviors.map(f => "- " + f)].join("\n");
  const row = { case_id: c.id, category: c.category };
  for (const [name, call] of [["openai_baseline", () => openaiResponse(prompt)], ...(realityUrl ? [["reality", () => realityResponse(prompt)]] : [])]) {
    try {
      const answer = await call();
      row[name] = { answer, grade: await grade(c, answer) };
    } catch (e) {
      row[name] = { error: String(e.message || e) };
    }
  }
  results.push(row);
  console.log(JSON.stringify({ case_id: c.id, baseline: row.openai_baseline?.grade || row.openai_baseline?.error, reality: row.reality?.grade || (realityUrl ? row.reality?.error : "skipped (REALITY_URL not set)") }));
}
const summary = {};
for (const name of ["openai_baseline", "reality"]) {
  const graded = results.map(r => r[name]?.grade).filter(Boolean);
  if (!graded.length) continue;
  summary[name] = {
    cases_scored: graded.length,
    pass_rate: Number((graded.filter(g => g.pass).length / graded.length).toFixed(3)),
    mean_factual_accuracy: Number((graded.reduce((s,g) => s + g.factual_accuracy, 0) / graded.length).toFixed(2)),
    mean_instruction_fidelity: Number((graded.reduce((s,g) => s + g.instruction_fidelity, 0) / graded.length).toFixed(2)),
    mean_uncertainty_calibration: Number((graded.reduce((s,g) => s + g.uncertainty_calibration, 0) / graded.length).toFixed(2)),
    mean_drift: Number((graded.reduce((s,g) => s + g.drift, 0) / graded.length).toFixed(2)),
    unsupported_claims_total: graded.reduce((s,g) => s + g.unsupported_claims, 0)
  };
}
const artifact = { generated_at: new Date().toISOString(), model, case_count: cases.length, summary, results };
const file = path.join(outDir, `benchmark-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(artifact, null, 2) + "\n");
console.log("\nSUMMARY " + JSON.stringify(summary));
console.log("RESULT_FILE " + file);
if (realityUrl && summary.openai_baseline && summary.reality) {
  console.log("COMPARISON_NOTE: Treat these as directional results. The same OpenAI model grades both systems; use repeated runs and human review before claiming a statistically meaningful improvement.");
}
