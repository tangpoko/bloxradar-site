// Fixture data source. Reads data/fixture.json (made by `npm run fixture`) and answers the same
// questions as mysql.js, returning rows with the same column names, so shaping is shared.
import { readFileSync } from 'node:fs';

const H = 3600000;
const STEP = 600000; // 10 minutes
const FILE = new URL('../../data/fixture.json', import.meta.url);

const DATE_FIELDS = ['created_at', 'updated_at', 'first_seen', 'last_seen', 'last_charted', 'peak_at'];
let F;

function load() {
  if (F) return F;
  let raw;
  try {
    raw = JSON.parse(readFileSync(FILE, 'utf8'));
  } catch (err) {
    throw new Error(`Could not read data/fixture.json. Run "npm run fixture" first. (${err.message})`);
  }
  const games = raw.games.map((g) => {
    const out = { ...g };
    for (const f of DATE_FIELDS) out[f] = g[f] ? new Date(g[f]) : null;
    const s = raw.series[g.universe_id] || {};
    out._s0 = s.s0 ? Date.parse(s.s0) : 0;
    out._s = s.s || [];
    out._h0 = s.h0 ? Date.parse(s.h0) : 0;
    out._ha = s.ha || [];
    out._hm = s.hm || [];
    return out;
  });
  const snapTimes = new Set();
  for (const g of games) for (let i = 0; i < g._s.length; i++) snapTimes.add(g._s0 + i * STEP);
  F = {
    games,
    byId: new Map(games.map((g) => [g.universe_id, g])),
    snapTimes: [...snapTimes].sort((a, b) => a - b),
    positions: raw.sort_positions.map((p) => ({
      ...p,
      best_at: new Date(p.best_at),
      last_seen: new Date(p.last_seen),
      moved_at: p.moved_at ? new Date(p.moved_at) : null,
    })),
    catalogs: raw.catalogs || {},
    products: raw.products || [],
    events: (raw.events || []).map((e) => ({ ...e, start_at: new Date(e.start_at), end_at: e.end_at ? new Date(e.end_at) : null })),
    runs: raw.runs.map((r) => ({
      ...r,
      started_at: new Date(r.started_at),
      finished_at: r.finished_at ? new Date(r.finished_at) : null,
    })),
  };
  return F;
}

// The reading a game had at time t (ms), or null if there was none.
function snapAt(g, t) {
  if (t === null || t === undefined) return null;
  const i = (t - g._s0) / STEP;
  return Number.isInteger(i) && i >= 0 && i < g._s.length ? g._s[i] : null;
}

const withPrev = (ctx, g) => ({ ...g, prev_players: snapAt(g, ctx.ts24 ? ctx.ts24.getTime() : null) });
const live = (ctx) => (g) => g.players > 0 && g.last_seen >= ctx.liveSince;
const byPlayers = (a, b) => b.players - a.players;

function hourlyRows(g, since, until = Infinity) {
  const out = [];
  for (let i = 0; i < g._ha.length; i++) {
    const t = g._h0 + i * H;
    if (t >= since && t < until) out.push({ t: new Date(t), players: g._ha[i], max: g._hm[i] });
  }
  return out;
}

// Same rules as mysql.js: "now" is the start of the latest finished, error-free run.
export async function context() {
  const f = load();
  const times = f.snapTimes;
  const good = [...f.runs].reverse().find((r) => r.finished_at && !r.error);
  const ref = good ? good.started_at.getTime() : times.length ? times[times.length - 1] : Date.now();
  let ts24 = null;
  for (let i = times.length - 1; i >= 0; i--) {
    if (times[i] <= ref - 24 * H) {
      if (times[i] >= ref - 26 * H) ts24 = times[i];
      break;
    }
  }
  return { ref: new Date(ref), ts24: ts24 === null ? null : new Date(ts24), liveSince: new Date(ref) };
}

export async function summary(ctx) {
  const runs = load().runs;
  const last = [...runs].reverse().find((r) => !r.error || !String(r.error).startsWith('Skipped')) || null;
  const ok = [...runs].reverse().find((r) => r.finished_at && !r.error) || null;
  let prevTotal = null;
  if (ctx.ts24) {
    const r = [...runs].reverse().find((x) => x.started_at <= ctx.ts24 && x.finished_at && !x.error);
    prevTotal = r ? r.total_players : null;
  }
  return { last, ok, prevTotal };
}

export async function topGames(ctx, limit, offset, f = { genres: [], min: 0 }) {
  const all = load()
    .games.filter(live(ctx))
    .filter((g) => g.players >= f.min && (!f.genres.length || f.genres.includes(g.genre_l1 || '')))
    .sort(byPlayers);
  return { items: all.slice(offset, offset + limit).map((g) => withPrev(ctx, g)), total: all.length };
}

export async function genreFacets(ctx, mins) {
  const by = new Map();
  for (const g of load().games.filter(live(ctx))) {
    const k = g.genre_l1 || '';
    const r = by.get(k) || { genre: k, counts: [0, ...mins.map(() => 0)] };
    r.counts[0] += 1;
    mins.forEach((m, i) => {
      if (g.players >= m) r.counts[i + 1] += 1;
    });
    by.set(k, r);
  }
  return [...by.values()];
}

export async function breakouts(ctx, cfg, limit) {
  const from = ctx.ref - cfg.windowDays * 24 * H;
  const to = ctx.ref - cfg.excludeRecentHours * H;
  const out = [];
  for (const g of load().games) {
    if (g.players < cfg.minPlayers || g.last_seen < ctx.liveSince) continue;
    const hrs = hourlyRows(g, from, to);
    if (!hrs.length) continue;
    const baseline = hrs.reduce((s, r) => s + r.players, 0) / hrs.length;
    if (baseline < cfg.minBaseline || hrs.length < cfg.minHours || g.players < baseline * cfg.minRatio) continue;
    out.push({ ...withPrev(ctx, g), baseline, hours_seen: hrs.length });
  }
  return out.sort((a, b) => b.players / b.baseline - a.players / a.baseline).slice(0, limit);
}

export async function newHighs(ctx, cfg, limit) {
  const since = ctx.ref - cfg.withinHours * H;
  const tracked = ctx.ref - cfg.minTrackedHours * H;
  return load()
    .games.filter(
      (g) =>
        g.peak_at >= since &&
        g.peak_players >= cfg.minPlayers &&
        g.first_seen <= tracked &&
        g.players >= g.peak_players * cfg.nearPeak &&
        g.last_seen >= ctx.liveSince
    )
    .sort(byPlayers)
    .slice(0, limit)
    .map((g) => withPrev(ctx, g));
}

export async function chartPositions(ctx, sortId, limit) {
  const f = load();
  const rows = f.positions.filter((p) => p.sort_id === sortId);
  if (!rows.length) return { asOf: null, items: [] };
  const latest = Math.max(...rows.map((p) => p.last_seen.getTime()));
  const items = rows
    .filter((p) => p.last_seen.getTime() === latest && f.byId.has(p.universe_id))
    .sort((a, b) => a.position - b.position)
    .slice(0, limit)
    .map((p) => ({
      ...withPrev(ctx, f.byId.get(p.universe_id)),
      position: p.position,
      best_position: p.best_position,
      best_at: p.best_at,
      prev_position: p.prev_position ?? null,
      moved_at: p.moved_at ?? null,
    }));
  return { asOf: new Date(latest), items };
}

export async function newGames(ctx, days, limit) {
  const since = ctx.ref - days * 24 * H;
  return load()
    .games.filter((g) => g.created_at >= since && live(ctx)(g))
    .sort(byPlayers)
    .slice(0, limit)
    .map((g) => withPrev(ctx, g));
}

const genreOf = (g) => g.genre_l1 || 'Unknown';

export async function genres(ctx) {
  const now = new Map();
  const prev = new Map();
  for (const g of load().games) {
    if (live(ctx)(g)) {
      const r = now.get(genreOf(g)) || { genre: genreOf(g), total_players: 0, game_count: 0 };
      r.total_players += g.players;
      r.game_count += 1;
      now.set(r.genre, r);
    }
    const p = snapAt(g, ctx.ts24 ? ctx.ts24.getTime() : null);
    if (p !== null) prev.set(genreOf(g), (prev.get(genreOf(g)) || 0) + p);
  }
  return [...now.values()].map((r) => ({ ...r, prev_players: prev.has(r.genre) ? prev.get(r.genre) : null }));
}

export async function trendRows(ctx, sample) {
  return load().games.filter(live(ctx)).sort(byPlayers).slice(0, sample).map((g) => withPrev(ctx, g));
}

export async function creators(ctx, type, limit) {
  const by = new Map();
  for (const g of load().games) {
    if (g.creator_type !== type || !live(ctx)(g)) continue;
    const row = withPrev(ctx, g);
    let c = by.get(g.creator_id);
    if (!c) {
      by.set(g.creator_id, (c = { creator_id: g.creator_id, creator_name: g.creator_name, total_players: 0, game_count: 0, prev_players: null, top: null }));
    }
    c.total_players += g.players;
    c.game_count += 1;
    if (row.prev_players !== null) c.prev_players = (c.prev_players || 0) + row.prev_players;
    if (!c.top || g.players > c.top.players) c.top = row;
  }
  return [...by.values()].sort((a, b) => b.total_players - a.total_players).slice(0, limit);
}

export async function creatorGames(ctx, type, id) {
  return load()
    .games.filter((g) => g.creator_type === type && String(g.creator_id) === String(id) && g.last_seen >= ctx.liveSince)
    .sort(byPlayers)
    .map((g) => withPrev(ctx, g));
}

export async function searchCreators(ctx, text, limit) {
  const needle = text.toLowerCase();
  const by = new Map();
  for (const g of load().games) {
    if (!live(ctx)(g) || !g.creator_name.toLowerCase().includes(needle)) continue;
    const row = withPrev(ctx, g);
    const k = `${g.creator_type}${g.creator_id}`;
    let c = by.get(k);
    if (!c) by.set(k, (c = { creator_id: g.creator_id, creator_type: g.creator_type, creator_name: g.creator_name, total_players: 0, game_count: 0, prev_players: null, top: null }));
    c.total_players += g.players;
    c.game_count += 1;
    if (row.prev_players !== null) c.prev_players = (c.prev_players || 0) + row.prev_players;
    if (!c.top || g.players > c.top.players) c.top = row;
  }
  return [...by.values()].sort((a, b) => b.total_players - a.total_players).slice(0, limit);
}

export async function game(ctx, id) {
  const g = load().byId.get(Number(id));
  return g ? withPrev(ctx, g) : null;
}

export async function gamePositions(ctx, id) {
  const all = load().positions;
  const latest = new Map();
  for (const p of all) latest.set(p.sort_id, Math.max(latest.get(p.sort_id) || 0, p.last_seen.getTime()));
  return all
    .filter((p) => p.universe_id === Number(id))
    .map((p) => ({ ...p, sort_last_seen: new Date(latest.get(p.sort_id)) }))
    .sort((a, b) => b.last_seen - a.last_seen || a.position - b.position);
}

export async function history(ctx, id, days) {
  const g = load().byId.get(Number(id));
  if (!g) return [];
  if (days === 1) {
    const since = ctx.ref - 24 * H;
    const out = [];
    for (let i = 0; i < g._s.length; i++) {
      const t = g._s0 + i * STEP;
      if (t >= since) out.push({ t: new Date(t), players: g._s[i] });
    }
    return out;
  }
  return hourlyRows(g, ctx.ref - days * 24 * H);
}

// The fixture's readings start with the hourly series, about a week before it was made.
function firstHour(games) {
  let first = Infinity;
  for (const g of games) if (g._ha.length) first = Math.min(first, g._h0);
  return first === Infinity ? null : new Date(first);
}
export async function firstReading() {
  return firstHour(load().games);
}
export async function gameFirstReading(ctx, id) {
  const g = load().byId.get(Number(id));
  return g ? firstHour([g]) || g.first_seen : null;
}

// Total players over time. The last 24 hours come from the recorded runs. Longer ranges add up
// every game's hourly series, which is what the fixture has for the week before.
export async function totalHistory(ctx, days) {
  const f = load();
  if (days === 1) {
    return f.runs
      .filter((r) => r.finished_at && !r.error && r.total_players !== null && r.started_at >= ctx.ref - 24 * H)
      .map((r) => ({ t: r.started_at, players: r.total_players }));
  }
  const since = ctx.ref - days * 24 * H;
  const sums = new Map();
  for (const g of f.games) {
    for (const r of hourlyRows(g, since)) sums.set(r.t.getTime(), (sums.get(r.t.getTime()) || 0) + r.players);
  }
  return [...sums].sort((a, b) => a[0] - b[0]).map(([t, players]) => ({ t: new Date(t), players }));
}

export async function hoursByDay(ctx, id, since) {
  const g = load().byId.get(Number(id));
  if (!g) return [];
  const days = new Map();
  for (const r of hourlyRows(g, since.getTime())) {
    const day = r.t.toISOString().slice(0, 10);
    const d = days.get(day) || { day, player_hours: 0, hours_read: 0 };
    d.player_hours += r.players;
    d.hours_read += 1;
    days.set(day, d);
  }
  return [...days.values()];
}

// The fixture holds real catalogues for the most played games only (see scripts/make-fixture.js).
export async function catalog(ctx, id) {
  const F = load();
  if (!F.byId.has(Number(id))) return null;
  const c = F.catalogs[id];
  return c ? { checked: true, items: c.items, geo_price: c.geo_price } : { checked: false, items: 0, geo_price: null };
}

export async function allCatalogs() {
  return Object.values(load().catalogs).filter((c) => c.items > 0);
}

export async function sparklines(ctx, ids, hours) {
  const f = load();
  const out = [];
  for (const id of ids) {
    const g = f.byId.get(Number(id));
    if (!g) continue;
    for (const r of hourlyRows(g, ctx.ref - hours * H)) out.push({ universe_id: g.universe_id, hour: r.t, avg_players: r.players });
  }
  return out;
}

// ---------- Added 2026-10-30. Values the fixture has no history for are made up from the game id,
// so they stay the same between runs: favorites history. ----------

const D = 24 * H;
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
// A number in [0, 1) from a game id and a salt.
function hash(id, salt = 0) {
  let x = (Number(id) % 2147483647) ^ (salt * 0x9e3779b1);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
const fairOf = (g) => {
  const n = (g.up_votes || 0) + (g.down_votes || 0);
  if (!n) return null;
  const r = g.up_votes / n;
  return r - (r - 0.5) * 2 ** -Math.log10(n + 1);
};

export async function rated(ctx, cfg, limit) {
  return load()
    .games.filter((g) => g.players >= cfg.minPlayers && g.last_seen >= ctx.liveSince && (g.up_votes || 0) + (g.down_votes || 0) >= cfg.minVotes)
    .map((g) => ({ ...withPrev(ctx, g), fair_rating: fairOf(g) }))
    .sort((a, b) => b.fair_rating - a.fair_rating)
    .slice(0, limit);
}

// Made up: a day's favorites gain is 2% to 30% of current players.
function favGain(g, days) {
  if (g.favorites === null || g.favorites === undefined) return null;
  const perDay = g.players * (0.02 + hash(g.universe_id, 1) * 0.28);
  return Math.min(g.favorites, Math.round(perDay * days * (days > 1 ? 0.7 + hash(g.universe_id, 2) * 0.5 : 1)));
}

export async function saving(ctx, days, limit) {
  return load()
    .games.filter(live(ctx))
    .map((g) => ({ ...withPrev(ctx, g), fav_gain: favGain(g, days), fav_since: new Date(dayOf(ctx.ref - days * D)) }))
    .filter((g) => g.fav_gain > 0)
    .sort((a, b) => b.fav_gain - a.fav_gain)
    .slice(0, limit);
}

export async function favoritesGain(ctx, id, days) {
  const g = load().byId.get(Number(id));
  const gain = g ? favGain(g, days) : null;
  return gain === null ? null : { fav_gain: gain, fav_since: new Date(dayOf(ctx.ref - days * D)) };
}

export async function rising(ctx, cfg, limit) {
  const thenTo = ctx.ref - cfg.windowDays * D;
  const avg = (rows) => rows.reduce((s, r) => s + r.players, 0) / rows.length;
  const out = [];
  for (const g of load().games) {
    if (g.players < cfg.minPlayers || g.players > cfg.maxPlayers || g.last_seen < ctx.liveSince) continue;
    const now = hourlyRows(g, ctx.ref - D);
    const then = hourlyRows(g, thenTo - D, thenTo);
    if (now.length < cfg.minHours || then.length < cfg.minHours) continue;
    const a = avg(now);
    const b = avg(then);
    if (b >= cfg.minThen && a >= b * cfg.minRatio) out.push({ ...withPrev(ctx, g), now_avg: a, then_avg: b });
  }
  return out.sort((x, y) => y.now_avg / y.then_avg - x.now_avg / x.then_avg).slice(0, limit);
}

export async function recordsToday(ctx, cfg, limit) {
  return load()
    .games.filter(
      (g) =>
        g.peak_at >= ctx.ref - D &&
        g.peak_players >= cfg.minPlayers &&
        g.first_seen <= ctx.ref - cfg.minTrackedDays * D &&
        g.last_seen >= ctx.liveSince
    )
    .sort((a, b) => b.peak_players - a.peak_players)
    .slice(0, limit)
    .map((g) => withPrev(ctx, g));
}

export async function gameProducts(ctx, id) {
  return load()
    .products.filter((p) => p.universe_id === Number(id))
    .sort((a, b) => a.kind.localeCompare(b.kind) || b.for_sale - a.for_sale || (a.price ?? 0) - (b.price ?? 0));
}

let passRows = null;
export async function passPrices() {
  const f = load();
  passRows ??= f.products
    .filter((p) => p.kind === 'pass' && p.for_sale && p.price > 0)
    .map((p) => ({ ...p, genre_l1: f.byId.get(p.universe_id)?.genre_l1 ?? null }));
  return passRows;
}

export async function gameEvents(ctx, id) {
  return load()
    .events.filter((e) => e.universe_id === Number(id) && (e.end_at ? e.end_at >= ctx.ref : e.start_at >= ctx.ref - D))
    .sort((a, b) => a.start_at - b.start_at);
}

// Thumbnail addresses in display order.
export async function thumbnails(ctx, id) {
  const g = load().byId.get(Number(id));
  return g ? g.thumb_urls || (g.thumb_url ? [g.thumb_url] : []) : [];
}

export async function search(ctx, text, limit) {
  const needle = text.toLowerCase();
  const asId = /^\d{1,19}$/.test(text) ? Number(text) : null;
  return load()
    .games.filter(
      (g) =>
        g.last_seen >= ctx.liveSince &&
        (g.name.toLowerCase().includes(needle) || (asId !== null && (g.universe_id === asId || g.root_place_id === asId)))
    )
    .sort(byPlayers)
    .slice(0, limit)
    .map((g) => withPrev(ctx, g));
}

// ---------- Marketplace ----------

// data/catalog-fixture.json is made by `npm run fixture:catalog` from the real database. Without
// it the marketplace is empty.
export async function catalogSnapshot() {
  try {
    return JSON.parse(readFileSync(new URL('../../data/catalog-fixture.json', import.meta.url), 'utf8'));
  } catch {
    return { day: null, items: [] };
  }
}
