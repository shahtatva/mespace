const haystack = p => [p.title, p.text, p.transcript].filter(Boolean).join('\n').toLowerCase();

/** A short excerpt around the first match: { pre, match, post } plus whether text was cut at either end. */
export function snippet(page, needle, before = 40, after = 70) {
  const src = [page.text, page.transcript].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const i = needle ? src.toLowerCase().indexOf(needle) : -1;
  if (i < 0) return { pre: src.slice(0, 120), match: '', post: '', cutStart: false, cutEnd: src.length > 120 };
  const a = Math.max(0, i - before);
  const b = Math.min(src.length, i + needle.length + after);
  return {
    pre: src.slice(a, i), match: src.slice(i, i + needle.length), post: src.slice(i + needle.length, b),
    cutStart: a > 0, cutEnd: b < src.length,
  };
}

/** Newest-first matches across titles, typed text and photo transcripts. */
export function searchEntries(entries, query, limit = 30) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return [];
  const hits = [];
  for (let i = entries.length - 1; i >= 0 && hits.length < limit; i--) {
    const e = entries[i];
    if (haystack(e.page).includes(needle)) hits.push({ entry: e, snippet: snippet(e.page, needle) });
  }
  return hits;
}
