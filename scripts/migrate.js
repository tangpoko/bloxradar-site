// Creates the tables, and adds any column that was added to schema.sql after a table was
// first created. CREATE TABLE IF NOT EXISTS never changes an existing table, and MySQL 8 has
// no ADD COLUMN IF NOT EXISTS, so each later column is listed here and checked first.
// Safe to run more than once.
import { readFile } from 'node:fs/promises';
import { getPool } from '../src/db.js';
import { requireDbEnv } from '../src/env.js';

// [table, column, definition]. When a column is added to schema.sql, add it here too.
const LATER_COLUMNS = [
  ['games', 'last_charted', 'DATETIME NULL'],
  ['games', 'last_above_min', 'DATETIME NULL'],
  ['games', 'miss_count', 'TINYINT UNSIGNED NOT NULL DEFAULT 0'],
  ['games', 'icon_checked_at', 'DATETIME NULL'],
  ['games', 'daily_checked_at', 'DATETIME NULL'],
  ['games', 'description', 'TEXT NULL'],
  ['runs', 'job', "VARCHAR(16) NOT NULL DEFAULT 'collect'"],
  ['runs', 'warning', 'TEXT NULL'],
  ['sort_positions', 'prev_position', 'SMALLINT UNSIGNED NULL'],
  ['sort_positions', 'moved_at', 'DATETIME NULL'],
  ['catalog_items', 'thumb_url', 'VARCHAR(512) NULL'],
  ['catalog_items', 'thumb_at', 'DATETIME NULL'],
];
// [table, index, columns]
const LATER_INDEXES = [
  ['games', 'idx_live', '(last_seen, players)'],
  ['sort_positions', 'idx_universe', '(universe_id)'],
];

requireDbEnv();
const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
const db = getPool({ multipleStatements: true });
await db.query(sql);

for (const [table, column, definition] of LATER_COLUMNS) {
  const [[{ n }]] = await db.query(
    'SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [table, column]
  );
  if (!n) {
    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`Added ${table}.${column}`);
  }
}
for (const [table, index, columns] of LATER_INDEXES) {
  const [[{ n }]] = await db.query(
    'SELECT COUNT(*) AS n FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
    [table, index]
  );
  if (!n) {
    await db.query(`ALTER TABLE \`${table}\` ADD INDEX \`${index}\` ${columns}`);
    console.log(`Added index ${table}.${index}`);
  }
}

const [tables] = await db.query('SHOW TABLES');
console.log('Tables:', tables.map((t) => Object.values(t)[0]).join(', '));
const [[v]] = await db.query('SELECT VERSION() AS v');
console.log('Database version:', v.v);
await db.end();
