/**
 * Reality Connector Registry v1.0
 *
 * Reality owns this connector layer. ChatGPT/plugin credentials are never used.
 * Providers are explicit capabilities backed by Reality-owned environment credentials.
 */
export const REALITY_CONNECTOR_REGISTRY_VERSION = "reality-connector-registry-v1.0";

const PROVIDERS = {
  github: {
    id: "github",
    label: "GitHub",
    credential: "REALITY_GITHUB_TOKEN",
    capabilities: ["read_repository","read_workflows","read_issues","write_issues","write_repository","create_pr","manage_actions"],
    adapter: "./reality-connector-github-v1.0.js"
  },
  vercel: {
    id: "vercel",
    label: "Vercel",
    credential: "REALITY_VERCEL_TOKEN",
    capabilities: ["read_projects","read_deployments","deploy","manage_project","read_runtime"],
    adapter: "./reality-connector-vercel-v1.0.js"
  },
  supabase: {
    id: "supabase",
    label: "Supabase",
    credential: "SUPABASE_SECRET_KEY",
    capabilities: ["read_persistence","write_persistence","query_universe"],
    adapter: "./reality-connector-supabase-v1.0.js"
  }
};

export function listConnectorDefinitions() {
  return Object.values(PROVIDERS).map(({ credential, ...definition }) => definition);
}

export function inspectConnectorRegistry(env = process.env) {
  return Object.values(PROVIDERS).map((provider) => {
    const configured = Boolean(env[provider.credential]);
    return {
      id: provider.id,
      label: provider.label,
      status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
      capabilities: provider.capabilities,
      credential_present: configured,
      credential_name: provider.credential,
      authority: "REALITY_OWNED",
      external_effects: provider.id === "github" || provider.id === "vercel"
    };
  });
}

export function assertConnectorCapability(providerId, capability, env = process.env) {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`CONNECTOR_NOT_REGISTERED:${providerId}`);
  if (!env[provider.credential]) throw new Error(`CONNECTOR_CREDENTIAL_MISSING:${providerId}`);
  if (!provider.capabilities.includes(capability)) {
    throw new Error(`CONNECTOR_CAPABILITY_NOT_REGISTERED:${providerId}:${capability}`);
  }
  return { provider: providerId, capability, authority: "REALITY_OWNED" };
}

export function connectorContract() {
  return {
    version: REALITY_CONNECTOR_REGISTRY_VERSION,
    owner: "Reality",
    dependency_on_chatgpt_plugins: false,
    credential_source: "Reality deployment environment",
    execution_rule: "Capability must be registered, credentialed, authorized, executed, and independently verified.",
    providers: listConnectorDefinitions()
  };
}
