// Marketplace job, once a day: reads the top of six catalog lists and saves each item's price and
// favourites for the day, plus every list's order. The history is the point: Roblox shows only
// today's numbers, and the best-selling lists give an order but no sales counts.
//   npm run catalog       reads Roblox and writes to the database
//   npm run catalog:dry   reads 2 pages of each list and prints what would be stored
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireDbEnv } from './env.js';
import { fetchCatalogPage, fetchCatalogThumbs, CATALOG_GAP_MS } from './roblox.js';

const DRY = process.argv.includes('--dry');

// Placeholder values. 10 pages of 30 is the top 300 of each overall list (about 3 minutes);
// each subcategory below gets 2 pages, the top 60 of three lists (about 6 more minutes).
const PAGES_PER_LIST = 10;
const PAGES_PER_SUB_LIST = 2;
const READ_BUDGET_MS = 20 * 60 * 1000; // Hostinger stops cron jobs at 30 minutes
const THUMB_REFRESH_DAYS = 20; // bundle thumbnail addresses expire after 30 days
const DAY_MS = 24 * 3600000;

// Roblox's own catalog subcategories (from catalog.roblox.com/v1/categories), grouped the way the
// marketplace pages will show them. `category` is Roblox's parent category id.
const SUBCATEGORIES = [
  { group: 'Characters', name: 'Full bodies', category: 18, id: 37 },
  { group: 'Emotes', name: 'Emotes', category: 12, id: 39 },
  { group: 'Bundles', name: 'Animation bundles', category: 12, id: 38 },
  { group: 'Clothing', name: 'T-shirts', category: 3, id: 58 },
  { group: 'Clothing', name: 'Shirts', category: 3, id: 59 },
  { group: 'Clothing', name: 'Sweaters', category: 3, id: 62 },
  { group: 'Clothing', name: 'Jackets', category: 3, id: 61 },
  { group: 'Clothing', name: 'Pants', category: 3, id: 60 },
  { group: 'Clothing', name: 'Shorts', category: 3, id: 63 },
  { group: 'Clothing', name: 'Dresses and skirts', category: 3, id: 65 },
  { group: 'Clothing', name: 'Shoes', category: 3, id: 64 },
  { group: 'Accessories', name: 'Hair', category: 18, id: 20 },
  { group: 'Accessories', name: 'Heads', category: 18, id: 66 },
  { group: 'Accessories', name: 'Head', category: 11, id: 54 },
  { group: 'Accessories', name: 'Face', category: 11, id: 21 },
  { group: 'Accessories', name: 'Neck', category: 11, id: 22 },
  { group: 'Accessories', name: 'Shoulder', category: 11, id: 23 },
  { group: 'Accessories', name: 'Front', category: 11, id: 24 },
  { group: 'Accessories', name: 'Back', category: 11, id: 25 },
  { group: 'Accessories', name: 'Waist', category: 11, id: 26 },
  { group: 'Accessories', name: 'Gear', category: 11, id: 5 },
];
// The lists read inside each subcategory. Their names get "@" and the subcategory id added.
const SUB_LISTS = [
  { name: 'sold_7d', sort: 2, sortAggregation: 3, minPrice: 1 },
  { name: 'favorited', sort: 1 },
  { name: 'newest', sort: 3 },
];
const LISTS = [
  { name: 'sold_1d', sort: 2, sortAggregation: 1, minPrice: 1 },
  { name: 'sold_7d', sort: 2, sortAggregation: 3, minPrice: 1 },
  { name: 'sold_30d', sort: 2, sortAggregation: 4, minPrice: 1 },
  { name: 'sold_all', sort: 2, sortAggregation: 5, minPrice: 1 },
  { name: 'favorited', sort: 1 },
  { name: 'newest', sort: 3 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const utcDay = (d) => d.toISOString().slice(0, 10);

// Reads the top `pages` pages of one list. A list that fails part way keeps the pages it got.
async function readList(list, pages, started) {
  const items = [];
  let cursor = null;
  let error = null;
  for (let page = 0; page < pages; page++) {
    if (Date.now() - started > READ_BUDGET_MS) {
      error = 'stopped early, out of time';
      break;
    }
    if (page > 0) await sleep(CATALOG_GAP_MS);
    try {
      const res = await fetchCatalogPage({ ...list, cursor });
      items.push(...res.items);
      cursor = res.next;
    } catch (err) {
      error = String(err.message || err);
      break;
    }
    if (!cursor) break;
  }
  return { items, error };
}

// The overall lists first, then each subcategory's lists, so if time runs out it is the smaller
// lists that are cut.
async function readAll(pages, subPages, subs) {
  const started = Date.now();
  const lists = [];
  const queue = [
    ...LISTS.map((l) => ({ list: l, name: l.name, pages })),
    ...subs.flatMap((s) =>
      SUB_LISTS.map((l) => ({ list: { ...l, category: s.category, subcategory: s.id }, name: `${l.name}@${s.id}`, pages: subPages }))
    ),
  ];
  for (const q of queue) {
    if (lists.length) await sleep(CATALOG_GAP_MS);
    const read = await readList(q.list, q.pages, started);
    lists.push({ name: q.name, ...read });
    // Progress, so someone running this by hand can see it is working. Cron logs it too.
    console.log(`Read ${q.name}: ${read.items.length} items${read.error ? ` (stopped: ${read.error})` : ''} [${lists.length}/${queue.length}, ${Math.round((Date.now() - started) / 1000)}s]`);
  }
  return lists;
}

// Reads a thumbnail for every item that has none, or whose picture is old enough that a bundle
// address may expire. Items without a ready thumbnail are left empty and tried again tomorrow.
async function addThumbs(conn, insertMany, items, now) {
  const [rows] = await conn.query(
    'SELECT item_type, item_id, thumb_at FROM catalog_items WHERE (item_type, item_id) IN (?)',
    [items.map((i) => [i.type, i.id])]
  );
  const fresh = new Set(
    rows.filter((r) => r.thumb_at && now - new Date(r.thumb_at) < THUMB_REFRESH_DAYS * DAY_MS).map((r) => `${r.item_type}|${r.item_id}`)
  );
  const need = items.filter((i) => !fresh.has(`${i.type}|${i.id}`));
  const found = await fetchCatalogThumbs(need);
  for (const [key, url] of found) {
    const [type, id] = key.split('|');
    await conn.query('UPDATE catalog_items SET thumb_url = ?, thumb_at = ? WHERE item_type = ? AND item_id = ?', [url, now, type, id]);
  }
  return { asked: need.length, found: found.size };
}

async function main() {
  const started = Date.now();
  if (DRY) return dryRun(started);

  requireDbEnv();
  const { getPool, insertMany, keepAlive } = await import('./db.js');
  const db = getPool({ connectionLimit: 1 });
  const conn = await db.getConnection();
  const stopKeepAlive = keepAlive(conn);
  try {
    const [[lock]] = await conn.query("SELECT GET_LOCK('bloxradar_catalog', 0) AS ok");
    if (!lock.ok) {
      console.log('Previous catalog run is still going. Skipping this one.');
      return;
    }
    const now = new Date(Math.floor(Date.now() / 60000) * 60000);
    const [run] = await conn.query("INSERT INTO runs (job, started_at) VALUES ('catalog', ?)", [now]);
    try {
      const lists = await readAll(PAGES_PER_LIST, PAGES_PER_SUB_LIST, SUBCATEGORIES);
      console.log('Saving to the database, then reading thumbnails.');
      const saved = await save(conn, insertMany, lists, now);
      // Thumbnails are extra. If they fail, the day's prices and positions are already saved.
      let thumbs = { asked: 0, found: 0 };
      let thumbError = null;
      try {
        thumbs = await addThumbs(conn, insertMany, saved.all, now);
      } catch (err) {
        thumbError = `thumbnails: ${String(err.message || err)}`;
      }
      const failed = lists.filter((l) => l.error);
      const warning =
        [...failed.map((l) => `${l.name}: ${l.error}`), ...(thumbError ? [thumbError] : [])].join('; ').slice(0, 1000) || null;
      await conn.query('UPDATE runs SET finished_at = UTC_TIMESTAMP(), games_tracked = ?, games_read = ?, warning = ? WHERE id = ?', [
        saved.items,
        saved.items,
        warning,
        run.insertId,
      ]);
      console.log(
        `Catalog: ${saved.items} items, ${saved.ranks} list positions, thumbnails ${thumbs.found} of ${thumbs.asked}, ` +
          `${((Date.now() - started) / 1000).toFixed(1)}s${warning ? `. ${warning}` : ''}`
      );
    } catch (err) {
      await conn
        .query('UPDATE runs SET finished_at = UTC_TIMESTAMP(), error = ? WHERE id = ?', [String(err.stack || err).slice(0, 5000), run.insertId])
        .catch(() => {});
      throw err;
    }
  } finally {
    stopKeepAlive();
    await conn.query("SELECT RELEASE_LOCK('bloxradar_catalog')").catch(() => {});
    conn.release();
    await db.end();
  }
}

// A list that read nothing is left alone, so a failed list never wipes the day's earlier order.
async function save(conn, insertMany, lists, now) {
  const day = utcDay(now);
  const byKey = new Map();
  const rankRows = [];
  for (const list of lists) {
    list.items.forEach((it, i) => {
      byKey.set(`${it.type}|${it.id}`, it);
      rankRows.push([list.name, day, i + 1, it.type, it.id]);
    });
  }
  const items = [...byKey.values()];
  await insertMany(
    conn,
    `INSERT INTO catalog_items (item_type, item_id, name, creator_id, creator_name, creator_type, kind, created_at, first_seen, last_seen) VALUES ?
     ON DUPLICATE KEY UPDATE name = VALUES(name), creator_name = VALUES(creator_name), kind = VALUES(kind), last_seen = VALUES(last_seen)`,
    items.map((it) => [
      it.type, it.id, it.name.slice(0, 255), it.creatorId, it.creatorName.slice(0, 255), it.creatorType, it.kind,
      it.createdAt ? new Date(it.createdAt) : null, now, now,
    ])
  );
  await insertMany(
    conn,
    `INSERT INTO catalog_daily (item_type, item_id, day, price, favorites, lowest_resale, total_quantity) VALUES ?
     ON DUPLICATE KEY UPDATE price = VALUES(price), favorites = VALUES(favorites), lowest_resale = VALUES(lowest_resale), total_quantity = VALUES(total_quantity)`,
    items.map((it) => [it.type, it.id, day, it.price, it.favorites, it.lowestResale, it.totalQuantity])
  );
  for (const list of lists.filter((l) => l.items.length)) {
    await conn.query('DELETE FROM catalog_rank_daily WHERE list_name = ? AND day = ?', [list.name, day]);
  }
  await insertMany(conn, 'INSERT INTO catalog_rank_daily (list_name, day, pos, item_type, item_id) VALUES ?', rankRows);
  return { items: items.length, ranks: rankRows.length, all: items };
}

async function dryRun(started) {
  // One page of each overall list and of the first two subcategories, so it takes about a minute.
  const lists = await readAll(1, 1, SUBCATEGORIES.slice(0, 2));
  const all = [...new Map(lists.flatMap((l) => l.items).map((i) => [`${i.type}|${i.id}`, i])).values()];
  const thumbs = await fetchCatalogThumbs(all.slice(0, 40));
  console.log(`Thumbnails: ${thumbs.size} ready of ${Math.min(all.length, 40)} asked`);
  for (const l of lists) {
    console.log(`\n${l.name}: ${l.items.length} items${l.error ? ` (stopped: ${l.error})` : ''}`);
    l.items.slice(0, 5).forEach((it, i) =>
      console.log(`  ${i + 1}. ${it.name} by ${it.creatorName}, ${it.price ?? 'off sale'} R$, ${it.favorites?.toLocaleString() ?? '-'} favourites${it.lowestResale ? `, resale from ${it.lowestResale}` : ''}`)
    );
  }
  console.log(`\nTook ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
