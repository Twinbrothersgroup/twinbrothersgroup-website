// Gmail send + read via OAuth2 (look-alike sending domain mailbox).
import { google } from 'googleapis';
import { CONFIG } from './config.js';

function gmailClient() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2 });
}

function rawMessage({ to, subject, body }) {
  const headers = [
    `From: ${CONFIG.sendFrom}`,
    `To: ${to}`,
    `Reply-To: ${CONFIG.replyTo}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  const msg = headers.join('\r\n') + '\r\n\r\n' + body;
  return Buffer.from(msg).toString('base64url');
}

export async function sendEmail({ to, subject, body }) {
  const gmail = gmailClient();
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: rawMessage({ to, subject, body }) },
  });
  return res.data; // { id, threadId, labelIds }
}

// Unread inbox messages since a query (e.g., 'newer_than:2d -in:sent').
export async function listReplies(query = 'newer_than:2d -from:me') {
  const gmail = gmailClient();
  const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 50 });
  const out = [];
  for (const m of list.data.messages || []) {
    const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
    out.push(full.data);
  }
  return out;
}

// Count bounces (Mail Delivery Subsystem) over a recent window — for the health check.
export async function bounceRate(windowQuery = 'newer_than:7d') {
  const gmail = gmailClient();
  const bounces = await gmail.users.messages.list({
    userId: 'me',
    q: `from:mailer-daemon ${windowQuery}`,
    maxResults: 100,
  });
  const sent = await gmail.users.messages.list({
    userId: 'me',
    q: `in:sent ${windowQuery}`,
    maxResults: 200,
  });
  const b = bounces.data.resultSizeEstimate || 0;
  const s = Math.max(1, sent.data.resultSizeEstimate || 1);
  return b / s;
}
