// Builds data/fixture.json for running the website without a database (DATA_SOURCE=fixture).
// Games, current player counts, icons and chart positions are real and read live from Roblox.
// Player history is made up: 7 days of 10-minute readings shaped like a daily cycle, from which
// the hourly table and the last 24 hours of 10-minute readings are taken. A few games are given a
// sudden rise (so "Breaking out" has entries) and a few a steady climb to a new peak right now.
// Game pass and developer product catalogues are real, for the CATALOG_TOP most played games and
// CATALOG_SAMPLE others picked at random. Descriptions, thumbnail addresses and the events of the
// EVENTS_TOP most played games are real too.
//
//   npm run fixture
import { mkdir, writeFile } from 'node:fs/promises';
import { fetchSorts, fetchGames, fetchIcons, fetchProducts, fetchThumbnailIds, fetchEvents } from '../src/roblox.js';

const H = 3600000;
const STEP = 600000;
const DAYS = 7;
const CATALOG_TOP = 40;
const CATALOG_SAMPLE = 120;
const EVENTS_TOP = 80;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ref = Math.floor(Date.now() / STEP) * STEP;
const start = ref - DAYS * 24 * H;

console.log('Reading Roblox charts...');
const sorts = await fetchSorts();
const charted = new Map();
for (const s of sorts) for (const g of s.games) if (!charted.has(g.universeId)) charted.set(g.universeId, g);
console.log(`${sorts.length} charts, ${charted.size} games. Reading details...`);
const details = (await fetchGames([...charted.keys()])).games.filter((g) => g.creator && g.name);
console.log(`${details.length} games read. Reading icons...`);
const { icons } = await fetchIcons(details.map((g) => g.id));
console.log('Reading thumbnails...');
const thumbUrls = new Map();
await fetchThumbnailIds(details.map((g) => g.id), thumbUrls);

// Pick the special cases from mid-sized games, so they are not the obvious top titles.
const ranked = [...details].sort((a, b) => (b.playing ?? 0) - (a.playing ?? 0));
const mid = ranked.filter((g, i) => i >= 15 && (g.playing ?? 0) >= 1500);
const breakoutIds = new Set(mid.filter((_, i) => i % 7 === 3).slice(0, 14).map((g) => g.id));
const climbIds = new Set(
  ranked.filter((g, i) => i >= 8 && (g.playing ?? 0) >= 600 && !breakoutIds.has(g.id) && i % 9 === 5).slice(0, 10).map((g) => g.id)
);

const games = [];
const series = {};
for (const g of details) {
  const r = rng(g.id % 2147483647);
  const P = g.playing ?? 0;
  const created = Date.parse(g.created);
  const firstSeen = Math.max(start, Math.ceil(created / STEP) * STEP);

  // Raw shape: daily cycle peaking around 20:00 UTC, a weekend lift, a slow trend, and noise.
  const amp = 0.2 + r() * 0.25;
  const phase = 17 + r() * 6;
  let trend = (r() - 0.5) * 0.5;
  if (climbIds.has(g.id)) trend = 0.9 + r() * 0.6;
  const breakout = breakoutIds.has(g.id);
  const rampHours = 3 + Math.floor(r() * 7);
  const lift = 3 + r() * 7;

  const raw = [];
  let walk = 0;
  for (let t = firstSeen; t <= ref; t += STEP) {
    const d = new Date(t);
    const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
    const day = d.getUTCDay();
    walk = walk * 0.92 + (r() - 0.5) * 0.05;
    let v = (1 + amp * Math.cos(((hour - phase) / 24) * 2 * Math.PI)) * (day === 0 || day === 6 ? 1.12 : 1);
    v *= 1 + trend * ((t - start) / (ref - start)) + walk;
    if (breakout) {
      const into = (t - (ref - rampHours * H)) / (rampHours * H); // 0 at ramp start, 1 now
      v *= into <= 0 ? 1 : 1 + (lift - 1) * Math.min(1, into) ** 1.6;
    }
    raw.push(Math.max(0, v));
  }
  const scale = raw.length && raw[raw.length - 1] > 0 ? P / raw[raw.length - 1] : 0;
  const vals = raw.map((v) => Math.round(v * scale));
  if (vals.length) vals[vals.length - 1] = P;
  // Climbing games set their all-time high with the latest reading.
  if (climbIds.has(g.id)) for (let i = 0; i < vals.length - 1; i++) vals[i] = Math.min(vals[i], Math.round(P * (0.9 + 0.08 * (i / vals.length))));

  // Hourly averages and maximums, as the collector would roll them up.
  const h0 = Math.floor(firstSeen / H) * H;
  const ha = [];
  const hm = [];
  vals.forEach((v, i) => {
    const k = Math.floor((firstSeen + i * STEP - h0) / H);
    ha[k] = ha[k] || { sum: 0, n: 0, max: 0 };
    ha[k].sum += v;
    ha[k].n += 1;
    ha[k].max = Math.max(ha[k].max, v);
  });
  const hourly = ha.map((x) => x || { sum: 0, n: 1, max: 0 });

  // Snapshots only for the last 24 hours, like the real retention would keep for the panels.
  const s0 = Math.max(firstSeen, ref - 24 * H - STEP * 6);
  const sFrom = (s0 - firstSeen) / STEP;
  series[g.id] = {
    s0: new Date(s0).toISOString(),
    s: vals.slice(sFrom),
    h0: new Date(h0).toISOString(),
    ha: hourly.map((x) => Math.round(x.sum / x.n)),
    hm: hourly.map((x) => x.max),
  };

  // All-time peak: the highest reading, or for many games an older, higher peak from before.
  let peak = 0;
  let peakAt = firstSeen;
  vals.forEach((v, i) => {
    if (v >= peak) {
      peak = v;
      peakAt = firstSeen + i * STEP;
    }
  });
  if (!breakout && !climbIds.has(g.id) && created < start && r() < 0.7) {
    peak = Math.round(peak * (1.2 + r() * 3));
    peakAt = created + r() * (start - created);
  }

  const c = charted.get(g.id);
  games.push({
    universe_id: g.id,
    root_place_id: g.rootPlaceId,
    name: g.name,
    creator_id: g.creator.id,
    creator_name: g.creator.name,
    creator_type: g.creator.type,
    genre_l1: g.genre_l1 || null,
    genre_l2: g.genre_l2 || null,
    max_players: g.maxPlayers ?? null,
    visits: g.visits ?? null,
    favorites: g.favoritedCount ?? null,
    up_votes: c?.totalUpVotes ?? null,
    down_votes: c?.totalDownVotes ?? null,
    icon_url: icons.get(g.id) || null,
    thumb_urls: thumbUrls.get(g.id) || [],
    description: g.description ?? null,
    created_at: new Date(created).toISOString(),
    updated_at: g.updated ? new Date(g.updated).toISOString() : null,
    first_seen: new Date(firstSeen).toISOString(),
    // Ten small games stand in for games that dropped off the tracking list two days ago.
    last_seen: new Date(ranked.indexOf(g) >= 700 && ranked.indexOf(g) < 710 ? ref - 48 * H : ref).toISOString(),
    last_charted: new Date(ref).toISOString(),
    last_above_min: new Date(ref).toISOString(),
    miss_count: 0,
    icon_checked_at: new Date(ref).toISOString(),
    players: P,
    peak_players: peak,
    peak_at: new Date(Math.floor(peakAt / 60000) * 60000).toISOString(),
  });
}

// Chart positions are real. Best positions and when they happened are made up.
const known = new Set(games.map((g) => g.universe_id));
const sortPositions = [];
for (const s of sorts) {
  s.games.forEach((g, i) => {
    if (!known.has(g.universeId) || sortPositions.some((p) => p.sort_id === s.sortId && p.universe_id === g.universeId)) return;
    const r = rng((g.universeId + i * 7919) % 2147483647);
    const pos = i + 1;
    const best = Math.max(1, pos - Math.floor(r() * Math.min(pos, 12)));
    sortPositions.push({
      sort_id: s.sortId,
      universe_id: g.universeId,
      position: pos,
      best_position: best,
      best_at: new Date(best === pos ? ref : ref - Math.floor(r() * DAYS * 24) * H).toISOString(),
      last_seen: new Date(ref).toISOString(),
      // Sample moves for the preview. The real ones come from the collector.
      prev_position: r() < 0.5 ? pos + Math.round((r() - 0.5) * 8) || null : null,
      moved_at: new Date(ref - Math.floor(r() * 20) * H).toISOString(),
    });
  });
}

// One collector run every 10 minutes for the last day.
const runs = [];
let id = 1;
for (let t = ref - 24 * H - STEP * 6; t <= ref; t += STEP) {
  let total = 0;
  for (const g of games) {
    const s = series[g.universe_id];
    const i = (t - Date.parse(s.s0)) / STEP;
    if (i >= 0 && i < s.s.length) total += s.s[i];
  }
  runs.push({
    id: id++,
    started_at: new Date(t).toISOString(),
    finished_at: new Date(t + 35000).toISOString(),
    games_tracked: games.length,
    games_read: games.length,
    total_players: total,
    error: null,
    warning: null,
  });
}
// The latest run finished with a few games unread, so the warning path is exercised.
runs[runs.length - 1].warning = '3 games not read: 429 from https://games.roblox.com/v1/games';

// Real catalogues for some games, so the earnings estimate has something to work from.
// Same numbers as server/data/mysql.js catalog(): items on sale with a price, and their geometric mean price.
console.log('Reading game passes and developer products...');
const byPlayers = [...games].sort((a, b) => b.players - a.players);
const rest = byPlayers.slice(CATALOG_TOP);
const pick = rng(7);
const sample = [];
while (sample.length < CATALOG_SAMPLE && rest.length) sample.push(rest.splice(Math.floor(pick() * rest.length), 1)[0]);
const catalogs = {};
const products = [];
for (const g of [...byPlayers.slice(0, CATALOG_TOP), ...sample]) {
  try {
    const list = (await fetchProducts(g.universe_id)).products;
    // Developer products are capped per game to keep the file small. The prices use them all.
    for (const p of [...list.filter((x) => x.kind === 'pass'), ...list.filter((x) => x.kind !== 'pass').slice(0, 60)]) {
      products.push({ kind: p.kind, product_id: String(p.id), universe_id: g.universe_id, name: p.name, price: p.price, for_sale: p.forSale ? 1 : 0 });
    }
    const prices = list.filter((p) => p.forSale && p.price > 0).map((p) => p.price);
    catalogs[g.universe_id] = {
      items: prices.length,
      geo_price: prices.length ? Math.exp(prices.reduce((a, p) => a + Math.log(p), 0) / prices.length) : null,
    };
  } catch (err) {
    console.log(`  skipped ${g.universe_id}: ${err.message}`);
  }
}

console.log('Reading events...');
const events = [];
for (const g of byPlayers.slice(0, EVENTS_TOP)) {
  try {
    for (const e of await fetchEvents(g.universe_id, new Date(ref - 24 * H))) {
      events.push({ event_id: e.id, universe_id: g.universe_id, title: e.title, category: e.category, start_at: e.start, end_at: e.end });
    }
  } catch (err) {
    console.log(`  events skipped ${g.universe_id}: ${err.message}`);
  }
}

await mkdir(new URL('../data/', import.meta.url), { recursive: true });
const out = {
  version: 1,
  generatedAt: new Date().toISOString(),
  ref: new Date(ref).toISOString(),
  note: 'Real games and current players. Player history, peaks and best chart positions are synthetic.',
  sortNames: Object.fromEntries(sorts.map((s) => [s.sortId, s.name])),
  games,
  series,
  sort_positions: sortPositions,
  catalogs,
  products,
  events,
  runs,
};
await writeFile(new URL('../data/fixture.json', import.meta.url), JSON.stringify(out));
console.log(
  `Wrote data/fixture.json: ${games.length} games, ${sortPositions.length} chart positions, ` +
    `${Object.keys(catalogs).length} catalogues, ${products.length} products, ${events.length} events, ${breakoutIds.size} breakouts and ${climbIds.size} new highs planted. Charts: ${sorts.map((s) => s.sortId).join(', ')}`
);
