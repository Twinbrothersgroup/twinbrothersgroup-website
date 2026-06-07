// Spread N sends across the business-hours window with jitter, so we never burst.
import { CONFIG } from './config.js';

// Returns an array of ISO timestamps (today, PT window) for `count` sends.
export function scheduleSendTimes(count, now = new Date()) {
  const { start, end } = CONFIG.sendWindow; // PT hours
  const times = [];
  if (count <= 0) return times;
  // Work in UTC offset for PT (-7 DST / -8 std); approximate with -7.
  const ptOffset = -7;
  const base = new Date(now);
  const windowMs = (end - start) * 3600 * 1000;
  const slot = windowMs / count;
  for (let i = 0; i < count; i++) {
    const jitter = Math.random() * slot * 0.6;
    const ms = i * slot + jitter;
    const t = new Date(base);
    t.setUTCHours(start - ptOffset, 0, 0, 0); // window start in UTC
    t.setTime(t.getTime() + ms);
    times.push(t.toISOString());
  }
  return times;
}

export function inSendWindow(now = new Date()) {
  const ptHour = (now.getUTCHours() + 24 - 7) % 24;
  return ptHour >= CONFIG.sendWindow.start && ptHour < CONFIG.sendWindow.end;
}
