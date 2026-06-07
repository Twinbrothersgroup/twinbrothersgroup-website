// Hourly: read recent inbound mail, classify with Claude, advance the matching lead's
// stage, suppress opt-outs/bounces, and alert Rafael on anything interested.
import { authorized } from './_guard.js';
import { CONFIG } from '../lib/config.js';
import { notion, updateLead, rowToLead } from '../lib/notion.js';
import { listReplies, sendEmail } from '../lib/gmail.js';
import { classifyReply } from '../lib/anthropic.js';

function header(msg, name) {
  return (msg.payload?.headers || []).find((h) => h.name.toLowerCase() === name)?.value || '';
}
function bodyText(msg) {
  const parts = msg.payload?.parts || [];
  const part = parts.find((p) => p.mimeType === 'text/plain') || msg.payload;
  const data = part?.body?.data;
  return data ? Buffer.from(data, 'base64').toString('utf8') : msg.snippet || '';
}
async function findLeadByEmail(email) {
  const r = await notion.databases.query({
    database_id: CONFIG.dbProjects,
    filter: { property: 'Email', email: { equals: email } },
    page_size: 1,
  });
  return r.results[0] ? rowToLead(r.results[0]) : null;
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
  const msgs = await listReplies('newer_than:2d -from:me -in:sent');
  const handled = [];

  for (const msg of msgs) {
    const from = header(msg, 'from');
    const email = (from.match(/<(.+?)>/)?.[1] || from).trim().toLowerCase();
    const lead = await findLeadByEmail(email);
    if (!lead) continue;
    const cls = await classifyReply(`Subject: ${header(msg, 'subject')}\n\n${bodyText(msg)}`);
    if (!cls) continue;

    await updateLead(lead.id, {
      stage: cls.next_stage || 'Replied',
      notes: `REPLY (${cls.label}) ${new Date().toISOString().slice(0, 10)}: ${cls.suggested_reply || ''}`,
      nextDate: null, // stop the sequence
    });

    if (cls.label === 'interested') {
      await sendEmail({
        to: CONFIG.alertEmail,
        subject: `🔥 Interested reply: ${lead.company}`,
        body: `${lead.company} (${email}) replied INTERESTED.\n\nSuggested reply: ${cls.suggested_reply}\n\nOpen Notion to act.`,
      });
    }
    handled.push({ email, label: cls.label });
  }
  return res.status(200).json({ handled });
}
