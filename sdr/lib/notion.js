// Notion CRM access: read the queue, write status. Notion is the system of record.
import { Client } from '@notionhq/client';
import { CONFIG } from './config.js';

const notion = new Client({ auth: CONFIG.notionToken });

const txt = (s) => (s ? [{ text: { content: String(s).slice(0, 1990) } }] : []);
const readText = (p) => (p?.rich_text || p?.title || []).map((t) => t.plain_text).join('');
const readSelect = (p) => p?.select?.name || '';

// Map a Notion page row → plain lead object the agents use.
export function rowToLead(page) {
  const p = page.properties;
  return {
    id: page.id,
    company: readText(p['Project']) || readText(p['Company']),
    gc: readText(p['GC / Contractor']),
    email: p['Email']?.email || '',
    stage: readSelect(p['Stage']),
    contacted: readSelect(p['GC Contacted?']),
    units: p['Units']?.number || 0,
    value: p['Value']?.number || 0,
    region: readSelect(p['Region']),
    hook: readText(p['Project / Hook']) || readText(p['Type']),
    jobSite: readText(p['Project']),
    lastTouch: p['Last Touch']?.date?.start || null,
    nextTouchDate: p['Next Action Date']?.date?.start || null,
    touchNo: p['Touch #']?.number || 0,
  };
}

// Leads that have never been contacted, highest value first (the cold queue).
export async function getColdQueue(limit) {
  const res = await notion.databases.query({
    database_id: CONFIG.dbProjects,
    filter: { property: 'GC Contacted?', select: { equals: 'No' } },
    sorts: [{ property: 'Value', direction: 'descending' }],
    page_size: limit,
  });
  return res.results.map(rowToLead).filter((l) => l.email);
}

// Leads whose next follow-up is due on/before `dateISO` and still in sequence.
export async function getFollowupsDue(dateISO) {
  const res = await notion.databases.query({
    database_id: CONFIG.dbProjects,
    filter: {
      and: [
        { property: 'Next Action Date', date: { on_or_before: dateISO } },
        { property: 'Stage', select: { does_not_equal: 'Replied' } },
        { property: 'Stage', select: { does_not_equal: 'Dead' } },
      ],
    },
  });
  return res.results.map(rowToLead).filter((l) => l.email && l.touchNo < CONFIG.maxTouches);
}

export async function updateLead(id, { stage, contacted, touchNo, lastTouch, nextDate, notes }) {
  const properties = {};
  if (stage) properties['Stage'] = { select: { name: stage } };
  if (contacted) properties['GC Contacted?'] = { select: { name: contacted } };
  if (typeof touchNo === 'number') properties['Touch #'] = { number: touchNo };
  if (lastTouch) properties['Last Touch'] = { date: { start: lastTouch } };
  if (nextDate !== undefined) properties['Next Action Date'] = nextDate ? { date: { start: nextDate } } : { date: null };
  if (notes) properties['Visit Notes'] = { rich_text: txt(notes) };
  await notion.pages.update({ page_id: id, properties });
}

// Simple PAUSED kill-switch flag stored on a settings page property.
export async function isPaused() {
  if (!CONFIG.settingsPage) return false;
  const pg = await notion.pages.retrieve({ page_id: CONFIG.settingsPage });
  return !!pg.properties?.['Paused']?.checkbox;
}
export async function setPaused(v) {
  if (!CONFIG.settingsPage) return;
  await notion.pages.update({ page_id: CONFIG.settingsPage, properties: { Paused: { checkbox: !!v } } });
}

export { notion };
