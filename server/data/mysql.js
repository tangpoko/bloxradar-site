// MySQL / MariaDB data source. Every query the website runs is in this file.
// Rules kept for MariaDB 10.3: no row aliases on INSERT, no CTEs, no GROUP BY that relies on
// functional dependency (MariaDB does not detect it), aggregates aliased to names that are not
// also column names.
//
// ctx (built by context()) carries:
//   ref        start time of the latest finished, error-free collector run; "now" for every panel
//   ts24       the reading closest to 24 hours before ref, or null if there is none yet
//   liveSince  same as ref. games.players is only current when last_seen >= this; games that
//              dropped off the tracking list keep a stale value, so every list filters on it
import { getPool } from '../../src/db.js';

let pool;
const db = () => (pool ??= getPool());
async function q(sql, params = []) {
  const [rows] = await db().query(sql, params);
  return rows;
}

// For tables added after launch: until `npm run migrate` has run after a deploy, a query on one
// gives no rows instead of an error page.
async function qOpt(sql, params = []) {
  try {
    return await q(sql, params);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return [];
    throw err;
  }
}

const H = 3600000;
const D = 24 * H;
const dayOf = (d) => new Date(d).toISOString().slice(0, 10);

// Game columns every list returns. prev_players comes from the snapshot 24 hours earlier.
const G = `g.universe_id, g.root_place_id, g.name, g.creator_id, g.creator_name, g.creator_type,
  g.genre_l1, g.genre_l2, g.icon_url, g.players, g.peak_players, g.peak_at, g.created_at,
  g.updated_at, g.first_seen, g.last_seen, g.visits, g.favorites, g.up_votes, g.down_votes, g.max_players,
  p.players AS prev_players`;
// Needs ctx.ts24 as its parameter. When ts24 is null, "p.ts = NULL" matches nothing, which is intended.
const PREV = 'LEFT JOIN snapshots p ON p.universe_id = g.universe_id AND p.ts = ?';

// A finished 10-minute collector run with no error. Rows with error 'Skipped: previous run still
// going' are excluded too, and so are runs of the daily job (job = 'daily').
const GOOD_RUN = "job = 'collect' AND finished_at IS NOT NULL AND error IS NULL";

export async function context() {
  const [run] = await q(`SELECT started_at FROM runs WHERE ${GOOD_RUN} ORDER BY id DESC LIMIT 1`);
  let ref = run ? new Date(run.started_at) : null;
  if (!ref) {
    const [a] = await q('SELECT MAX(ts) AS ref FROM snapshots');
    ref = a.ref ? new Date(a.ref) : new Date();
  }
  // Accept a reading up to 2 hours older than exactly 24h, in case a run was missed.
  const [b] = await q('SELECT MAX(ts) AS ts FROM snapshots WHERE ts <= ? AND ts >= ?', [
    new Date(ref - 24 * H),
    new Date(ref - 26 * H),
  ]);
  return { ref, ts24: b.ts ? new Date(b.ts) : null, liveSince: ref };
}

export async function summary(ctx) {
  const [last] = await q(
    "SELECT started_at, finished_at, error, warning FROM runs WHERE job = 'collect' AND (error IS NULL OR error NOT LIKE 'Skipped%') ORDER BY id DESC LIMIT 1"
  );
  const [ok] = await q(
    `SELECT started_at, finished_at, games_read, total_players FROM runs WHERE ${GOOD_RUN} ORDER BY id DESC LIMIT 1`
  );
  let prev = null;
  if (ctx.ts24) {
    const [r] = await q(
      `SELECT total_players FROM runs
       WHERE started_at <= ? AND ${GOOD_RUN}
       ORDER BY started_at DESC LIMIT 1`,
      [ctx.ts24]
    );
    prev = r ? r.total_players : null;
  }
  return { last: last || null, ok: ok || null, prevTotal: prev };
}

// Total players in the tracked games over the last `days` days, one point per good collector run.
// Rows: { t, players }
export async function totalHistory(ctx, days) {
  const since = new Date(ctx.ref - days * 24 * H);
  return q(
    `SELECT started_at AS t, total_players AS players FROM runs
     WHERE ${GOOD_RUN} AND total_players IS NOT NULL AND started_at >= ? ORDER BY started_at`,
    [since]
  );
}

// Time of the first good collector run, or null.
export async function firstReading() {
  const [r] = await q(`SELECT MIN(started_at) AS t FROM runs WHERE ${GOOD_RUN}`);
  return r ? r.t : null;
}

// When we first read a game, or null.
export async function gameFirstReading(ctx, id) {
  const [r] = await q('SELECT first_seen AS t FROM games WHERE universe_id = ?', [id]);
  return r ? r.t : null;
}

// f = { genres, min }: genres is a list of genre_l1 values ('' for games with none), empty for all.
export async function topGames(ctx, limit, offset, f = { genres: [], min: 0 }) {
  let where = 'g.players > 0 AND g.last_seen >= ? AND g.players >= ?';
  const params = [ctx.liveSince, f.min];
  if (f.genres.length) {
    where += ` AND COALESCE(g.genre_l1, '') IN (${f.genres.map(() => '?').join(',')})`;
    params.push(...f.genres);
  }
  const items = await q(`SELECT ${G} FROM games g ${PREV} WHERE ${where} ORDER BY g.players DESC LIMIT ? OFFSET ?`, [
    ctx.ts24,
    ...params,
    limit,
    offset,
  ]);
  const [c] = await q(`SELECT COUNT(*) AS n FROM games g WHERE ${where}`, params);
  return { items, total: Number(c.n) };
}

// Live games per genre, in total and at or above each player count in mins. Feeds the counts in
// the Filters panel.
export async function genreFacets(ctx, mins) {
  const sums = mins.map((m, i) => `SUM(players >= ${Number(m)}) AS at_${i}`).join(', ');
  const rows = await q(
    `SELECT COALESCE(genre_l1, '') AS genre_name, COUNT(*) AS n_all${sums ? `, ${sums}` : ''}
     FROM games WHERE players > 0 AND last_seen >= ?
     GROUP BY COALESCE(genre_l1, '')`,
    [ctx.liveSince]
  );
  return rows.map((r) => ({ genre: r.genre_name, counts: [Number(r.n_all), ...mins.map((m, i) => Number(r[`at_${i}`]))] }));
}

export async function breakouts(ctx, cfg, limit) {
  return q(
    `SELECT ${G}, b.baseline, b.hours_seen
     FROM (
       SELECT h.universe_id, AVG(h.avg_players) AS baseline, COUNT(*) AS hours_seen
       FROM hourly h JOIN games g2 ON g2.universe_id = h.universe_id
       WHERE g2.players >= ? AND g2.last_seen >= ? AND h.hour >= ? AND h.hour < ?
       GROUP BY h.universe_id
     ) b
     JOIN games g ON g.universe_id = b.universe_id
     ${PREV}
     WHERE b.baseline >= ? AND b.hours_seen >= ? AND g.players >= b.baseline * ?
     ORDER BY g.players / b.baseline DESC
     LIMIT ?`,
    [
      cfg.minPlayers,
      ctx.liveSince,
      new Date(ctx.ref - cfg.windowDays * 24 * H),
      new Date(ctx.ref - cfg.excludeRecentHours * H),
      ctx.ts24,
      cfg.minBaseline,
      cfg.minHours,
      cfg.minRatio,
      limit,
    ]
  );
}

export async function newHighs(ctx, cfg, limit) {
  return q(
    `SELECT ${G} FROM games g ${PREV}
     WHERE g.peak_at >= ? AND g.peak_players >= ? AND g.first_seen <= ?
       AND g.players >= g.peak_players * ? AND g.last_seen >= ?
     ORDER BY g.players DESC LIMIT ?`,
    [
      ctx.ts24,
      new Date(ctx.ref - cfg.withinHours * H),
      cfg.minPlayers,
      new Date(ctx.ref - cfg.minTrackedHours * H),
      cfg.nearPeak,
      ctx.liveSince,
      limit,
    ]
  );
}

export async function chartPositions(ctx, sortId, limit) {
  const [s] = await q('SELECT MAX(last_seen) AS ts FROM sort_positions WHERE sort_id = ?', [sortId]);
  if (!s.ts) return { asOf: null, items: [] };
  const items = await q(
    `SELECT ${G}, sp.position, sp.best_position, sp.best_at, sp.prev_position, sp.moved_at
     FROM sort_positions sp
     JOIN games g ON g.universe_id = sp.universe_id
     ${PREV}
     WHERE sp.sort_id = ? AND sp.last_seen = ?
     ORDER BY sp.position LIMIT ?`,
    [ctx.ts24, sortId, s.ts, limit]
  );
  return { asOf: s.ts, items };
}

export async function newGames(ctx, days, limit) {
  return q(
    `SELECT ${G} FROM games g ${PREV}
     WHERE g.created_at >= ? AND g.players > 0 AND g.last_seen >= ?
     ORDER BY g.players DESC LIMIT ?`,
    [ctx.ts24, new Date(ctx.ref - days * 24 * H), ctx.liveSince, limit]
  );
}

// [{ genre, total_players, game_count, prev_players }]
export async function genres(ctx) {
  const now = await q(
    `SELECT COALESCE(NULLIF(genre_l1, ''), 'Unknown') AS genre,
            SUM(players) AS total_players, COUNT(*) AS game_count
     FROM games WHERE players > 0 AND last_seen >= ?
     GROUP BY COALESCE(NULLIF(genre_l1, ''), 'Unknown')`,
    [ctx.liveSince]
  );
  const prev = ctx.ts24
    ? await q(
        `SELECT COALESCE(NULLIF(g.genre_l1, ''), 'Unknown') AS genre, SUM(s.players) AS prev_total
         FROM snapshots s JOIN games g ON g.universe_id = s.universe_id
         WHERE s.ts = ?
         GROUP BY COALESCE(NULLIF(g.genre_l1, ''), 'Unknown')`,
        [ctx.ts24]
      )
    : [];
  const prevBy = new Map(prev.map((r) => [r.genre, r.prev_total]));
  return now.map((r) => ({ ...r, prev_players: prevBy.has(r.genre) ? prevBy.get(r.genre) : null }));
}

export async function trendRows(ctx, sample) {
  return q(
    `SELECT ${G} FROM games g ${PREV}
     WHERE g.players > 0 AND g.last_seen >= ?
     ORDER BY g.players DESC LIMIT ?`,
    [ctx.ts24, ctx.liveSince, sample]
  );
}

// type is 'Group' or 'User'. Returns [{ creator_id, creator_name, total_players, game_count, prev_players, top }]
export async function creators(ctx, type, limit) {
  const list = await q(
    `SELECT g.creator_id, MAX(g.creator_name) AS creator_name,
            SUM(g.players) AS total_players, COUNT(*) AS game_count, SUM(p.players) AS prev_players
     FROM games g ${PREV}
     WHERE g.creator_type = ? AND g.players > 0 AND g.last_seen >= ?
     GROUP BY g.creator_id
     ORDER BY total_players DESC LIMIT ?`,
    [ctx.ts24, type, ctx.liveSince, limit]
  );
  if (!list.length) return [];
  const games = await q(
    `SELECT ${G} FROM games g ${PREV}
     WHERE g.creator_type = ? AND g.creator_id IN (?) AND g.players > 0 AND g.last_seen >= ?
     ORDER BY g.players DESC`,
    [ctx.ts24, type, list.map((r) => r.creator_id), ctx.liveSince]
  );
  const top = new Map();
  for (const r of games) if (!top.has(String(r.creator_id))) top.set(String(r.creator_id), r);
  return list.map((c) => ({ ...c, top: top.get(String(c.creator_id)) || null }));
}

// Every live game by one studio or solo developer, biggest first.
export async function creatorGames(ctx, type, id) {
  return q(
    `SELECT ${G} FROM games g ${PREV}
     WHERE g.creator_type = ? AND g.creator_id = ? AND g.last_seen >= ?
     ORDER BY g.players DESC`,
    [ctx.ts24, type, id, ctx.liveSince]
  );
}

// Studios and solo developers whose name contains the text, biggest first, in the same shape as
// creators().
export async function searchCreators(ctx, text, limit) {
  const like = `%${text.replace(/[!%_]/g, (c) => `!${c}`)}%`;
  const list = await q(
    `SELECT g.creator_id, g.creator_type, MAX(g.creator_name) AS creator_name,
            SUM(g.players) AS total_players, COUNT(*) AS game_count, SUM(p.players) AS prev_players
     FROM games g ${PREV}
     WHERE g.last_seen >= ? AND g.creator_name LIKE ? ESCAPE '!'
     GROUP BY g.creator_id, g.creator_type
     ORDER BY total_players DESC LIMIT ?`,
    [ctx.ts24, ctx.liveSince, like, limit]
  );
  if (!list.length) return [];
  const games = await q(
    `SELECT ${G} FROM games g ${PREV}
     WHERE g.creator_id IN (?) AND g.last_seen >= ?
     ORDER BY g.players DESC`,
    [ctx.ts24, list.map((r) => r.creator_id), ctx.liveSince]
  );
  const top = new Map();
  for (const r of games) {
    const k = `${r.creator_type}${r.creator_id}`;
    if (!top.has(k)) top.set(k, r);
  }
  return list.map((c) => ({ ...c, top: top.get(`${c.creator_type}${c.creator_id}`) || null }));
}

export async function game(ctx, id) {
  const [r] = await q(`SELECT ${G}, g.description FROM games g ${PREV} WHERE g.universe_id = ?`, [ctx.ts24, id]);
  return r || null;
}

// Every chart the game has ever been in, with whether it is in that chart right now.
export async function gamePositions(ctx, id) {
  return q(
    `SELECT sp.sort_id, sp.position, sp.best_position, sp.best_at, sp.last_seen,
            (SELECT MAX(s2.last_seen) FROM sort_positions s2 WHERE s2.sort_id = sp.sort_id) AS sort_last_seen
     FROM sort_positions sp WHERE sp.universe_id = ?
     ORDER BY sp.last_seen DESC, sp.position`,
    [id]
  );
}

// The last `days` days: 10-minute readings for 1 day, hourly averages for longer. Rows: { t, players, max }
export async function history(ctx, id, days) {
  if (days === 1) {
    return q('SELECT ts AS t, players FROM snapshots WHERE universe_id = ? AND ts >= ? ORDER BY ts', [
      id,
      new Date(ctx.ref - 24 * H),
    ]);
  }
  const since = new Date(ctx.ref - days * 24 * H);
  return q(
    `SELECT hour AS t, avg_players AS players, max_players AS max
     FROM hourly WHERE universe_id = ? AND hour >= ? ORDER BY hour`,
    [id, since]
  );
}

// Sum of hourly averages per UTC day since `since`. Rows: { day, player_hours, hours_read }
export async function hoursByDay(ctx, id, since) {
  return q(
    `SELECT DATE(hour) AS day, SUM(avg_players) AS player_hours, COUNT(*) AS hours_read
     FROM hourly WHERE universe_id = ? AND hour >= ? GROUP BY DATE(hour) ORDER BY day`,
    [id, since]
  );
}

// What one game has for sale. geo_price is the geometric mean price of items on sale.
// Row: { checked, items, geo_price }. checked is false until src/daily.js has read the game.
export async function catalog(ctx, id) {
  const [r] = await q(
    `SELECT g.daily_checked_at IS NOT NULL AS checked,
            (SELECT COUNT(*) FROM products p WHERE p.universe_id = g.universe_id AND p.for_sale = 1 AND p.price > 0) AS items,
            (SELECT EXP(AVG(LN(p.price))) FROM products p WHERE p.universe_id = g.universe_id AND p.for_sale = 1 AND p.price > 0) AS geo_price
     FROM games g WHERE g.universe_id = ?`,
    [id]
  );
  return r ? { checked: !!Number(r.checked), items: Number(r.items), geo_price: r.geo_price === null ? null : Number(r.geo_price) } : null;
}

// Item count and geometric mean price for every game with something on sale, to find the typical game.
// Cached for an hour, since it reads the whole products table and changes once a day at most.
let catalogsCache = null;
export async function allCatalogs() {
  if (catalogsCache && Date.now() - catalogsCache.at < H) return catalogsCache.rows;
  const rows = await q(
    `SELECT universe_id, COUNT(*) AS items, EXP(AVG(LN(price))) AS geo_price
     FROM products WHERE for_sale = 1 AND price > 0 GROUP BY universe_id`
  );
  catalogsCache = { at: Date.now(), rows };
  return rows;
}

// Hourly averages for the last `hours` hours for a handful of games. Rows: { universe_id, hour, avg_players }
export async function sparklines(ctx, ids, hours) {
  if (!ids.length) return [];
  return q(
    `SELECT universe_id, hour, avg_players FROM hourly
     WHERE universe_id IN (?) AND hour >= ? ORDER BY universe_id, hour`,
    [ids, new Date(ctx.ref - hours * H)]
  );
}

export async function search(ctx, text, limit) {
  const like = `%${text.replace(/[!%_]/g, (c) => `!${c}`)}%`;
  const asId = /^\d{1,19}$/.test(text) ? text : null;
  return q(
    `SELECT ${G} FROM games g ${PREV}
     WHERE g.last_seen >= ?
       AND (g.name LIKE ? ESCAPE '!' ${asId ? 'OR g.universe_id = ? OR g.root_place_id = ?' : ''})
     ORDER BY g.players DESC LIMIT ?`,
    asId ? [ctx.ts24, ctx.liveSince, like, asId, asId, limit] : [ctx.ts24, ctx.liveSince, like, limit]
  );
}

// ---------- Lists added 2026-10-30 ----------

// Like rating pulled towards 50% when a game has few votes (SteamDB's public formula):
// rating - (rating - 0.5) * 2^(-log10(votes + 1)). Same formula as fairRating() in server/shape.js.
const VOTES = '(g.up_votes + g.down_votes)';
const FAIR = `(g.up_votes / ${VOTES} - (g.up_votes / ${VOTES} - 0.5) * POW(2, -LOG10(${VOTES} + 1)))`;

export async function rated(ctx, cfg, limit) {
  return q(
    `SELECT ${G}, ${FAIR} AS fair_rating FROM games g ${PREV}
     WHERE g.players >= ? AND g.last_seen >= ? AND ${VOTES} >= ?
     ORDER BY fair_rating DESC LIMIT ?`,
    [ctx.ts24, cfg.minPlayers, ctx.liveSince, cfg.minVotes, limit]
  );
}

// Favorites gained since the latest daily reading at least `days` days old. fav_since is the day
// of that reading, so the page can say exactly what the gain is measured against.
export async function saving(ctx, days, limit) {
  return q(
    `SELECT ${G}, CAST(g.favorites AS SIGNED) - CAST(d.favorites AS SIGNED) AS fav_gain, d.day AS fav_since
     FROM games g ${PREV}
     JOIN game_daily d ON d.universe_id = g.universe_id
       AND d.day = (SELECT MAX(d2.day) FROM game_daily d2 WHERE d2.universe_id = g.universe_id AND d2.day <= ?)
     WHERE g.players > 0 AND g.last_seen >= ? AND d.favorites IS NOT NULL AND g.favorites > d.favorites
     ORDER BY fav_gain DESC LIMIT ?`,
    [ctx.ts24, dayOf(ctx.ref - days * D), ctx.liveSince, limit]
  );
}

// One game's favorites gain, same rule as saving(). Row { fav_gain, fav_since } or null.
export async function favoritesGain(ctx, id, days) {
  const [r] = await q(
    `SELECT CAST(g.favorites AS SIGNED) - CAST(d.favorites AS SIGNED) AS fav_gain, d.day AS fav_since
     FROM games g JOIN game_daily d ON d.universe_id = g.universe_id
       AND d.day = (SELECT MAX(d2.day) FROM game_daily d2 WHERE d2.universe_id = g.universe_id AND d2.day <= ?)
     WHERE g.universe_id = ? AND d.favorites IS NOT NULL`,
    [dayOf(ctx.ref - days * D), id]
  );
  return r || null;
}

// Small games growing fastest: average players over the last day against the average over one day
// windowDays days earlier, for games with between cfg.minPlayers and cfg.maxPlayers now.
export async function rising(ctx, cfg, limit) {
  const pick = 'JOIN games gx ON gx.universe_id = h.universe_id AND gx.players >= ? AND gx.players <= ? AND gx.last_seen >= ?';
  const thenTo = new Date(ctx.ref - cfg.windowDays * D);
  return q(
    `SELECT ${G}, a.now_avg, b.then_avg
     FROM (SELECT h.universe_id, AVG(h.avg_players) AS now_avg, COUNT(*) AS now_hours
           FROM hourly h ${pick} WHERE h.hour >= ? GROUP BY h.universe_id) a
     JOIN (SELECT h.universe_id, AVG(h.avg_players) AS then_avg, COUNT(*) AS then_hours
           FROM hourly h ${pick} WHERE h.hour >= ? AND h.hour < ? GROUP BY h.universe_id) b ON b.universe_id = a.universe_id
     JOIN games g ON g.universe_id = a.universe_id
     ${PREV}
     WHERE a.now_hours >= ? AND b.then_hours >= ? AND b.then_avg >= ? AND a.now_avg >= b.then_avg * ?
     ORDER BY a.now_avg / b.then_avg DESC LIMIT ?`,
    [
      cfg.minPlayers, cfg.maxPlayers, ctx.liveSince, new Date(ctx.ref - D),
      cfg.minPlayers, cfg.maxPlayers, ctx.liveSince, new Date(thenTo - D), thenTo,
      ctx.ts24, cfg.minHours, cfg.minHours, cfg.minThen, cfg.minRatio, limit,
    ]
  );
}

// Games whose all-time peak (since we started tracking them) was set in the last 24 hours.
export async function recordsToday(ctx, cfg, limit) {
  return q(
    `SELECT ${G} FROM games g ${PREV}
     WHERE g.peak_at >= ? AND g.peak_players >= ? AND g.first_seen <= ? AND g.last_seen >= ?
     ORDER BY g.peak_players DESC LIMIT ?`,
    [ctx.ts24, new Date(ctx.ref - D), cfg.minPlayers, new Date(ctx.ref - cfg.minTrackedDays * D), ctx.liveSince, limit]
  );
}

// ---------- Game page extras ----------

// Everything a game sells. Rows: { kind, product_id, name, price, for_sale }
export async function gameProducts(ctx, id) {
  return q(
    'SELECT kind, product_id, name, price, for_sale FROM products WHERE universe_id = ? ORDER BY kind, for_sale DESC, price',
    [id]
  );
}

// Every game pass on sale, with its game's genre, for the price benchmarks. Cached for an hour,
// since it reads the whole products table and changes once a day at most.
let passCache = null;
export async function passPrices() {
  if (passCache && Date.now() - passCache.at < H) return passCache.rows;
  const rows = await q(
    `SELECT p.universe_id, p.name, p.price, g.genre_l1 FROM products p JOIN games g ON g.universe_id = p.universe_id
     WHERE p.kind = 'pass' AND p.for_sale = 1 AND p.price > 0`
  );
  passCache = { at: Date.now(), rows };
  return rows;
}

// The game's events that have not ended. Rows: { event_id, title, category, start_at, end_at }
export async function gameEvents(ctx, id) {
  return qOpt(
    `SELECT event_id, title, category, start_at, end_at FROM game_events
     WHERE universe_id = ? AND (end_at >= ? OR (end_at IS NULL AND start_at >= ?)) ORDER BY start_at LIMIT 20`,
    [id, ctx.ref, new Date(ctx.ref - D)]
  );
}

// Thumbnail addresses in display order, as daily.js last stored them. Kept as one value per game,
// one address per line.
export async function thumbnails(ctx, id) {
  const [r] = await qOpt("SELECT value FROM game_media WHERE universe_id = ? AND kind = 'thumb_urls'", [id]);
  return r ? r.value.split('\n').filter(Boolean) : [];
}

// ---------- Marketplace ----------

// Every item with its row for the latest day the catalog job has saved, and its position in each
// list that day. Empty until `npm run migrate` and the first catalog run.
export async function catalogSnapshot() {
  const [d] = await qOpt("SELECT DATE_FORMAT(MAX(day), '%Y-%m-%d') AS latest FROM catalog_daily");
  if (!d || !d.latest) return { day: null, items: [] };
  const rows = await q(
    `SELECT i.item_type, i.item_id, i.name, i.creator_id, i.creator_name, i.creator_type, i.kind, i.thumb_url, i.created_at,
            c.price, c.favorites, c.lowest_resale, c.total_quantity
     FROM catalog_daily c
     JOIN catalog_items i ON i.item_type = c.item_type AND i.item_id = c.item_id
     WHERE c.day = ?`,
    [d.latest]
  );
  const ranks = await q('SELECT list_name, pos, item_type, item_id FROM catalog_rank_daily WHERE day = ?', [d.latest]);
  const byItem = new Map();
  for (const r of ranks) {
    const k = `${r.item_type}${r.item_id}`;
    if (!byItem.has(k)) byItem.set(k, {});
    byItem.get(k)[r.list_name] = r.pos;
  }
  return { day: d.latest, items: rows.map((r) => ({ ...r, ranks: byItem.get(`${r.item_type}${r.item_id}`) || {} })) };
}
