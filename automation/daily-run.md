# TBG Cold Email — Daily Run (the routine follows this every morning)

You are running TBG's cold email engine for the day. Work autonomously, end to end, then post a summary.
Read `automation/rules.md` and `automation/templates.md` first and obey them exactly (especially the
**no dash** rule and the 20 new + 30 follow up = 50/day cap). You DRAFT into Gmail; you never send.
System of record is the Notion CRM "TBG — Companies / GCs (Outreach)".

Today = the current date. Daily cap = 50. Target = 20 new + 30 follow ups (if fewer follow ups are due,
add more new to reach 50; never exceed 50).

## Step 1 — Reply sweep (update the CRM from the inbox)
- Search Gmail for messages received since the last run: `in:inbox newer_than:2d`.
- For each, try to match the sender to a CRM company by email.
- Classify each match: interested / not interested / referral / auto reply / bounce / unsubscribe.
- Update Notion:
  - interested or any genuine reply: Status `Replied`, Replied `Yes`, clear `Next Touch`, add a one line
    note. Collect these for the summary so Rafael can act today.
  - bounce: Status `Dead`, note "bounced".
  - unsubscribe or "no": Status `Dead`, note "opted out", add to suppression (never contact again).

## Step 2 — Follow ups due today (build up to 30)
- Query the CRM "Due Today" view: `Next Touch <= today AND Replied = No AND Status not in (Dead, Won, Nurture) AND Touch # < 4`.
- For each (highest Tier first, up to 30):
  - Pick the next template by Sequence Step: Cold->Touch 2 (FU1), FU1->Touch 3 (FU2), FU2->Touch 4 (FU3).
  - Personalize with their project/hook from Notes. Run the no dash check. Keep it short.
  - Create a Gmail DRAFT to their email (from rafael@twinbrothersgroup.com) with the signature block.
  - Update the lead: Touch # +1, advance Sequence Step, Last Touch = today, Emails Sent +1, and set
    Next Touch = today + 4 days (FU1->FU2), +7 (FU2->FU3). If you just drafted Touch 4 (FU3), set
    Sequence Step `Done`, clear Next Touch.
- Aging out: any lead with Sequence Step `Done`, no reply, and Last Touch 3+ days ago -> Status `Nurture`.

## Step 3 — New leads (fill the remainder, target 20, highest score first)
1. Pull permit signals:
   - Seattle: run `node automation/fetch-permits.mjs 3` (JSON on stdout, already scored).
   - King County: pull recent permits from the county permit search at kingcounty.gov (web).
   - Snohomish County: pull recent permits from the SnoCo permit portal at snohomishcountywa.gov (web).
2. For the top scored projects, identify the builder / developer / GC and find a real contact email
   online (company website, BuildZoom, MBAKS or NARI member directories, LinkedIn). Prefer a named person.
3. Dedupe: skip any company already in the CRM. Skip suppressed / Dead companies.
4. Take the top ones (highest score) until you reach 20 new. If permit derived contactable builders run
   short, top up from the CRM backlog (Status `Not Contacted`, highest Tier first) and by finding more
   active WA builders online.
5. For each new lead:
   - Create a CRM row: Company, Owner / Contact, Email, Region, Tier (A if score high, else B/C),
     Notes = the permit hook, Status `Contacted`, Sequence Step `Cold`, Touch # 1, Emails Sent 1,
     Last Touch = today, Next Touch = today + 3.
   - Draft the Touch 1 cold email, naming their specific project in the first line. No dashes. Signature block.
     Create the Gmail DRAFT.

## Step 4 — Guardrails (always)
- Never exceed 50 drafts total. Never draft to a Replied / Won / Dead / suppressed company.
- One email per company per day. Max 4 touches per company, ever.
- Every email: personalized, no dashes, signature + address + opt out line.

## Step 5 — Summary (post it)
Append a dated entry to the TBG Sales HQ daily log (and/or output it) with:
- Replies overnight, and which are INTERESTED and need Rafael today (name + what they want).
- Follow ups drafted (count) and new leads drafted (count + where sourced) = total drafts.
- Leads aged out to Nurture/Dead.
- Running totals if easy: contacted, reply rate.
- End with: "X drafts are in your Gmail Drafts. Review and send."
