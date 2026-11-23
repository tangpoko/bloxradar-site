// Daily data job: votes, badge statistics, game passes, developer products, icon and
// thumbnails, plus a dated record of anything that changed. Cron starts it every 15 minutes,
// offset from the 10-minute collector (minutes 4, 19, 34, 49) so their requests to
// games.roblox.com don't land in the same 30 seconds.
// Each run takes the tracked games whose daily data is 24 hours old or more, up to
// GAMES_PER_RUN, so every game is read once a day at the same time of day.
// Hostinger stops cron jobs after 30 minutes, which is why the work is split into slices.
//   npm run daily       reads Roblox and writes to the database
//   npm run daily:dry   reads 5 top games and prints what would be stored, no database needed
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireDbEnv } from './env.js';
import { fetchSorts, fetchVotes, fetchThumbnailIds, fetchIcons, fetchBadges, fetchProducts, fetchEvents } from './roblox.js';

const DRY = process.argv.includes('--dry');

// Placeholder values.
const GAMES_PER_RUN = 60; // 96 runs a day x 60 games = room for about 5,700 games a day
const RECHECK_HOURS = 24;
// A normal run takes about a minute. If Roblox rate-limits hard, stop reading new games after
// this long and save what was read, so a run is never killed at 30 minutes with nothing saved.
const READ_BUDGET_MS = 20 * 60 * 1000;
const BADGES_PER_GAME = 5; // only the most-earned badges are stored, to keep the table small
const BADGE_RETENTION_DAYS = 180; // badge_daily is the largest daily table; game_daily is kept forever
// Roblox gives the win rate to 3 decimals, so 0.001 could really be anywhere from 0.0005 to
// 0.0015. Dividing by anything under 0.05 gives too rough an estimate.
const MIN_EST_WIN_RATE = 0.05;
// A badge given on joining has a win rate equal to the share of yesterday's players who were
// new. Names checked against the top 40 games. "Welcome Back" style badges are for returning players.
const NEW_PLAYER_BADGE =
  /\b(welcome|joined|join|first (time|visit|play)|beginning|beginner|newbie|new player|you played|just started|started playing)\b/i;
const NOT_NEW_PLAYER_BADGE = /\b(welcome back|returning|return|group|discord)\b/i;

const floorMinute = (d) => new Date(Math.floor(d.getTime() / 60000) * 60000);
const utcDay = (d) => d.toISOString().slice(0, 10);
const DAY_MS = 24 * 3600000;

// The most commonly earned badge gives the most precise estimate: daily players = awarded
// yesterday / win rate. This is our reading of Roblox's numbers, not something Roblox documents.
// The join badge is the matching badge with the most awards of all time, since every player gets it.
export function estimates(badges) {
  const forEst = badges
    .filter((b) => b.winRate >= MIN_EST_WIN_RATE && b.pastDay > 0)
    .sort((a, b) => b.winRate - a.winRate)[0];
  const forNew = badges
    .filter((b) => NEW_PLAYER_BADGE.test(b.name) && !NOT_NEW_PLAYER_BADGE.test(b.name) && b.winRate > 0 && b.pastDay > 0)
    .sort((a, b) => b.total - a.total)[0];
  return {
    dailyPlayers: forEst ? Math.round(forEst.pastDay / forEst.winRate) : null,
    estBadgeId: forEst?.id ?? null,
    newPlayerShare: forNew ? forNew.winRate : null,
    newBadgeId: forNew?.id ?? null,
  };
}

// The icon URL contains a hash of the source image, which is what we compare. The hash was
// measured to stay the same across repeated fetches, sizes and formats.
function iconKey(url) {
  const m = /180DAY-([0-9a-f]+)/i.exec(url || '');
  return m ? m[1] : url || null;
}

// Reads everything per game. A game that throws is left out and retried on the next run,
// except a 404, which means the game no longer exists: those are returned in `gone`.
// `ping` is called about once a minute to keep the database connection from timing out.
async function readGames(ids, ping = async () => {}) {
  const started = Date.now();
  const thumbUrls = new Map();
  const [votes, thumbs, { icons }] = [await fetchVotes(ids), await fetchThumbnailIds(ids, thumbUrls), await fetchIcons(ids)];
  const eventsFrom = new Date(Date.now() - DAY_MS);
  const perGame = new Map();
  const gone = [];
  const errors = [];
  const eventErrors = [];
  let lastPing = Date.now();
  for (const id of ids) {
    if (Date.now() - started > READ_BUDGET_MS) {
      errors.push(`stopped early after ${READ_BUDGET_MS / 60000} minutes`);
      break;
    }
    if (Date.now() - lastPing > 60000) {
      await ping();
      lastPing = Date.now();
    }
    try {
      const badges = await fetchBadges(id);
      const { products, truncated } = await fetchProducts(id);
      // Events are extra. If they fail, the game's other data is still saved.
      let events = null;
      try {
        events = await fetchEvents(id, eventsFrom);
      } catch (err) {
        eventErrors.push(`${id}: ${err.message || err}`);
      }
      perGame.set(id, { badges, products, truncated, events });
    } catch (err) {
      if (err.status === 404) gone.push(id);
      else errors.push(`${id}: ${err.message || err}`);
    }
  }
  return { votes, thumbs, thumbUrls, icons, perGame, gone, errors, eventErrors };
}

async function main() {
  const started = Date.now();
  const now = floorMinute(new Date());
  if (DRY) return dryRun(started);

  requireDbEnv();
  const { getPool, insertMany, keepAlive } = await import('./db.js');
  const db = getPool({ connectionLimit: 1 });
  const conn = await db.getConnection();
  const stopKeepAlive = keepAlive(conn);
  try {
    const [[lock]] = await conn.query("SELECT GET_LOCK('bloxradar_daily', 0) AS ok");
    if (!lock.ok) {
      console.log('Previous daily run is still going. Skipping this one.');
      return;
    }
    const [run] = await conn.query("INSERT INTO runs (job, started_at) VALUES ('daily', ?)", [now]);
    try {
      const summary = await collectDaily(conn, insertMany, now);
      await conn.query(
        'UPDATE runs SET finished_at = UTC_TIMESTAMP(), games_tracked = ?, games_read = ?, warning = ? WHERE id = ?',
        [summary.picked, summary.read, summary.warning, run.insertId]
      );
      console.log(
        `Daily: read ${summary.read} of ${summary.picked} games, ${summary.changes} changes, ` +
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
    await conn.query("SELECT RELEASE_LOCK('bloxradar_daily')").catch(() => {});
    conn.release();
    await db.end();
  }
}

async function collectDaily(conn, insertMany, now) {
  // Games the 10-minute collector read in the last day, oldest daily check first.
  const [rows] = await conn.query(
    `SELECT universe_id, name, description, favorites, visits, daily_checked_at
     FROM games
     WHERE last_seen >= ? AND (daily_checked_at IS NULL OR daily_checked_at <= ?)
     ORDER BY daily_checked_at IS NULL DESC, daily_checked_at
     LIMIT ?`,
    [new Date(now.getTime() - DAY_MS), new Date(now.getTime() - RECHECK_HOURS * 3600000), GAMES_PER_RUN]
  );
  if (!rows.length) return { picked: 0, read: 0, changes: 0, warning: null };

  const ids = rows.map((r) => Number(r.universe_id));
  const { votes, thumbs, thumbUrls, icons, perGame, gone, errors, eventErrors } = await readGames(ids, () => conn.query('SELECT 1'));
  const readIds = ids.filter((id) => perGame.has(id));
  const day = utcDay(now);

  const [oldProducts] = await conn.query(
    'SELECT kind, product_id, universe_id, price, for_sale FROM products WHERE universe_id IN (?)',
    [ids]
  );
  const [oldMedia] = await conn.query('SELECT universe_id, kind, value FROM game_media WHERE universe_id IN (?)', [ids]);
  const mediaKey = (u, k) => `${u}|${k}`;
  const media = new Map(oldMedia.map((m) => [mediaKey(Number(m.universe_id), m.kind), m.value]));

  const dailyRows = [];
  const badgeRows = [];
  const productRows = [];
  const mediaRows = [];
  const changeRows = [];
  const removedProducts = [];
  const eventRows = [];

  for (const g of rows) {
    const id = Number(g.universe_id);
    const data = perGame.get(id);
    if (!data) continue;
    // The first daily read of a game sets the starting point. Logging every pass and the
    // current title as "changes" would only fill the change log with noise.
    const firstTime = !g.daily_checked_at;

    const v = votes.get(id);
    const est = estimates(data.badges);
    dailyRows.push([
      id, day, v?.up ?? null, v?.down ?? null, g.favorites, g.visits,
      est.dailyPlayers, est.estBadgeId, est.newPlayerShare, est.newBadgeId,
    ]);
    for (const b of [...data.badges].filter((b) => b.pastDay > 0).sort((a, b) => b.pastDay - a.pastDay).slice(0, BADGES_PER_GAME)) {
      badgeRows.push([b.id, day, id, b.name.slice(0, 255), b.pastDay, b.winRate, b.total]);
    }

    // Products: added, removed, price and on-sale changes.
    const before = new Map(
      oldProducts.filter((p) => Number(p.universe_id) === id).map((p) => [`${p.kind}|${p.product_id}`, p])
    );
    const seen = new Set();
    for (const p of data.products) {
      const key = `${p.kind}|${p.id}`;
      seen.add(key);
      const old = before.get(key);
      if (!firstTime) {
        if (!old) changeRows.push([id, now, 'product_added', p.id, null, `${p.kind}: ${p.name} (${p.price ?? 'off sale'})`]);
        else {
          const wasForSale = !!old.for_sale;
          if (wasForSale !== p.forSale) changeRows.push([id, now, 'for_sale', p.id, wasForSale ? '1' : '0', p.forSale ? '1' : '0']);
          // Off-sale items have no price, so a price change only means something when it's on sale both times.
          else if (p.forSale && (old.price ?? null) !== (p.price ?? null)) changeRows.push([id, now, 'price', p.id, old.price, p.price]);
        }
      }
      productRows.push([
        p.kind, p.id, id, (p.name || '').slice(0, 255), p.price, p.forSale ? 1 : 0,
        p.created ? new Date(p.created) : null, p.updated ? new Date(p.updated) : null, now, now,
      ]);
    }
    // Only call something removed when its list wasn't cut off at the page limit.
    for (const kind of ['pass', 'devproduct']) {
      if (data.truncated[kind]) continue;
      for (const [key, old] of before) {
        if (old.kind === kind && !seen.has(key)) {
          removedProducts.push([kind, Number(old.product_id)]);
          changeRows.push([id, now, 'product_removed', old.product_id, `${kind}: price ${old.price ?? 'none'}`, null]);
        }
      }
    }

    // Title, description, icon and thumbnails. Missing or empty values mean the request failed
    // or the collector hasn't filled them yet, so they are skipped rather than stored.
    const thumbList = thumbs.get(id);
    const current = {
      name: g.name,
      description: g.description,
      icon: iconKey(icons.get(id)),
      thumbnails: thumbList?.length ? thumbList.join(',') : null,
    };
    for (const [kind, value] of Object.entries(current)) {
      if (value === null || value === undefined || value === '') continue;
      const old = media.get(mediaKey(id, kind));
      if (old === value) continue;
      if (old !== undefined && !firstTime) changeRows.push([id, now, kind, null, old, value]);
      mediaRows.push([id, kind, value, now]);
    }
    // Thumbnail addresses for the game page, one per line. An address changes when Roblox
    // re-renders the same image, so they are stored but never logged as a change.
    if (thumbUrls.has(id)) mediaRows.push([id, 'thumb_urls', thumbUrls.get(id).join('\n'), now]);

    for (const e of data.events ?? []) {
      eventRows.push([e.id, id, e.title.slice(0, 255), e.category, new Date(e.start), e.end ? new Date(e.end) : null, now, now]);
    }
  }

  // The collector writes to games at the same time. If MySQL picks this transaction as a
  // deadlock victim, run it once more rather than losing the whole slice.
  for (let attempt = 1; ; attempt++) {
    await conn.beginTransaction();
    try {
      await insertMany(
        conn,
        `INSERT INTO game_daily (universe_id, day, up_votes, down_votes, favorites, visits,
           daily_players_est, est_badge_id, new_player_share, new_badge_id)
         VALUES ?
         ON DUPLICATE KEY UPDATE up_votes = VALUES(up_votes), down_votes = VALUES(down_votes),
           favorites = VALUES(favorites), visits = VALUES(visits),
           daily_players_est = VALUES(daily_players_est), est_badge_id = VALUES(est_badge_id),
           new_player_share = VALUES(new_player_share), new_badge_id = VALUES(new_badge_id)`,
        dailyRows
      );
      await insertMany(
        conn,
        `INSERT INTO badge_daily (badge_id, day, universe_id, name, past_day_awarded, win_rate, awarded_total)
         VALUES ?
         ON DUPLICATE KEY UPDATE name = VALUES(name), past_day_awarded = VALUES(past_day_awarded),
           win_rate = VALUES(win_rate), awarded_total = VALUES(awarded_total)`,
        badgeRows
      );
      await insertMany(
        conn,
        `INSERT INTO products (kind, product_id, universe_id, name, price, for_sale, created_at, updated_at, first_seen, last_seen)
         VALUES ?
         ON DUPLICATE KEY UPDATE universe_id = VALUES(universe_id), name = VALUES(name), price = VALUES(price),
           for_sale = VALUES(for_sale), created_at = VALUES(created_at), updated_at = VALUES(updated_at),
           last_seen = VALUES(last_seen)`,
        productRows
      );
      for (const [kind, pid] of removedProducts) {
        await conn.query('DELETE FROM products WHERE kind = ? AND product_id = ?', [kind, pid]);
      }
      await insertMany(
        conn,
        `INSERT INTO game_media (universe_id, kind, value, updated_at) VALUES ?
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)`,
        mediaRows
      );
      await insertMany(
        conn,
        'INSERT INTO game_changes (universe_id, ts, kind, ref_id, old_value, new_value) VALUES ?',
        changeRows
      );
      // Votes for games not in any chart are only read here, so copy them onto the game too.
      for (const id of readIds) {
        const v = votes.get(id);
        if (v) await conn.query('UPDATE games SET up_votes = ?, down_votes = ? WHERE universe_id = ?', [v.up, v.down, id]);
      }
      // Games that 404 no longer exist; marking them checked stops them taking a slot every run.
      const checked = [...readIds, ...gone];
      if (checked.length) await conn.query('UPDATE games SET daily_checked_at = ? WHERE universe_id IN (?)', [now, checked]);
      await conn.commit();
      break;
    } catch (err) {
      await conn.rollback().catch(() => {});
      if (err.code === 'ER_LOCK_DEADLOCK' && attempt < 2) continue;
      throw err;
    }
  }

  // game_events comes from `npm run migrate`. Until that has run after a deploy, skip it.
  await insertMany(
    conn,
    `INSERT INTO game_events (event_id, universe_id, title, category, start_at, end_at, first_seen, last_seen) VALUES ?
     ON DUPLICATE KEY UPDATE title = VALUES(title), category = VALUES(category), start_at = VALUES(start_at),
       end_at = VALUES(end_at), last_seen = VALUES(last_seen)`,
    eventRows
  ).catch((err) => {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
  });
  // An event the developer deleted or cancelled is no longer returned. Remove it if it has not
  // ended, so it stops showing as on now or starting soon. Ended events are kept as history.
  for (const id of readIds) {
    const evs = perGame.get(id).events;
    if (evs === null) continue;
    const keep = evs.map((e) => e.id);
    await conn
      .query(
        `DELETE FROM game_events WHERE universe_id = ? AND (end_at IS NULL OR end_at >= ?)${keep.length ? ' AND event_id NOT IN (?)' : ''}`,
        keep.length ? [id, now, keep] : [id, now]
      )
      .catch((err) => {
        if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
      });
  }

  await conn.query('DELETE FROM badge_daily WHERE day < ? LIMIT 50000', [
    utcDay(new Date(now.getTime() - BADGE_RETENTION_DAYS * DAY_MS)),
  ]);

  return {
    picked: ids.length,
    read: readIds.length,
    changes: changeRows.length,
    warning:
      [errors.length ? `${errors.length} games not read: ${errors[0]}` : '', eventErrors.length ? `Events not read for ${eventErrors.length} games: ${eventErrors[0]}` : '']
        .filter(Boolean)
        .join('. ') || null,
  };
}

async function dryRun(started) {
  const sorts = await fetchSorts();
  const top = sorts.find((s) => s.sortId === 'top-playing-now') ?? sorts[0];
  const games = top.games.slice(0, 5);
  const ids = games.map((g) => g.universeId);
  const { votes, thumbs, thumbUrls, icons, perGame, gone, errors } = await readGames(ids);
  for (const g of games) {
    const data = perGame.get(g.universeId);
    const v = votes.get(g.universeId);
    console.log(`\n${g.name} (${g.playerCount.toLocaleString()} playing now)`);
    console.log(`  votes: ${v ? `${v.up.toLocaleString()} up, ${v.down.toLocaleString()} down` : 'none'}`);
    console.log(`  thumbnails: ${thumbs.get(g.universeId)?.length ?? 0}${thumbUrls.has(g.universeId) ? ` (${thumbUrls.get(g.universeId).length} with an address)` : ''}, icon key: ${iconKey(icons.get(g.universeId)) ?? 'none'}`);
    if (!data) continue;
    console.log(`  events running or upcoming: ${data.events === null ? 'not read' : data.events.map((e) => `${e.title} (${e.start.slice(0, 10)})`).join('; ') || 'none'}`);
    const est = estimates(data.badges);
    const ratio = est.dailyPlayers ? (est.dailyPlayers / g.playerCount).toFixed(1) : '-';
    console.log(
      `  badges: ${data.badges.length}, daily players est: ${est.dailyPlayers?.toLocaleString() ?? 'none'} ` +
        `(${ratio} per concurrent player), new player share: ${est.newPlayerShare ?? 'none'}`
    );
    const passes = data.products.filter((p) => p.kind === 'pass');
    const dps = data.products.filter((p) => p.kind === 'devproduct');
    console.log(
      `  passes: ${passes.length} (${passes.slice(0, 4).map((p) => `${p.name} ${p.price ?? 'off sale'}`).join(', ')}), ` +
        `dev products: ${dps.length}${data.truncated.devproduct ? ' (cut off at page limit)' : ''}`
    );
  }
  if (gone.length) console.log(`\nGone (404): ${gone.join(', ')}`);
  if (errors.length) console.log(`\nErrors: ${errors.join('; ')}`);
  console.log(`\nTook ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

// Only run when started directly, so tests can import estimates() without starting a run.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
