// HTTP handling: the JSON API under /api, a few page routes, and static files from public/.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi, resolve, HttpError } from './api.js';
import { CACHE_SECONDS } from './config.js';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
};

// Pretty URLs that map onto one HTML file each. The page script reads the rest of the path.
const PAGES = [
  [/^\/$/, 'index.html'],
  [/^\/game\/\d+\/?$/, 'game.html'],
  [/^\/list\/[a-z-]+\/?$/, 'list.html'],
  [/^\/search\/?$/, 'search.html'],
  [/^\/card\/\d+\/?$/, 'card.html'],
  [/^\/studio\/[gu]\/\d+\/?$/, 'studio.html'],
  [/^\/creators(\/browse|\/top|\/c\/\d+)?\/?$/, 'market.html'],
];

// API responses are cached in memory per full URL. The data only changes every 10 minutes.
const cache = new Map();
const CACHE_MAX = 500;

// Makes room before adding an entry: drops expired ones first, then the oldest. In-flight entries
// count towards the limit too, so a flood of distinct URLs cannot grow the map past CACHE_MAX.
function makeRoom() {
  if (cache.size < CACHE_MAX) return;
  const now = Date.now();
  for (const [k, v] of cache) if (!v.pending && v.expires <= now) cache.delete(k);
  while (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
}

export const cacheSize = () => cache.size;

async function api(url) {
  const route = resolve(url);
  // Unknown paths are answered without touching the data or the cache.
  if (!route) return { status: 404, json: JSON.stringify({ error: 'Unknown endpoint' }) };
  const key = route.key;
  const hit = cache.get(key);
  if (hit && !hit.pending && hit.expires > Date.now()) return hit;
  // Share one in-flight request between callers asking for the same thing at the same moment.
  if (hit && hit.pending) return hit.pending;
  const store = (status, json) => {
    const entry = { status, json, expires: Date.now() + CACHE_SECONDS * 1000 };
    cache.delete(key);
    makeRoom();
    cache.set(key, entry);
    return entry;
  };
  const pending = handleApi(url, route).then(
    (body) => store(200, JSON.stringify(body)),
    (err) => {
      // "Game not found" is cached like any other answer. Server errors are not, so the next request retries.
      if (err instanceof HttpError && err.status === 404) return store(404, JSON.stringify({ error: err.message }));
      cache.delete(key);
      throw err;
    }
  );
  makeRoom();
  cache.set(key, { expires: 0, pending });
  return pending;
}

function send(res, status, type, body, extra = {}) {
  res.writeHead(status, { 'content-type': type, 'x-content-type-options': 'nosniff', ...extra });
  res.end(body);
}

async function serveFile(res, rel, cacheControl, status = 200) {
  const full = normalize(join(PUBLIC, rel));
  if (!full.startsWith(PUBLIC.endsWith(sep) ? PUBLIC : PUBLIC + sep)) return false;
  try {
    const s = await stat(full);
    if (!s.isFile()) return false;
    const body = await readFile(full);
    send(res, status, TYPES[extname(full)] || 'application/octet-stream', body, { 'cache-control': cacheControl });
    return true;
  } catch {
    return false;
  }
}

// Scripts and styles are kept by the browser for 5 minutes. The local preview asks the browser to
// check every time, so edits show up on a normal reload.
const ASSET_CACHE = process.env.DATA_SOURCE === 'fixture' ? 'no-cache' : 'public, max-age=300';

export function createApp() {
  return createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return send(res, 400, 'text/plain', 'Bad request');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'text/plain', 'Method not allowed');

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      try {
        const entry = await api(url);
        return send(res, entry.status, 'application/json; charset=utf-8', entry.json, {
          'cache-control': entry.status === 200 ? `public, max-age=${CACHE_SECONDS}` : 'no-store',
        });
      } catch (err) {
        const status = err instanceof HttpError ? err.status : 500;
        if (status === 500) console.error(new Date().toISOString(), url.pathname, err);
        return send(res, status, 'application/json; charset=utf-8', JSON.stringify({ error: status === 500 ? 'Server error' : err.message }), {
          'cache-control': 'no-store',
        });
      }
    }

    for (const [re, file] of PAGES) {
      if (re.test(url.pathname) && (await serveFile(res, file, 'no-cache'))) return;
    }
    let rel;
    try {
      rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    } catch {
      return send(res, 400, 'text/plain', 'Bad request');
    }
    if (rel && !rel.endsWith('.html') && (await serveFile(res, rel, ASSET_CACHE))) return;
    if (!(await serveFile(res, '404.html', 'no-cache', 404))) send(res, 404, 'text/plain', 'Not found');
  });
}
