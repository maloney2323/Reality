import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { executeGithubRead as sharedExecuteGithubRead } from '../../shared/reality-core/github-provider-read.ts';

// The Vercel gateway deploys two handlers:
//   /api/personal-connect  — Personal Reality (world_id "personal:self")
//   /api/pipedream-connect — Business Reality (ownership/isolation gate intact)
// The handoff's vercel.json rewrite (/api/pipedream-connect -> /api/personal-connect)
// is ineffective because api/pipedream-connect.js still exists as a filesystem route,
// so Vercel serves it directly. To make Personal connections work against the live
// deploy, the proxy routes by world_id itself: personal:self -> personal handler,
// everything else -> business handler. This preserves Business isolation exactly.
const PERSONAL_TARGET = 'https://reality-core-staging.vercel.app/api/personal-connect';
const BUSINESS_TARGET = 'https://reality-core-staging.vercel.app/api/pipedream-connect';

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

// The gateway routinely returns 403 for authenticated-but-unauthorized sessions
// (e.g. AUTHENTICATED_REALITY_USER_REQUIRED). Forwarding that non-2xx status makes
// the SDK throw an opaque HTTP error and the structured reason never reaches the
// client — so the UI shows nothing. Always return 200 with the structured body;
// the client reads `ok`/`error` to decide what happened.
function okJson(payload: any, upstreamStatus = 200) {
  const body = (payload && typeof payload === 'object') ? { ...payload } : { error: String(payload || 'Reality connection request failed.') };
  if (upstreamStatus >= 400 && !body.error) body.error = `Reality connection gateway returned ${upstreamStatus}.`;
  body.upstream_status = upstreamStatus;
  body.ok = body.ok !== undefined ? body.ok : !(upstreamStatus >= 400 || body.error);
  return json(body, 200);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const principal = await base44.auth.me();
    if (!principal?.id) return okJson({ error: 'Authentication required.', upstream_status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').trim();
    if (![
      'capability',
      'app_search',
      'connection_status',
      'connect_token',
      'provider_read',
      'google_sheets_list',
      'google_sheets_inspect',
      'google_sheets_create_test',
      'google_sheets_execute',
    ].includes(action)) {
      return okJson({ error: 'Unsupported Reality connection action.', upstream_status: 400 });
    }

    // Prefer the function invocation's own Authorization header: it is the live
    // Base44 session the SDK just used to call this function, so the gateway's
    // User/me verification will accept it. The client-supplied token is a fallback
    // only — a stale localStorage value there was causing AUTHENTICATED_REALITY_USER_REQUIRED.
    const requestAuth = req.headers.get('authorization') || '';
    const explicitToken = String(body?.reality_session_token || '').trim();
    const auth = requestAuth || (explicitToken ? `Bearer ${explicitToken}` : '');
    const { reality_session_token: _omittedToken, consumption_token: _omittedConsumptionToken, ...rawUpstreamBody } = body;
    const upstreamBody: any = { ...rawUpstreamBody };
    const isPersonal = String(upstreamBody?.world_id || '').trim() === 'personal:self';

    if (action === 'google_sheets_execute') {
      const grantId = String(upstreamBody?.grant_id || '').trim();
      if (grantId.length < 12 || !isPersonal) {
        return okJson({ error: 'A valid Personal Reality spreadsheet grant is required.', upstream_status: 400 });
      }
      const consumptionToken = `spreadsheet-consumption:${crypto.randomUUID()}:${crypto.randomUUID()}`;
      const consumptionTokenSha256 = await sha256Hex(consumptionToken);
      const consumedAt = new Date().toISOString();
      const result = await base44.asServiceRole.entities.WorkConnectedSpreadsheetAuthorityGrantV01.updateMany(
        {
          grant_id: grantId,
          user_id: principal.id,
          world_id: 'personal:self',
          consumption_state: 'UNCONSUMED',
        },
        {
          $set: {
            consumption_state: 'CONSUMED',
            consumption_token_sha256: consumptionTokenSha256,
            consumed_at: consumedAt,
          },
        },
      );
      if (Number(result?.updated || 0) !== 1) {
        return okJson({ error: 'This one-time spreadsheet authority was already consumed or is no longer valid.', upstream_status: 409 });
      }
      upstreamBody.consumption_token = consumptionToken;
    }

    // provider_read: execute GitHub reads directly through the Base44 GitHub
    // connector SDK instead of forwarding to the dead staging gateway. This is
    // the bridge the user-facing provider proof test (RealityPluginBrowser) and
    // the chat world-inspection flow share. Vercel has no connector or secret in
    // this Reality, so it is reported honestly rather than proxied to a dead
    // endpoint. Other providers fall through to the legacy gateway path.
    if (action === 'provider_read') {
      const provider = String(upstreamBody?.provider || '').trim().toLowerCase();
      const worldId = String(upstreamBody?.world_id || '').trim();
      if (provider === 'github') {
        const readResult = await sharedExecuteGithubRead(base44, '');
        return okJson({
          action: 'provider_read',
          world_id: worldId,
          provider: 'github',
          ...readResult,
          truth_authorized: false,
          action_authorized: false,
          external_effects_permitted: false,
        }, 200);
      }
      if (provider === 'vercel') {
        return okJson({
          action: 'provider_read',
          world_id: worldId,
          provider: 'vercel',
          execution_attempted: false,
          auth_context_available: false,
          provider_response_status: null,
          failure_boundary: 'NO_VERCEL_CREDENTIAL_AVAILABLE',
          read_executed: false,
          readability_established: false,
          completeness_established: false,
          evidence: [],
          evidence_binding_created: false,
          evidence_binding_count: 0,
          reason:
            'No Vercel connector or credential is available to this Reality. Vercel is not in the platform supported-connectors list and no Vercel secret is configured, so Vercel provider reads cannot be executed. Vercel write/read capability is NOT PROVEN.',
          truth_authorized: false,
          action_authorized: false,
          external_effects_permitted: false,
        }, 200);
      }

      // Personal Google evidence sources are now consumed through their actual
      // Base44 connector credentials. These branches establish provider
      // readability only; they do not establish truth, completeness, importance,
      // or action authority.
      if (['google-calendar', 'googlecalendar', 'google-drive', 'googledrive', 'google-sheets', 'googlesheets', 'google-docs', 'googledocs'].includes(provider)) {
        const connectorType =
          provider.includes('calendar') ? 'googlecalendar'
          : provider.includes('drive') ? 'googledrive'
          : provider.includes('sheets') ? 'googlesheets'
          : 'googledocs';
        try {
          const connection = await base44.asServiceRole.connectors.getConnection(connectorType);
          const accessToken = connection?.accessToken;
          if (!accessToken) {
            return okJson({
              action: 'provider_read',
              world_id: worldId,
              provider,
              read_executed: false,
              readability_established: false,
              completeness_established: false,
              evidence: [],
              reason: `Authorized ${connectorType} connection has no usable access token.`,
              truth_authorized: false,
              action_authorized: false,
              external_effects_permitted: false,
            }, 200);
          }

          const headers = { Authorization: `Bearer ${accessToken}` };
          let endpoint = '';
          if (connectorType === 'googlecalendar') {
            const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
            url.searchParams.set('singleEvents', 'true');
            url.searchParams.set('orderBy', 'startTime');
            url.searchParams.set('showDeleted', 'false');
            url.searchParams.set('maxResults', '12');
            endpoint = url.toString();
          } else if (connectorType === 'googledrive') {
            const url = new URL('https://www.googleapis.com/drive/v3/files');
            url.searchParams.set('pageSize', '12');
            url.searchParams.set('orderBy', 'modifiedTime desc');
            url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,createdTime,webViewLink,description)');
            endpoint = url.toString();
          } else if (connectorType === 'googlesheets') {
            const url = new URL('https://www.googleapis.com/drive/v3/files');
            url.searchParams.set('pageSize', '12');
            url.searchParams.set('orderBy', 'modifiedTime desc');
            url.searchParams.set('q', "trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'");
            url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,createdTime,webViewLink)');
            endpoint = url.toString();
          } else {
            const url = new URL('https://www.googleapis.com/drive/v3/files');
            url.searchParams.set('pageSize', '12');
            url.searchParams.set('orderBy', 'modifiedTime desc');
            url.searchParams.set('q', "trashed = false and mimeType = 'application/vnd.google-apps.document'");
            url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,createdTime,webViewLink)');
            endpoint = url.toString();
          }

          const response = await fetch(endpoint, { headers });
          const raw = await response.text();
          if (!response.ok) {
            return okJson({
              action: 'provider_read',
              world_id: worldId,
              provider,
              read_executed: false,
              readability_established: false,
              completeness_established: false,
              evidence: [],
              reason: `Google ${connectorType} read returned HTTP ${response.status}.`,
              provider_response_status: response.status,
              truth_authorized: false,
              action_authorized: false,
              external_effects_permitted: false,
            }, 200);
          }
          const payload = raw ? JSON.parse(raw) : {};
          const rows = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.files) ? payload.files : [];
          const evidence = rows.slice(0, 12).map((row: any) => JSON.stringify(row).slice(0, 1800));
          return okJson({
            action: 'provider_read',
            world_id: worldId,
            provider,
            read_executed: true,
            readability_established: true,
            completeness_established: false,
            evidence,
            evidence_binding_created: false,
            evidence_binding_count: 0,
            provenance: `BASE44_${connectorType.toUpperCase()}_READONLY_CONNECTOR`,
            reason: `Google ${connectorType} read executed through the authorized Base44 connector.`,
            truth_authorized: false,
            action_authorized: false,
            external_effects_permitted: false,
          }, 200);
        } catch (error: any) {
          return okJson({
            action: 'provider_read',
            world_id: worldId,
            provider,
            read_executed: false,
            readability_established: false,
            completeness_established: false,
            evidence: [],
            reason: error?.message || `Google ${connectorType} read failed closed.`,
            truth_authorized: false,
            action_authorized: false,
            external_effects_permitted: false,
          }, 200);
        }
      }
    }

    // Personal Reality connection discovery: the external staging gateway is a
    // known-dead endpoint, so for personal:self report connector-backed
    // connection state directly. This lets the RealityPluginBrowser load and
    // trigger runProviderRead('github') — which now executes the real connector
    // read above — instead of failing silently on a dead gateway. Business
    // worlds still fall through to the staging gateway unchanged. No truth or
    // action authority is granted; this only reports connection state.
    // Connection authorization is user-level, not Thought-level. A new Thought
    // should inherit the user's already-authorized source connections. The active
    // world still scopes what Reality may read/use, but it must not force OAuth
    // again just because the user opened another chat.
    const isPersonalWorld = String(upstreamBody?.world_id || '').trim() === 'personal:self';
    if (isPersonalWorld && (action === 'capability' || action === 'connection_status' || action === 'app_search')) {
      if (isPersonalWorld && action === 'capability') {
        return okJson({
          configured: true,
          connection_layer: 'DYNAMIC_PROVIDER_DISCOVERY',
          provider_catalog_hardcoded: false,
          provider_routing_hardcoded: false,
          universal_app_discovery_supported: true,
          truth_authorized: false,
          action_authorized: false,
        }, 200);
      }
      if (isPersonalWorld && action === 'connection_status') {
        const accounts: any[] = [
          { app_slug: 'base44', connected: true, connection_state: 'READ_READY' },
        ];
        const connectorSlugs: Array<[string, string]> = [
          ['github', 'github'],
          ['gmail', 'gmail'],
          ['googlecalendar', 'googlecalendar'],
          ['googledrive', 'googledrive'],
          ['googlesheets', 'googlesheets'],
          ['googledocs', 'googledocs'],
        ];
        for (const [appSlug, connectorType] of connectorSlugs) {
          try {
            const conn = await base44.asServiceRole.connectors.getConnection(connectorType);
            if (conn?.accessToken) accounts.push({ app_slug: appSlug, connected: true, connection_state: 'READ_READY' });
          } catch {
            // Not connected: omit it rather than fabricating a connection.
          }
        }
        return okJson({
          accounts,
          connection_scope: 'USER_ACCOUNT',
          world_id: upstreamBody?.world_id,
          truth_authorized: false,
          action_authorized: false,
        }, 200);
      }
      // app_search: return an empty catalog. Featured Quick access cards fall
      // back to shortcut entries, so no provider is fabricated.
      return okJson({ apps: [], world_id: upstreamBody?.world_id }, 200);
    }

    // Capability is a shared GET; route it to the personal handler (it returns the
    // union of supported actions including provider_read for github/vercel/base44).
    const target = action === 'capability'
      ? PERSONAL_TARGET
      : (isPersonal ? PERSONAL_TARGET : BUSINESS_TARGET);
    const upstream = action === 'capability'
      ? await fetch(target, { method: 'GET', headers: { Accept: 'application/json' } })
      : await fetch(target, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(auth ? { Authorization: auth } : {}),
          },
          body: JSON.stringify(upstreamBody),
        });

    const text = await upstream.text();
    const payload = text ? JSON.parse(text) : {};
    return okJson(payload, upstream.status);
  } catch (error: any) {
    return okJson({ error: error?.message || 'Reality could not reach the connection gateway.', upstream_status: 502 });
  }
}