export default function handler(req, res) {
  res.status(200).json({
    proof: "REALITY-WORLDLINE-PROOF-V0.1",
    runtime_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    runtime_deployment_id: process.env.VERCEL_DEPLOYMENT_ID || null,
    observed_at: new Date().toISOString(),
  });
}
