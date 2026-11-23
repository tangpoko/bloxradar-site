// Shared helpers for every page: fetching, number and time formatting, row pieces,
// the header (search, total players, last update) and the theme switch.

export async function api(path) {
  const res = await fetch(path, { headers: { accept: 'application/json' } });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    const err = new Error((body && body.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const intFmt = new Intl.NumberFormat();
const compactFmt = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
export const int = (n) => (n === null || n === undefined ? 'n/a' : intFmt.format(n));
export const compact = (n) => (n === null || n === undefined ? 'n/a' : compactFmt.format(n));

// Change versus 24 hours ago. Color plus an arrow plus a sign, so it reads without color too.
// When there is no percentage (the old value was 0), the direction comes from the absolute change.
export function change(pct, abs, { withAbs = false } = {}) {
  const hasPct = pct !== null && pct !== undefined;
  const hasAbs = abs !== null && abs !== undefined;
  if (!hasPct && !hasAbs) return '<span class="chg na num" title="No reading from 24 hours ago">new</span>';
  if (!hasPct) {
    pct = null;
    withAbs = true; // the absolute number is the only figure there is
  }
  const dir = hasPct ? (Math.abs(pct) < 0.5 ? 'flat' : pct > 0 ? 'up' : 'down') : abs > 0 ? 'up' : abs < 0 ? 'down' : 'flat';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '▬';
  const label = dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'flat';
  const pctText = pct === null ? '' : `${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`;
  const absText = withAbs && abs !== null && abs !== undefined ? ` <span class="muted">${abs > 0 ? '+' : abs < 0 ? '-' : ''}${int(Math.abs(abs))}</span>` : '';
  return `<span class="chg ${dir} num" title="${label} versus 24 hours ago"><span aria-hidden="true">${arrow}</span><span class="sr-only">${label}</span> ${pctText}${absText}</span>`;
}

// Times arrive in UTC and are shown in the viewer's own time zone.
const dtFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const dFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
export const localDateTime = (iso) => (iso ? dtFmt.format(new Date(iso)) : 'n/a');
export const localDate = (iso) => (iso ? dFmt.format(new Date(iso)) : 'n/a');
// For values that are a UTC calendar day (stored as midnight UTC), so they do not shift a day back
// for viewers west of UTC.
const dayFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });
export const utcDay = (iso) => (iso ? dayFmt.format(new Date(iso)) : 'n/a');
export function ago(iso) {
  if (!iso) return 'n/a';
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 90) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
export const timeTag = (iso, text) => `<time datetime="${esc(iso)}" title="${esc(localDateTime(iso))}">${esc(text ?? ago(iso))}</time>`;

export const gameUrl = (id) => `/game/${id}`;
export const studioUrl = (type, id) => `/studio/${type === 'Group' ? 'g' : 'u'}/${id}`;

export function icon(src, cls = '') {
  return src
    ? `<img class="icon ${cls}" src="${esc(src)}" alt="" loading="lazy" decoding="async" width="36" height="36" referrerpolicy="no-referrer">`
    : `<span class="icon ${cls}" aria-hidden="true"></span>`;
}

export function creatorLabel(c) {
  if (!c) return '';
  return `${esc(c.name)}${c.type === 'Group' ? '' : ' <span class="muted">(solo)</span>'}`;
}

export function gameCell(g, { sub } = {}) {
  return `<a class="game" href="${gameUrl(g.id)}">${icon(g.icon)}<span class="t"><span class="name">${esc(g.name)}</span><span class="by">${sub ?? creatorLabel(g.creator)}</span></span></a>`;
}

// Small line chart from a list of numbers.
export function spark(values, w = 120, h = 30) {
  if (!values || values.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"></svg>`;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path class="a" d="${line}L${w},${h}L0,${h}Z"/><path class="l" d="${line}"/></svg>`;
}

export const skeleton = (n = 6) => Array.from({ length: n }, () => '<div class="skel"></div>').join('');
export const empty = (msg) => `<p class="note">${esc(msg)}</p>`;
export const failed = (err) =>
  `<p class="note err">Could not load this. ${err && err.status === 404 ? 'It was not found.' : 'Try again in a minute.'}</p>`;

// Fills an element from an async render function, with loading and error states.
// isStale() returning true means a newer fill of the same element has started, so this one
// must not touch the element any more.
export async function fill(el, render, rows = 6, isStale = () => false) {
  el.innerHTML = skeleton(rows);
  el.setAttribute('aria-busy', 'true');
  try {
    const html = await render();
    if (!isStale()) el.innerHTML = html;
  } catch (err) {
    if (isStale()) return;
    console.error(err);
    el.innerHTML = failed(err);
  } finally {
    if (!isStale()) el.removeAttribute('aria-busy');
  }
}

// ---------- Tabs ----------

// Wires a role="tablist": click, or Left/Right/Home/End, to choose. Only the chosen tab is in the
// Tab order. onSelect(tab) runs whenever the chosen tab changes.
// Time ranges for the player graphs. A range is offered once our readings cover at least 90% of
// it, so a graph never claims more history than we have. 24 hours is always offered.
export const RANGES = [
  ['24h', '24 hours', 1],
  ['7d', '7 days', 7],
  ['30d', '30 days', 30],
  ['60d', '60 days', 60],
  ['90d', '90 days', 90],
  ['180d', '180 days', 180],
  ['1y', '1 year', 365],
];
export function rangeButtons(since, idPrefix, current, controls) {
  const have = since ? (Date.now() - Date.parse(since)) / 86400000 : 0;
  return RANGES.filter(([, , d]) => d === 1 || have >= d * 0.9)
    .map(
      ([k, label]) =>
        `<button class="tab" role="tab" type="button" id="${idPrefix}-${k}" data-r="${k}" aria-selected="${k === current}" aria-controls="${controls}">${label}</button>`
    )
    .join('');
}

export function tabs(list, onSelect) {
  const items = [...list.querySelectorAll('[role="tab"]')];
  const select = (tab, { focus = false, silent = false } = {}) => {
    for (const t of items) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    }
    if (focus) tab.focus();
    if (!silent) onSelect(tab);
  };
  items.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const n = items.length;
      const next = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(items[next], { focus: true });
    });
  });
  select(items.find((t) => t.getAttribute('aria-selected') === 'true') || items[0], { silent: true });
  return select;
}

// ---------- Theme ----------

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem('theme', t);
  } catch {
    /* private mode */
  }
  document.dispatchEvent(new CustomEvent('themechange'));
}

// ---------- Header and footer ----------

// The site menu. Each section is one or more list pages (/list/<panel>). Sections with more
// than one page get a row of tabs above the list.
// Roblox's main charts, by the id Roblox uses. Each gets its own list page. The "Trending in"
// genre charts are left out.
export const CHARTS = [
  // [id, tab label, page title]
  ['top-earning', 'Top Earning', 'Top Earning Games'],
  ['top-trending', 'Top Trending', 'Top Trending Games'],
  ['up-and-coming', 'Up-and-Coming', 'Up-and-Coming Games'],
  ['top-playing-now', 'Playing Now', 'Top Playing Now Games'],
  ['most-popular', 'Most Popular', 'Most Popular Games'],
  ['top-rated', 'Top Rated', 'Top Rated Games'],
  ['top-revisited', 'Revisited', 'Top Revisited Games'],
  ['fun-with-friends', 'Fun with Friends', 'Fun with Friends Games'],
  ['top-paid-access', 'Paid Access', 'Top Paid Access Games'],
];

export const SECTIONS = [
  { id: 'overview', label: 'Overview', href: '/', pages: [] },
  {
    id: 'games',
    label: 'Games',
    href: '/list/top',
    pages: [
      ['top', 'Most played'],
      ['breakouts', 'Breaking out'],
      ['rising', 'Rising stars'],
      ['new-games', 'New'],
      ['new-highs', 'New highs'],
      ['records-today', 'Records today'],
      ['saving', 'Most saved'],
      ['rated', 'Best rated'],
      ['genres', 'Genres'],
    ],
  },
  {
    id: 'trends',
    label: 'Trends',
    href: '/list/trends',
    pages: [['trends', 'By players'], ['trends-growing', 'Growing fastest'], ['trends-new', 'In new games']],
  },
  { id: 'charts', label: 'Charts', href: '/list/top-earning', pages: CHARTS },
  {
    id: 'studios',
    label: 'Studios',
    href: '/list/studios',
    pages: [['studios', 'Studios'], ['solo', 'Solo developers'], ['creators-growing', 'Growing fastest']],
  },
];

// Which section the current page belongs to. Game pages and their cards count as Games.
export function currentSection(pathname = location.pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) return 'overview';
  if (parts[0] === 'game' || parts[0] === 'card') return 'games';
  if (parts[0] === 'list') return SECTIONS.find((s) => s.pages.some(([k]) => k === parts[1]))?.id ?? null;
  return null;
}

// The creators side has its own menu. Best selling opens a list of item types. Experiences (games) is
// the main site.
const MARKET_TYPES = [
  ['characters', 'Characters'],
  ['emotes', 'Emotes'],
  ['clothing', 'Clothing'],
  ['accessories', 'Accessories'],
  ['bundles', 'Animation bundles'],
];
function marketNav() {
  const path = location.pathname.replace(/\/+$/, '');
  const q = new URLSearchParams(location.search);
  const browse = path === '/creators/browse';
  const sort = q.get('sort') || 'sold';
  const limited = q.get('limited') === '1';
  const hide = q.get('roblox') === '0' ? '&roblox=0' : '';
  const link = (href, label, current) => `<a class="pill" href="${href}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
  const selling = browse && sort === 'sold' && !limited;
  return [
    link('/creators', 'Overview', path === '/creators'),
    `<div class="dd">
      <button class="pill dd-btn" type="button" aria-expanded="false" aria-haspopup="true"${selling ? ' aria-current="page"' : ''}>Best selling <span aria-hidden="true">&#9662;</span></button>
      <div class="dd-menu" role="menu" hidden>
        <a role="menuitem" href="/creators/browse?sort=sold${hide}">All best sellers</a>
        ${MARKET_TYPES.map(([g, l]) => `<a role="menuitem" href="/creators/browse?group=${g}&sort=sold${hide}">${l}</a>`).join('')}
      </div>
    </div>`,
    link(`/creators/browse?sort=newest${hide}`, 'Newest', browse && sort === 'newest'),
    link(`/creators/browse?limited=1&sort=favorites${hide}`, 'Limiteds', browse && limited),
    link('/creators/top', 'Top Creators', path === '/creators/top' || path.startsWith('/creators/c/')),
  ].join('');
}

// The Best selling menu is fixed-positioned because the section bar scrolls sideways on a phone,
// which would clip a menu inside it.
function wireDropdown() {
  const btn = document.querySelector('.dd-btn');
  if (!btn) return;
  const menu = btn.nextElementSibling;
  const close = () => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };
  btn.addEventListener('click', () => {
    if (!menu.hidden) return close();
    const r = btn.getBoundingClientRect();
    menu.style.top = `${r.bottom + 6}px`;
    menu.style.left = `${Math.min(r.left, innerWidth - 220)}px`;
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !e.target.closest('.dd')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      close();
      btn.focus();
    }
  });
  addEventListener('scroll', close, { passive: true });
}

export function initChrome() {
  const market = document.documentElement.dataset.area === 'market';
  const top = document.getElementById('top');
  top.innerHTML = `<div class="top-in">
    <div class="brandbox">
      <a class="brand" href="${market ? '/creators' : '/'}"><span class="mark" aria-hidden="true"></span>BloxRadar</a>
      <div class="switch" role="group" aria-label="Site">
        <a class="sw exp" href="/"${market ? '' : ' aria-current="page"'}>Experiences</a>
        <a class="sw mk" href="/creators"${market ? ' aria-current="page"' : ''}>Creators</a>
      </div>
    </div>
    ${market ? '<div class="pulse"></div>' : '<div class="pulse" id="pulse"><span class="muted">Loading</span></div>'}
    ${
      market
        ? `<form class="search" role="search" action="/creators/browse" autocomplete="off">
      <label class="sr-only" for="q">Search items and creators</label>
      <input id="q" name="q" type="search" placeholder="Search items and creators" maxlength="60" value="${esc(new URLSearchParams(location.search).get('q') || '')}">
    </form>`
        : `<form class="search" role="search" action="/search" autocomplete="off">
      <label class="sr-only" for="q">Search games</label>
      <input id="q" name="q" type="search" placeholder="Search games" maxlength="100"
        role="combobox" aria-expanded="false" aria-controls="suggest" aria-autocomplete="list">
      <div class="suggest" id="suggest" role="listbox" hidden></div>
    </form>`
    }
    <span class="sr-only" id="pulse-status" aria-live="polite"></span>
    <button class="theme-btn" id="theme" type="button"></button>
  </div>
  <nav class="sections" aria-label="Sections"><div class="sections-in">${
    market
      ? marketNav()
      : SECTIONS.map((s) => `<a class="pill" href="${s.href}"${s.id === currentSection() ? ' aria-current="page"' : ''}>${s.label}</a>`).join('')
  }</div></nav>`;
  if (market) wireDropdown();

  const btn = document.getElementById('theme');
  const label = () => {
    const t = currentTheme();
    btn.textContent = t === 'dark' ? 'Light' : 'Dark';
    btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  };
  btn.addEventListener('click', () => {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    label();
  });
  label();

  if (!market) {
    initSearch();
    loadPulse();
    setInterval(loadPulse, 60000);
  }

  const foot = document.createElement('footer');
  foot.className = 'foot';
  foot.innerHTML =
    '<p>Player counts are read from Roblox every 10 minutes. Times are shown in your time zone.</p>' +
    '<p><a class="x-link" href="https://x.com/BloxRadar" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-6.3L6.4 22H3.3l7.3-8.3L1 2h6.3l4.4 5.8L18.9 2Zm-1.1 18.1h1.7L6.3 3.8H4.5l13.3 16.3Z"/></svg>Follow BloxRadar on X</a></p>' +
    '<p>Not affiliated with Roblox Corporation.</p>';
  document.body.appendChild(foot);
}

// A small "i" button that shows or hides an explanation. Returns [buttonHtml, noteHtml]; put the
// note where the text should appear. Wired by one listener on the document.
let infoSeq = 0;
export function infoTip(text, label = 'How this is worked out') {
  const id = `info-${++infoSeq}`;
  return [
    `<button class="info-btn" type="button" aria-expanded="false" aria-controls="${id}" title="${esc(label)}"><span aria-hidden="true">i</span><span class="sr-only">${esc(label)}</span></button>`,
    `<p class="info-note" id="${id}" hidden>${text}</p>`,
  ];
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.info-btn');
  if (!btn) return;
  const note = document.getElementById(btn.getAttribute('aria-controls'));
  if (!note) return;
  note.hidden = !note.hidden;
  btn.setAttribute('aria-expanded', String(!note.hidden));
});

// "in 3 days", "in 5 h", "2 days left" style times for events.
export function until(iso) {
  if (!iso) return 'n/a';
  const s = (Date.parse(iso) - Date.now()) / 1000;
  const abs = Math.abs(s);
  const text = abs < 3600 ? `${Math.max(1, Math.round(abs / 60))} min` : abs < 48 * 3600 ? `${Math.round(abs / 3600)} h` : `${Math.round(abs / 86400)} days`;
  return s >= 0 ? `in ${text}` : `${text} ago`;
}

let lastStale = null;
async function loadPulse() {
  const el = document.getElementById('pulse');
  try {
    const s = await api('/api/summary');
    const lastAt = s.lastGoodRun;
    const stale = !lastAt || Date.now() - Date.parse(lastAt) > 30 * 60000;
    // Screen readers hear only a change between Live and Delayed, not every minute's new total.
    if (lastStale !== null && lastStale !== stale) {
      document.getElementById('pulse-status').textContent = stale ? 'Numbers are delayed.' : 'Numbers are live again.';
    }
    lastStale = stale;
    const pct = s.totalPlayers !== null && s.prevTotal ? ((s.totalPlayers - s.prevTotal) / s.prevTotal) * 100 : null;
    el.innerHTML = `<span class="live${stale ? ' stale' : ''}">${stale ? 'Delayed' : 'Live'}</span>
      <span class="total num" title="Players in all tracked games">${int(s.totalPlayers)}</span>
      ${pct === null ? '' : change(Math.round(pct * 10) / 10, null)}
      <span class="when">Updated ${timeTag(lastAt)}</span>`;
    document.dispatchEvent(new CustomEvent('summary', { detail: s }));
  } catch {
    el.innerHTML = '<span class="muted">Live numbers unavailable</span>';
  }
}

function initSearch() {
  const input = document.getElementById('q');
  const box = document.getElementById('suggest');
  const params = new URLSearchParams(location.search);
  if (location.pathname.startsWith('/search') && params.get('q')) input.value = params.get('q');
  let timer;
  let seq = 0;
  let active = -1;

  const close = () => {
    box.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    active = -1;
  };
  const links = () => [...box.querySelectorAll('a')];
  const mark = () =>
    links().forEach((a, i) => {
      a.setAttribute('aria-selected', String(i === active));
      if (i === active) input.setAttribute('aria-activedescendant', a.id);
    });

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const text = input.value.trim();
    if (text.length < 2) return close();
    timer = setTimeout(async () => {
      const mine = ++seq;
      try {
        const r = await api(`/api/search?q=${encodeURIComponent(text)}&limit=8`);
        if (mine !== seq) return;
        const games = r.items.map(
          (g, i) =>
            `<a id="sg-${i}" role="option" href="${gameUrl(g.id)}">${icon(g.icon, 'sm')}<span class="game"><span class="t"><span class="name">${esc(g.name)}</span><span class="by">${esc(g.creator.name)}</span></span></span><span class="num muted">${int(g.players)}</span></a>`
        );
        // Studios and solo developers open their own page.
        const makers = (r.creators || [])
          .filter((c) => c.topGame)
          .slice(0, 4)
          .map(
            (c, i) =>
              `<a id="sg-${games.length + i}" role="option" href="${studioUrl(c.type, c.id)}">${icon(c.topGame.icon, 'sm')}<span class="game"><span class="t"><span class="name">${esc(c.name)}</span><span class="by">${c.type === 'Group' ? 'Studio' : 'Solo developer'}. ${int(c.games)} ${c.games === 1 ? 'game' : 'games'}</span></span></span><span class="num muted">${int(c.players)}</span></a>`
          );
        box.innerHTML = games.length || makers.length ? games.join('') + makers.join('') : '<div class="empty">No tracked game or studio matches that name.</div>';
        box.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        active = -1;
      } catch {
        close();
      }
    }, 180);
  });
  input.addEventListener('keydown', (e) => {
    const list = links();
    if (box.hidden || !list.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
      mark();
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      location.href = list[active].href;
    } else if (e.key === 'Escape') {
      close();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search')) close();
  });
}
