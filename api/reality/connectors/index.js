import { inspectConnectorRegistry, connectorContract } from "../../../src/reality-connector-registry-v1.0.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const registry = inspectConnectorRegistry();
  return res.status(200).json({
    ok: true,
    registry: connectorContract(),
    connectors: registry.map(({ credential_present, credential_name, ...safe }) => ({
      ...safe,
      credential_present
    }))
  });
}
