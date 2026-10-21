import { LINES } from './book.js';
import { parseDate, validDate } from './dates.js';
import { NIBS, PAGE_W, PAGE_H, strokeD, addPoint, eraseAt } from './ink.js';
import { blankPage } from './model.js';
import { preparePhoto, forgetPhoto, hydratePhotos } from './photos.js';
import { paperHTML, headHTML, photoHTML, strokeHTML } from './render.js';
import { splitText, contTitle } from './textfit.js';
import { $, $$, uid, coarsePointer } from './util.js';

/**
 * The full-screen page editor. One page at a time; Write, Draw, Speak and Photo all work on the same page.
 * Saving writes through `store`; the caller re-reads pages afterwards via onSaved / onTrashed.
 */
export function createEditor({ store, toast, getStyle, setStyle, pageNumberOf, onSaved, onTrashed }) {
  const editor = $('editor'), edPage = $('edPage'), edText = $('edText'), edTitle = $('edTitle'), edInk = $('edInk');
  const edMeasure = $('edMeasure'), edPhoto = $('edPhoto'), edDate = $('edDate'), edTranscript = $('edTranscript');

  const ED = {
    page: null, isNew: true, mode: 'write', undo: [],
    photoBlob: null, photoURL: null, photoSize: null, oldPhoto: null,
    penSeen: false, cur: null, erasing: false, tool: 'pen', ink: 0, nib: 'fine',
    dirty: false, rec: null, listening: false, saving: false, confirmClose: null,
  };
  const hasPhoto = () => !!(ED.photoBlob || ED.page.photo);

  /* ---------- open / close ---------- */
  function open(page, mode = 'write') {
    const style = getStyle();
    ED.isNew = !page;
    ED.page = page ? structuredClone(page) : blankPage(style);
    ED.undo = [];
    if (ED.photoURL) URL.revokeObjectURL(ED.photoURL);
    ED.photoBlob = null; ED.photoURL = null; ED.photoSize = null; ED.oldPhoto = null;
    ED.dirty = false;
    setTool('pen');
    edTitle.value = ED.page.title;
    edText.value = ED.page.text;
    edTranscript.value = ED.page.transcript || '';
    edDate.value = ED.page.date;
    $('micLive').textContent = '';
    $('micFallback').hidden = true;
    $('photoHint').textContent = 'Photograph a page from your paper journal. It gets taped onto this page, so paper and digital entries live in the same notebook.';
    $('edDelete').hidden = ED.isNew;
    $('edNum').textContent = page ? pageNumberOf(page.id) : '';
    $('styleBox').open = false;
    resetConfirm();
    editor.hidden = false;
    applyPaper(); applyHand(); renderHead(); renderInk(); renderPhoto(); syncSegs();
    setMode(['write', 'draw', 'speak', 'photo'].includes(mode) ? mode : 'write');
    layout();
    if (ED.mode === 'write' && !hasPhoto() && !coarsePointer()) edText.focus({ preventScroll: true });
  }

  function close() {
    stopDictation();
    if (ED.photoURL) URL.revokeObjectURL(ED.photoURL);
    ED.photoURL = null; ED.photoBlob = null;
    editor.hidden = true;
  }

  function resetConfirm() {
    clearTimeout(ED.confirmClose);
    ED.confirmClose = null;
    $('edCloseLabel').textContent = 'Close';
    $('edClose').classList.remove('danger');
  }

  function requestClose() {
    if (!ED.dirty || ED.confirmClose) { resetConfirm(); close(); return; }
    $('edCloseLabel').textContent = 'Discard changes?';
    $('edClose').classList.add('danger');
    toast('You have unsaved changes. Press close again to discard them.');
    ED.confirmClose = setTimeout(resetConfirm, 4000);
  }
  $('edClose').addEventListener('click', requestClose);
  document.addEventListener('keydown', ev => { if (!editor.hidden && ev.key === 'Escape') requestClose(); });

  function layout() {
    if (editor.hidden) return;
    let w;
    if (innerWidth < 760) w = Math.min(innerWidth - 32, 600);
    else {
      const r = $('edStage').getBoundingClientRect();
      w = Math.min(r.width - 56, (r.height - 56) / 1.414, 780);
    }
    edPage.style.setProperty('--epw', Math.floor(Math.max(240, w)) + 'px');
    updateMeter();
  }
  addEventListener('resize', layout);

  /* ---------- modes ---------- */
  function setMode(m) {
    ED.mode = m;
    $$('.ed-modes [role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
    $$('.ed-tools .panel').forEach(p => { p.hidden = p.dataset.panel !== m; });
    edPage.classList.toggle('drawing', m === 'draw');
    if (m !== 'speak') stopDictation();
    updateHints();
  }
  $$('.ed-modes [role="tab"]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

  function updateHints() {
    const photo = hasPhoto();
    $('writeHint').textContent = photo
      ? 'This page holds a photo. Remove it under Photo to write on the lines instead.'
      : 'Type on the page. If you write more than fits, the rest carries over to a new page when you save.';
    $('btnMic').disabled = photo;
    $('micHint').textContent = photo
      ? 'This page holds a photo. Remove it under Photo to dictate onto the lines.'
      : 'Speak naturally. Your words are written onto the lines as you talk.';
    $('photoTools').hidden = !photo;
    $('pickLabel').textContent = photo ? 'Replace image' : 'Choose an image';
    $('lblCamera').hidden = !coarsePointer();
  }

  /* ---------- page look ---------- */
  const renderHead = () => { $('edHead').innerHTML = headHTML(parseDate(ED.page.date)); };
  const applyPaper = () => { $('edPaper').innerHTML = paperHTML(ED.page.paper); };
  function applyHand() {
    const cls = ED.page.hand === 'script' ? 'hand-script' : 'hand-print';
    for (const el of [edTitle, edText, edMeasure]) { el.classList.remove('hand-print', 'hand-script'); el.classList.add(cls); }
    updateMeter();
  }
  function syncSegs() {
    const set = (id, v) => $$('#' + id + ' button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    set('segPaper', ED.page.paper); set('segHand', ED.page.hand); set('segNib', ED.nib); set('swInk', String(ED.ink));
  }
  const onSeg = (id, fn) => $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (b) { fn(b.dataset.v); syncSegs(); } });
  onSeg('segPaper', v => { ED.page.paper = v; ED.dirty = true; applyPaper(); setStyle({ paper: v, hand: ED.page.hand }); });
  onSeg('segHand', v => { ED.page.hand = v; ED.dirty = true; applyHand(); setStyle({ paper: ED.page.paper, hand: v }); });
  onSeg('segNib', v => { ED.nib = v; setTool('pen'); });
  onSeg('swInk', v => { ED.ink = +v; setTool('pen'); });

  edDate.addEventListener('change', () => {
    const v = validDate(edDate.value);
    if (!v) { edDate.value = ED.page.date; return; }
    ED.page.date = v; ED.dirty = true; renderHead();
  });
  edTitle.addEventListener('input', () => { ED.dirty = true; });
  edText.addEventListener('input', () => { ED.dirty = true; updateMeter(); });
  edTranscript.addEventListener('input', () => { ED.dirty = true; });

  /* ---------- lines and overflow ---------- */
  const lineHeight = () => parseFloat(getComputedStyle(edText).lineHeight) || 20;
  function usedLines(text) {
    if (!text) return 0;
    edMeasure.textContent = text + '​';
    return Math.round(edMeasure.scrollHeight / lineHeight());
  }
  const fits = text => usedLines(text) <= LINES;
  function updateMeter() {
    if (editor.hidden || !ED.page) return;
    const m = $('meter');
    if (hasPhoto()) { m.textContent = 'Photo page'; m.classList.remove('over'); return; }
    const n = usedLines(edText.value), over = n - LINES;
    m.classList.toggle('over', over > 0);
    m.textContent = over > 0
      ? `Page full. ${over} more line${over === 1 ? '' : 's'} will carry over to a new page when you save.`
      : `${n} of ${LINES} lines used`;
  }

  /* ---------- drawing ---------- */
  const renderInk = () => { edInk.innerHTML = ED.page.ink.map(strokeHTML).join(''); };
  function setTool(t) {
    ED.tool = t;
    $('btnEraser').setAttribute('aria-pressed', String(t === 'eraser'));
    edPage.classList.toggle('erasing', t === 'eraser');
  }
  $('btnEraser').addEventListener('click', () => setTool(ED.tool === 'eraser' ? 'pen' : 'eraser'));
  const pushUndo = () => { ED.undo.push(JSON.stringify(ED.page.ink)); if (ED.undo.length > 60) ED.undo.shift(); };
  $('btnUndo').addEventListener('click', () => {
    if (!ED.undo.length) return;
    ED.page.ink = JSON.parse(ED.undo.pop());
    ED.dirty = true;
    renderInk();
  });
  $('btnClearInk').addEventListener('click', () => {
    if (!ED.page.ink.length) return;
    pushUndo();
    ED.page.ink = [];
    ED.dirty = true;
    renderInk();
    toast('Ink cleared. Undo brings it back.');
  });

  function pagePoint(e) {
    const r = edInk.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * PAGE_W, (e.clientY - r.top) / r.height * PAGE_H];
  }
  function erase(e) {
    const before = ED.page.ink.length;
    ED.page.ink = eraseAt(ED.page.ink, ...pagePoint(e));
    if (ED.page.ink.length !== before) { ED.dirty = true; renderInk(); }
  }
  edInk.addEventListener('pointerdown', e => {
    if (ED.mode !== 'draw' || e.button > 0) return;
    if (e.pointerType === 'pen') ED.penSeen = true;
    if (ED.penSeen && e.pointerType === 'touch') return;
    e.preventDefault();
    edInk.setPointerCapture(e.pointerId);
    pushUndo();
    if (ED.tool === 'eraser') { ED.erasing = e.pointerId; erase(e); return; }
    const s = { c: ED.ink, w: NIBS[ED.nib], p: [] };
    addPoint(s.p, ...pagePoint(e));
    ED.page.ink.push(s);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'ink' + s.c);
    path.setAttribute('stroke-width', s.w);
    path.setAttribute('d', strokeD(s.p));
    edInk.appendChild(path);
    ED.cur = { s, path, id: e.pointerId };
    ED.dirty = true;
  });
  edInk.addEventListener('pointermove', e => {
    if (ED.erasing === e.pointerId) { erase(e); return; }
    if (!ED.cur || ED.cur.id !== e.pointerId) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ce of events.length ? events : [e]) addPoint(ED.cur.s.p, ...pagePoint(ce));
    ED.cur.path.setAttribute('d', strokeD(ED.cur.s.p));
  });
  const endStroke = e => {
    if (ED.erasing === e.pointerId) ED.erasing = false;
    if (ED.cur && ED.cur.id === e.pointerId) ED.cur = null;
  };
  edInk.addEventListener('pointerup', endStroke);
  edInk.addEventListener('pointercancel', endStroke);

  /* ---------- dictation ---------- */
  function setListening(on) {
    ED.listening = on;
    $('btnMic').classList.toggle('listening', on);
    $('micLabel').textContent = on ? 'Stop dictating' : 'Start dictating';
    if (!on) $('micLive').textContent = '';
  }
  function stopDictation() {
    const rec = ED.rec;
    ED.rec = null;
    if (rec) { try { rec.stop(); } catch { /* already stopped */ } }
    setListening(false);
  }
  function showMicFallback() {
    stopDictation();
    $('micFallback').hidden = false;
    $('btnMic').disabled = true;
    edText.focus();
    edText.setSelectionRange(edText.value.length, edText.value.length);
  }
  function appendDictation(t) {
    t = t.trim();
    if (!t) return;
    const v = edText.value;
    if (!v.trim() || /[.!?]\s*$/.test(v) || /\n\s*$/.test(v)) t = t[0].toUpperCase() + t.slice(1);
    edText.value = v + (v && !/\s$/.test(v) ? ' ' : '') + t;
    edText.scrollTop = edText.scrollHeight;
    ED.dirty = true;
    updateMeter();
  }
  $('btnMic').addEventListener('click', () => {
    if (ED.listening) { stopDictation(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showMicFallback(); return; }
    let rec;
    try {
      rec = new SR();
      rec.lang = navigator.language || 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
    } catch { showMicFallback(); return; }
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) appendDictation(r[0].transcript); else interim += r[0].transcript;
      }
      $('micLive').textContent = interim;
    };
    rec.onerror = e => {
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error)) showMicFallback();
      else if (e.error === 'network') { stopDictation(); toast('Dictation needs an internet connection in this browser. Keyboard dictation works offline.'); }
    };
    // Some browsers stop listening after a pause; keep going until the button is pressed again.
    rec.onend = () => {
      if (ED.rec !== rec) return;
      try { rec.start(); } catch { ED.rec = null; setListening(false); }
    };
    ED.rec = rec;
    try { rec.start(); setListening(true); } catch { showMicFallback(); }
  });

  /* ---------- photos ---------- */
  function renderPhoto() {
    const src = ED.photoURL;
    if (src) edPhoto.innerHTML = photoHTML({ src }, ED.photoSize.w / ED.photoSize.h);
    else if (ED.page.photo) {
      edPhoto.innerHTML = photoHTML({ id: ED.page.photo }, ED.page.photoAspect);
      hydratePhotos(edPhoto, store);
    } else edPhoto.innerHTML = '';
    edPhoto.hidden = !hasPhoto();
    edText.hidden = hasPhoto();
  }
  async function onPhotoFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) { toast('Choose a photo or image file.'); return; }
    $('photoHint').textContent = 'Preparing the photo…';
    try {
      const { blob, w, h } = await preparePhoto(file);
      if (ED.photoURL) URL.revokeObjectURL(ED.photoURL);
      if (ED.page.photo && !ED.oldPhoto) ED.oldPhoto = ED.page.photo;
      ED.page.photo = null;
      ED.photoBlob = blob; ED.photoSize = { w, h }; ED.photoURL = URL.createObjectURL(blob);
      ED.dirty = true;
      renderPhoto(); updateHints(); updateMeter();
      $('photoHint').textContent = 'Taped in. Save the page to keep it.';
    } catch {
      $('photoHint').textContent = 'That image couldn’t be opened. Try a JPEG or PNG.';
    }
  }
  $('inCamera').addEventListener('change', e => onPhotoFile(e.target));
  $('inPick').addEventListener('change', e => onPhotoFile(e.target));
  $('btnRemovePhoto').addEventListener('click', () => {
    if (ED.page.photo && !ED.oldPhoto) ED.oldPhoto = ED.page.photo;
    ED.page.photo = null; ED.page.photoAspect = null;
    if (ED.photoURL) URL.revokeObjectURL(ED.photoURL);
    ED.photoURL = null; ED.photoBlob = null; ED.photoSize = null;
    ED.dirty = true;
    renderPhoto(); updateHints(); updateMeter();
    $('photoHint').textContent = 'Photo removed. Save the page to keep this change.';
  });

  /* ---------- save and delete ---------- */
  async function removeUnusedPhoto(id) {
    const pages = await store.allPages();
    if (pages.some(p => p.photo === id)) return;
    await store.removePhoto(id);
    forgetPhoto(id);
  }

  $('edSave').addEventListener('click', async () => {
    if (ED.saving) return;
    const btn = $('edSave');
    ED.saving = true; btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const page = ED.page;
      page.title = edTitle.value.trim().slice(0, 200);
      page.text = edText.value.replace(/\s+$/, '');
      page.transcript = edTranscript.value.trim();
      const chunks = !hasPhoto() && page.text && !fits(page.text) ? splitText(page.text, fits) : [page.text];
      page.text = chunks[0];
      if (ED.photoBlob) {
        const id = uid();
        await store.putPhoto({ id, type: 'image/jpeg', data: await ED.photoBlob.arrayBuffer(), w: ED.photoSize.w, h: ED.photoSize.h });
        page.photo = id;
        page.photoAspect = ED.photoSize.w / ED.photoSize.h;
      }
      const now = Date.now();
      page.id = page.id || uid();
      page.createdAt = page.createdAt || now;
      page.updatedAt = now;
      await store.putPage(page);
      for (let i = 1; i < chunks.length; i++) {
        await store.putPage({
          ...blankPage({ date: page.date, paper: page.paper, hand: page.hand }),
          id: uid(), title: contTitle(page.title), text: chunks[i], createdAt: page.createdAt + i, updatedAt: now,
        });
      }
      if (ED.oldPhoto && ED.oldPhoto !== page.photo) await removeUnusedPhoto(ED.oldPhoto);
      ED.dirty = false;
      resetConfirm();
      close();
      toast(chunks.length > 1 ? `Saved across ${chunks.length} pages` : 'Saved');
      onSaved(page.id);
    } catch {
      toast('Couldn’t save the page. Your text is still here; try again.');
    } finally {
      ED.saving = false; btn.disabled = false; btn.textContent = 'Save page';
    }
  });

  $('edDelete').addEventListener('click', async () => {
    if (ED.isNew) return;
    try {
      const stored = (await store.allPages()).find(p => p.id === ED.page.id);
      if (!stored) { close(); return; }
      const trashed = { ...stored, deletedAt: Date.now() };
      await store.putPage(trashed);
      resetConfirm();
      close();
      onTrashed(trashed);
    } catch {
      toast('Couldn’t move the page to Trash. Try again.');
    }
  });

  return {
    open,
    isOpen: () => !editor.hidden,
    removeUnusedPhoto,
  };
}
