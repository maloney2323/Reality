export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).setHeader('Allow', 'GET').json({ error: 'METHOD_NOT_ALLOWED' });

  return res.status(200).json({
    ok: true,
    schema: 'reality-production-attestation-v1.0',
    commit_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    commit_ref: process.env.VERCEL_GIT_COMMIT_REF || null,
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID || null,
    environment: process.env.VERCEL_ENV || null,
  });
}
