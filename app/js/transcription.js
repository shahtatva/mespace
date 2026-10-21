/* How a reading from Claude lands on a page, and how imported pages get their dates. No browser APIs. */

export const UNCLEAR = /\[(?:\?|illegible)\]/gi;

export const countUnclear = text => (String(text || '').match(UNCLEAR) || []).length;

/**
 * A copy of `page` with Claude's reading applied. The text replaces what was there. The title is filled
 * only when empty, and the date only when the page's date wasn't set by hand.
 */
export function applyReading(page, reading, now = Date.now()) {
  const next = {
    ...page,
    transcript: reading.text,
    transcriptAI: reading.text,
    transcriptChecked: false,
    transcriptStatus: 'done',
    transcriptError: '',
    needsCheck: !reading.legible || countUnclear(reading.text) > 0,
    updatedAt: now,
  };
  if (!next.title && reading.title) next.title = reading.title;
  if (reading.date && page.dateSet !== 'user') {
    next.date = reading.date;
    next.dateSet = 'page';
  }
  return next;
}

/**
 * Dates the pages of one import in capture order. A page whose date came from its own writing (or from me)
 * sets the date; a page without one takes the date of the page before it.
 * Returns only the pages whose date changed, as updated copies.
 */
export function chainImportDates(pages, now = Date.now()) {
  const ordered = [...pages].sort((a, b) => (a.importSeq || 0) - (b.importSeq || 0));
  const changed = [];
  let running = null;
  for (const p of ordered) {
    if (p.dateSet !== 'guess' || running === null) { running = p.date; continue; }
    if (p.date !== running) changed.push({ ...p, date: running, updatedAt: now });
  }
  return changed;
}
