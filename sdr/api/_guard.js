// Reject any cron route call that doesn't carry the shared secret.
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when configured.
import { CONFIG } from '../lib/config.js';

export function authorized(req) {
  const hdr = req.headers['authorization'] || '';
  const q = req.query?.key;
  return (CONFIG.cronSecret && hdr === `Bearer ${CONFIG.cronSecret}`) || (q && q === CONFIG.cronSecret);
}
