// Daily kill-switch: if bounce rate exceeds threshold, pause sending and alert.
import { authorized } from './_guard.js';
import { CONFIG } from '../lib/config.js';
import { setPaused } from '../lib/notion.js';
import { bounceRate, sendEmail } from '../lib/gmail.js';

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
  const rate = await bounceRate('newer_than:7d');
  const overBounce = rate > CONFIG.bouncePause;

  if (overBounce) {
    await setPaused(true);
    await sendEmail({
      to: CONFIG.alertEmail,
      subject: '⛔ TBG outreach PAUSED — bounce rate high',
      body: `Bounce rate over the last 7 days is ${(rate * 100).toFixed(1)}% (threshold ${(CONFIG.bouncePause * 100).toFixed(1)}%). Sending is paused. Clean the list, then un-pause in Notion.`,
    });
  }
  return res.status(200).json({ bounceRate: rate, paused: overBounce });
}
