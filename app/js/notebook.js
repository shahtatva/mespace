import { buildBook, viewCount, viewOf, pagesOfView, firstPageOfView, monthTabs, labelOf, INDEX_ROWS } from './book.js';
import { MONTHS, parseDate } from './dates.js';
import { pageInner } from './render.js';
import { searchEntries } from './search.js';
import { hydratePhotos } from './photos.js';
import { $, esc, reduceMotion } from './util.js';

/**
 * The open book on the desk: lays out spreads (or single pages on narrow screens), turns pages,
 * draws the month tabs and pager, and runs search. Pages come in through setPages().
 */
export function createNotebook({ store, onOpenPage, onNew, isBlocked }) {
  const book = $('book'), stage = $('stage'), pageL = $('pageL'), pageR = $('pageR');
  const q = $('q'), pop = $('pop');
  const S = { book: [], entries: [], view: 0, single: false, opened: false, loading: true, focusId: null };
  let flip = null;

  const ctx = () => ({ entries: S.entries, indexRows: INDEX_ROWS, loading: S.loading });
  const count = () => viewCount(S.book.length, S.single);

  function fillPage(el, pi, side, extra = '') {
    const p = S.book[pi];
    el.className = `page ${side}${extra ? ' ' + extra : ''}`;
    el.dataset.pi = pi;
    el.dataset.kind = p ? p.kind : '';
    el.innerHTML = p ? pageInner(p, pi + 1, ctx()) : '';
    if (p && p.kind === 'entry' && !extra) {
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Open page ${pi + 1}: ${labelOf(p.entry.page)}`);
    } else {
      el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label');
    }
    hydratePhotos(el, store);
  }

  function layout() {
    const r = stage.getBoundingClientRect();
    const availW = r.width - 30 - 24, availH = r.height - 24 - 34;
    const spreadPw = Math.min(availW / 2, availH / 1.414);
    const singlePw = Math.min(availW, availH / 1.414);
    const single = spreadPw < 250 && singlePw > spreadPw;
    if (single !== S.single) {
      const pi = firstPageOfView(S.view, S.single);
      S.single = single;
      S.view = viewOf(pi, single);
    }
    const pw = Math.max(150, Math.floor(Math.min(single ? singlePw : spreadPw, 640)));
    book.style.setProperty('--pw', pw + 'px');
    book.classList.toggle('single', single);
  }

  function renderView() {
    const [l, r] = pagesOfView(S.view, S.single);
    if (!S.single) fillPage(pageL, l, 'l');
    fillPage(pageR, r, 'r');
  }

  function renderTabs() {
    const { tabs, multiYear } = monthTabs(S.entries);
    const here = pagesOfView(S.view, S.single).map(pi => S.book[pi]).filter(Boolean);
    const cur = here.find(p => p.kind === 'entry');
    const curKey = cur ? String(cur.entry.page.date).slice(0, 7) : null;
    const onIndex = here.some(p => p.kind === 'index');
    $('tabs').innerHTML = `<button class="tab ix" data-goto="0" aria-current="${onIndex}">Index</button>`
      + tabs.map(t => `<button class="tab" style="--h:${TAB_HUES[t.month]}" data-goto="${t.pi}" aria-current="${t.key === curKey}" title="${MONTHS[t.month]} ${t.year}">`
        + `${MONTHS[t.month].slice(0, 3)}${multiYear ? ' ’' + String(t.year).slice(2) : ''}</button>`).join('');
  }

  function renderPager() {
    const n = S.book.length;
    const [l, r] = pagesOfView(S.view, S.single);
    $('count').textContent = S.single ? `Page ${r + 1} of ${n}` : `Pages ${l + 1}–${r + 1} of ${n}`;
    $('prev').disabled = S.view <= 0;
    $('next').disabled = S.view >= count() - 1;
  }

  function cancelFlip() {
    if (!flip) return;
    flip.anim.cancel();
    flip.leaf.remove();
    flip = null;
  }

  function flipTo(v) {
    v = Math.max(0, Math.min(count() - 1, v));
    if (v === S.view) return;
    if (flip) { cancelFlip(); renderView(); }
    const from = S.view, dir = v > from ? 1 : -1;
    S.view = v;
    renderTabs(); renderPager();
    if (S.single || reduceMotion()) {
      renderView();
      if (!reduceMotion()) pageR.animate([{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
      return;
    }
    const [ol, or] = pagesOfView(from, false), [nl, nr] = pagesOfView(v, false);
    const leaf = document.createElement('div');
    leaf.className = 'leaf ' + (dir > 0 ? 'fwd' : 'bwd');
    const front = document.createElement('div'), back = document.createElement('div');
    leaf.append(front, back);
    if (dir > 0) { fillPage(front, or, 'r', 'face'); fillPage(back, nl, 'l', 'face backface'); fillPage(pageR, nr, 'r'); }
    else { fillPage(front, ol, 'l', 'face'); fillPage(back, nr, 'r', 'face backface'); fillPage(pageL, nl, 'l'); }
    book.appendChild(leaf);
    const anim = leaf.animate(
      [{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${dir > 0 ? -180 : 180}deg)` }],
      { duration: 700, easing: 'cubic-bezier(.42,.06,.22,1)' });
    flip = { anim, leaf };
    anim.onfinish = () => {
      if (!flip || flip.anim !== anim) return;
      if (dir > 0) fillPage(pageL, nl, 'l'); else fillPage(pageR, nr, 'r');
      leaf.remove();
      flip = null;
    };
  }

  const goToPage = pi => flipTo(viewOf(pi, S.single));

  function goToLatest() {
    const last = S.entries[S.entries.length - 1];
    goToPage(last ? last.pi : S.book.findIndex(p => p.kind === 'new'));
  }

  function rebuild() {
    cancelFlip();
    ({ book: S.book, entries: S.entries } = buildBook(S.pages));
    layout();
    if (S.focusId) {
      const e = S.entries.find(x => x.page.id === S.focusId);
      if (e) S.view = viewOf(e.pi, S.single);
      S.focusId = null;
    } else if (!S.opened && S.entries.length) {
      S.view = viewOf(S.entries[S.entries.length - 1].pi, S.single);
    }
    if (!S.loading) S.opened = true;
    S.view = Math.max(0, Math.min(count() - 1, S.view));
    renderView(); renderTabs(); renderPager();
    if (q.value.trim()) runSearch();
  }

  /* search */
  function runSearch() {
    const text = q.value.trim();
    if (!text) { pop.hidden = true; return; }
    const hits = searchEntries(S.entries, text);
    pop.innerHTML = hits.length
      ? hits.map(({ entry: e, snippet: s }) => {
        const d = parseDate(e.page.date);
        const snip = s.match
          ? `${s.cutStart ? '…' : ''}${esc(s.pre)}<mark>${esc(s.match)}</mark>${esc(s.post)}${s.cutEnd ? '…' : ''}`
          : 'Matched the title';
        return `<button data-pi="${e.pi}"><span class="d">${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}<br>${d.getFullYear()}</span>`
          + `<span class="t">${esc(labelOf(e.page))}</span><span class="s">${snip}</span></button>`;
      }).join('')
      : `<div class="none">No pages mention “${esc(text)}”.</div>`;
    pop.hidden = false;
  }
  const closeSearch = () => { pop.hidden = true; };
  q.addEventListener('input', runSearch);
  q.addEventListener('focus', () => { if (q.value.trim()) runSearch(); });
  pop.addEventListener('click', ev => {
    const b = ev.target.closest('button[data-pi]');
    if (!b) return;
    closeSearch(); q.blur();
    goToPage(+b.dataset.pi);
  });
  document.addEventListener('pointerdown', ev => { if (!ev.target.closest('#search')) closeSearch(); });

  /* clicks, keys, swipes */
  const openAt = pi => {
    const p = S.book[pi];
    if (p && p.kind === 'entry') onOpenPage(p.entry.page);
    else if (p && p.kind === 'new') onNew('write');
  };
  book.addEventListener('click', ev => {
    const go = ev.target.closest('[data-goto]');
    if (go) { goToPage(+go.dataset.goto); return; }
    const act = ev.target.closest('[data-act]');
    if (act) { onNew(act.dataset.act); return; }
    if (ev.target.closest('#ribbon')) { goToLatest(); return; }
    const pg = ev.target.closest('.page');
    if (pg && !pg.closest('.leaf')) openAt(+pg.dataset.pi);
  });
  book.addEventListener('keydown', ev => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.page[role="button"]')) {
      ev.preventDefault();
      openAt(+ev.target.dataset.pi);
    }
  });
  $('prev').addEventListener('click', () => flipTo(S.view - 1));
  $('next').addEventListener('click', () => flipTo(S.view + 1));

  let touch0 = null;
  stage.addEventListener('touchstart', e => { touch0 = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!touch0) return;
    const t = e.changedTouches[0], dx = t.clientX - touch0.x, dy = t.clientY - touch0.y;
    touch0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) flipTo(S.view + (dx < 0 ? 1 : -1));
  }, { passive: true });

  document.addEventListener('keydown', ev => {
    if (isBlocked()) return;
    if (ev.key === 'Escape' && !pop.hidden) { closeSearch(); return; }
    if (ev.target.closest('input, textarea')) return;
    if (ev.key === 'ArrowRight') flipTo(S.view + 1);
    if (ev.key === 'ArrowLeft') flipTo(S.view - 1);
  });

  let resizeT;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const was = S.single;
      layout();
      if (was !== S.single) { cancelFlip(); renderView(); renderTabs(); renderPager(); }
    }, 80);
  });

  S.pages = [];
  rebuild();

  return {
    setPages(pages, { focusId = null, loading = false } = {}) {
      S.pages = pages;
      S.loading = loading;
      if (focusId) S.focusId = focusId;
      rebuild();
    },
    pageNumberOf: id => S.entries.find(e => e.page.id === id)?.no ?? '',
    closeSearch,
  };
}

const TAB_HUES = [212, 194, 170, 140, 100, 58, 40, 24, 6, 344, 312, 268];
