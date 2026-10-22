import { readPage, ReadError } from './claude.js';
import { normalizePage } from './model.js';
import { applyReading, chainImportDates } from './transcription.js';

/** Adds one reading's token use to the running total shown in Settings. */
export async function recordUsage(store, usage = {}) {
  const u = (await store.getMeta('claudeUsage')) || { pages: 0, inputTokens: 0, outputTokens: 0 };
  u.pages += 1;
  u.inputTokens += (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
  u.outputTokens += usage.output_tokens || 0;
  await store.setMeta('claudeUsage', u);
}

// Failures that stop the whole queue (the next page would fail the same way); anything else fails just one page.
const STOPS_QUEUE = new Set(['bad-key', 'no-permission', 'billing', 'offline', 'busy', 'cancelled']);

/**
 * Reads queued photo pages one at a time, in the background. A page's place in the queue is stored on the page
 * itself, so reading picks up where it left off after the app closes or the connection drops.
 *
 * onProgress(state): { state: 'reading', done, total } | { state: 'stopped', reason, left } | { state: 'done', done } | null
 * onPageChanged(page): a page's text, date or reading status changed.
 */
export function createTranscriber({ store, getKey, deviceId, onProgress, onPageChanged }) {
  let running = false, controller = null, retryTimer = null;

  const all = async () => (await store.allPages()).map(normalizePage).filter(Boolean);
  const queued = p => !p.deletedAt && p.photo && (p.transcriptStatus === 'queued' || p.transcriptStatus === 'reading');
  // Only pages queued on this device; another synced device reads its own.
  const waiting = pages => pages
    .filter(p => queued(p) && (!p.queuedOn || p.queuedOn === deviceId))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  async function run() {
    if (running) return;
    clearTimeout(retryTimer);
    let queue = waiting(await all());
    if (!queue.length) { onProgress(null); return; }
    const key = await getKey();
    if (!key) { onProgress({ state: 'stopped', reason: 'no-key', left: queue.length }); return; }
    if (navigator.onLine === false) { onProgress({ state: 'stopped', reason: 'offline', left: queue.length }); return; }

    running = true;
    let done = 0;
    try {
      while (queue.length) {
        const page = { ...queue[0], transcriptStatus: 'reading' };
        onProgress({ state: 'reading', done, total: done + queue.length });
        await store.putPage(page);
        onPageChanged(page);

        let reading = null, failure = null;
        const photo = await store.getPhoto(page.photo);
        if (!photo) failure = new ReadError('no-photo');
        else {
          controller = new AbortController();
          try { reading = await readPage(key, photo, { signal: controller.signal }); }
          catch (e) { failure = e instanceof ReadError ? e : new ReadError('failed'); }
          controller = null;
        }

        // Re-read the page: it may have been edited or deleted while Claude was reading it.
        const pages = await all();
        const fresh = pages.find(p => p.id === page.id);
        if (failure && STOPS_QUEUE.has(failure.reason)) {
          if (fresh) await store.putPage({ ...fresh, transcriptStatus: 'queued' });
          onProgress({ state: 'stopped', reason: failure.reason, left: waiting(await all()).length });
          if (failure.reason === 'busy') retryTimer = setTimeout(run, 60000);
          return;
        }
        if (fresh && !fresh.deletedAt) {
          if (failure) {
            const failed = { ...fresh, transcriptStatus: 'failed', transcriptError: failure.reason };
            await store.putPage(failed);
            onPageChanged(failed);
          } else {
            const read = applyReading(fresh, reading);
            await store.putPage(read);
            if (read.importId) {
              const group = pages.map(p => (p.id === read.id ? read : p)).filter(p => p.importId === read.importId && !p.deletedAt);
              for (const p of chainImportDates(group)) await store.putPage(p);
            }
            await recordUsage(store, reading.usage);
            onPageChanged(read);
          }
        }
        done++;
        queue = waiting(await all());
      }
      onProgress({ state: 'done', done });
    } finally {
      running = false;
      controller = null;
    }
  }

  addEventListener('online', () => run());

  return {
    /** Queues pages for reading and starts if idle. */
    async enqueue(ids) {
      const wanted = new Set(ids);
      for (const p of await all()) {
        if (wanted.has(p.id) && p.photo) await store.putPage({ ...p, transcriptStatus: 'queued', transcriptError: '', queuedOn: deviceId, updatedAt: Date.now() });
      }
      run();
    },
    run,
    /** Stops after cancelling the page being read; the rest stay queued. */
    stop() { clearTimeout(retryTimer); if (controller) controller.abort(); },
    /** Pages waiting to be read on any device. */
    async waitingCount() { return (await all()).filter(queued).length; },
    /** Reads, on this device, pages another device queued but hasn't read. */
    async takeOver() {
      for (const p of await all()) {
        if (queued(p) && p.queuedOn !== deviceId) await store.putPage({ ...p, transcriptStatus: 'queued', queuedOn: deviceId, updatedAt: Date.now() });
      }
      run();
    },
  };
}
