// Picks the data source. DATA_SOURCE=fixture reads data/fixture.json, anything else uses MySQL.
// Plain imports, no top-level await: Hostinger starts the app with require(), which rejects it.
import * as fixture from './fixture.js';
import * as mysql from './mysql.js';

export const SOURCE = (process.env.DATA_SOURCE || 'mysql').toLowerCase() === 'fixture' ? 'fixture' : 'mysql';

export const data = SOURCE === 'fixture' ? fixture : mysql;
