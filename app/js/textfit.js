/**
 * Splits text into page-sized chunks. `fits(str)` says whether a string fits on one page;
 * each chunk is the longest prefix that fits, pulled back to the last line break or space when one is close.
 */
export function splitText(text, fits, maxPages = 40) {
  const chunks = [];
  let rest = text;
  for (let guard = 0; guard < maxPages && rest && !fits(rest); guard++) {
    let lo = 1, hi = rest.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fits(rest.slice(0, mid))) lo = mid; else hi = mid - 1;
    }
    let cut = lo;
    const head = rest.slice(0, lo);
    const brk = Math.max(head.lastIndexOf('\n'), head.lastIndexOf(' '));
    if (brk > lo * 0.6) cut = brk + 1;
    chunks.push(rest.slice(0, cut).replace(/\s+$/, ''));
    rest = rest.slice(cut).replace(/^\s+/, '');
  }
  if (rest) chunks.push(rest);
  return chunks.length ? chunks : [''];
}

export const contTitle = t => (t ? t.replace(/\s*\(cont\.\)$/, '') + ' ' : '') + '(cont.)';
