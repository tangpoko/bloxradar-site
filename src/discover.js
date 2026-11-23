// Finds games that are not in any Roblox chart. Cron starts this every hour.
//   npm run discover       searches Roblox and saves what it finds to the database
//   npm run discover:dry   searches a few terms and prints a summary, no database needed
// The collector (src/collect.js) then reads every found game that has enough players.
import { requireDbEnv } from './env.js';
import { searchGames } from './roblox.js';

const DRY = process.argv.includes('--dry');

// Each run searches TERMS_PER_RUN terms, starting where the last run stopped (it is worked out
// from the clock, so nothing has to be stored). With 150 terms that is a full pass every 3 hours.
// Measured on 2026-10-29: 16 pages of 40 games per term at a 1 s gap, about 20 s a term, and
// 56 terms found 11,486 games outside the charts, 4,256 of them with 50 or more players.
const TERMS_PER_RUN = 50;
const PAGES_PER_TERM = 16;
// Stop starting new terms after this long, so a run always finishes before Hostinger's 30 minutes.
const TIME_LIMIT_MS = 20 * 60 * 1000;
const KEEP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const TERMS = [
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  ...(
    'simulator tycoon obby rpg anime horror fighting tower-defense racing roleplay survival shooter pet clicker fishing ' +
    'brookhaven blox fruit dragon zombie city school farm mining soccer story escape battle adventure world steal brainrot ' +
    'egg grow garden build boat murder mystery dress impress adopt rivals tower hell ninja sword gun war army car drive ' +
    'bike truck train plane space galaxy ocean island forest cave castle kingdom king queen princess hero villain monster ' +
    'ghost vampire demon angel god magic wizard witch fairy fire ice water earth lightning dark light shadow night summer ' +
    'winter halloween christmas birthday party dance music piano draw art cook restaurant pizza burger cafe hotel hospital ' +
    'police prison heist bank spy detective trade shop store merge idle rebirth upgrade level boss raid dungeon quest loot ' +
    'craft sandbox parkour speed run jump flood disaster hide seek tag infection football basketball baseball boxing ' +
    'skate surf swim dive'
  )
    .split(' ')
    .map((t) => t.replace('-', ' ')),
];

const floorMinute = (d) => new Date(Math.floor(d.getTime() / 60000) * 60000);

// The terms for this run. The hour number moves the window along, wrapping at the end.
function termsFor(now) {
  const start = (Math.floor(now.getTime() / 3600000) * TERMS_PER_RUN) % TERMS.length;
  return Array.from({ length: TERMS_PER_RUN }, (_, i) => TERMS[(start + i) % TERMS.length]);
}

// Runs the searches. Returns Map(universeId -> players) and how many terms finished.
// A term that fails after retries is skipped, so one bad answer does not lose the run.
async function crawl(terms, pages, started) {
  const found = new Map();
  const errors = [];
  let done = 0;
  for (const term of terms) {
    if (Date.now() - started > TIME_LIMIT_MS) break;
    try {
      for (const [id, g] of await searchGames(term, pages)) found.set(id, g.players);
      done++;
    } catch (err) {
      errors.push(`${term}: ${err.message}`);
    }
  }
  return { found, done, errors };
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
    const [[lock]] = await conn.query("SELECT GET_LOCK('bloxradar_discover', 0) AS ok");
    if (!lock.ok) {
      console.log('Previous discover run is still going. Skipping this one.');
      return;
    }
    const [run] = await conn.query("INSERT INTO runs (job, started_at) VALUES ('discover', ?)", [now]);
    try {
      const terms = termsFor(now);
      const { found, done, errors } = await crawl(terms, PAGES_PER_TERM, started);
      // Players is overwritten each time, so it is the latest reading, not a peak.
      await insertMany(
        conn,
        `INSERT INTO discovered (universe_id, players, seen_at) VALUES ?
         ON DUPLICATE KEY UPDATE players = VALUES(players), seen_at = VALUES(seen_at)`,
        [...found].map(([id, players]) => [id, players, now])
      );
      await conn.query('DELETE FROM discovered WHERE seen_at < ?', [new Date(now.getTime() - KEEP_DAYS * DAY_MS)]);
      const strong = [...found.values()].filter((p) => p >= 50).length;
      const warning = errors.length || done < terms.length ? `${done} of ${terms.length} terms searched. ${errors[0] ?? 'Ran out of time.'}` : null;
      await conn.query('UPDATE runs SET finished_at = UTC_TIMESTAMP(), games_tracked = ?, games_read = ?, warning = ? WHERE id = ?', [
        found.size,
        strong,
        warning,
        run.insertId,
      ]);
      console.log(
        `Discover: ${done} of ${terms.length} terms, ${found.size} games found, ${strong} with 50 or more players, ` +
          `${((Date.now() - started) / 1000).toFixed(1)}s${warning ? `. ${warning}` : ''}`
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
    await conn.query("SELECT RELEASE_LOCK('bloxradar_discover')").catch(() => {});
    conn.release();
    await db.end();
  }
}

async function dryRun(started) {
  const terms = termsFor(floorMinute(new Date())).slice(0, 3);
  const { found, done, errors } = await crawl(terms, 3, started);
  const players = [...found.values()];
  console.log(`Terms: ${terms.join(', ')} (${done} done, ${errors.length} failed)`);
  console.log(`Games found: ${found.size}, with 50 or more players: ${players.filter((p) => p >= 50).length}`);
  console.log(`Players in them: ${players.reduce((a, b) => a + b, 0).toLocaleString()}`);
  console.log(`Took ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
