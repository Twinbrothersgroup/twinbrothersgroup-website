// Daily planner (8am PT). Builds today's send plan: follow-ups first, then new leads
// up to the ramped cap; Claude drafts each; results are written back to Notion as the
// day's queue (Stage advanced + Next Action Date set). /api/tick then releases them.
import { authorized } from './_guard.js';
import { CONFIG, dailyLimit } from '../lib/config.js';
import { getColdQueue, getFollowupsDue, updateLead, isPaused } from '../lib/notion.js';
import { draftColdEmail, draftFollowup } from '../lib/anthropic.js';

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
  if (await isPaused()) return res.status(200).json({ skipped: 'paused' });

  const today = new Date().toISOString().slice(0, 10);
  const cap = dailyLimit();
  const planned = [];

  // 1) Follow-ups due today (priority).
  const followups = await getFollowupsDue(today);
  for (const lead of followups.slice(0, cap)) {
    const touchN = (lead.touchNo || 1) + 1;
    const draft = await draftFollowup(lead, touchN);
    if (!draft) continue;
    planned.push({ lead, draft, touchN, type: 'followup' });
  }

  // 2) Fill remaining budget with brand-new leads (one per company assumed upstream).
  const remaining = Math.max(0, cap - planned.length);
  if (remaining > 0) {
    const cold = await getColdQueue(remaining);
    for (const lead of cold) {
      const draft = await draftColdEmail(lead);
      if (!draft) continue;
      planned.push({ lead, draft, touchN: 1, type: 'cold' });
    }
  }

  // 3) Persist the plan to Notion (the queue tick will send). Store draft in Visit Notes.
  for (const p of planned) {
    const nextDays = CONFIG.followupDays[Math.min(p.touchN - 1, CONFIG.followupDays.length - 1)] || 7;
    const nextDate = new Date(Date.now() + nextDays * 864e5).toISOString().slice(0, 10);
    await updateLead(p.lead.id, {
      stage: p.type === 'cold' ? 'Contacted' : `Follow-up ${p.touchN - 1}`,
      contacted: 'Yes',
      touchNo: p.touchN,
      lastTouch: today,
      nextDate,
      notes: `QUEUED ${today} | ${p.draft.subject} || ${p.draft.body}`,
    });
  }

  return res.status(200).json({ cap, planned: planned.length, followups: followups.length });
}
