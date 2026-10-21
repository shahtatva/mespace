/*
 * Speech-to-text for the editor, built on the browser's speech recognition.
 *
 * Browsers disagree about how they report what they heard. Some send words again that they already sent,
 * and Chrome on Android repeats every earlier phrase at the start of each new one ("okay", "okay okay", ...).
 * So instead of appending each piece as it arrives, every update rebuilds the text from the browser's
 * full result list, and a phrase that already contains everything before it replaces it rather than adding to it.
 */

const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, '').replace(/\s+/g, ' ').trim();

/** Adds a recognized phrase to the text so far, unless the phrase is a repeat of all of it plus new words. */
export function mergeSegment(acc, seg) {
  seg = String(seg || '').trim();
  if (!seg) return acc;
  if (!acc) return seg;
  const a = norm(acc), b = norm(seg);
  if (b.length > a.length && b.startsWith(a + ' ')) return seg;
  return acc + ' ' + seg;
}

/** Finished and in-progress text for one listening session, from a result list of { isFinal, text }. */
export function mergeResults(results) {
  let final = '', interim = '';
  for (const r of results) {
    if (r.isFinal) final = mergeSegment(final, r.text);
    else interim = mergeSegment(interim, r.text);
  }
  // In-progress text sometimes starts with the finished words again.
  if (final && interim) {
    const f = norm(final), i = norm(interim);
    if (i === f) interim = '';
    else if (i.startsWith(f + ' ')) interim = interim.trim().split(/\s+/).slice(f.split(' ').length).join(' ');
  }
  return { final, interim };
}

/** Appends dictated words to existing page text, with a space between and a capital at a sentence start. */
export function joinText(base, addition) {
  addition = String(addition || '').trim();
  if (!addition) return base;
  if (!base.trim() || /[.!?]\s*$/.test(base) || /\n\s*$/.test(base)) addition = addition[0].toUpperCase() + addition.slice(1);
  return base + (base && !/\s$/.test(base) ? ' ' : '') + addition;
}

const FAILURES = {
  'not-allowed': 'blocked',
  'service-not-allowed': 'service',
  'audio-capture': 'no-mic',
  'network': 'service',
  'language-not-supported': 'service',
};

/**
 * Listens until stop(). When the browser ends a session on a pause, a fresh one starts quietly.
 * onUpdate(text, interim): everything finished since start(), plus words still being recognized.
 * onFail(reason): 'unsupported' | 'blocked' | 'no-mic' | 'service'.
 * onListening(on): whether the microphone is live.
 */
export function createDictation({ onUpdate, onFail, onListening }) {
  const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  let active = false, rec = null, done = '';

  function session() {
    const r = new SR();
    r.lang = navigator.language || 'en-US';
    r.continuous = true;
    r.interimResults = true;
    let cur = { final: '', interim: '' };
    r.onresult = e => {
      if (rec !== r) return;
      cur = mergeResults(Array.from(e.results, x => ({ isFinal: x.isFinal, text: x[0].transcript })));
      onUpdate(mergeSegment(done, cur.final), cur.interim);
    };
    r.onerror = e => {
      const reason = FAILURES[e.error];
      if (reason && rec === r) { active = false; onFail(reason); }
    };
    r.onend = () => {
      if (rec !== r) return;
      // Keep words the browser heard but never marked as finished.
      done = mergeSegment(mergeSegment(done, cur.final), cur.interim);
      onUpdate(done, '');
      if (active) {
        try { rec = session(); rec.start(); return; } catch { active = false; }
      }
      rec = null;
      onListening(false);
    };
    return r;
  }

  return {
    get listening() { return active; },
    start() {
      if (!SR) { onFail('unsupported'); return; }
      done = '';
      active = true;
      try {
        rec = session();
        rec.start();
        onListening(true);
      } catch {
        active = false; rec = null;
        onFail('service');
      }
    },
    /** Stops listening; words still being recognized are kept. */
    stop() {
      active = false;
      if (!rec) { onListening(false); return; }
      try { rec.stop(); } catch { rec = null; onListening(false); }
    },
    /** Stops at once and drops anything not yet delivered (used when the editor closes). */
    cancel() {
      active = false;
      const r = rec;
      rec = null;
      if (r) { try { r.abort(); } catch { /* already stopped */ } }
      onListening(false);
    },
  };
}
