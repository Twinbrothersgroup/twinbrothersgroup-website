# TBG Cold Email Engine — One Time Setup (about 10 minutes)

This system runs as a **Claude Code Routine**: a saved Claude session that runs in the cloud every
morning at 8am, on your Claude subscription (no Vercel, no API key, no monthly server bill). It sources
permits, finds builders, drafts 50 emails into your Gmail, and updates your Notion CRM. You only review
the drafts and hit send.

## What you do once

1. **Connect Gmail and Notion to Claude** (so the routine can use them on its own):
   - Go to claude.ai/customize/connectors
   - Make sure **Gmail** and **Notion** are connected and authorized. Do this here first; routines inherit
     these tokens.

2. **Create the routine:**
   - Go to claude.ai/code/routines and click **New routine**.
   - Repository: select `twinbrothersgroup/twinbrothersgroup-website` (branch `claude/tv-sales-walkin-plan-rKkm4`,
     or main once merged).
   - Prompt: `Follow automation/daily-run.md`
   - Connectors: turn **ON** Gmail and Notion.
   - Trigger: **Schedule -> Daily -> 8:00 AM** (your timezone).
   - Create.

3. **Allow the permit websites** in the routine's environment network policy:
   - Allow: `data.seattle.gov`, `kingcounty.gov`, `snohomishcountywa.gov`
     (and the builder sites it will look up). Without this the permit pull is blocked.

## What happens every morning
- 8am: the routine wakes up, sweeps replies, drafts ~30 follow ups + ~20 new permit sourced emails,
  updates the Notion CRM, and posts a summary.
- You: open Gmail Drafts, skim, send.

## Knobs you can change later (in automation/rules.md)
- Daily cap and the 20/30 split.
- Counties / permit sources.
- Templates and voice (automation/templates.md).
- When you trust it, we can switch from "draft" to throttled auto send.

## Notes
- Routines are in research preview; there is a per account daily run allowance (usually fine for one run/day).
- The system drafts only. Nothing sends without you.
