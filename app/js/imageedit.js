import { decodeImage, toJpeg } from './photos.js';
import { $ } from './util.js';

const KEEP = { max: 2400, quality: 0.88 };

/** Rotates an image by quarter turns clockwise. Resolves { blob, w, h }. */
export async function rotateBlob(blob, quarterTurns = 1) {
  const img = await decodeImage(blob);
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  const turns = ((quarterTurns % 4) + 4) % 4;
  const c = document.createElement('canvas');
  c.width = turns % 2 ? h0 : w0;
  c.height = turns % 2 ? w0 : h0;
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  g.rotate(turns * Math.PI / 2);
  g.drawImage(img, -w0 / 2, -h0 / 2);
  return toJpeg(c, KEEP.max, KEEP.quality);
}

/** Crops to a rectangle given as fractions of the image: { x, y, w, h } from 0 to 1. Resolves { blob, w, h }. */
export async function cropBlob(blob, rect) {
  const img = await decodeImage(blob);
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  const sx = Math.round(rect.x * w0), sy = Math.round(rect.y * h0);
  const sw = Math.max(1, Math.min(w0 - sx, Math.round(rect.w * w0)));
  const sh = Math.max(1, Math.min(h0 - sy, Math.round(rect.h * h0)));
  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return toJpeg(c, KEEP.max, KEEP.quality);
}

const MIN = 0.08;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Opens the crop sheet for an image. Drag the corners (or the frame) to crop; Rotate turns it a quarter.
 * Resolves the edited image as { blob, w, h }, or null if cancelled.
 */
export function openCropper(blob) {
  const sheet = $('cropSheet'), img = $('cropImg'), box = $('cropBox'), frame = $('cropFrame');
  let working = blob, url = null, rect = null, drag = null;

  const show = b => {
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(b);
    img.src = url;
    rect = { x: 0.02, y: 0.02, w: 0.96, h: 0.96 };
    place();
  };
  const place = () => {
    box.style.left = rect.x * 100 + '%';
    box.style.top = rect.y * 100 + '%';
    box.style.width = rect.w * 100 + '%';
    box.style.height = rect.h * 100 + '%';
  };

  const onDown = e => {
    const handle = e.target.closest('[data-h]');
    if (!handle) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    drag = { h: handle.dataset.h, id: e.pointerId, x: e.clientX, y: e.clientY, start: { ...rect } };
  };
  const onMove = e => {
    if (!drag || drag.id !== e.pointerId) return;
    const r = frame.getBoundingClientRect();
    const dx = (e.clientX - drag.x) / r.width, dy = (e.clientY - drag.y) / r.height;
    const s = drag.start;
    let { x, y, w, h } = s;
    if (drag.h === 'move') {
      x = clamp(s.x + dx, 0, 1 - s.w);
      y = clamp(s.y + dy, 0, 1 - s.h);
    } else {
      if (drag.h.includes('w')) { x = clamp(s.x + dx, 0, s.x + s.w - MIN); w = s.x + s.w - x; }
      if (drag.h.includes('e')) w = clamp(s.w + dx, MIN, 1 - s.x);
      if (drag.h.includes('n')) { y = clamp(s.y + dy, 0, s.y + s.h - MIN); h = s.y + s.h - y; }
      if (drag.h.includes('s')) h = clamp(s.h + dy, MIN, 1 - s.y);
    }
    rect = { x, y, w, h };
    place();
  };
  const onUp = e => { if (drag && drag.id === e.pointerId) drag = null; };

  return new Promise(resolve => {
    const busy = on => { for (const id of ['cropApply', 'cropRotate', 'cropCancel']) $(id).disabled = on; };
    const finish = result => {
      sheet.hidden = true;
      if (url) URL.revokeObjectURL(url);
      box.removeEventListener('pointerdown', onDown);
      box.removeEventListener('pointermove', onMove);
      box.removeEventListener('pointerup', onUp);
      box.removeEventListener('pointercancel', onUp);
      $('cropApply').onclick = $('cropRotate').onclick = $('cropCancel').onclick = null;
      document.removeEventListener('keydown', onKey, true);
      resolve(result);
    };
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); finish(null); } };

    box.addEventListener('pointerdown', onDown);
    box.addEventListener('pointermove', onMove);
    box.addEventListener('pointerup', onUp);
    box.addEventListener('pointercancel', onUp);
    document.addEventListener('keydown', onKey, true);
    $('cropCancel').onclick = () => finish(null);
    $('cropRotate').onclick = async () => {
      busy(true);
      try { working = (await rotateBlob(working, 1)).blob; show(working); } finally { busy(false); }
    };
    $('cropApply').onclick = async () => {
      busy(true);
      try { finish(await cropBlob(working, rect)); } catch { busy(false); }
    };
    sheet.hidden = false;
    show(working);
  });
}
