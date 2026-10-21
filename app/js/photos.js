const urls = new Map();

/** A blob: URL for a stored photo, created once per photo and reused. */
export function photoURL(store, id) {
  if (!urls.has(id)) {
    urls.set(id, store.getPhoto(id).then(ph => {
      if (!ph) throw new Error('missing photo');
      return URL.createObjectURL(new Blob([ph.data], { type: ph.type }));
    }));
    urls.get(id).catch(() => urls.delete(id));
  }
  return urls.get(id);
}

export function forgetPhoto(id) {
  const u = urls.get(id);
  if (!u) return;
  urls.delete(id);
  u.then(url => URL.revokeObjectURL(url), () => {});
}

/** Fills in every <img data-photo> under `root` from storage, marking the frame when a photo can't be shown. */
export function hydratePhotos(root, store) {
  for (const img of root.querySelectorAll('img[data-photo]')) {
    const frame = img.parentElement;
    img.addEventListener('error', () => frame.classList.add('broken'), { once: true });
    photoURL(store, img.dataset.photo).then(url => { img.src = url; }, () => frame.classList.add('broken'));
  }
}

export async function decodeImage(blob) {
  try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch { /* fall back below */ }
  return new Promise((resolve, reject) => {
    const u = URL.createObjectURL(blob), im = new Image();
    im.onload = () => { URL.revokeObjectURL(u); resolve(im); };
    im.onerror = () => { URL.revokeObjectURL(u); reject(new Error('decode')); };
    im.src = u;
  });
}

/** Re-encodes an image as JPEG, no larger than `max` pixels on its long side. */
export async function toJpeg(img, max, quality) {
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  const s = Math.min(1, max / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * s)), h = Math.max(1, Math.round(h0 * s));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);
  g.drawImage(img, 0, 0, w, h);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
  if (!blob) throw new Error('encode');
  return { blob, w, h };
}

/** Turns a picked or captured file into the JPEG we keep: up to 2400 px, good enough to read handwriting later. */
export async function preparePhoto(file) {
  return toJpeg(await decodeImage(file), 2400, 0.88);
}
