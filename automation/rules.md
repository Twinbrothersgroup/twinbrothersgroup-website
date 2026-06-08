# TBG Cold Email Engine — Rules (the engine obeys these every run)

## Goal
50 emails/day, drafted into Gmail for Rafael to review and send. Mix: **20 new + 30 follow-ups**.
Follow-ups are built first; new leads fill the rest up to 50. Never exceed 50/day.

## Cadence (4 touches over 14 days, then stop)
- Touch 1, Day 0: cold email (references their specific project)
- Touch 2, Day 3: follow up, light bump
- Touch 3, Day 7: follow up, references / proof
- Touch 4, Day 14: follow up, breakup
- After Touch 4 with no reply: set Status `Nurture` (re touch in 90 days if a new permit from that company appears). If the email bounced, set `Dead`.
- Any reply: set Status `Replied`, set Replied `Yes`, clear `Next Touch` (pull them out of the sequence). Flag interested replies for Rafael.

## Lead ranking (permit leads are the hottest)
Score each candidate by: permit recency (newer is hotter) + project size (units and dollar value) +
project type (multifamily and commercial new construction outrank single family, which outranks
alterations) + whether a real decision maker email was found. The permit fetcher
(`automation/fetch-permits.mjs`) already returns a `score`; new leads go out highest score first.
Companies tied to a fresh permit always outrank generic builders with no active project.

## Lead sourcing (free hybrid, daily)
- **Permits = the hot signal + the hook.** Pull permits filed in the last ~3 days each morning:
  - Seattle: `node automation/fetch-permits.mjs 3` (structured Socrata feed).
  - King County: public permit portal / Permit Search at kingcounty.gov (web).
  - Snohomish County: SnoCo permit portal at snohomishcountywa.gov (web).
- **Permits name the project, not the builder.** For each top project, find the builder, developer,
  or GC and a real contact email online (company website, BuildZoom, MBAKS/NARI member pages, LinkedIn).
- **Backlog buffer:** keep at least ~100 scored, un contacted companies in the CRM so 20 new always go
  out. If a day's fresh permits yield fewer than 20 contactable builders, top up from the CRM backlog
  (Status `Not Contacted`, highest Tier first) and by discovering more WA builders online.
- One company = one lead (per company, not per permit). Lead with their biggest or newest project.

## Voice and style (hard rules)
- Personalize every email. In the cold email, name their specific project or permit in the first line.
- **Never use a hyphen, en dash, or em dash anywhere in subject or body.** Write "in house" not the
  hyphenated form, "full scope", "wood frame", "follow up". Phone is written 321.200.7304 (dots, no dashes).
  Before saving any draft, scan it for "-", "–", "—" and rewrite if any are found.
- Sound like a busy human wrote it fast. Short sentences. Plain words. One ask per email. No buzzwords,
  no fluff, no emojis, no attachments on the first touch.
- Subjects are lowercase.

## Deliverability and compliance
- Draft only. Rafael sends. (Protects the domain and keeps a human in the loop.)
- The TBG domain is warm (about 2 years of consistent use), so run at the full 50/day, no ramp.
- CAN SPAM: every email ends with the physical address (14205 SE 36th St, Suite 100, Bellevue WA 98006)
  and a one line opt out ("reply stop and we will leave you alone").
- Suppression: anyone who opts out, says no, or bounces never gets contacted again. Mark them `Dead`
  and skip them forever.
- Bounce watch: if many bounces show up, note it in the summary and recommend pausing new sends.

## System of record
Notion CRM "TBG — Companies / GCs (Outreach)" is the live truth. Fields used:
Company, Owner / Contact, Email, Status, Replied, Tier, Region, Notes, Emails Sent,
Last Touch (date), Next Touch (date), Touch # (number), Sequence Step (Cold/FU1/FU2/FU3/Done).
