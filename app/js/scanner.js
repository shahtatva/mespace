import { todayISO, validDate } from './dates.js';
import { rotateBlob } from './imageedit.js';
import { blankPage } from './model.js';
import { preparePhoto, toJpeg } from './photos.js';
import { $, uid } from './util.js';

/**
 * "Scan a notebook": photograph many paper pages in one sitting, from the live camera or from photos already
 * taken, then add them all to the book as photo pages carrying the notebook's name, in capture order.
 */
export function createScanner({ store, getKey, deviceId, toast, openSettings, onAdded }) {
  const sheet = $('scanner'), video = $('scVideo');
  let shots = [];
  let stream = null, saving = false, confirmClose = null;

  function resetClose() {
    clearTimeout(confirmClose);
    confirmClose = null;
    $('scCloseLabel').textContent = 'Close';
  }

  async function open() {
    shots = [];
    renderTray();
    resetClose();
    $('scName').value = '';
    $('scDate').value = '';
    const hasKey = !!(await getKey());
    $('scRead').checked = hasKey;
    $('scRead').disabled = !hasKey;
    $('scReadHint').textContent = hasKey
      ? 'Claude reads each page in the background, so search can find it and pages get the dates you wrote on them.'
      : 'To have pages read automatically, add an Anthropic API key in Settings first.';
    $('scOpenSettings').hidden = hasKey;
    $('scSetup').hidden = false;
    $('scCam').hidden = true;
    sheet.hidden = false;
  }

  function stopCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    video.srcObject = null;
  }

  function close() {
    stopCamera();
    for (const s of shots) URL.revokeObjectURL(s.url);
    shots = [];
    sheet.hidden = true;
  }

  function requestClose() {
    if (!shots.length || confirmClose) { resetClose(); close(); return; }
    $('scCloseLabel').textContent = `Discard ${shots.length} page${shots.length === 1 ? '' : 's'}?`;
    confirmClose = setTimeout(resetClose, 4000);
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('This browser can’t use the camera here. Choose photos instead.');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } },
      });
    } catch (e) {
      toast(e && e.name === 'NotAllowedError'
        ? 'Camera access is blocked for this site. Allow it, or choose photos instead.'
        : 'The camera couldn’t start. Choose photos instead.');
      return;
    }
    video.srcObject = stream;
    await video.play().catch(() => {});
    $('scSetup').hidden = true;
    $('scCam').hidden = false;
  }

  function addShot(blob, w, h) {
    shots.push({ id: uid(), blob, w, h, url: URL.createObjectURL(blob) });
    renderTray();
  }

  async function shoot() {
    if (!video.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    $('scFlash').classList.remove('go');
    void $('scFlash').offsetWidth;
    $('scFlash').classList.add('go');
    if (navigator.vibrate) navigator.vibrate(20);
    const { blob, w, h } = await toJpeg(c, 2400, 0.88);
    addShot(blob, w, h);
  }

  async function addFiles(input) {
    const files = [...(input.files || [])].filter(f => !f.type || f.type.startsWith('image/'));
    input.value = '';
    // Photos of consecutive pages are usually taken in order, so keep that order.
    files.sort((a, b) => (a.lastModified - b.lastModified) || a.name.localeCompare(b.name));
    for (const f of files) {
      try {
        const { blob, w, h } = await preparePhoto(f);
        addShot(blob, w, h);
      } catch {
        toast(`Couldn’t open ${f.name}.`);
      }
    }
  }

  function renderTray() {
    const n = shots.length;
    $('scTray').innerHTML = shots.map((s, i) =>
      `<li><img src="${s.url}" alt="Page ${i + 1}"><span class="sc-no">${i + 1}</span>`
      + `<button class="sc-act rot" data-rot="${s.id}" aria-label="Rotate page ${i + 1}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg></button>`
      + `<button class="sc-act del" data-del="${s.id}" aria-label="Remove page ${i + 1}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></li>`).join('');
    $('scTray').hidden = !n;
    $('scDone').disabled = !n;
    $('scDone').textContent = n ? `Add ${n} page${n === 1 ? '' : 's'}` : 'Add pages';
    $('scCount').textContent = n ? `${n} page${n === 1 ? '' : 's'}` : 'No pages yet';
    $('scTray').scrollLeft = $('scTray').scrollWidth;
  }

  $('scTray').addEventListener('click', async e => {
    const rot = e.target.closest('[data-rot]'), del = e.target.closest('[data-del]');
    const id = (rot || del) && (rot || del).dataset[rot ? 'rot' : 'del'];
    const i = shots.findIndex(s => s.id === id);
    if (i < 0) return;
    if (del) {
      URL.revokeObjectURL(shots[i].url);
      shots.splice(i, 1);
    } else {
      const { blob, w, h } = await rotateBlob(shots[i].blob, 1);
      URL.revokeObjectURL(shots[i].url);
      shots[i] = { ...shots[i], blob, w, h, url: URL.createObjectURL(blob) };
    }
    renderTray();
  });

  async function save() {
    if (saving || !shots.length) return;
    saving = true;
    const btn = $('scDone');
    btn.disabled = true;
    btn.textContent = 'Adding…';
    const name = $('scName').value.trim().slice(0, 120);
    const entered = validDate($('scDate').value);
    const read = $('scRead').checked;
    const importId = uid(), now = Date.now(), ids = [];
    try {
      for (const [i, s] of shots.entries()) {
        const photoId = uid();
        await store.putPhoto({ id: photoId, type: 'image/jpeg', data: await s.blob.arrayBuffer(), w: s.w, h: s.h });
        const page = {
          ...blankPage({ date: entered || todayISO() }),
          id: uid(), photo: photoId, photoAspect: s.w / s.h, notebook: name,
          importId, importSeq: i,
          // A date I typed for the first page is mine; every other date is a guess until the page's own writing says otherwise.
          dateSet: entered && i === 0 ? 'user' : 'guess',
          transcriptStatus: read ? 'queued' : '',
          queuedOn: read ? deviceId : '',
          createdAt: now + i, updatedAt: now,
        };
        await store.putPage(page);
        ids.push(page.id);
      }
      close();
      onAdded(ids, { name, read });
    } catch {
      toast(ids.length
        ? `Added ${ids.length} of ${shots.length} pages before something went wrong. Try adding the rest again.`
        : 'Couldn’t add the pages. Try again.');
      btn.disabled = false;
      renderTray();
    } finally {
      saving = false;
    }
  }

  $('scClose').addEventListener('click', requestClose);
  $('scCamera').addEventListener('click', startCamera);
  $('scShutter').addEventListener('click', shoot);
  $('scFiles').addEventListener('change', e => addFiles(e.target));
  $('scFiles2').addEventListener('change', e => addFiles(e.target));
  $('scDone').addEventListener('click', save);
  $('scOpenSettings').addEventListener('click', () => { close(); openSettings(); });
  document.addEventListener('keydown', e => { if (!sheet.hidden && e.key === 'Escape') requestClose(); });

  return { open, isOpen: () => !sheet.hidden };
}
