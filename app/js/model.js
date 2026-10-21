import { todayISO, validDate } from './dates.js';

export const PAPERS = ['lined', 'dot', 'plain'];
export const HANDS = ['print', 'script'];
export const READ_STATES = ['', 'queued', 'reading', 'done', 'failed'];
// Who decided a page's date: me, the date written on the page, or a guess from the page before it.
export const DATE_SOURCES = ['user', 'page', 'guess'];
export const TRASH_DAYS = 30;

export function blankPage({ date, paper = 'lined', hand = 'print' } = {}) {
  return {
    id: null, date: validDate(date) || todayISO(), title: '', text: '', paper, hand,
    ink: [], photo: null, photoAspect: null, transcript: '', notebook: '',
    transcriptAI: '', transcriptStatus: '', transcriptError: '', transcriptChecked: false, needsCheck: false,
    importId: '', importSeq: 0, dateSet: 'user',
    createdAt: 0, updatedAt: 0, deletedAt: null,
  };
}

const str = (v, max) => (typeof v === 'string' ? v : '').slice(0, max);
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function cleanStroke(s) {
  if (!s || !Array.isArray(s.p) || s.p.length < 2) return null;
  const p = s.p.filter(n => typeof n === 'number' && Number.isFinite(n)).map(Math.round);
  if (p.length < 2) return null;
  return { c: Math.abs(num(s.c) | 0) % 3, w: Math.min(20, Math.max(1, num(s.w) || 3.4)), p: p.length % 2 ? p.slice(0, -1) : p };
}

/** Coerces anything page-shaped (from storage or a backup file) into a well-formed page record. */
export function normalizePage(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id) return null;
  const date = validDate(raw.date);
  if (!date) return null;
  return {
    id: raw.id.slice(0, 80),
    date,
    title: str(raw.title, 200),
    text: str(raw.text, 200000),
    paper: PAPERS.includes(raw.paper) ? raw.paper : 'lined',
    hand: HANDS.includes(raw.hand) ? raw.hand : 'print',
    ink: Array.isArray(raw.ink) ? raw.ink.map(cleanStroke).filter(Boolean) : [],
    photo: typeof raw.photo === 'string' && raw.photo ? raw.photo.slice(0, 80) : null,
    photoAspect: num(raw.photoAspect) > 0 ? num(raw.photoAspect) : null,
    transcript: str(raw.transcript, 200000),
    notebook: str(raw.notebook, 120),
    transcriptAI: str(raw.transcriptAI, 200000),
    transcriptStatus: READ_STATES.includes(raw.transcriptStatus) ? raw.transcriptStatus : '',
    transcriptError: str(raw.transcriptError, 40),
    transcriptChecked: raw.transcriptChecked === true,
    needsCheck: raw.needsCheck === true,
    importId: str(raw.importId, 80),
    importSeq: num(raw.importSeq),
    dateSet: DATE_SOURCES.includes(raw.dateSet) ? raw.dateSet : 'user',
    createdAt: num(raw.createdAt),
    updatedAt: num(raw.updatedAt),
    deletedAt: num(raw.deletedAt) || null,
  };
}

export const isLive = p => !p.deletedAt;

export function expiredTrash(pages, now = Date.now(), days = TRASH_DAYS) {
  return pages.filter(p => p.deletedAt && now - p.deletedAt > days * 864e5);
}

export const daysLeftInTrash = (p, now = Date.now(), days = TRASH_DAYS) =>
  Math.max(0, days - Math.floor((now - p.deletedAt) / 864e5));
