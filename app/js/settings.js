import { accuracySummary } from './accuracy.js';
import { labelOf } from './book.js';
import { checkKey, estimateCost, READ_ERRORS } from './claude.js';
import { shortDate, timeAgo } from './dates.js';
import { SYNC_ERRORS } from './sync.js';
import { $, esc } from './util.js';

/**
 * The Settings sheet: the Anthropic API key for reading handwriting, what reading has cost,
 * how accurate it has been on pages I've checked, and the pages that need a look.
 */
export function createSettings({ store, getPages, transcriber, sync, onOpenPage }) {
  const sheet = $('settingsSheet'), input = $('setKey');
  const hint = text => { $('setKeyHint').textContent = text; };

  function renderSync() {
    const st = sync.state;
    $('syncOff').hidden = sync.connected;
    $('syncOn').hidden = !sync.connected;
    if (!sync.connected) return;
    const when = st.lastSyncAt ? `last synced ${timeAgo(st.lastSyncAt)}` : 'not synced yet';
    $('syncInfo').textContent = st.status === 'syncing' ? `Syncing with ${st.repo}…`
      : st.status === 'error' ? `${SYNC_ERRORS[st.error] || SYNC_ERRORS.failed} (${st.repo}, ${when})`
      : `Syncing with ${st.repo} · ${when}`;
    $('syncNow').disabled = st.status === 'syncing';
  }

  async function render() {
    renderSync();
    const key = await store.getMeta('claudeKey');
    input.value = '';
    input.type = 'password';
    $('setShow').textContent = 'Show';
    input.placeholder = key ? `Saved key ending in ${key.slice(-4)}` : 'sk-ant-…';
    $('setRemove').hidden = !key;
    $('setKeyLabel').textContent = key ? 'Replace the API key' : 'Anthropic API key';

    const u = (await store.getMeta('claudeUsage')) || { pages: 0, inputTokens: 0, outputTokens: 0 };
    $('setUsage').textContent = u.pages
      ? `Read so far: ${u.pages} page${u.pages === 1 ? '' : 's'}, about $${estimateCost(u).toFixed(2)} at current prices.`
      : 'Nothing read yet.';

    const pages = getPages().filter(p => !p.deletedAt);
    const acc = accuracySummary(pages);
    $('setAccuracy').textContent = acc.pages
      ? `${(acc.accuracy * 100).toFixed(1)}% of words read correctly, across ${acc.pages} checked page${acc.pages === 1 ? '' : 's'} (${acc.words.toLocaleString()} words).`
      : 'No checked pages yet.';

    const toCheck = pages.filter(p => p.photo && (p.needsCheck || p.transcriptStatus === 'failed'))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    $('setCheckList').innerHTML = toCheck.length
      ? toCheck.map(p => `<li><button data-open="${esc(p.id)}"><span class="tr-date">${shortDate(p.date)}</span>`
        + `<span class="tr-title">${esc(labelOf(p))}</span>`
        + `<span class="tr-meta">${p.transcriptStatus === 'failed' ? esc(READ_ERRORS[p.transcriptError] || 'Couldn’t be read') : 'Some words were hard to read'}</span></button></li>`).join('')
      : '<li class="tr-empty">Nothing to check.</li>';

    const waiting = await transcriber.waitingCount();
    $('setWaiting').hidden = !waiting;
    $('setWaitingText').textContent = `${waiting} page${waiting === 1 ? ' is' : 's are'} waiting to be read.`;
    $('setReadNow').hidden = !key;
  }

  async function saveKey() {
    const value = input.value.trim();
    if (!value) { hint('Paste your API key first.'); return; }
    if (!value.startsWith('sk-ant-')) { hint('That doesn’t look like an Anthropic API key. They start with “sk-ant-”.'); return; }
    $('setSave').disabled = true;
    hint('Checking the key…');
    try {
      await checkKey(value);
      await store.setMeta('claudeKey', value);
      hint('Key saved and working.');
      transcriber.run();
    } catch (e) {
      if (e.reason === 'offline' || e.reason === 'busy') {
        await store.setMeta('claudeKey', value);
        hint('Saved, but it couldn’t be checked right now. It will be checked the first time a page is read.');
      } else {
        hint(READ_ERRORS[e.reason] || READ_ERRORS.failed);
      }
    } finally {
      $('setSave').disabled = false;
      render();
    }
  }

  const syncHint = text => { $('syncHint').textContent = text; };
  $('syncConnect').addEventListener('click', async () => {
    const btn = $('syncConnect');
    btn.disabled = true;
    syncHint('Connecting…');
    try {
      await sync.connect($('syncRepo').value, $('syncToken').value);
      $('syncToken').value = '';
      const st = sync.state;
      syncHint(st.status === 'error' ? (SYNC_ERRORS[st.error] || SYNC_ERRORS.failed) : 'Connected. This device is now in sync.');
    } catch (e) {
      syncHint(SYNC_ERRORS[e && e.reason] || SYNC_ERRORS.failed);
    } finally {
      btn.disabled = false;
      render();
    }
  });
  $('syncNow').addEventListener('click', async () => { syncHint(''); await sync.run(); renderSync(); });
  let confirmDisconnect = null;
  $('syncDisconnect').addEventListener('click', async () => {
    const btn = $('syncDisconnect');
    if (!confirmDisconnect) {
      btn.textContent = 'Disconnect this device?';
      confirmDisconnect = setTimeout(() => { btn.textContent = 'Disconnect'; confirmDisconnect = null; }, 4000);
      return;
    }
    clearTimeout(confirmDisconnect);
    confirmDisconnect = null;
    btn.textContent = 'Disconnect';
    await sync.disconnect();
    syncHint('Disconnected. Pages on this device stay as they are.');
    render();
  });

  $('setSave').addEventListener('click', saveKey);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') saveKey(); });
  $('setShow').addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    $('setShow').textContent = show ? 'Hide' : 'Show';
  });
  $('setRemove').addEventListener('click', async () => {
    await store.setMeta('claudeKey', null);
    hint('Key removed from this device.');
    render();
  });
  $('setReadNow').addEventListener('click', () => { transcriber.takeOver(); sheet.hidden = true; });
  $('setCheckList').addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    const page = getPages().find(p => p.id === b.dataset.open);
    if (page) { sheet.hidden = true; onOpenPage(page); }
  });

  return {
    async open() { hint(''); syncHint(''); await render(); sheet.hidden = false; },
    isOpen: () => !sheet.hidden,
    refresh() { if (!sheet.hidden) render(); },
    refreshSync() { if (!sheet.hidden) renderSync(); },
  };
}
