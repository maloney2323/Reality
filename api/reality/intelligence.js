// Compatibility route for the original Reality homepage.
// All public cognition must traverse the SAME authenticated, proposal-only,
// final-publication-gated boundary as /api/chat. The previous route minted an
// anonymous session, accepted body authorization for self-build, and bypassed
// the final outbound evidence gate. None of those are safe fallbacks.
//
// Historic conversation/connected-world reads may be reintroduced only behind
// an authenticated server-owned evidence admission service. This endpoint
// never trusts arbitrary systemContext, personal history or approval payloads.
import governedChatHandler from '../chat.js';

export const maxDuration = 60;

export default async function handler(req, res) {
  return governedChatHandler(req, res);
}
