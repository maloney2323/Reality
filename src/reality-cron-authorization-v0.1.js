import { timingSafeEqual } from 'node:crypto';

// Vercel sends Authorization: Bearer <CRON_SECRET> for configured cron
// invocations. Neither a generic bearer nor the User-Agent header confers
// authority to perform scheduled work or write a ledger.
export function isAuthorizedCron(req, secret = process.env.CRON_SECRET) {
  if (typeof secret !== 'string' || secret.length < 16) return false;
  const authorization = req?.headers?.authorization;
  if (typeof authorization !== 'string') return false;
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) return false;
  const supplied = Buffer.from(match[1], 'utf8');
  const expected = Buffer.from(secret, 'utf8');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
