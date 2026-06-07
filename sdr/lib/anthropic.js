// The agents' brain: Claude calls for drafting + reply classification.
import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from './config.js';

const client = new Anthropic({ apiKey: CONFIG.anthropicKey });

async function ask(system, user, maxTokens = 700) {
  const msg = await client.messages.create({
    model: CONFIG.model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
}

const COPYWRITER = `You write cold framing-subcontractor emails for Twin Brothers Group (Bellevue, WA) in Rafael Cabrera's voice.
Rules: lowercase subject line; name the recipient's specific project in the first sentence; ONE ask (get on the bid list / who handles framing bids); mention in-house crews + full material takeoff with every bid; <=120 words; no attachments; plain and human.
Always end with the signature block and a CAN-SPAM footer line.
Return STRICT JSON: {"subject": "...", "body": "..."}`;

const FOLLOWUP = `You write a short follow-up email (touch {N}) for Twin Brothers Group to a prospect who hasn't replied.
Touch 2 = light bump. Touch 3 = add the references (CPM Arlington RockCreek Church; Korsmo Tulalip Quil Ceda Crossing 115k SF; West Wood Homes ~70k SF). Touch 4 = brief breakup.
Keep it <=90 words, reference their project, one ask. Return STRICT JSON: {"subject": "...", "body": "..."}`;

const CLASSIFIER = `Classify a prospect's email reply for a framing subcontractor.
Return STRICT JSON: {"label": one of ["interested","not_interested","referral","auto_reply","bounce","unsubscribe"], "name": "contact name or ''", "next_stage": one of ["Replied","Dead","Bidding"], "suggested_reply": "one short sentence Rafael could send"}`;

function sig() {
  return `\n\nRafael Cabrera\nTwin Brothers Group LLC\n(321) 200-7304 · ${CONFIG.replyTo}\nwww.TwinBrothersGroup.com\n\n${CONFIG.companyAddress} · Reply STOP to opt out.`;
}

function parseJson(s) {
  const m = s.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

export async function draftColdEmail(lead) {
  const out = parseJson(await ask(COPYWRITER, JSON.stringify(lead)));
  if (out && !out.body.includes('Rafael Cabrera')) out.body += sig();
  return out;
}

export async function draftFollowup(lead, touchN) {
  const out = parseJson(await ask(FOLLOWUP.replace('{N}', touchN), JSON.stringify({ ...lead, touchN })));
  if (out && !out.body.includes('Rafael Cabrera')) out.body += sig();
  return out;
}

export async function classifyReply(emailText) {
  return parseJson(await ask(CLASSIFIER, emailText.slice(0, 4000)));
}
