/*
 * How many words Claude read correctly, measured against text I've checked and corrected.
 * Word accuracy = 1 − (word edits needed ÷ words on the page), counting substitutions, insertions and deletions.
 */
import { UNCLEAR } from './transcription.js';

export const words = text => String(text || '')
  .replace(UNCLEAR, ' ')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s']/gu, ' ')
  .split(/\s+/)
  .filter(Boolean);

/** Word-level edit distance between two word lists. */
export function wordEdits(ref, hyp) {
  let prev = Array.from({ length: hyp.length + 1 }, (_, j) => j);
  for (let i = 1; i <= ref.length; i++) {
    const cur = [i];
    for (let j = 1; j <= hyp.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[hyp.length];
}

/** { words, edits } for a page whose text I've checked, or null when there's nothing to compare. */
export function pageAccuracy(page) {
  if (!page.transcriptChecked || !page.transcriptAI) return null;
  const ref = words(page.transcript);
  if (!ref.length) return null;
  return { words: ref.length, edits: Math.min(ref.length, wordEdits(ref, words(page.transcriptAI))) };
}

/** Accuracy across every checked page, weighted by words: { pages, words, edits, accuracy }. */
export function accuracySummary(pages) {
  let n = 0, total = 0, edits = 0;
  for (const p of pages) {
    const a = !p.deletedAt && pageAccuracy(p);
    if (!a) continue;
    n++; total += a.words; edits += a.edits;
  }
  return { pages: n, words: total, edits, accuracy: total ? 1 - edits / total : null };
}
