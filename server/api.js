// JSON API. Each handler gets the parsed URL and returns a plain object to send.
import { data } from './data/index.js';
import { PANELS, DEFAULT_LIMIT, MAX_LIMIT, EARNINGS, FILTERS } from './config.js';
import { dailyHours, earnings, reference } from './earnings.js';
import { benchmarks, benchmarkFor, passType, typeLabel } from './prices.js';
import * as S from './shape.js';
import * as M from './market.js';
import { creatorProfile } from './profile.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Routes whose limit defaults to something other than DEFAULT_LIMIT. The cache key uses these too.
const LIMIT_DEFAULTS = { genres: MAX_LIMIT, search: 20 };

function limitOf(url, fallback = DEFAULT_LIMIT) {
  const n = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_LIMIT) : fallback;
}
// Filters from ?genre=A,B&min=1000. Genres are matched as given, with FILTERS.noGenre standing for
// games with no genre. min must be one of the offered steps, anything else means no minimum.
function filterOf(url) {
  const genres = [...new Set((url.searchParams.get('genre') || '').split(',').map((s) => s.trim().slice(0, 40)).filter(Boolean))]
    .slice(0, FILTERS.maxGenres)
    .map((s) => (s === FILTERS.noGenre ? '' : s))
    .sort();
  const n = Number(url.searchParams.get('min'));
  return { genres, min: FILTERS.minPlayers.includes(n) ? n : 0 };
}
function offsetOf(url) {
  const n = Number.parseInt(url.searchParams.get('offset') ?? '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 0;
}

// The context (latest run time and the reading 24 hours earlier) is shared by every request for
// 30 seconds, so a burst of different endpoints costs two small queries in total.
const CONTEXT_SECONDS = 30;
let ctxCache = { expires: 0, promise: null };
function ctx() {
  if (ctxCache.expires > Date.now()) return ctxCache.promise;
  const promise = data.context();
  ctxCache = { expires: Date.now() + CONTEXT_SECONDS * 1000, promise };
  promise.catch(() => {
    if (ctxCache.promise === promise) ctxCache = { expires: 0, promise: null };
  });
  return promise;
}

async function withSparks(c, rows, hours = 24) {
  const m = S.sparkMap(await data.sparklines(c, rows.map((r) => r.id), hours));
  return rows.map((r) => ({ ...r, spark: m.get(r.id) || [] }));
}

// How many places a game moved in a chart, if it moved in the last 24 hours. Positive is up
// (towards 1), negative is down, 0 is no recent move.
function placesMoved(row, asOf) {
  if (!row.prev_position || !row.moved_at || !asOf) return 0;
  if (new Date(asOf) - new Date(row.moved_at) > 24 * 3600000) return 0;
  return Number(row.prev_position) - Number(row.position);
}

const chartIdOf = (url) => {
  const id = (url.searchParams.get('id') || '').toLowerCase();
  return /^[a-z0-9-]{1,60}$/.test(id) ? id : PANELS.topEarningSort;
};

async function chartRoute(c, sortId, limit) {
  const { asOf, items } = await data.chartPositions(c, sortId, limit);
  return {
    chartId: sortId,
    chart: S.sortLabel(sortId),
    chartAsOf: S.iso(asOf),
    items: items.map((r) => ({
      ...S.game(r),
      position: Number(r.position),
      bestPosition: Number(r.best_position),
      bestAt: S.iso(r.best_at),
      moved: placesMoved(r, asOf),
    })),
  };
}

// The price benchmarks only change when the pass list does (at most hourly), so they are worked out
// once per list rather than per request.
let bmCache = { rows: null, bm: null };
async function passBenchmarks() {
  const rows = await data.passPrices();
  if (bmCache.rows !== rows) bmCache = { rows, bm: benchmarks(rows) };
  return bmCache.bm;
}

const eventRow = (r) => ({ id: String(r.event_id), title: r.title, category: r.category || null, start: S.iso(r.start_at), end: S.iso(r.end_at) });

// Time ranges for the player graphs, in days. The browser only offers a range once our readings
// cover most of it (see rangeButtons in public/assets/common.js).
const RANGE_DAYS = { '24h': 1, '7d': 7, '30d': 30, '60d': 60, '90d': 90, '180d': 180, '1y': 365 };
const rangeOf = (url) => (Object.hasOwn(RANGE_DAYS, url.searchParams.get('range')) ? url.searchParams.get('range') : '24h');

const TREND_SORTS = ['players', 'growing', 'new'];
const sortOf = (url, allowed) => (allowed.includes(url.searchParams.get('sort')) ? url.searchParams.get('sort') : allowed[0]);

function creatorRow(r) {
  const players = Number(r.total_players);
  const prev = r.prev_players === null ? null : Number(r.prev_players);
  return {
    id: Number(r.creator_id),
    name: r.creator_name,
    type: r.creator_type,
    players,
    games: Number(r.game_count),
    prev,
    change: prev === null ? null : players - prev,
    changePct: prev ? Math.round(((players - prev) / prev) * 1000) / 10 : null,
    topGame: r.top ? S.game(r.top) : null,
  };
}

const creatorUrl = (type, id) => (type === 'Group' ? `https://www.roblox.com/communities/${id}` : `https://www.roblox.com/users/${id}/profile`);

// One studio or solo developer: the totals and every live game they have. kind is 'g' or 'u'.
async function studioRoute(c, kind, id) {
  const type = kind === 'g' ? 'Group' : 'User';
  const rows = await data.creatorGames(c, type, id);
  if (!rows.length) throw new HttpError(404, 'Studio not found');
  const withPrev = rows.filter((r) => r.prev_players !== null);
  const total = rows.reduce((n, r) => n + (Number(r.players) || 0), 0);
  const studio = creatorRow({
    creator_id: id,
    creator_name: rows[0].creator_name,
    creator_type: type,
    total_players: total,
    game_count: rows.length,
    prev_players: withPrev.length ? withPrev.reduce((n, r) => n + Number(r.prev_players), 0) : null,
    top: null,
  });
  return { studio: { ...studio, url: creatorUrl(type, id) }, games: rows.map(S.game) };
}

const routes = {
  async summary(c) {
    const { last, ok, prevTotal } = await data.summary(c);
    const total = ok ? Number(ok.total_players) : null;
    return {
      totalPlayers: total,
      prevTotal: prevTotal === null ? null : Number(prevTotal),
      gamesRead: ok ? Number(ok.games_read) : null,
      lastRun: last
        ? {
            startedAt: S.iso(last.started_at),
            finishedAt: S.iso(last.finished_at),
            ok: !last.error && !!last.finished_at,
            warning: last.warning || null,
          }
        : null,
      lastGoodRun: ok ? S.iso(ok.finished_at) : null,
    };
  },

  async breakouts(c, url) {
    const cfg = PANELS.breakouts;
    const rows = (await data.breakouts(c, cfg, limitOf(url))).map((r) => ({
      ...S.game(r),
      baseline: Math.round(Number(r.baseline)),
      ratio: Math.round((Number(r.players) / Number(r.baseline)) * 10) / 10,
    }));
    return { rules: cfg, items: await withSparks(c, rows) };
  },

  async 'new-highs'(c, url) {
    const cfg = PANELS.newHighs;
    const rows = (await data.newHighs(c, cfg, limitOf(url))).map(S.game);
    return { rules: cfg, items: await withSparks(c, rows) };
  },

  async top(c, url) {
    const f = filterOf(url);
    const [{ items, total }, facets] = await Promise.all([
      data.topGames(c, limitOf(url), offsetOf(url), f),
      data.genreFacets(c, FILTERS.minPlayers),
    ]);
    return {
      total,
      offset: offsetOf(url),
      items: items.map(S.game),
      filters: {
        minPlayers: FILTERS.minPlayers,
        // counts[0] is every live game in the genre, counts[i] those with at least minPlayers[i - 1].
        genres: facets.map((r) => ({ genre: r.genre || FILTERS.noGenre, counts: r.counts })),
      },
    };
  },

  async 'top-earning'(c, url) {
    return chartRoute(c, PANELS.topEarningSort, limitOf(url));
  },

  // Any Roblox chart we read, by its id: /api/chart?id=top-trending
  async chart(c, url) {
    return chartRoute(c, chartIdOf(url), limitOf(url));
  },

  async 'new-games'(c, url) {
    const days = PANELS.newGames.days;
    return { days, items: (await data.newGames(c, days, limitOf(url))).map(S.game) };
  },

  async genres(c, url) {
    const rows = await data.genres(c);
    const total = rows.reduce((s, r) => s + Number(r.total_players), 0);
    const items = rows
      .map((r) => {
        const players = Number(r.total_players);
        const prev = r.prev_players === null ? null : Number(r.prev_players);
        return {
          genre: r.genre,
          players,
          games: Number(r.game_count),
          share: total ? Math.round((players / total) * 1000) / 10 : 0,
          prev,
          change: prev === null ? null : players - prev,
          changePct: prev ? Math.round(((players - prev) / prev) * 1000) / 10 : null,
        };
      })
      .sort((a, b) => b.players - a.players)
      .slice(0, limitOf(url, LIMIT_DEFAULTS.genres));
    return { total, items };
  },

  async trends(c, url) {
    const cfg = PANELS.trends;
    const sort = sortOf(url, TREND_SORTS);
    const rows = await data.trendRows(c, cfg.sampleGames);
    return {
      sort,
      sampleGames: rows.length,
      rules: { growingMinPlayers: cfg.growingMinPlayers, newDays: PANELS.newGames.days },
      items: S.trends(rows, { ...cfg, sort, newSince: new Date(c.ref - PANELS.newGames.days * 24 * 3600000) }, limitOf(url)),
    };
  },

  // ?type=studio|solo, by players. ?sort=growing: studios and solo developers together, by the
  // change against yesterday, among the PANELS.creatorsGrowing.sample biggest of each.
  async creators(c, url) {
    if (url.searchParams.get('sort') === 'growing') {
      const cfg = PANELS.creatorsGrowing;
      const [groups, users] = await Promise.all([data.creators(c, 'Group', cfg.sample), data.creators(c, 'User', cfg.sample)]);
      const items = [...groups.map((r) => ({ ...r, creator_type: 'Group' })), ...users.map((r) => ({ ...r, creator_type: 'User' }))]
        .map(creatorRow)
        .filter((r) => r.prev !== null && r.prev >= cfg.minPrevPlayers && r.changePct !== null)
        .sort((a, b) => b.changePct - a.changePct)
        .slice(0, limitOf(url));
      return { type: 'all', sort: 'growing', rules: cfg, items };
    }
    const kind = url.searchParams.get('type') === 'solo' ? 'solo' : 'studio';
    const type = kind === 'solo' ? 'User' : 'Group';
    const rows = await data.creators(c, type, limitOf(url));
    return { type: kind, items: rows.map((r) => creatorRow({ ...r, creator_type: type })) };
  },

  async rated(c, url) {
    const cfg = PANELS.rated;
    const rows = await data.rated(c, cfg, limitOf(url));
    return { rules: cfg, items: rows.map((r) => ({ ...S.game(r), ...S.votes(r) })) };
  },

  // Favorites gained. ?days=7 for the week, otherwise the last day.
  async saving(c, url) {
    const days = url.searchParams.get('days') === '7' ? PANELS.saving.weekDays : PANELS.saving.days;
    const rows = await data.saving(c, days, limitOf(url));
    return { days, items: rows.map((r) => ({ ...S.game(r), favGain: Number(r.fav_gain), favSince: S.iso(r.fav_since) })) };
  },

  async rising(c, url) {
    const cfg = PANELS.rising;
    const rows = (await data.rising(c, cfg, limitOf(url))).map(risingRow);
    return { rules: cfg, items: await withSparks(c, rows, 24 * (cfg.windowDays + 1)) };
  },

  async 'records-today'(c, url) {
    const cfg = PANELS.recordsToday;
    return { rules: cfg, items: (await data.recordsToday(c, cfg, limitOf(url))).map(S.game) };
  },

  // The four tiles on the front page: the top game of each list, and how many games the list has.
  async hero(c) {
    const limit = 100;
    const [top, br, hi, ri, te, tt, ng] = await Promise.all([
      data.topGames(c, 1, 0),
      data.breakouts(c, PANELS.breakouts, limit),
      data.newHighs(c, PANELS.newHighs, limit),
      data.rising(c, PANELS.rising, limit),
      data.chartPositions(c, PANELS.topEarningSort, 5),
      data.chartPositions(c, 'top-trending', 5),
      data.newGames(c, PANELS.newGames.days, 5),
    ]);
    // A tile is never empty. When its list has no game (the first days of readings, or a quiet
    // day), it shows a list that always has one instead. A stand-in list skips games already on
    // an earlier tile, so the same game is not shown twice.
    const shown = new Set();
    const pick = (rows) => {
      const r = rows.find((x) => !shown.has(Number(x.universe_id)));
      return r ? S.game(r) : null;
    };
    const lists = [];
    const add = (key, count, g) => {
      if (g) shown.add(g.id);
      lists.push([key, count, g]);
    };
    add('top', top.total, top.items[0] && S.game(top.items[0]));
    if (br.length) add('breakouts', br.length, { ...S.game(br[0]), ratio: Math.round((Number(br[0].players) / Number(br[0].baseline)) * 10) / 10 });
    else add('top-trending', null, pick(tt.items));
    if (hi.length) add('new-highs', hi.length, S.game(hi[0]));
    else add('new-games', null, pick(ng));
    if (ri.length) add('rising', ri.length, risingRow(ri[0]));
    else add('top-earning', null, pick(te.items));
    return {
      risingDays: PANELS.rising.windowDays,
      tiles: lists.map(([key, count, g]) => ({ key, count, game: g || null })),
    };
  },

  // Total players in the tracked games over time, for the front page graph.
  async 'total-history'(c, url) {
    const range = rangeOf(url);
    const [raw, since] = await Promise.all([data.totalHistory(c, RANGE_DAYS[range]), data.firstReading(c)]);
    return { range, since: S.iso(since), points: S.history(raw) };
  },

  async search(c, url) {
    const text = (url.searchParams.get('q') || '').trim().slice(0, 100);
    if (text.length < 2) return { q: text, items: [], creators: [] };
    const limit = limitOf(url, LIMIT_DEFAULTS.search);
    const [games, creators] = await Promise.all([data.search(c, text, limit), data.searchCreators(c, text, Math.min(limit, 10))]);
    return { q: text, items: games.map(S.game), creators: creators.map(creatorRow) };
  },
};

function soft(promise, fallback, what) {
  return promise.catch((err) => {
    console.error(new Date().toISOString(), `game page ${what}:`, err.message || err);
    return fallback;
  });
}

function risingRow(r) {
  return {
    ...S.game(r),
    nowAvg: Math.round(Number(r.now_avg)),
    thenAvg: Math.round(Number(r.then_avg)),
    ratio: Math.round((Number(r.now_avg) / Number(r.then_avg)) * 10) / 10,
  };
}

async function gameRoute(c, id) {
  const row = await data.game(c, id);
  if (!row) throw new HttpError(404, 'Game not found');
  // The extras below each fall back to nothing if their query fails, so one broken section never
  // takes the whole game page down.
  const [rawPositions, events, products, bm, fav, thumbs] = await Promise.all([
    data.gamePositions(c, id),
    soft(data.gameEvents(c, id), [], 'events'),
    soft(data.gameProducts(c, id), [], 'products'),
    soft(passBenchmarks(), new Map(), 'price benchmarks'),
    soft(data.favoritesGain(c, id, PANELS.saving.weekDays), null, 'favorites gain'),
    soft(data.thumbnails(c, id), [], 'thumbnails'),
  ]);
  const positions = rawPositions.map((p) => ({
    chartId: p.sort_id,
    chart: S.sortLabel(p.sort_id),
    position: Number(p.position),
    bestPosition: Number(p.best_position),
    bestAt: S.iso(p.best_at),
    lastSeen: S.iso(p.last_seen),
    current: new Date(p.last_seen).getTime() >= new Date(p.sort_last_seen).getTime(),
  }));
  return {
    ...S.gameDetail(row),
    live: new Date(row.last_seen) >= c.liveSince,
    lastSeen: S.iso(row.last_seen),
    positions,
    hoursPlayed: await hoursPlayed(c, id),
    ...S.votes(row),
    codes: S.codesFrom(row.description),
    events: events.map(eventRow),
    thumb: thumbs[0] || null,
    thumbnails: thumbs,
    favorites7: fav && fav.fav_gain !== null ? { gain: Number(fav.fav_gain), since: S.iso(fav.fav_since) } : null,
    products: products.map((p) => {
      const type = p.kind === 'pass' ? passType(p.name) : null;
      const forSale = !!Number(p.for_sale);
      const bench = type && forSale && p.price > 0 ? benchmarkFor(bm, row.genre_l1 || '', type) : null;
      return {
        kind: p.kind,
        id: String(p.product_id),
        name: p.name,
        price: p.price === null ? null : Number(p.price),
        forSale,
        type,
        typeLabel: type ? typeLabel(type) : null,
        benchmark: bench,
      };
    }),
  };
}

// Hours played per day for the last EARNINGS.averageDays days, plus the earnings estimate.
async function hoursPlayed(c, id) {
  const today = c.ref.toISOString().slice(0, 10);
  const since = new Date(Date.parse(today) - EARNINGS.averageDays * 24 * 3600000);
  const [rows, cat, all] = await Promise.all([data.hoursByDay(c, id, since), data.catalog(c, id), data.allCatalogs()]);
  const days = dailyHours(rows, today);
  return { days, ...earnings(days, cat, reference(all)) };
}

async function historyRoute(c, id, url) {
  const range = rangeOf(url);
  const days = RANGE_DAYS[range];
  const [raw, since] = await Promise.all([data.history(c, id, days), data.gameFirstReading(c, id)]);
  const points = S.history(raw);
  const step = days === 1 ? '10m' : points.length < raw.length ? '1d' : '1h';
  return { id: Number(id), range, since: S.iso(since), step, points };
}

// Works out which endpoint a URL is for, without touching the data. Returns null for unknown paths.
// key is the cache key: the route plus only the parameters handlers read, already parsed, so
// /api/top, ?limit=10&junk=1 and ?limit=010 all share one cache entry.
export function resolve(url) {
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const p = url.searchParams;
  const params = [
    `limit=${limitOf(url, LIMIT_DEFAULTS[parts[0]] ?? DEFAULT_LIMIT)}`,
    `offset=${offsetOf(url)}`,
    `q=${(p.get('q') || '').trim().slice(0, 100).toLowerCase()}`,
    `type=${p.get('type') === 'solo' ? 'solo' : 'studio'}`,
    `range=${rangeOf(url)}`,
    `genre=${filterOf(url).genres.join(',')}`,
    `id=${chartIdOf(url)}`,
    `sort=${sortOf(url, [...TREND_SORTS, 'growing'])}`,
    `min=${filterOf(url).min}`,
    `days=${p.get('days') === '7' ? 7 : 1}`,
    `mk=${parts[0] === 'market' ? M.keyOf(M.parse(url)) : ''}`,
  ].join('&');
  let name = null;
  let run = null;
  if (parts[0] === 'game' && /^\d{1,19}$/.test(parts[1] || '')) {
    if (parts.length === 2) {
      name = `game/${parts[1]}`;
      run = (c) => gameRoute(c, parts[1]);
    } else if (parts.length === 3 && parts[2] === 'history') {
      name = `game/${parts[1]}/history`;
      run = (c) => historyRoute(c, parts[1], url);
    }
  } else if (parts[0] === 'studio' && (parts[1] === 'g' || parts[1] === 'u') && /^\d{1,19}$/.test(parts[2] || '')) {
    if (parts.length === 3) {
      name = `studio/${parts[1]}/${parts[2]}`;
      run = (c) => studioRoute(c, parts[1], parts[2]);
    } else if (parts.length === 4 && parts[3] === 'profile') {
      name = `studio/${parts[1]}/${parts[2]}/profile`;
      run = async (c) => {
        await studioRoute(c, parts[1], parts[2]);
        return { profile: await creatorProfile(parts[1] === 'g' ? 'Group' : 'User', parts[2]) };
      };
    }
  } else if (parts[0] === 'market') {
    if (parts.length === 2 && parts[1] === 'home') {
      name = 'market/home';
      run = () => M.home(M.parse(url));
    } else if (parts.length === 2 && parts[1] === 'creators') {
      name = 'market/creators';
      run = () => M.creators(M.parse(url));
    } else if (parts.length === 2 && parts[1] === 'items') {
      name = 'market/items';
      run = () => M.items(M.parse(url));
    } else if (parts.length === 4 && parts[1] === 'creator' && parts[3] === 'profile' && /^\d{1,19}$/.test(parts[2])) {
      name = `market/creator/${parts[2]}/profile`;
      run = async () => {
        const c = await M.creator(Number(parts[2]));
        if (!c) throw new HttpError(404, 'Creator not found');
        return { profile: await creatorProfile(c.creator.type, c.creator.id) };
      };
    } else if (parts.length === 3 && parts[1] === 'creator' && /^\d{1,19}$/.test(parts[2])) {
      name = `market/creator/${parts[2]}`;
      run = async () => {
        const body = await M.creator(Number(parts[2]));
        if (!body) throw new HttpError(404, 'Creator not found');
        return body;
      };
    }
  } else if (parts.length === 1 && Object.hasOwn(routes, parts[0])) {
    name = parts[0];
    run = (c) => routes[parts[0]](c, url);
  }
  return run ? { key: `${name}?${params}`, run } : null;
}

// Returns the response body, or throws HttpError. Unknown routes fail before any data is read.
export async function handleApi(url, route = resolve(url)) {
  if (!route) throw new HttpError(404, 'Unknown endpoint');
  const c = await ctx();
  const body = await route.run(c);
  return { asOf: S.iso(c.ref), ...body };
}
