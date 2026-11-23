// One collector run. Cron starts this every 10 minutes.
//   npm run collect       reads Roblox and writes to the database
//   npm run collect:dry   reads Roblox and prints a summary, no database needed
import { requireDbEnv } from './env.js';
import { fetchSorts, fetchGames, fetchIcons } from './roblox.js';

const DRY = process.argv.includes('--dry');

// A game stays on the reading list while it has had at least TRACK_MIN_PLAYERS players at
// some reading in the last ABOVE_MIN_GRACE_DAYS days, or has been in any Roblox chart in the
// last CHART_GRACE_DAYS days. The grace period stops games dropping out at their nightly low.
// Charts are how new games get found in the first place. Placeholder values.
const TRACK_MIN_PLAYERS = 50;
const ABOVE_MIN_GRACE_DAYS = 7;
const CHART_GRACE_DAYS = 3;
// Games the hourly search (src/discover.js) found count too, for this long after it last saw them.
// Once read here at TRACK_MIN_PLAYERS or more players, a game stays on the list through last_above_min.
const DISCOVERED_GRACE_DAYS = 1;
// Roblox sometimes leaves a live game out of one response. Only treat it as gone
// (players 0) after it is missing this many runs in a row.
const MISSES_BEFORE_ZERO = 3;
const ICONS_PER_RUN = 500;
const ICON_REFRESH_DAYS = 30; // icon URLs are marked 180DAY, and developers change icons
const RAW_RETENTION_DAYS = Number(process.env.RAW_RETENTION_DAYS || 7);
// Hourly chart positions are about 21,600 rows a day at 900 chart entries. chart_daily keeps the
// per-day summary forever, so the hourly rows only need to cover recent detail.
const CHART_HOURLY_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

// Tables added after launch exist only once `npm run migrate` has run after a deploy. Until then
// a query on one gives no rows instead of failing the whole run.
const optional = (query) =>
  query.catch((err) => {
    if (err.code === 'ER_NO_SUCH_TABLE') return [[]];
    throw err;
  });

const floorMinute = (d) => new Date(Math.floor(d.getTime() / 60000) * 60000);
const floorHour = (d) => new Date(Math.floor(d.getTime() / 3600000) * 3600000);
const daysAgo = (now, days) => new Date(now.getTime() - days * DAY_MS);

async function main() {
  const started = Date.now();
  const now = floorMinute(new Date());
  if (DRY) return dryRun(started);

  requireDbEnv();
  const { getPool, insertMany, keepAlive } = await import('./db.js');
  const db = getPool({ connectionLimit: 1 });
  // Everything runs on this one connection. That keeps the lock alive (it would be lost if
  // an idle connection timed out) and lets the core writes share a transaction.
  const conn = await db.getConnection();
  const stopKeepAlive = keepAlive(conn);
  try {
    const [[lock]] = await conn.query("SELECT GET_LOCK('bloxradar_collect', 0) AS ok");
    if (!lock.ok) {
      await conn.query('INSERT INTO runs (started_at, finished_at, error) VALUES (?, UTC_TIMESTAMP(), ?)', [
        now,
        'Skipped: previous run still going',
      ]);
      console.log('Previous run is still going. Skipping this one.');
      return;
    }

    // The run row is written before anything else can fail, so every failure leaves a trace.
    const [run] = await conn.query('INSERT INTO runs (started_at) VALUES (?)', [now]);
    try {
      const summary = await collect(conn, insertMany, now);
      await conn.query(
        'UPDATE runs SET finished_at = UTC_TIMESTAMP(), games_tracked = ?, games_read = ?, total_players = ?, warning = ? WHERE id = ?',
        [summary.tracked, summary.read, summary.totalPlayers, summary.warning, run.insertId]
      );
      console.log(
        `Read ${summary.read} of ${summary.tracked} games, ${summary.totalPlayers.toLocaleString()} players, ` +
          `${((Date.now() - started) / 1000).toFixed(1)}s${summary.warning ? `. ${summary.warning}` : ''}`
      );
    } catch (err) {
      try {
        await conn.query('UPDATE runs SET finished_at = UTC_TIMESTAMP(), error = ? WHERE id = ?', [
          String(err.stack || err).slice(0, 5000),
          run.insertId,
        ]);
      } catch {
        // The database itself is what failed. The original error below is the useful one.
      }
      throw err;
    }
  } finally {
    stopKeepAlive();
    await conn.query("SELECT RELEASE_LOCK('bloxradar_collect')").catch(() => {});
    conn.release();
    await db.end();
  }
}

async function collect(conn, insertMany, now) {
  const sorts = await fetchSorts();
  const charted = new Map(); // universeId -> chart entry (has vote counts)
  for (const s of sorts) for (const g of s.games) charted.set(g.universeId, g);

  const [tracked] = await conn.query(
    'SELECT universe_id FROM games WHERE last_above_min >= ? OR last_charted >= ?',
    [daysAgo(now, ABOVE_MIN_GRACE_DAYS), daysAgo(now, CHART_GRACE_DAYS)]
  );
  const [found] = await optional(
    conn.query('SELECT universe_id FROM discovered WHERE seen_at >= ? AND players >= ?', [daysAgo(now, DISCOVERED_GRACE_DAYS), TRACK_MIN_PLAYERS])
  );
  const ids = new Set(tracked.map((r) => Number(r.universe_id)));
  for (const r of found) ids.add(Number(r.universe_id));
  for (const id of charted.keys()) ids.add(id);

  const { games, failedIds, errors } = await fetchGames([...ids]);
  const totalPlayers = games.reduce((sum, g) => sum + (g.playing ?? 0), 0);

  // Asked for, answered, but left out: deleted, private, or a Roblox hiccup.
  const returned = new Set(games.map((g) => g.id));
  const failed = new Set(failedIds);
  const missing = [...ids].filter((id) => !returned.has(id) && !failed.has(id));

  await conn.beginTransaction();
  try {
    await insertMany(
      conn,
      `INSERT INTO games (universe_id, root_place_id, name, creator_id, creator_name, creator_type,
         genre_l1, genre_l2, max_players, visits, favorites, up_votes, down_votes,
         created_at, updated_at, first_seen, last_seen, last_charted, last_above_min, miss_count,
         players, peak_players, peak_at, description)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         root_place_id = VALUES(root_place_id), name = VALUES(name), description = VALUES(description),
         creator_id = VALUES(creator_id), creator_name = VALUES(creator_name), creator_type = VALUES(creator_type),
         genre_l1 = VALUES(genre_l1), genre_l2 = VALUES(genre_l2), max_players = VALUES(max_players),
         visits = VALUES(visits), favorites = VALUES(favorites),
         up_votes = COALESCE(VALUES(up_votes), up_votes), down_votes = COALESCE(VALUES(down_votes), down_votes),
         updated_at = VALUES(updated_at), last_seen = VALUES(last_seen),
         last_charted = COALESCE(VALUES(last_charted), last_charted),
         last_above_min = COALESCE(VALUES(last_above_min), last_above_min),
         miss_count = 0,
         -- peak_at must come before peak_players: MySQL applies these left to right
         peak_at = IF(VALUES(players) > peak_players, VALUES(last_seen), peak_at),
         peak_players = GREATEST(peak_players, VALUES(players)),
         players = VALUES(players)`,
      games.map((g) => {
        const c = charted.get(g.id);
        const playing = g.playing ?? 0;
        return [
          g.id, g.rootPlaceId, g.name, g.creator.id, g.creator.name, g.creator.type,
          g.genre_l1 || null, g.genre_l2 || null, g.maxPlayers ?? null, g.visits ?? null, g.favoritedCount ?? null,
          c?.totalUpVotes ?? null, c?.totalDownVotes ?? null,
          new Date(g.created), g.updated ? new Date(g.updated) : null, now, now,
          c ? now : null, playing >= TRACK_MIN_PLAYERS ? now : null, 0,
          playing, playing, now, g.description ?? null,
        ];
      })
    );

    if (missing.length) {
      // players is set before miss_count so it reads the old count on every engine.
      await conn.query(
        'UPDATE games SET players = IF(miss_count + 1 >= ?, 0, players), miss_count = LEAST(miss_count + 1, 255) WHERE universe_id IN (?)',
        [MISSES_BEFORE_ZERO, missing]
      );
    }

    await insertMany(
      conn,
      'INSERT IGNORE INTO snapshots (universe_id, ts, players) VALUES ?',
      games.map((g) => [g.id, now, g.playing ?? 0]),
      1000
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  }

  const positions = [];
  for (const s of sorts) s.games.forEach((g, i) => positions.push([s.sortId, g.universeId, i + 1, i + 1, now, now, null, null]));
  await insertMany(
    conn,
    `INSERT INTO sort_positions (sort_id, universe_id, position, best_position, best_at, last_seen, prev_position, moved_at)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       -- A move counts only if the game was in this chart at the last run too, so coming back
       -- after days away does not show as an arrow. These two come first because MySQL applies
       -- the assignments left to right and they read the old position.
       prev_position = IF(VALUES(position) <> position AND last_seen >= VALUES(last_seen) - INTERVAL 30 MINUTE, position, prev_position),
       moved_at = IF(VALUES(position) <> position AND last_seen >= VALUES(last_seen) - INTERVAL 30 MINUTE, VALUES(last_seen), moved_at),
       best_at = IF(VALUES(position) < best_position, VALUES(last_seen), best_at),
       best_position = LEAST(best_position, VALUES(position)),
       position = VALUES(position), last_seen = VALUES(last_seen)`,
    positions
  );

  // Best position this hour per game and chart. A game can appear twice in one chart.
  const hour = floorHour(now);
  const best = new Map();
  for (const [sortId, universeId, pos] of positions) {
    const key = `${universeId}|${sortId}`;
    if (!best.has(key) || pos < best.get(key)[3]) best.set(key, [universeId, sortId, hour, pos]);
  }
  await optional(
    insertMany(
      conn,
      `INSERT INTO chart_hourly (universe_id, sort_id, hour, position) VALUES ?
       ON DUPLICATE KEY UPDATE position = LEAST(position, VALUES(position))`,
      [...best.values()]
    )
  );

  await refreshIcons(conn, now);
  await rollUpHours(conn, now);
  await rollUpCharts(conn, now);
  await conn.query('DELETE FROM snapshots WHERE ts < ? LIMIT 50000', [daysAgo(now, RAW_RETENTION_DAYS)]);
  await optional(conn.query('DELETE FROM chart_hourly WHERE hour < ? LIMIT 50000', [daysAgo(now, CHART_HOURLY_DAYS)]));

  return {
    tracked: ids.size,
    read: games.length,
    totalPlayers,
    warning: failedIds.length ? `${failedIds.length} games not read: ${errors[0]}` : null,
  };
}

// Fills icons for new games and refreshes old ones, a limited number per run.
async function refreshIcons(conn, now) {
  const [rows] = await conn.query(
    `SELECT universe_id FROM games
     WHERE last_seen = ? AND (icon_checked_at IS NULL OR icon_checked_at < ?)
     ORDER BY icon_checked_at IS NULL DESC, icon_checked_at
     LIMIT ?`,
    [now, daysAgo(now, ICON_REFRESH_DAYS), ICONS_PER_RUN]
  );
  if (!rows.length) return;
  const { icons, checked } = await fetchIcons(rows.map((r) => Number(r.universe_id)));
  const entries = [...icons];
  for (let i = 0; i < entries.length; i += 200) {
    const part = entries.slice(i, i + 200);
    const cases = part.map(() => 'WHEN ? THEN ?').join(' ');
    await conn.query(`UPDATE games SET icon_url = CASE universe_id ${cases} END WHERE universe_id IN (?)`, [
      ...part.flat(),
      part.map(([id]) => id),
    ]);
  }
  if (checked.length) await conn.query('UPDATE games SET icon_checked_at = ? WHERE universe_id IN (?)', [now, checked]);
}

// Recomputes the hourly averages for the current hour, and for the previous hour
// during the first run after the hour changes, so that hour gets its final numbers.
async function rollUpHours(conn, now) {
  const hours = [floorHour(now)];
  if (now.getUTCMinutes() < 15) hours.push(new Date(hours[0].getTime() - 3600000));
  for (const h of hours) {
    await conn.query(
      `INSERT INTO hourly (universe_id, hour, avg_players, max_players)
       SELECT universe_id, ?, ROUND(AVG(players)), MAX(players)
       FROM snapshots WHERE ts >= ? AND ts < ?
       GROUP BY universe_id
       ON DUPLICATE KEY UPDATE avg_players = VALUES(avg_players), max_players = VALUES(max_players)`,
      [h, h, new Date(h.getTime() + 3600000)]
    );
  }
}

// Rolls chart_hourly up into chart_daily for the current UTC day, in the first run of each hour,
// and for the day before during the first run after midnight so it gets its last hour.
async function rollUpCharts(conn, now) {
  if (now.getUTCMinutes() >= 15) return;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = [today];
  if (now.getUTCHours() === 0) days.push(new Date(today.getTime() - DAY_MS));
  for (const d of days) {
    await optional(
      conn.query(
        `INSERT INTO chart_daily (universe_id, sort_id, day, best_position, hours_in)
         SELECT universe_id, sort_id, ?, MIN(position), COUNT(*)
         FROM chart_hourly WHERE hour >= ? AND hour < ?
         GROUP BY universe_id, sort_id
         ON DUPLICATE KEY UPDATE best_position = VALUES(best_position), hours_in = VALUES(hours_in)`,
        [d.toISOString().slice(0, 10), d, new Date(d.getTime() + DAY_MS)]
      )
    );
  }
}

async function dryRun(started) {
  const sorts = await fetchSorts();
  const charted = new Map();
  for (const s of sorts) for (const g of s.games) charted.set(g.universeId, g);
  const { games, failedIds, errors } = await fetchGames([...charted.keys()]);
  const { icons } = await fetchIcons(games.slice(0, 50).map((g) => g.id));
  const total = games.reduce((sum, g) => sum + (g.playing ?? 0), 0);
  console.log(`Charts: ${sorts.length}`);
  console.log(`Unique games in charts: ${charted.size}`);
  console.log(`Games read: ${games.length}, not read: ${failedIds.length}${errors.length ? ` (${errors[0]})` : ''}`);
  console.log(`Total players: ${total.toLocaleString()}`);
  console.log(`Icons found for ${icons.size} of first 50`);
  console.log('Top 5 by players:');
  for (const g of [...games].sort((a, b) => b.playing - a.playing).slice(0, 5)) {
    console.log(`  ${g.playing.toLocaleString().padStart(9)}  ${g.name}  (${g.creator.name}, ${g.genre_l1})`);
  }
  console.log(`Took ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
