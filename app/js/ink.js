/* Ink lives in page units: a page is 1000 wide and 1414 tall, whatever size it is drawn at. */
export const PAGE_W = 1000;
export const PAGE_H = 1414;
export const NIBS = { fine: 3.4, bold: 7 };

/** SVG path data for a stroke stored as a flat [x0, y0, x1, y1, ...] list, smoothed through segment midpoints. */
export function strokeD(p) {
  if (!Array.isArray(p) || p.length < 2) return '';
  if (p.length <= 4) return `M${p[0]} ${p[1]}L${p[p.length - 2] + 0.1} ${p[p.length - 1]}`;
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < p.length - 2; i += 2) {
    d += `Q${p[i]} ${p[i + 1]} ${(p[i] + p[i + 2]) / 2} ${(p[i + 1] + p[i + 3]) / 2}`;
  }
  return d + `L${p[p.length - 2]} ${p[p.length - 1]}`;
}

/** Appends a point unless it is closer than `minDist` to the last one. Returns whether it was added. */
export function addPoint(p, x, y, minDist = 2.5) {
  const dx = x - p[p.length - 2], dy = y - p[p.length - 1];
  if (p.length >= 2 && dx * dx + dy * dy < minDist * minDist) return false;
  p.push(Math.round(x), Math.round(y));
  return true;
}

/** Strokes left after erasing every stroke that passes within `r` of (x, y). */
export function eraseAt(strokes, x, y, r = 16) {
  const r2 = r * r;
  return strokes.filter(s => {
    for (let i = 0; i < s.p.length; i += 2) {
      const dx = s.p[i] - x, dy = s.p[i + 1] - y;
      if (dx * dx + dy * dy < r2) return false;
    }
    return true;
  });
}
