// Central config + the ramp/cap math. All tunable via env (see .env.example).
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
const list = (v, d) => (v ? v.split(',').map((s) => Number(s.trim())) : d);

export const CONFIG = {
  notionToken: process.env.NOTION_TOKEN,
  dbProjects: process.env.NOTION_DB_PROJECTS,
  dbCompanies: process.env.NOTION_DB_COMPANIES,
  settingsPage: process.env.NOTION_SETTINGS_PAGE,

  anthropicKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',

  sendFrom: process.env.SEND_FROM || 'rafael@twinbrothersframing.com',
  replyTo: process.env.REPLY_TO || 'rafael@twinbrothersgroup.com',
  alertEmail: process.env.ALERT_EMAIL || 'rafael@twinbrothersgroup.com',
  companyAddress: process.env.COMPANY_ADDRESS || '14205 SE 36th St, Suite 100, Bellevue, WA 98006',

  dailyCap: num(process.env.DAILY_CAP, 50),
  ramp: list(process.env.RAMP, [10, 20, 35, 50]),
  maxTouches: num(process.env.MAX_TOUCHES, 4),
  followupDays: list(process.env.FOLLOWUP_DAYS, [3, 7, 14]),
  bouncePause: num(process.env.BOUNCE_PAUSE, 0.04),
  complaintPause: num(process.env.COMPLAINT_PAUSE, 0.001),
  campaignStart: process.env.CAMPAIGN_START || null,

  // Business-hours send window in Pacific time (24h).
  sendWindow: { start: 9, end: 16 },
  cronSecret: process.env.CRON_SECRET,
};

// How many sends are allowed today, honoring the warm-up ramp.
export function dailyLimit(now = new Date()) {
  if (!CONFIG.campaignStart) return CONFIG.ramp[0] ?? CONFIG.dailyCap;
  const start = new Date(CONFIG.campaignStart + 'T00:00:00Z');
  const weeks = Math.max(0, Math.floor((now - start) / (7 * 864e5)));
  const ramped = CONFIG.ramp[Math.min(weeks, CONFIG.ramp.length - 1)];
  return Math.min(ramped, CONFIG.dailyCap);
}
