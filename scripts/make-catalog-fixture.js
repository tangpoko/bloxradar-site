// Writes data/catalog-fixture.json from the catalog tables in the real database, so
// `npm run preview` can show the creators pages. Needs .env.
import { writeFile } from 'node:fs/promises';
import { requireDbEnv } from '../src/env.js';
import { catalogSnapshot } from '../server/data/mysql.js';

requireDbEnv();
const snap = await catalogSnapshot();
await writeFile(new URL('../data/catalog-fixture.json', import.meta.url), JSON.stringify(snap));
console.log(`Wrote data/catalog-fixture.json: ${snap.items.length} items for ${snap.day}`);
process.exit(0);
