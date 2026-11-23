// /list/<panel>: the long version of one home page panel.
import { initChrome, fill, int, esc, infoTip, SECTIONS, currentSection } from './common.js';
import { PANELS, loadPanel } from './panels.js';
import { readFilters, isFiltered, filterQuery, matches, facetsFromItems, mountFilters } from './filters.js';

initChrome();

const key = location.pathname.split('/').filter(Boolean)[1];
const p = PANELS[key];
const title = document.getElementById('title');
const why = document.getElementById('why');
const body = document.getElementById('body');
const pager = document.getElementById('pager');
const PAGE = 50;
const filters = readFilters();
const filtered = p && p.filter && isFiltered(filters);
let facets = null;

// Tabs for the other lists in the same section. Filters carry over to lists that have them.
const section = SECTIONS.find((s) => s.id === currentSection());
let bar = null;
if (section && (section.pages.length > 1 || (p && p.filter))) {
  bar = document.createElement('nav');
  bar.className = 'subtabs';
  bar.setAttribute('aria-label', `${section.label} lists`);
  // The tabs sit in their own box so they can scroll sideways on a phone while Filters stays put.
  bar.innerHTML = section.pages.length > 1
    ? `<div class="subtab-list">${section.pages
        .map(([k, label]) => {
          const q = PANELS[k] && PANELS[k].filter ? filterQuery(filters, '') : '';
          return `<a class="subtab" href="/list/${k}${q}"${k === key ? ' aria-current="page"' : ''}>${label}</a>`;
        })
        .join('')}</div>`
    : '';
  document.querySelector('.page-head').after(bar);
}
const panel = bar && p && p.filter ? mountFilters(bar, () => facets) : null;

const noMatch = () =>
  `<p class="note">No games match these filters. <a href="${location.pathname}">Clear the filters</a>.</p>`;

if (!p) {
  title.textContent = 'Page not found';
  why.textContent = 'There is no list with that name.';
  why.hidden = false;
} else {
  // The heading is the section (Trends, Charts). The tabs under it say which list this is.
  title.textContent = section ? section.label : p.title;
  document.title = `${p.title}. BloxRadar`;
  const offset = p.paged ? Math.max(0, Number.parseInt(new URLSearchParams(location.search).get('offset') || '0', 10) || 0) : 0;
  const serverQuery = p.filter === 'server' ? filterQuery(filters, '').replace(/^\?/, '&') : '';
  fill(
    body,
    async () => {
      const d = await loadPanel(key, p.paged ? PAGE : 100, offset, serverQuery);
      if (p.filter === 'client') {
        facets = facetsFromItems(d.items);
        d.items = d.items.filter(matches(filters));
      } else if (p.filter === 'server') {
        facets = d.filters.genres;
      }
      if (panel) panel.redraw();
      if (p.why) {
        why.textContent = p.why(d);
        if (p.info) {
          const [btn, note] = infoTip(esc(p.info));
          why.insertAdjacentHTML('beforeend', ` ${btn}`);
          why.insertAdjacentHTML('afterend', note);
        }
        why.hidden = false;
      }
      if (filtered && !d.items.length) return noMatch();
      if (!p.paged) return p.render(d, 0);
      const start = Number.isFinite(d.offset) ? d.offset : offset;
      if (d.total > 0 && start >= d.total) {
        return `<p class="note">This page is past the end of the list, which has ${int(d.total)} games. <a href="${location.pathname}${filterQuery(filters)}">Go to the first page</a>.</p>`;
      }
      pageLinks(d, start);
      return p.render(d, start);
    },
    10
  );
}

function pageLinks(d, offset) {
  const at = (n) => {
    const s = new URLSearchParams(location.search);
    if (n) s.set('offset', String(n));
    else s.delete('offset');
    const q = s.toString().replace(/%2C/g, ',');
    return q ? `?${q}` : location.pathname;
  };
  const from = d.items.length ? offset + 1 : 0;
  const to = offset + d.items.length;
  const prev = offset > 0 ? `<a class="btn" href="${at(Math.max(0, offset - PAGE))}">Previous</a>` : '<button class="btn" disabled>Previous</button>';
  const next = to < d.total ? `<a class="btn" href="${at(offset + PAGE)}">Next</a>` : '<button class="btn" disabled>Next</button>';
  pager.innerHTML = `<span class="num">${int(from)} to ${int(to)} of ${int(d.total)}</span>${prev}${next}`;
  pager.hidden = false;
}
