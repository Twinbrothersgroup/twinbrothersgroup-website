// Release queued emails (every 15 min during the PT send window). Sends a small batch
// per tick so the day's volume is spread out, then marks each row SENT.
import { authorized } from './_guard.js';
import { CONFIG } from '../lib/config.js';
import { notion, isPaused, updateLead, rowToLead } from '../lib/notion.js';
import { sendEmail } from '../lib/gmail.js';
import { inSendWindow } from '../lib/throttle.js';

const PER_TICK = 3; // ~3 every 15 min ≈ up to ~80/day ceiling; cap still enforced upstream.

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
  if (!inSendWindow()) return res.status(200).json({ skipped: 'outside send window' });
  if (await isPaused()) return res.status(200).json({ skipped: 'paused' });

  const today = new Date().toISOString().slice(0, 10);
  const q = await notion.databases.query({
    database_id: CONFIG.dbProjects,
    filter: { property: 'Visit Notes', rich_text: { starts_with: 'QUEUED' } },
    page_size: PER_TICK,
  });

  const sent = [];
  for (const page of q.results) {
    const lead = rowToLead(page);
    const notes = (page.properties['Visit Notes']?.rich_text || []).map((t) => t.plain_text).join('');
    const subject = notes.split(' | ')[1]?.split(' || ')[0]?.trim();
    const body = notes.split(' || ')[1]?.trim();
    if (!lead.email || !subject || !body) continue;
    try {
      await sendEmail({ to: lead.email, subject, body });
      await updateLead(lead.id, { notes: `SENT ${today} | ${subject}` });
      sent.push(lead.email);
    } catch (e) {
      await updateLead(lead.id, { notes: `SEND-ERROR ${today}: ${String(e).slice(0, 200)}` });
    }
  }
  return res.status(200).json({ sent: sent.length, addresses: sent });
}
