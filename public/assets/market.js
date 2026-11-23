// /creators (front page), /creators/browse (filtered list), /creators/top and /creators/c/<id>.
import { initChrome, api, esc, int, compact, fill, empty, utcDay } from './common.js';

initChrome();

const GROUPS = [
  ['', 'All'],
  ['characters', 'Characters'],
  ['emotes', 'Emotes'],
  ['bundles', 'Animation bundles'],
  ['clothing', 'Clothing'],
  ['accessories', 'Accessories'],
];
const SORTS = [
  ['sold', 'Best selling'],
  ['favorites', 'Most favourited'],
  ['newest', 'Newest'],
  ['price-low', 'Price, low to high'],
  ['price-high', 'Price, high to low'],
];
const PERIODS = [
  ['1d', 'Past day'],
  ['7d', 'Past week'],
  ['30d', 'Past month'],
  ['all', 'All time'],
];
const PAGE = 30;

const path = location.pathname.replace(/\/+$/, '');
const view = path === '/creators' ? 'home' : path === '/creators/browse' ? 'browse' : path === '/creators/top' ? 'creators' : 'creator';
const creatorId = view === 'creator' ? path.split('/').pop() : null;
const params = new URLSearchParams(location.search);

const $ = (id) => document.getElementById(id);
const title = $('title');
const lede = $('lede');
const controls = $('controls');
const body = $('body');
const pager = $('pager');

// "Show items made by Roblox" is remembered on this device. A roblox=0 in the address wins.
function storedHide() {
  try {
    return localStorage.getItem('market-roblox') === '0';
  } catch {
    return false;
  }
}
const hideRoblox = params.has('roblox') ? params.get('roblox') === '0' : storedHide();
function rememberHide(hide) {
  try {
    localStorage.setItem('market-roblox', hide ? '0' : '1');
  } catch {
    /* private mode */
  }
}

// Builds a query string, leaving out empty values and the defaults.
function qs(o) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== '' && v !== null && v !== undefined && v !== false) s.set(k, String(v));
  const t = s.toString();
  return t ? `?${t}` : '';
}
const robloxParam = () => (hideRoblox ? { roblox: 0 } : {});

// ---------- Pieces ----------

// Our own drawing of a Robux sign (a hexagon with a square cut out), not Roblox's artwork.
const ROBUX =
  '<svg class="robux" viewBox="0 0 24 24" width="14" height="14" role="img" aria-label="Robux"><path fill="currentColor" fill-rule="evenodd" d="M12 1.5l9.2 5.25v10.5L12 22.5l-9.2-5.25V6.75L12 1.5zM9 9v6h6V9H9z"/></svg>';
const priceText = (it) =>
  it.price === null ? '<span class="muted">Off sale</span>' : it.price === 0 ? 'Free' : `${ROBUX} ${int(it.price)}`;

function card(it, n) {
  const thumb = it.thumb
    ? `<img src="${esc(it.thumb)}" alt="" loading="lazy" decoding="async" width="150" height="150" referrerpolicy="no-referrer">`
    : '';
  const limited = `<span class="tagrow">${
    it.limited ? `<span class="tag" title="${it.resale ? `Lowest resale ${int(it.resale)} Robux` : 'Limited'}">Limited${it.resale ? ` &middot; ${ROBUX} ${compact(it.resale)}` : ''}</span>` : ''
  }</span>`;
  const no = n === null ? '' : `<span class="no num"${it.rank ? ` title="${esc(it.rank.label)}. Roblox's best selling order, not a sales count."` : ''}>${n}</span>`;
  return `<article class="item">
    <a class="thumb${it.thumb ? '' : ' ph'}" href="${esc(it.url)}" target="_blank" rel="noopener" aria-label="${esc(it.name)} on Roblox" data-kind="${esc(it.kind)}">${thumb}</a>
    <a class="iname" href="${esc(it.url)}" target="_blank" rel="noopener">${no}${esc(it.name)}</a>
    <a class="by" href="/creators/c/${it.creator.id}">${esc(it.creator.name)}</a>
    <span class="why">${esc(it.why || '')}</span>
    <div class="meta"><span class="num">${priceText(it)}</span><span class="num muted" title="Favourites on Roblox">&#9825; ${compact(it.favorites)}</span></div>
    ${limited}
  </article>`;
}

function row(it, n) {
  const thumb = it.thumb
    ? `<img src="${esc(it.thumb)}" alt="" loading="lazy" decoding="async" width="52" height="52" referrerpolicy="no-referrer">`
    : '';
  return `<li class="row mrow"><span class="rank num">${n}</span>
    <a class="thumb sm${it.thumb ? '' : ' ph'}" href="${esc(it.url)}" target="_blank" rel="noopener" aria-label="${esc(it.name)} on Roblox" data-kind="">${thumb}</a>
    <span class="t"><a class="iname" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.name)}</a><a class="by" href="/creators/c/${it.creator.id}">${esc(it.creator.name)}</a></span>
    <span class="val num">${priceText(it)}<small>${it.limited ? 'Limited' : `&#9825; ${compact(it.favorites)}`}</small></span></li>`;
}

// numbered: show the position in Roblox's best selling order. Left off where the order is not that.
const cards = (list, start = 0, numbered = true) => `<div class="mgrid">${list.map((it, i) => card(it, numbered ? start + i + 1 : null)).join('')}</div>`;

// An item picture that fails to load turns into the same placeholder as an item with no picture.
document.addEventListener(
  'error',
  (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.closest('.thumb')) return;
    img.closest('.thumb').classList.add('ph');
    img.remove();
  },
  true
);

function robloxToggle() {
  return `<label class="check"><input type="checkbox" id="roblox" ${hideRoblox ? '' : 'checked'}> Include items made by Roblox</label>`;
}
function wireRobloxToggle(apply) {
  const box = $('roblox');
  if (!box) return;
  box.addEventListener('change', () => {
    rememberHide(!box.checked);
    apply(!box.checked);
  });
}

// A search with no result: our lists only hold the top sellers, so point at Roblox's own search.
const notFound = (text) =>
  `<p class="note">Nothing for “${esc(text)}” in our lists. <a class="ext" href="https://www.roblox.com/catalog?Keyword=${encodeURIComponent(text)}" target="_blank" rel="noopener">Search Roblox for it</a>.</p>`;

const searchRoblox = (text) =>
  `<p class="fine">Not here? <a class="ext" href="https://www.roblox.com/catalog?Keyword=${encodeURIComponent(text)}" target="_blank" rel="noopener">Search Roblox for “${esc(text)}”</a>.</p>`;

const noData = () =>
  empty('No data yet. It fills in after the first daily catalog run.');

// ---------- Front page ----------

const cstat = (n, l) => `<span class="cstat"><span class="num">${n}</span><span>${l}</span></span>`;
const creatorRows = (list) => `<ol class="creators">${list
  .map(
    (c, i) => `<li><a class="crow" href="/creators/c/${c.id}">
  <span class="rank num">${i + 1}</span>
  ${c.icon ? `<img class="cav" src="${esc(c.icon)}" alt="" loading="lazy" width="80" height="80" referrerpolicy="no-referrer">` : '<span class="cav"></span>'}
  <span class="cname">${esc(c.name)}</span>
  <span class="cstats">${cstat(int(c.inTop), 'items in the top 300')}${cstat(`#${int(c.best)}`, 'best item rank')}${cstat(compact(c.favorites), 'favourites')}</span></a></li>`
  )
  .join('')}</ol>`;

async function creatorsPage() {
  document.title = 'Top creators. BloxRadar';
  title.textContent = 'Top creators';
  const csort = params.get('csort') === 'best' ? 'best' : 'items';
  lede.textContent =
    csort === 'best'
      ? "Ranked by the best selling item each creator has this week."
      : "Ranked by how many of their items are in Roblox's top 300 best sellers this week.";
  $('crumb').innerHTML = '<a href="/">Home</a> / <a href="/creators">Creators</a>';
  const sortLink = (k, label) => `<a class="subtab" href="/creators/top${qs({ ...(k === 'best' ? { csort: 'best' } : {}), ...robloxParam() })}"${k === csort ? ' aria-current="page"' : ''}>${label}</a>`;
  controls.innerHTML = `<div class="mbar">${robloxToggle()}<span class="csorts">${sortLink('items', 'Most items in top 300')}${sortLink('best', 'Best selling item')}</span></div>`;
  wireRobloxToggle((hide) => {
    const u = new URL(location.href);
    u.searchParams.set('roblox', hide ? '0' : '1');
    location.href = u.toString();
  });
  await fill(
    body,
    async () => {
      const d = await api(`/api/market/creators${qs({ ...(csort === 'best' ? { csort: 'best' } : {}), ...robloxParam() })}`);
      if (!d.day) return noData();
      return d.creators.length ? `<section class="panel">${creatorRows(d.creators)}</section>` : empty('No creators to show.');
    },
    6
  );
}

// Panel widths in a 12 column grid, in the order shown. Each row adds up to 12 so no row is ragged.
const LAYOUT = [
  ['sold', 7],
  ['favorites', 5],
  ['characters', 4],
  ['emotes', 4],
  ['bundles', 4],
  ['clothing', 6],
  ['accessories', 6],
  ['newest', 6],
  ['limited', 6],
];
const SPAN = Object.fromEntries(LAYOUT);
const TITLES = { characters: 'Top characters', emotes: 'Top emotes', bundles: 'Top animation bundles', clothing: 'Top clothing', accessories: 'Top accessories' };

async function home() {
  document.title = 'Creators. BloxRadar';
  document.querySelector('.page-head').hidden = true;
  controls.innerHTML = '';
  await fill(
    body,
    async () => {
      const d = await api(`/api/market/home${qs(robloxParam())}`);
      if (!d.day) return noData();
      const top = (d.sections.find((s) => s.id === 'sold') || { items: [] }).items.slice(0, 3);
      const hero = `<section class="mhero" aria-label="Overview">
        <div class="mh-text">
          <div class="label"><span class="beat" aria-hidden="true"></span>BloxRadar Creators</div>
          <h1>What Roblox is buying this week</h1>
          <p class="muted">Top selling items and creators. Updated ${utcDay(d.day)}.</p>
          ${robloxToggle()}
        </div>
        <ol class="mh-strip">${top
          .map(
            (it, i) => `<li><a href="${esc(it.url)}" target="_blank" rel="noopener" class="thumb${it.thumb ? '' : ' ph'}" aria-label="${esc(it.name)} on Roblox" data-kind="${esc(it.kind)}">${
              it.thumb ? `<img src="${esc(it.thumb)}" alt="" width="150" height="150" referrerpolicy="no-referrer">` : ''
            }</a><a class="iname" href="${esc(it.url)}" target="_blank" rel="noopener"><span class="no num">${i + 1}</span>${esc(it.name)}</a><a class="by" href="/creators/c/${it.creator.id}">${esc(it.creator.name)}</a></li>`
          )
          .join('')}</ol>
      </section>`;
      const panel = (s) => `<section class="panel span-${SPAN[s.id] || 6}">
        <div class="panel-head"><h2>${esc(TITLES[s.id] || s.title)}</h2><a class="more" href="${esc(s.link + (hideRoblox ? '&roblox=0' : ''))}">See all &rarr;</a></div>
        <ol class="rows">${s.items.map((it, i) => row(it, i + 1)).join('')}</ol>
      </section>`;
      const creators = d.creators.length
        ? `<section class="panel span-12">
        <div class="panel-head"><h2>Top creators this week</h2><a class="more" href="/creators/top${hideRoblox ? '?roblox=0' : ''}">See all &rarr;</a></div>
        <p class="why">Ranked by how many of their items are in Roblox's top 300 best sellers this week.</p>
        ${creatorRows(d.creators)}</section>`
        : '';
      return `${hero}<div class="grid">${LAYOUT.map(([id]) => d.sections.find((x) => x.id === id)).filter(Boolean).map(panel).join('')}${creators}</div>`;
    },
    4
  );
  wireRobloxToggle((hide) => {
    const u = new URL(location.href);
    u.searchParams.set('roblox', hide ? '0' : '1');
    location.href = u.toString();
  });
}

// ---------- Filtered list (browse and creator pages) ----------

function readQuery() {
  return {
    group: params.get('group') || '',
    q: params.get('q') || '',
    kind: params.get('kind') || '',
    sort: params.get('sort') || 'sold',
    period: params.get('period') || '7d',
    min: params.get('min') || '',
    max: params.get('max') || '',
    limited: params.get('limited') === '1',
    offset: Math.max(0, Number.parseInt(params.get('offset') || '0', 10) || 0),
  };
}

const opts = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');

function filterBar(q, kinds) {
  const kindOpts = [['', 'All types'], ...kinds.map((k) => [k.name, `${k.name} (${int(k.count)})`])];
  const showPeriod = q.sort === 'sold' && !q.kind;
  return `<form class="filters" id="filters">
    <label>Sort<select name="sort">${opts(SORTS, q.sort)}</select></label>
    ${showPeriod ? `<label>Period<select name="period">${opts(PERIODS, q.period)}</select></label>` : ''}
    <label>Type<select name="kind">${opts(kindOpts, q.kind)}</select></label>
    <label>Min price<input name="min" type="number" inputmode="numeric" min="0" value="${esc(q.min)}" placeholder="Robux"></label>
    <label>Max price<input name="max" type="number" inputmode="numeric" min="0" value="${esc(q.max)}" placeholder="Robux"></label>
    <label class="check"><input type="checkbox" name="limited"${q.limited ? ' checked' : ''}> Limiteds only</label>
    ${view === 'browse' ? robloxToggle() : ''}
  </form>`;
}

// Sends the chosen filters to the address, which reloads the list. Any change starts at page one.
function wireFilters(q) {
  const form = $('filters');
  const go = () => {
    const f = new FormData(form);
    const next = {
      q: q.q,
      group: q.group,
      kind: f.get('kind') || '',
      sort: f.get('sort') === 'sold' ? '' : f.get('sort'),
      period: f.get('period') && f.get('period') !== '7d' ? f.get('period') : '',
      min: f.get('min') || '',
      max: f.get('max') || '',
      limited: f.get('limited') ? 1 : '',
      ...(view === 'browse' ? (form.querySelector('#roblox')?.checked ? {} : { roblox: 0 }) : {}),
    };
    if (view === 'browse') rememberHide(next.roblox === 0);
    location.search = qs(next);
  };
  form.addEventListener('change', go);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    go();
  });
}

function pageLinks(d) {
  const at = (n) => {
    const s = new URLSearchParams(location.search);
    if (n) s.set('offset', String(n));
    else s.delete('offset');
    const t = s.toString();
    return t ? `?${t}` : location.pathname;
  };
  const from = d.items.length ? d.offset + 1 : 0;
  const to = d.offset + d.items.length;
  const prev = d.offset > 0 ? `<a class="btn" href="${at(Math.max(0, d.offset - PAGE))}">Previous</a>` : '<button class="btn" disabled>Previous</button>';
  const next = to < d.total ? `<a class="btn" href="${at(d.offset + PAGE)}">Next</a>` : '<button class="btn" disabled>Next</button>';
  pager.innerHTML = `<span class="num">${int(from)} to ${int(to)} of ${int(d.total)}</span>${prev}${next}`;
  pager.hidden = false;
}

async function list(extra, intro) {
  const q = readQuery();
  const query = {
    q: q.q,
    group: q.group,
    kind: q.kind,
    sort: q.sort === 'sold' ? '' : q.sort,
    period: q.period === '7d' ? '' : q.period,
    min: q.min,
    max: q.max,
    limited: q.limited ? 1 : '',
    offset: q.offset || '',
    limit: PAGE,
    ...robloxParam(),
    ...extra,
  };
  // The filter bar is drawn once the first answer says which types exist.
  await fill(
    body,
    async () => {
      const d = await api(`/api/market/items${qs(query)}`);
      if (!d.day) return noData();
      controls.insertAdjacentHTML('beforeend', filterBar(q, d.kinds));
      wireFilters(q);
      if (intro) intro(d);
      if (!d.items.length) return q.q ? notFound(q.q) : empty('No items match these filters.');
      pageLinks(d);
      return cards(d.items, d.offset, q.sort === 'sold' && !extra?.creator) + (q.q ? searchRoblox(q.q) : '');
    },
    4
  );
}

function browse() {
  const q = readQuery();
  const g = GROUPS.find(([k]) => k === q.group);
  title.textContent = q.q ? `Results for \u201c${q.q}\u201d` : g && g[0] ? g[1] : 'Browse items';
  document.title = `${title.textContent}. BloxRadar`;
  lede.textContent = q.q ? 'Items and creators matching your search.' : 'Filter by type and price, hide Roblox-made items, or open a creator to see their store.';
  $('crumb').innerHTML = '<a href="/">Home</a> / <a href="/creators">Creators</a>';
  const keep = { q: q.q, kind: '', sort: q.sort === 'sold' ? '' : q.sort, ...robloxParam() };
  controls.innerHTML = `<nav class="subtabs" aria-label="Item groups"><div class="subtab-list">${GROUPS.map(
    ([k, label]) => `<a class="subtab" href="/creators/browse${qs({ ...keep, group: k })}"${k === q.group ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('')}</div></nav>`;
  return list({});
}

// Icon, member or follower count and description, read from Roblox. Drawn when it arrives, and
// left out if Roblox did not answer or the creator has nothing to show.
async function profile(c) {
  let p = null;
  try {
    p = (await api(`/api/market/creator/${creatorId}/profile`)).profile;
  } catch {
    return;
  }
  if (!p) return;
  const el = $('cprofile');
  if (!el) return;
  const icon = p.icon ? `<img class="cicon" src="${esc(p.icon)}" alt="" width="200" height="200" referrerpolicy="no-referrer">` : '';
  const count = p.count === null ? '' : `<span class="cpill num">${compact(p.count)} ${p.countLabel}</span>`;
  const badge = p.verified ? '<span class="cpill">Verified</span>' : '';
  if (!icon && !count && !badge && !p.description) return;
  el.innerHTML = `<div class="cprof">${icon}<div class="cbody"><div class="cpills">${count}${badge}</div>${p.description ? `<p class="cdesc">${esc(p.description)}</p>` : ''}</div></div>`;
}

async function creator() {
  $('crumb').innerHTML = '<a href="/">Home</a> / <a href="/creators/top">Top Creators</a>';
  title.innerHTML = '&nbsp;';
  let info;
  try {
    info = await api(`/api/market/creator/${creatorId}`);
  } catch (err) {
    title.textContent = 'Creator not found';
    lede.textContent = err.status === 404 ? 'We have no items by this creator.' : 'Could not load this. Try again in a minute.';
    return;
  }
  const c = info.creator;
  title.textContent = c.name;
  document.title = `${c.name}. BloxRadar`;
  lede.hidden = true;
  const open = document.createElement('a');
  open.className = 'btn cbtn';
  open.href = c.url;
  open.target = '_blank';
  open.rel = 'noopener';
  open.textContent = 'Open on Roblox';
  title.parentElement.append(open);
  const stat = (n, l) => `<div class="stat"><span class="num">${n}</span><span>${l}</span></div>`;
  controls.innerHTML = `<div id="cprofile"></div><div class="stats">${stat(int(info.count), 'top selling items')}${stat(
    info.bestWeekly ? `#${int(info.bestWeekly)}` : 'none',
    'best item rank'
  )}${stat(compact(info.favorites), 'favourites in total')}${stat(int(info.limiteds), 'limiteds')}</div>`;
  profile(c);
  await list({ creator: creatorId, roblox: '' });
  const more = document.createElement('p');
  more.className = 'fine';
  more.textContent = "Shows this creator's top selling items.";
  body.after(more);
}

if (view === 'home') home();
else if (view === 'creators') creatorsPage();
else if (view === 'browse') browse();
else creator();
