// Monday 8am: tally the week and email a "what's working" summary to Rafael.
import { authorized } from './_guard.js';
import { CONFIG } from '../lib/config.js';
import { notion } from '../lib/notion.js';
import { sendEmail } from '../lib/gmail.js';

async function countByStage() {
  const counts = {};
  let cursor;
  do {
    const r = await notion.databases.query({
      database_id: CONFIG.dbProjects,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const p of r.results) {
      const s = p.properties['Stage']?.select?.name || 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    }
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return counts;
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
  const counts = await countByStage();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const replied = counts['Replied'] || 0;
  const contacted = (counts['Contacted'] || 0) + (counts['Follow-up 1'] || 0) + (counts['Follow-up 2'] || 0) + (counts['Follow-up 3'] || 0) + replied + (counts['Bidding'] || 0);
  const replyRate = contacted ? ((replied / contacted) * 100).toFixed(1) : '0';

  const body =
    `TBG weekly outreach report\n\n` +
    `Total leads: ${total}\nContacted: ${contacted}\nReplied: ${replied} (reply rate ${replyRate}%)\n\n` +
    `By stage:\n` + Object.entries(counts).map(([k, v]) => `  ${k}: ${v}`).join('\n');

  await sendEmail({ to: CONFIG.alertEmail, subject: '📊 TBG outreach — weekly report', body });
  return res.status(200).json({ total, contacted, replied, replyRate, counts });
}
