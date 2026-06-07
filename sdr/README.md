# TBG SDR — automated cold-outreach engine

The "live agents" behind **TBG Sales HQ** (Notion). Runs on **Vercel Cron**: every morning it
drafts personalized cold emails + due follow-ups from the Notion CRM, sends them throttled through
a look-alike domain, reads replies, and auto-pauses if deliverability dips.

> ⚠️ **Before you add secrets, move this folder to its own PRIVATE repo.** The code here holds no
> secrets or leads (everything comes from env vars + Notion at runtime), but the deployment should
> be private. This scaffold is the implementation of `Phase 1 Build Spec` in Notion.

## What runs (Vercel cron → API routes)
| Route | Schedule (UTC) | Job |
| --- | --- | --- |
| `/api/plan-day` | `0 15 * * 1-5` (8am PT, Mon–Fri) | Build today's send queue: follow-ups first, then new leads up to the ramped cap; Claude drafts each. |
| `/api/tick` | `*/15 16-23 * * 1-5` (9am–4pm PT) | Release queued emails whose send-time has arrived (throttled + jittered). |
| `/api/scan-replies` | `0 * * * *` (hourly) | Read inbox, classify replies with Claude, advance stage, suppress opt-outs/bounces, alert on interest. |
| `/api/health` | `30 23 * * *` | Compute bounce/complaint rate; pause sending if over threshold. |
| `/api/weekly-report` | `0 15 * * 1` | Post last week's stats to Notion. |

Every route is protected by `CRON_SECRET` (see `api/_guard.js`).

## Setup
1. `npm install`
2. Copy `.env.example` → set env vars in Vercel project settings.
3. Create a Notion internal integration; share both databases with it; put IDs in env.
4. Set up the look-alike domain + Google Workspace mailbox; create an OAuth client; get a refresh token with `gmail.send` + `gmail.readonly` scopes.
5. Deploy to Vercel (Pro, for reliable cron). Cron schedules are in `vercel.json`.

## Safety
- Warm-up ramp + daily cap in `lib/config.js`.
- Auto-pause kill-switch in `/api/health` (writes a `PAUSED` flag the planner checks).
- CAN-SPAM footer + suppression list enforced in `lib/gmail.js` / `lib/notion.js`.
- One touch per company; max 4 touches over 14 days.

See `Outreach Operating System (Rules & Throughput)` in Notion for the governing rules.
