// /game/<universeId>: one game's numbers, player chart and Roblox chart positions.
import { initChrome, api, esc, int, compact, change, localDate, utcDay, localDateTime, ago, until, timeTag, icon, studioUrl, failed, tabs, rangeButtons, infoTip } from './common.js';
import { FAIR_RATING_TEXT } from './panels.js';

initChrome();

const id = location.pathname.split('/').filter(Boolean)[1];
const root = document.getElementById('game');
let plot = null;
let range = '24h';
let lastHistory = null;
let hoursPlot = null;
let lastHours = null;

function stat(label, value, sub = '', cls = '') {
  return `<div class="${cls}"><div class="label">${label}</div><div class="v num">${value}</div><div class="s">${sub}</div></div>`;
}

function render(g) {
  document.title = `${g.name}. BloxRadar`;
  const votes = (g.upVotes ?? 0) + (g.downVotes ?? 0);
  const rating = g.fairRating === null ? 'n/a' : `${(g.fairRating * 100).toFixed(1)}%`;
  const [ratingBtn, ratingNote] = infoTip(esc(FAIR_RATING_TEXT), 'How the rating is worked out');
  const fav7 =
    g.favorites7 && g.favorites7.gain >= 0
      ? `<br><span class="muted" title="Since ${esc(utcDay(g.favorites7.since))}">+${int(g.favorites7.gain)} in 7 days</span>`
      : '';
  const positions = [...g.positions].sort((a, b) => Number(b.current) - Number(a.current) || a.position - b.position);

  root.innerHTML = `
    <div class="crumb"><a href="/">Home</a></div>
    <section class="g-head">
      ${icon(g.icon, 'lg')}
      <div>
        <h1>${esc(g.name)}</h1>
        <div class="meta">By <a href="${studioUrl(g.creator.type, g.creator.id)}">${esc(g.creator.name)}</a><span class="tag">${g.creator.type === 'Group' ? 'Studio' : 'Solo developer'}</span>${
          g.genre ? `<span class="tag">${esc(g.genre)}</span>` : ''
        }${g.subgenre && g.subgenre !== g.genre ? `<span class="tag">${esc(g.subgenre)}</span>` : ''}</div>
      </div>
      <div class="g-actions open">
        <a class="btn" href="/card/${g.id}">Stats card</a>
        <a class="btn" href="https://www.roblox.com/games/${g.placeId}" target="_blank" rel="noopener">Open on Roblox</a>
      </div>
    </section>
    ${g.live ? '' : `<p class="note">This game was not in the latest update. Last read ${timeTag(g.lastSeen)}. The numbers below are from then.</p>`}
    <section class="stats" aria-label="Numbers">
      ${stat('Playing now', int(g.players), change(g.changePct, g.change, { withAbs: true }), 'now')}
      ${stat('All-time peak', int(g.peak), g.peakAt ? `<span class="muted">${timeTag(g.peakAt, localDate(g.peakAt))}</span>` : '')}
      ${stat('Visits', compact(g.visits), `<span class="muted">${int(g.visits)}</span>`)}
      ${stat('Favorites', compact(g.favorites), `<span class="muted">${int(g.favorites)}</span>${fav7}`)}
      ${stat(
        `Rating ${ratingBtn}`,
        rating,
        votes ? `<span class="muted">${Math.round((g.upVotes / votes) * 100)}% likes, ${compact(votes)} votes</span>` : '<span class="muted">No votes read yet</span>'
      )}
      ${stat('Created', `<span title="${esc(localDateTime(g.createdAt))}">${localDate(g.createdAt)}</span>`, g.updatedAt ? `<span class="muted">Updated ${esc(ago(g.updatedAt))}</span>` : '')}
    </section>
    ${ratingNote}
    <section class="chart-wrap" aria-label="Player chart">
      <div class="chart-head">
        <h2>Players</h2>
        <div class="tabs" role="tablist" aria-label="Time range">
          ${rangeButtons(g.firstSeen, 'rt', range, 'chart-panel')}
        </div>
      </div>
      <div id="chart-panel" role="tabpanel" aria-labelledby="rt-24h">
        <div id="chart" role="img" aria-label="Player count over time"></div>
        <p class="note" id="chart-note" hidden></p>
      </div>
    </section>
    ${eventsSection(g.events)}
    ${codesSection(g.codes)}
    ${earningsSection(g.hoursPlayed)}
    ${productsSection(g)}
    <section class="panel g-panel">
      <div class="panel-head"><h2>Roblox chart positions</h2></div>
      ${
        positions.length
          ? `<table class="table"><thead><tr><th>Position</th><th class="l">Chart</th><th>Best position</th><th class="hide-sm">Best reached</th><th class="hide-sm">Last seen</th></tr></thead><tbody>${positions
              .map(
                (p) =>
                  `<tr><td class="num">${p.current ? p.position : '<span class="muted">not in it</span>'}</td><td class="l">${esc(p.chart)}</td><td class="num">${p.bestPosition}</td><td class="hide-sm">${timeTag(p.bestAt, localDate(p.bestAt))}</td><td class="hide-sm muted">${timeTag(p.lastSeen)}</td></tr>`
              )
              .join('')}</tbody></table>`
          : '<p class="note">This game has not appeared in any Roblox chart we read.</p>'
      }
    </section>
    ${thumbsSection(g.thumbnails, g.name)}`;

  rangesSince = g.firstSeen;
  bindRanges();
  loadHistory();
  lastHours = g.hoursPlayed;
  drawHours();
}

// ---------- Thumbnails, events, codes and prices ----------

// The game's thumbnails as they are on Roblox now, first one large. Clicking a small one shows it large.
function thumbsSection(urls, name) {
  if (!urls || !urls.length) return '';
  const small =
    urls.length > 1
      ? `<div class="thumbs">${urls
          .map((u, i) => `<button type="button" data-shot="${i}" aria-pressed="${i === 0}" aria-label="Thumbnail ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`)
          .join('')}</div>`
      : '';
  return `<section class="panel g-panel">
    <div class="panel-head"><h2>Thumbnails</h2><span class="muted small">${urls.length === 1 ? '1 image' : `${urls.length} images`}, as on Roblox now</span></div>
    <div class="shots" data-urls="${esc(JSON.stringify(urls))}">
      <img class="main" src="${esc(urls[0])}" alt="${esc(name)}, thumbnail 1">
      ${small}
    </div>
  </section>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.shots [data-shot]');
  if (!b) return;
  const box = b.closest('.shots');
  const i = Number(b.dataset.shot);
  const main = box.querySelector('.main');
  main.src = JSON.parse(box.dataset.urls)[i];
  main.alt = main.alt.replace(/\d+$/, String(i + 1));
  for (const x of box.querySelectorAll('[data-shot]')) x.setAttribute('aria-pressed', String(x === b));
});

const CATEGORY = { contentUpdate: 'Update', newContent: 'New content', activity: 'Activity', rewards: 'Rewards', competition: 'Competition', limitedTimeOffer: 'Offer', other: 'Other' };
const categoryLabel = (c) => CATEGORY[c] || (c ? c.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, (x) => x.toUpperCase()) : '');

function eventsSection(events) {
  if (!events || !events.length) return '';
  const now = Date.now();
  return `<section class="panel g-panel">
    <div class="panel-head"><h2>Events</h2><span class="muted small">Announced through Roblox</span></div>
    <ol class="rows">${events
      .map((e) => {
        const on = Date.parse(e.start) <= now;
        const when = on ? (e.end ? `On now. Ends ${timeTag(e.end, until(e.end))}` : 'On now') : `Starts ${timeTag(e.start, until(e.start))}`;
        const span = `${esc(localDateTime(e.start))}${e.end ? ` to ${esc(localDateTime(e.end))}` : ''}`;
        return `<li class="row no-rank ev"><span class="t"><span class="name">${esc(e.title)}</span><span class="by">${e.category ? `${esc(categoryLabel(e.category))}. ` : ''}${span}</span></span><span class="val">${when}</span></li>`;
      })
      .join('')}</ol>
  </section>`;
}

function codesSection(codes) {
  if (!codes || !codes.length) return '';
  return `<section class="panel g-panel">
    <div class="panel-head"><h2>Codes in the description</h2></div>
    <p class="why">Words that look like codes in the game's description on Roblox. We cannot check whether they still work, and many games post codes only on Discord.</p>
    <div class="codes">${codes
      .map((c) => `<button class="code" type="button" data-code="${esc(c)}" title="Copy ${esc(c)}"><code>${esc(c)}</code><span class="copied" aria-live="polite"></span></button>`)
      .join('')}</div>
  </section>`;
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('.code');
  if (!b) return;
  try {
    await navigator.clipboard.writeText(b.dataset.code);
    b.querySelector('.copied').textContent = 'Copied';
    setTimeout(() => {
      b.querySelector('.copied').textContent = '';
    }, 1500);
  } catch {
    /* clipboard blocked; the code is still on screen to copy by hand */
  }
});

// Where a price sits against the middle half of what other games charge for the same kind of pass.
function verdict(price, b) {
  if (price < b.low) return '<span class="vd low">Cheaper than most</span>';
  if (price > b.high) return '<span class="vd high">Pricier than most</span>';
  return '<span class="vd mid">Typical</span>';
}

function productsSection(g) {
  const passes = g.products.filter((p) => p.kind === 'pass');
  const dps = g.products.filter((p) => p.kind === 'devproduct');
  const head = '<div class="panel-head"><h2>Game passes and prices</h2></div>';
  if (!g.products.length) {
    return `<section class="panel g-panel">${head}<p class="note">We have not read what this game sells yet, or it sells nothing. What games sell is read once a day.</p></section>`;
  }
  const genre = g.genre ? esc(g.genre) : 'all genres';
  const onSale = passes.filter((p) => p.forSale && p.price > 0).sort((a, b) => a.price - b.price);
  const off = passes.filter((p) => !p.forSale);
  const passRows = onSale
    .map((p) => {
      const b = p.benchmark;
      const note = b ? ` title="${b.scope === 'genre' ? genre : 'All genres'}: the middle half of games charge R$ ${int(b.low)} to ${int(b.high)} (${int(b.games)} games)"` : '';
      const usual = b ? `<span class="num">R$ ${int(b.median)}</span>` : '<span class="muted">Not enough games</span>';
      return `<tr><td class="l">${esc(p.name)}</td><td class="num">R$ ${int(p.price)}</td><td class="usual hide-sm"${note}>${usual}</td><td class="v">${b ? verdict(p.price, b) : ''}</td></tr>`;
    })
    .join('');
  const prices = dps.filter((p) => p.forSale && p.price > 0).map((p) => p.price);
  const dpBlock = dps.length
    ? `<details class="how dps"><summary>${int(dps.length)} developer products${prices.length ? `, R$ ${int(Math.min(...prices))} to R$ ${int(Math.max(...prices))}` : ''}</summary>
        <table class="table"><tbody>${dps
          .slice(0, 200)
          .map((p) => `<tr><td class="l">${esc(p.name)}</td><td class="num">${p.forSale && p.price ? `R$ ${int(p.price)}` : '<span class="muted">off sale</span>'}</td></tr>`)
          .join('')}</tbody></table></details>`
    : '';
  const others = g.genre ? `other ${genre} games` : 'other games';
  return `<section class="panel g-panel">${head}
    <p class="why">Compared with what ${others} charge for the same kind of pass. <a href="/prices${g.genre ? `?g=${encodeURIComponent(g.genre)}` : ''}">All prices for ${genre}</a>.</p>
    ${onSale.length ? `<table class="table prices"><thead><tr><th class="l">Pass</th><th>Price</th><th class="hide-sm">Typical price</th><th class="v"></th></tr></thead><tbody>${passRows}</tbody></table>` : '<p class="note">No game passes on sale.</p>'}
    ${off.length ? `<details class="how dps"><summary>${int(off.length)} game ${off.length === 1 ? 'pass' : 'passes'} off sale</summary><p class="note">${off.map((p) => esc(p.name)).join(', ')}</p></details>` : ''}
    ${dpBlock}
  </section>`;
}

const robux = (n) => `R$ ${compact(n)}`;
const usd = (n) => `$${compact(n)}`;

function earningsSection(h) {
  if (!h || !h.days.length) {
    return `<section class="panel g-panel"><div class="panel-head"><h2>Hours played and earnings</h2></div><p class="note">No hourly readings for this game yet.</p></section>`;
  }
  const e = h.estimate;
  const avgSub = h.avgDailyHours === null
    ? '<span class="muted">Needs one complete day of readings</span>'
    : `${h.weekChangePct === null ? '' : change(h.weekChangePct) + ' <span class="muted">vs the week before</span><br>'}<span class="muted">Average of the last ${h.fullDays} complete ${h.fullDays === 1 ? 'day' : 'days'}</span>`;

  let est = '<p class="note">An estimate needs one complete day of readings.</p>';
  if (e) {
    const ref = e.reference;
    const basis =
      e.basis === 'unchecked'
        ? 'We have not read what this game sells yet, so this uses the rate for a typical game.'
        : e.basis === 'no-sales'
          ? 'This game has nothing for sale, so this only counts what Roblox pays for play time.'
          : `This game has ${int(e.items)} items for sale at a typical price of R$ ${int(e.typicalPrice)}. The typical game we track has ${int(ref.items)} at R$ ${int(ref.price)}.`;
    est = `
      <div class="v num">${robux(e.monthlyRobux)}<span class="usd">${usd(e.monthlyUsd)}</span></div>
      <div class="s muted">Likely between ${robux(e.lowRobux)} and ${robux(e.highRobux)} (${usd(e.lowUsd)} to ${usd(e.highUsd)})</div>
      <p class="basis">${esc(basis)} That gives R$ ${e.robuxPerHour.toFixed(2)} per hour played.</p>
      <details class="how">
        <summary>How this is worked out</summary>
        <p>Roblox does not publish what any game earns. This is our estimate, not a Roblox figure.</p>
        <p>Hours played is measured: we read the player count every 10 minutes, and a day's hours played is the sum of its 24 hourly averages.</p>
        <p>Earnings per month is the average day's hours played, times 30, times a rate in Robux per hour. The rate starts at R$ ${e.baseRobuxPerHour} per hour. In 2025 Roblox paid creators about $1.5 billion for roughly 124 billion hours played, which is about R$ 3.3 per hour across the whole platform, and part of that went to avatar item creators rather than games.</p>
        <p>The rate then goes up for games that sell more items or more expensive ones than the typical game we track, and down for games that sell fewer or cheaper ones. It stays between 0.3 and 3 times the starting rate. Games with nothing for sale get 0.15 times the starting rate, for what Roblox pays for play time.</p>
        <p>Dollars use the rate Roblox pays when creators cash out, $${e.devexUsdPerRobux} per Robux. Real earnings can be well outside the range shown, because how much players spend depends on how the game sells, which public data does not show.</p>
      </details>`;
  }

  return `
    <section class="panel g-panel">
      <div class="panel-head"><h2>Hours played and earnings</h2></div>
      <div class="earn">
        <div>
          <div class="label">Hours played per day</div>
          <div class="v num">${h.avgDailyHours === null ? 'n/a' : compact(h.avgDailyHours)}</div>
          <div class="s">${avgSub}</div>
          <div id="hours-chart" role="img" aria-label="Hours played per day"></div>
        </div>
        <div>
          <div class="label">Earnings per month <span class="tag">Estimate</span></div>
          ${est}
        </div>
      </div>
    </section>`;
}

function drawHours() {
  if (hoursPlot) {
    hoursPlot.destroy();
    hoursPlot = null;
  }
  const el = document.getElementById('hours-chart');
  const days = lastHours?.days;
  if (!el || !days || !days.length) return;
  const xs = days.map((_, i) => i);
  const full = days.map((d) => (d.partial ? null : d.hours));
  const part = days.map((d) => (d.partial ? d.hours : null));
  const label = (i) => {
    const d = days[i];
    return d ? new Date(`${d.day}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
  };
  const ink = cssVar('--muted');
  const grid = cssVar('--grid');
  const axis = { stroke: ink, grid: { stroke: grid, width: 1 }, ticks: { show: false }, font: '11px "Geist Mono", monospace' };
  const bars = uPlot.paths.bars({ size: [0.7, 28] });
  hoursPlot = new uPlot(
    {
      width: el.clientWidth,
      height: el.clientHeight,
      series: [
        { label: 'Day', value: (u, v) => label(v) },
        { label: 'Hours played', fill: cssVar('--chart-line'), stroke: cssVar('--chart-line'), paths: bars, points: { show: false }, value: (u, v) => (v === null ? '' : int(v)) },
        { label: 'So far (day not complete)', fill: cssVar('--chart-max'), stroke: cssVar('--chart-max'), paths: bars, points: { show: false }, value: (u, v) => (v === null ? '' : int(v)) },
      ],
      cursor: { points: { show: false }, drag: { x: false, y: false } },
      scales: { x: { time: false, range: () => [-0.6, days.length - 0.4] }, y: { range: (u, min, max) => [0, max * 1.1 || 1] } },
      axes: [
        { ...axis, grid: { show: false }, space: 44, incrs: [1, 2, 3, 7, 14], values: (u, vals) => vals.map((v) => (Number.isInteger(v) ? label(v) : '')) },
        { ...axis, size: 56, values: (u, vals) => vals.map((v) => compact(v)) },
      ],
      legend: { live: true },
    },
    [xs, full, part],
    el
  );
}

// Range buttons for the player chart. The game's first reading decides which ranges are offered.
let rangesSince;
function bindRanges() {
  tabs(root.querySelector('.chart-head [role="tablist"]'), (t) => {
    range = t.dataset.r;
    document.getElementById('chart-panel').setAttribute('aria-labelledby', t.id);
    loadHistory();
  });
}
function setRanges(since) {
  rangesSince = since;
  root.querySelector('.chart-head [role="tablist"]').innerHTML = rangeButtons(since, 'rt', range, 'chart-panel');
  bindRanges();
}

async function loadHistory() {
  const want = range;
  const note = document.getElementById('chart-note');
  try {
    const h = await api(`/api/game/${id}/history?range=${want}`);
    if (want !== range) return;
    lastHistory = h;
    if (h.since !== rangesSince) setRanges(h.since);
    if (h.points.length < 2) {
      note.textContent = 'Not enough readings yet for this range.';
      note.hidden = false;
      destroy();
      return;
    }
    note.hidden = true;
    draw(h);
  } catch (err) {
    note.innerHTML = failed(err);
    note.hidden = false;
  }
}

function destroy() {
  if (plot) {
    plot.destroy();
    plot = null;
  }
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function draw(h) {
  destroy();
  const el = document.getElementById('chart');
  const xs = h.points.map((p) => Date.parse(p.t) / 1000);
  const avg = h.points.map((p) => p.players);
  const hourly = h.step !== '10m';
  const series = [
    {},
    {
      label: hourly ? (h.step === '1d' ? 'Daily average' : 'Hourly average') : 'Players',
      stroke: cssVar('--chart-line'),
      fill: cssVar('--chart-fill'),
      width: 2,
      value: (u, v) => (v === null ? '' : int(v)),
    },
  ];
  const data = [xs, avg];
  if (hourly) {
    series.push({
      label: h.step === '1d' ? 'Daily high' : 'Hourly high',
      stroke: cssVar('--chart-max'),
      width: 1,
      dash: [4, 4],
      value: (u, v) => (v === null ? '' : int(v)),
    });
    data.push(h.points.map((p) => p.max));
  }
  const ink = cssVar('--muted');
  const grid = cssVar('--grid');
  const axis = { stroke: ink, grid: { stroke: grid, width: 1 }, ticks: { stroke: grid, width: 1 }, font: '12px "Geist Mono", monospace' };
  plot = new uPlot(
    {
      width: el.clientWidth,
      height: el.clientHeight,
      series,
      cursor: { points: { size: 6 } },
      scales: { y: { range: (u, min, max) => [0, max * 1.08 || 1] } },
      axes: [axis, { ...axis, size: 64, values: (u, vals) => vals.map((v) => compact(v)) }],
      legend: { live: true },
    },
    data,
    el
  );
}

new ResizeObserver(() => {
  const el = document.getElementById('chart');
  if (plot && el) plot.setSize({ width: el.clientWidth, height: el.clientHeight });
  const hel = document.getElementById('hours-chart');
  if (hoursPlot && hel) hoursPlot.setSize({ width: hel.clientWidth, height: hel.clientHeight });
}).observe(document.body);
document.addEventListener('themechange', () => {
  if (lastHistory && plot) draw(lastHistory);
  drawHours();
});

if (!/^\d+$/.test(id || '')) {
  root.innerHTML = '<p class="note err">That is not a game address.</p>';
} else {
  api(`/api/game/${id}`)
    .then(render)
    .catch((err) => {
      root.innerHTML = `<div class="crumb"><a href="/">Home</a></div>${failed(err)}`;
    });
}
