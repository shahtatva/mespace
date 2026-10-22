export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY = 864e5;

export const pad2 = n => String(n).padStart(2, '0');

export const toISODate = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const todayISO = (now = new Date()) => toISODate(now);

/** Returns the string when it is a real calendar date in YYYY-MM-DD form, otherwise null. */
export function validDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s : '');
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? s : null;
}

/** Local-time Date for a YYYY-MM-DD string; today for anything else. */
export function parseDate(s) {
  return validDate(s) ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : new Date();
}

export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
}

export const shortDate = s => {
  const d = parseDate(s);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
};

/** "today", "yesterday", "5 days ago" for a past timestamp. */
export function daysAgo(ms, now = Date.now()) {
  const days = Math.floor((now - ms) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** "just now", "5 min ago", "3 h ago", then days, for a past timestamp. */
export function timeAgo(ms, now = Date.now()) {
  const min = Math.floor((now - ms) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.floor(min / 60)} h ago`;
  return daysAgo(ms, now);
}
