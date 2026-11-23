import { initChrome, fill, int, compact, change, timeTag, esc, tabs, rangeButtons, api, gameUrl, failed } from './common.js';
import { PANELS, loadPanel } from './panels.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Counts a number up from what is on screen to the new value, so a refresh visibly ticks.
function countTo(el, value) {
  if (value === null || value === undefined) {
    el.textContent = 'n/a';
    return;
  }
  const from = Number(el.dataset.v || 0);
  el.dataset.v = String(value);
  if (reduceMotion || from === value) {
    el.textContent = int(value);
    return;
  }
  const start = performance.now();
  const ms = from ? 700 : 1100;
  const step = (now) => {
    const k = Math.min(1, (now - start) / ms);
    const eased = 1 - (1 - k) ** 3;
    el.textContent = int(Math.round(from + (value - from) * eased));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

let lastRun = null;
document.addEventListener('summary', (e) => {
  const s = e.detail;
  countTo(document.getElementById('b-total'), s.totalPlayers);
  const pct = s.totalPlayers !== null && s.prevTotal ? Math.round(((s.totalPlayers - s.prevTotal) / s.prevTotal) * 1000) / 10 : null;
  document.getElementById('b-change').innerHTML =
    pct === null ? '<span class="muted">No reading yet</span>' : change(pct, s.totalPlayers - s.prevTotal, { withAbs: true });
  document.getElementById('b-games').textContent = int(s.gamesRead);
  document.getElementById('b-when').innerHTML = s.lastGoodRun ? timeTag(s.lastGoodRun) : 'not yet';
  // A new collector run means new numbers for the graph and the tiles too.
  if (lastRun !== null && s.lastGoodRun !== lastRun) {
    loadTotal();
    spots();
  }
  lastRun = s.lastGoodRun;
});

initChrome();

// ---------- Total players graph ----------

let range = '24h';
let plot = null;
let lastTotal = null;
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

async function loadTotal() {
  const want = range;
  const note = document.getElementById('total-note');
  try {
    const h = await api(`/api/total-history?range=${want}`);
    if (want !== range) return;
    lastTotal = h;
    setRanges(h.since);
    if (h.points.length < 2) {
      note.textContent = 'Not enough readings yet for this range.';
      note.hidden = false;
      if (plot) plot.destroy();
      plot = null;
      return;
    }
    note.hidden = true;
    drawTotal(h);
  } catch (err) {
    note.innerHTML = failed(err);
    note.hidden = false;
  }
}

function drawTotal(h) {
  if (plot) plot.destroy();
  const el = document.getElementById('total-chart');
  const xs = h.points.map((p) => Date.parse(p.t) / 1000);
  const ys = h.points.map((p) => p.players);
  const ink = cssVar('--muted');
  const grid = cssVar('--grid');
  const axis = { stroke: ink, grid: { stroke: grid, width: 1 }, ticks: { show: false }, font: '11px "Geist Mono", monospace' };
  // The line runs violet to cyan like the big number. The fill fades out towards the bottom.
  const stroke = (u) => {
    const g = u.ctx.createLinearGradient(u.bbox.left, 0, u.bbox.left + u.bbox.width, 0);
    g.addColorStop(0, cssVar('--violet'));
    g.addColorStop(1, cssVar('--cyan'));
    return g;
  };
  const area = (u) => {
    const g = u.ctx.createLinearGradient(0, u.bbox.top, 0, u.bbox.top + u.bbox.height);
    g.addColorStop(0, cssVar('--hero-fill'));
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    return g;
  };
  plot = new uPlot(
    {
      width: el.clientWidth,
      height: el.clientHeight,
      series: [{}, { label: 'Players', stroke, fill: area, width: 2.5, points: { show: false }, value: (u, v) => (v === null ? '' : int(v)) }],
      cursor: { points: { size: 8 } },
      // Not from zero: the total moves by a few percent over a day, and that movement is what to see.
      scales: { y: { range: (u, min, max) => [Math.max(0, min - (max - min) * 0.25), max + (max - min) * 0.12 || 1] } },
      axes: [axis, { ...axis, size: 52, values: (u, vals) => vals.map((v) => compact(v)) }],
      legend: { show: false },
    },
    [xs, ys],
    el
  );
  if (!reduceMotion) {
    el.classList.remove('drawn');
    void el.offsetWidth;
    el.classList.add('drawn');
  }
}

// The range buttons are redrawn when the date of our first reading is known, and again if it
// changes, so longer ranges appear as the history grows.
const rangeList = document.querySelector('.hero-chart [role="tablist"]');
let rangesSince;
function setRanges(since) {
  if (since === rangesSince) return;
  rangesSince = since;
  rangeList.innerHTML = rangeButtons(since, 'tt', range, 'total-panel');
  tabs(rangeList, (t) => {
    range = t.dataset.r;
    document.getElementById('total-panel').setAttribute('aria-labelledby', t.id);
    loadTotal();
  });
}
setRanges(null);
loadTotal();
new ResizeObserver(() => {
  const el = document.getElementById('total-chart');
  if (plot && el) plot.setSize({ width: el.clientWidth, height: el.clientHeight });
}).observe(document.getElementById('total-chart'));
document.addEventListener('themechange', () => lastTotal && plot && drawTotal(lastTotal));

// ---------- The four tiles: the top game of each list ----------

const SPOTS = {
  top: { label: 'Most played now', list: '/list/top', stat: (g) => [int(g.players), 'playing now'], more: (n) => `See all ${int(n)} games` },
  breakouts: { label: 'Breaking out', list: '/list/breakouts', stat: (g) => [`${g.ratio}x`, 'its usual players'], more: (n) => `${int(n)} breaking out now` },
  'new-highs': { label: 'New all-time high', list: '/list/new-highs', stat: (g) => [int(g.peak), 'players, its record'], more: (n) => `${int(n)} at their record now` },
  'top-trending': { label: 'Top trending', list: '/list/top-trending', stat: (g) => [int(g.players), 'playing now'], more: () => 'Top trending now' },
  'new-games': { label: 'Biggest new game', list: '/list/new-games', stat: (g) => [int(g.players), 'playing now'], more: () => 'New games this month' },
  'top-earning': { label: 'Top earning', list: '/list/top-earning', stat: (g) => [int(g.players), 'playing now'], more: () => 'Top earners now' },
  rising: { label: 'Rising star', list: '/list/rising', stat: (g, d) => [`${g.ratio}x`, `players in ${d.risingDays} days`], more: (n) => `${int(n)} rising stars` },
};

// The game's icon fills the tile. The stored address is the 150 pixel icon, and Roblox serves the
// same icon at 512 pixels when the size in the address is changed (checked 2026-10-30). If that
// ever fails, the tile falls back to the 150 pixel one.
const bigIcon = (url) => url.replace('/150/150/', '/512/512/');
document.addEventListener(
  'error',
  (e) => {
    const img = e.target;
    if (img.classList?.contains('spot-bg') && img.dataset.small && img.src !== img.dataset.small) img.src = img.dataset.small;
  },
  true
);

function spot(t, d) {
  const c = SPOTS[t.key];
  const g = t.game;
  if (!g) {
    return `<div class="spot empty" data-k="${t.key}"><span class="spot-label">${c.label}</span><div class="spot-foot"><p class="spot-none">None right now</p>
      <a class="spot-more" href="${c.list}">Open the list</a></div></div>`;
  }
  const [big, small] = c.stat(g, d);
  return `<div class="spot" data-k="${t.key}">
    ${g.icon ? `<img class="spot-bg" src="${esc(bigIcon(g.icon))}" data-small="${esc(g.icon)}" alt="" decoding="async" referrerpolicy="no-referrer">` : ''}
    <span class="spot-label">${c.label}</span>
    <div class="spot-foot">
    <a class="spot-main" href="${gameUrl(g.id)}">
      <span class="spot-t"><span class="spot-name">${esc(g.name)}</span><span class="spot-stat"><b class="num">${big}</b> ${small}</span></span>
    </a>
    <a class="spot-more" href="${c.list}">${c.more(t.count)}</a>
    </div>
  </div>`;
}

async function spots() {
  const el = document.getElementById('spots');
  try {
    const d = await api('/api/hero');
    el.innerHTML = d.tiles.map((t) => spot(t, d)).join('');
  } catch (err) {
    el.innerHTML = failed(err);
  }
}
spots();

function frame(el, key, title, body) {
  el.innerHTML = `<div class="panel-head"><h2>${esc(title)}</h2>${body.tabs || `<a class="see-all" href="/list/${key}">See all</a>`}</div>
    <div class="panel-body"></div>`;
  return el.querySelector('.panel-body');
}

async function panel(el) {
  const key = el.dataset.panel;
  const limit = Number(el.dataset.limit);
  const p = PANELS[key];
  const target = frame(el, key, p.title, {});
  await fill(target, async () => {
    const d = await loadPanel(key, limit);
    return p.render(d);
  }, Math.min(limit, 6));
}

// Studios and solo developers share one panel with a switch.
async function creators(el) {
  const limit = Number(el.dataset.limit);
  el.innerHTML = `<div class="panel-head"><h2 id="cr-title">Top studios</h2>
      <div class="tabs" role="tablist" aria-label="Creator type">
        <button class="tab" role="tab" type="button" id="cr-tab-studios" data-k="studios" aria-selected="true" aria-controls="cr-panel">Studios</button>
        <button class="tab" role="tab" type="button" id="cr-tab-solo" data-k="solo" aria-selected="false" aria-controls="cr-panel">Solo</button>
      </div></div>
    <div class="panel-body" id="cr-panel" role="tabpanel" aria-labelledby="cr-tab-studios"></div>
    <a class="see-all" id="cr-all" href="/list/studios">See all studios</a>`;
  const body = el.querySelector('.panel-body');
  // Each switch gets a number. A slow answer for a tab that is no longer chosen is thrown away.
  let seq = 0;
  const show = (k) => {
    const mine = ++seq;
    const p = PANELS[k];
    body.setAttribute('aria-labelledby', `cr-tab-${k}`);
    el.querySelector('#cr-title').textContent = p.title;
    const all = el.querySelector('#cr-all');
    all.href = `/list/${k}`;
    all.textContent = k === 'solo' ? 'See all solo developers' : 'See all studios';
    return fill(body, async () => p.render(await loadPanel(k, limit)), 6, () => mine !== seq);
  };
  tabs(el.querySelector('[role="tablist"]'), (t) => show(t.dataset.k));
  await show('studios');
}

for (const el of document.querySelectorAll('[data-panel]')) {
  if (el.dataset.panel === 'creators') creators(el);
  else panel(el);
}
