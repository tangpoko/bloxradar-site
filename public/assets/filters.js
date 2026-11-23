// Filters panel on the game lists: genre and a minimum player count, kept in the URL as
// ?genre=A,B&min=1000 so a filtered list can be shared. Most played is filtered by the server
// (it is paged); the shorter lists are filtered here, from the rows already loaded.
import { esc, int } from './common.js';

// Same steps and label as FILTERS in server/config.js.
export const MIN_STEPS = [1000, 10000, 100000];
const NO_GENRE = 'Other';
const stepLabel = (n) => `${n >= 1000 ? `${n / 1000}K` : n}+`;

export function readFilters(search = location.search) {
  const p = new URLSearchParams(search);
  const genres = [...new Set((p.get('genre') || '').split(',').map((s) => s.trim()).filter(Boolean))];
  const min = Number(p.get('min'));
  return { genres, min: MIN_STEPS.includes(min) ? min : 0 };
}

export const isFiltered = (f) => f.genres.length > 0 || f.min > 0;

// Query string for a filter state, keeping any other parameters except offset.
export function filterQuery(f, search = location.search) {
  const p = new URLSearchParams(search);
  p.delete('offset');
  p.delete('genre');
  p.delete('min');
  if (f.genres.length) p.set('genre', [...f.genres].sort().join(','));
  if (f.min) p.set('min', String(f.min));
  const s = p.toString().replace(/%2C/g, ',');
  return s ? `?${s}` : '';
}

const genreOf = (g) => g.genre || NO_GENRE;
export const matches = (f) => (g) => g.players >= f.min && (!f.genres.length || f.genres.includes(genreOf(g)));

// Counts per genre from loaded rows, in the shape the top games API returns: counts[0] is every
// game in the genre, counts[i] those with at least MIN_STEPS[i - 1] players.
export function facetsFromItems(items) {
  const by = new Map();
  for (const g of items) {
    const k = genreOf(g);
    const r = by.get(k) || { genre: k, counts: [0, ...MIN_STEPS.map(() => 0)] };
    r.counts[0] += 1;
    MIN_STEPS.forEach((m, i) => {
      if (g.players >= m) r.counts[i + 1] += 1;
    });
    by.set(k, r);
  }
  return [...by.values()];
}

// Games in one genre at the chosen minimum.
const countAt = (row, min) => row.counts[min ? MIN_STEPS.indexOf(min) + 1 : 0] || 0;

// Adds the Filters button to the start of `bar` and wires its panel. getFacets() returns the
// per-genre counts once the list has loaded. Choosing "Show" loads the page with the new filters.
export function mountFilters(bar, getFacets) {
  const applied = readFilters();
  let draft = { genres: [...applied.genres], min: applied.min };

  const wrap = document.createElement('div');
  wrap.className = 'filter-wrap';
  const active = applied.genres.length + (applied.min ? 1 : 0);
  wrap.innerHTML = `<button class="subtab filter-btn" type="button" aria-expanded="false" aria-controls="filter-pop">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M4.5 8h7M7 12h2"/></svg>Filters${active ? `<span class="filter-n num">${active}</span>` : ''}
    </button>
    <div class="filter-pop" id="filter-pop" role="dialog" aria-label="Filters" hidden></div>`;
  bar.prepend(wrap);
  const btn = wrap.querySelector('.filter-btn');
  const pop = wrap.querySelector('.filter-pop');

  const draw = () => {
    const facets = getFacets();
    if (!facets) {
      pop.innerHTML = '<p class="filter-wait muted">Loading</p>';
      return;
    }
    const rows = [...facets].sort((a, b) =>
      a.genre === NO_GENRE ? 1 : b.genre === NO_GENRE ? -1 : a.genre.localeCompare(b.genre)
    );
    const picked = (r) => !draft.genres.length || draft.genres.includes(r.genre);
    const total = rows.filter(picked).reduce((s, r) => s + countAt(r, draft.min), 0);
    const chip = (attrs, label, n, on) =>
      `<button type="button" class="chip" ${attrs} aria-pressed="${on}"${!n && !on ? ' disabled' : ''}>${esc(label)} <span class="num">${int(n)}</span></button>`;
    pop.innerHTML = `<div class="filter-sec">
        <h2>Genre</h2>
        <div class="chips">${rows.map((r) => chip(`data-genre="${esc(r.genre)}"`, r.genre, countAt(r, draft.min), draft.genres.includes(r.genre))).join('')}</div>
      </div>
      <div class="filter-sec">
        <h2>Players right now</h2>
        <div class="chips">${MIN_STEPS.map((m) =>
          chip(`data-min="${m}"`, stepLabel(m), rows.filter(picked).reduce((s, r) => s + countAt(r, m), 0), draft.min === m)
        ).join('')}</div>
      </div>
      <div class="filter-foot">
        <button type="button" class="filter-clear"${isFiltered(draft) ? '' : ' disabled'}>Clear</button>
        <button type="button" class="filter-show">Show ${int(total)} ${total === 1 ? 'game' : 'games'}</button>
      </div>`;
  };

  const open = (on) => {
    pop.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    if (on) {
      draft = { genres: [...applied.genres], min: applied.min };
      draw();
      (pop.querySelector('.chip:not([disabled])') || pop.querySelector('button'))?.focus();
    }
  };

  btn.addEventListener('click', () => open(pop.hidden));
  pop.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.genre !== undefined) {
      const g = b.dataset.genre;
      draft.genres = draft.genres.includes(g) ? draft.genres.filter((x) => x !== g) : [...draft.genres, g];
    } else if (b.dataset.min) {
      const m = Number(b.dataset.min);
      draft.min = draft.min === m ? 0 : m;
    } else if (b.classList.contains('filter-clear')) {
      draft = { genres: [], min: 0 };
    } else if (b.classList.contains('filter-show')) {
      location.search = filterQuery(draft);
      return;
    }
    const key = b.dataset.genre ?? b.dataset.min ?? b.className;
    draw();
    // Keep focus on the same control after redrawing.
    const again = [...pop.querySelectorAll('button')].find((x) => (x.dataset.genre ?? x.dataset.min ?? x.className) === key);
    (again && !again.disabled ? again : pop.querySelector('.filter-show')).focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) {
      open(false);
      btn.focus();
    }
  });
  // composedPath, not contains: a chip click redraws the panel, so the target is already gone.
  document.addEventListener('click', (e) => {
    if (!pop.hidden && !e.composedPath().includes(wrap)) open(false);
  });

  return { redraw: () => !pop.hidden && draw() };
}
